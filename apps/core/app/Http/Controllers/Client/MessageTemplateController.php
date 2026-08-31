<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\MessageTemplate;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class MessageTemplateController extends Controller
{
    /**
     * Display a listing of templates.
     */
    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        $templates = $tenant->messageTemplates()
            ->with('whatsappAccount')
            ->latest()
            ->paginate(15)
            ->through(fn (MessageTemplate $template): array => [
                'id' => (string) $template->id,
                'name' => $template->name,
                'language' => $template->language,
                'category' => $template->category,
                'status' => $template->status,
                'phone_number' => $template->whatsappAccount->phone_number,
                'rejection_reason' => $template->rejection_reason,
                'created_at' => $template->created_at->format('Y-m-d H:i'),
            ]);

        return Inertia::render('client/templates/index', [
            'templates' => $templates,
        ]);
    }

    /**
     * Show the form to create a new template.
     */
    public function create(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        $accounts = $tenant->whatsappAccounts()
            ->whereIn('status', ['active', 'ACTIVE'])
            ->get()
            ->map(fn ($account): array => [
                'id' => (string) $account->id,
                'phone_number' => $account->phone_number,
                'display_name' => $account->display_name,
                'waba_id' => $account->waba_id,
            ]);

        return Inertia::render('client/templates/create', [
            'accounts' => $accounts,
        ]);
    }

    /**
     * Store a new template and submit to Meta.
     */
    public function store(Request $request, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $validated = $request->validate([
            'whatsapp_account_id' => ['required', 'string', 'exists:whatsapp_accounts,id'],
            'name' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9_]+$/'],
            'language' => ['required', 'string', 'max:10'],
            'category' => ['required', 'string', 'in:MARKETING,UTILITY,AUTHENTICATION'],
            'components' => ['required', 'array'],
            'header_type' => ['nullable', 'string', 'in:NONE,TEXT,IMAGE,VIDEO,DOCUMENT'],
            'header_media' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,gif,webp,mp4,3gpp,pdf,doc,docx',
                'max:102400',
            ],
        ]);

        $headerType = strtoupper($validated['header_type'] ?? 'NONE');
        $mediaHeaderTypes = ['IMAGE', 'VIDEO', 'DOCUMENT'];
        $mediaPath = null;

        if (in_array($headerType, $mediaHeaderTypes) && $request->hasFile('header_media')) {
            $mediaPath = $request->file('header_media')->store('template_media', 'public');
        }

        $tenant = $request->user()->tenant;

        // Verify account belongs to tenant
        $account = $tenant->whatsappAccounts()->findOrFail($validated['whatsapp_account_id']);

        try {
            if ($account->access_token) {
                $whatsAppApi->withToken($account->access_token);
            } else {
                $whatsAppApi->withToken(null);
            }
            // Submit to Meta API
            $response = $whatsAppApi->createTemplate($account->waba_id, [
                'name' => $validated['name'],
                'language' => $validated['language'],
                'category' => $validated['category'],
                'components' => $validated['components'],
            ]);

            $metaTemplateId = $response->json('id');

            $tenant->messageTemplates()->create([
                'whatsapp_account_id' => (string) $account->id,
                'meta_template_id' => $metaTemplateId,
                'name' => $validated['name'],
                'language' => $validated['language'],
                'category' => $validated['category'],
                'status' => 'pending',
                'components' => $validated['components'],
            ]);

            Inertia::flash('toast', ['type' => 'success', 'message' => __('Template submitted for approval.')]);
        } catch (\Exception $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Failed to create template: ').$e->getMessage()]);
        }

        return to_route('client.templates.index');
    }

    /**
     * Display a template's details.
     */
    public function show(Request $request, MessageTemplate $template): Response
    {
        $tenant = $request->user()->tenant;

        if ((string) $template->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $template->load('whatsappAccount');

        return Inertia::render('client/templates/show', [
            'template' => [
                'id' => (string) $template->id,
                'name' => $template->name,
                'language' => $template->language,
                'category' => $template->category,
                'status' => $template->status,
                'components' => $template->components,
                'rejection_reason' => $template->rejection_reason,
                'phone_number' => $template->whatsappAccount->phone_number,
                'created_at' => $template->created_at->format('Y-m-d H:i'),
            ],
        ]);
    }

    /**
     * Delete a template.
     */
    public function destroy(Request $request, MessageTemplate $template, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $template->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        try {
            $account = $template->whatsappAccount;

            if ($account->waba_id) {
                if ($account->access_token) {
                    $whatsAppApi->withToken($account->access_token);
                } else {
                    $whatsAppApi->withToken(null);
                }
                $whatsAppApi->deleteTemplate($account->waba_id, $template->name);
            }

            $template->delete();

            Inertia::flash('toast', ['type' => 'success', 'message' => __('Template deleted successfully.')]);
        } catch (\Exception $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Failed to delete template: ').$e->getMessage()]);
        }

        return to_route('client.templates.index');
    }

    /**
     * Sync template statuses and definitions from Meta.
     */
    public function sync(Request $request, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        $accounts = $tenant->whatsappAccounts()->where('status', 'active')->get();

        if ($accounts->isEmpty()) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => __('No active WhatsApp accounts found to sync templates from.')]);

            return to_route('client.templates.index');
        }

        $syncedCount = 0;

        foreach ($accounts as $account) {
            $wabaId = $account->waba_id;
            if (! $wabaId) {
                continue;
            }

            try {
                if ($account->access_token) {
                    $whatsAppApi->withToken($account->access_token);
                } else {
                    $whatsAppApi->withToken(null);
                }

                $remoteTemplates = $whatsAppApi->getTemplates($wabaId);

                foreach ($remoteTemplates as $remoteTemplate) {
                    $name = $remoteTemplate['name'] ?? null;
                    if (! $name) {
                        continue;
                    }

                    $newStatus = strtolower($remoteTemplate['status'] ?? 'pending');

                    $tenant->messageTemplates()->updateOrCreate(
                        [
                            'whatsapp_account_id' => $account->id,
                            'name' => $name,
                            'language' => $remoteTemplate['language'] ?? 'en',
                        ],
                        [
                            'meta_template_id' => $remoteTemplate['id'] ?? null,
                            'category' => $remoteTemplate['category'] ?? 'UTILITY',
                            'status' => $newStatus,
                            'components' => $remoteTemplate['components'] ?? [],
                            'rejection_reason' => $newStatus === 'rejected'
                                ? ($remoteTemplate['rejected_reason'] ?? 'Rejected by Meta')
                                : null,
                        ]
                    );

                    $syncedCount++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to sync templates for WABA {$wabaId}: ".$e->getMessage());
            }
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(':count templates synced and updated successfully from Meta!', ['count' => $syncedCount]),
        ]);

        return to_route('client.templates.index');
    }
}
