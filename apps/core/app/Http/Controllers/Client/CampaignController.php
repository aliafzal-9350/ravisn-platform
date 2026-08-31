<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessCampaign;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use Carbon\CarbonImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CampaignController extends Controller
{
    /**
     * Display a listing of campaigns.
     */
    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        $campaigns = $tenant->campaigns()
            ->with(['messageTemplate', 'whatsappAccount'])
            ->latest()
            ->paginate(15)
            ->through(fn (Campaign $campaign): array => [
                'id' => (string) $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'message_type' => $campaign->message_type,
                'message_label' => $campaign->message_type === 'direct'
                    ? __('Direct message')
                    : $campaign->messageTemplate?->name,
                'phone_number' => $campaign->whatsappAccount->phone_number,
                'total_recipients' => $campaign->total_recipients,
                'sent_count' => $campaign->sent_count,
                'delivered_count' => $campaign->delivered_count,
                'failed_count' => $campaign->failed_count,
                'read_count' => $campaign->read_count,
                'progress' => $campaign->progressPercentage(),
                'scheduled_at' => $this->formatScheduledAt($campaign),
                'scheduled_timezone' => $campaign->scheduled_timezone,
                'created_at' => $campaign->created_at->format('Y-m-d H:i'),
            ]);

        return Inertia::render('client/campaigns/index', [
            'campaigns' => $campaigns,
        ]);
    }

    /**
     * Show the form to create a new campaign.
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
            ]);

        $templates = $tenant->messageTemplates()
            ->whereIn('status', ['approved', 'APPROVED'])
            ->get()
            ->map(fn ($template): array => [
                'id' => (string) $template->id,
                'name' => $template->name,
                'language' => $template->language,
                'category' => $template->category,
                'status' => strtoupper($template->status),
                'whatsapp_account_id' => (string) $template->whatsapp_account_id,
                'components' => $template->components,
            ]);

        $groups = $tenant->contactGroups()
            ->withCount('contacts')
            ->get()
            ->map(fn ($group): array => [
                'id' => (string) $group->id,
                'name' => $group->name,
                'contacts_count' => $group->contacts_count,
            ]);

        return Inertia::render('client/campaigns/create', [
            'accounts' => $accounts,
            'templates' => $templates,
            'groups' => $groups,
            'timezones' => DateTimeZone::listIdentifiers(),
            'defaultTimezone' => config('app.timezone', 'UTC'),
        ]);
    }

    /**
     * Store a new campaign.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'whatsapp_account_id' => ['required', 'string', 'exists:whatsapp_accounts,id'],
            'message_type' => ['required', Rule::in(['template', 'direct'])],
            'message_template_id' => [
                Rule::requiredIf(fn (): bool => $request->input('message_type', 'template') === 'template'),
                'nullable',
                'string',
                'exists:message_templates,id',
            ],
            'direct_message_body' => [
                Rule::requiredIf(fn (): bool => $request->input('message_type') === 'direct'),
                'nullable',
                'string',
                'max:4096',
            ],
            'header_image' => ['nullable', 'image', 'max:5120'],
            'header_media_url' => ['nullable', 'url', 'max:2048'],
            'scheduled_at' => ['nullable', 'date'],
            'scheduled_timezone' => ['required_with:scheduled_at', 'nullable', 'timezone'],
            'contact_group_id' => ['nullable', 'string', 'exists:contact_groups,id'],
            'recipients' => ['required_without:contact_group_id', 'array'],
            'recipients.*.phone_number' => ['required_with:recipients', 'string'],
            'recipients.*.variables' => ['nullable', 'array'],
        ]);

        $tenant = $request->user()->tenant;
        $messageType = $validated['message_type'];
        $scheduledAt = $this->scheduledAtFromRequest($validated);

        if ($scheduledAt && $scheduledAt->lte(now())) {
            return back()->withErrors([
                'scheduled_at' => __('The scheduled dispatch time must be in the future.'),
            ])->withInput();
        }

        // Verify account and template belong to tenant
        $account = $tenant->whatsappAccounts()->findOrFail($validated['whatsapp_account_id']);
        $template = null;

        if ($messageType === 'template') {
            $template = $tenant->messageTemplates()
                ->where('whatsapp_account_id', (string) $account->id)
                ->whereIn('status', ['approved', 'APPROVED'])
                ->findOrFail($validated['message_template_id']);

            // Validate header image requirement if template has an IMAGE header component
            $hasImageHeader = false;
            $components = is_string($template->components) ? json_decode($template->components, true) : $template->components;
            foreach ($components ?: [] as $c) {
                if (strtoupper($c['type'] ?? '') === 'HEADER' && strtoupper($c['format'] ?? '') === 'IMAGE') {
                    $hasImageHeader = true;
                    break;
                }
            }

            if ($hasImageHeader && ! $request->hasFile('header_image') && empty($validated['header_media_url'])) {
                return back()->withErrors([
                    'header_image' => __('This template requires a header image. Please upload an image or provide an image URL.'),
                ])->withInput();
            }
        }

        $headerMediaUrl = $validated['header_media_url'] ?? null;
        if ($request->hasFile('header_image')) {
            $path = $request->file('header_image')->store('campaigns/headers', 'public');
            $headerMediaUrl = asset('storage/'.$path);
        }

        $recipientsList = [];
        if (! empty($validated['contact_group_id'])) {
            $group = $tenant->contactGroups()->findOrFail($validated['contact_group_id']);
            $contacts = $group->contacts()->get();
            foreach ($contacts as $contact) {
                // Pass the contact name and variables
                $recipientsList[] = [
                    'phone_number' => $contact->phone,
                    'variables' => [
                        $contact->name,
                        $contact->var1 ?? '',
                        $contact->var2 ?? '',
                        $contact->var3 ?? '',
                        $contact->var4 ?? '',
                        $contact->var5 ?? '',
                    ],
                ];
            }
        } else {
            $recipientsList = $validated['recipients'] ?? [];
        }

        if (empty($recipientsList)) {
            return back()->withErrors(['recipients' => __('No recipients found in the selected group.')]);
        }

        $campaign = $tenant->campaigns()->create([
            'whatsapp_account_id' => $account->id,
            'message_template_id' => $template?->id,
            'message_type' => $messageType,
            'direct_message_body' => $messageType === 'direct' ? $validated['direct_message_body'] : null,
            'header_media_url' => $headerMediaUrl,
            'name' => $validated['name'],
            'status' => $scheduledAt ? 'scheduled' : 'draft',
            'total_recipients' => count($recipientsList),
            'scheduled_at' => $scheduledAt,
            'scheduled_timezone' => $scheduledAt ? $validated['scheduled_timezone'] : null,
        ]);

        // Create recipients
        foreach ($recipientsList as $recipientData) {
            $campaign->recipients()->create([
                'campaign_id' => (string) $campaign->id,
                'phone_number' => $recipientData['phone_number'],
                'template_variables' => $recipientData['variables'] ?? null,
                'status' => 'pending',
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Campaign created successfully.')]);

        return to_route('client.campaigns.show', $campaign);
    }

    /**
     * Display a campaign's details.
     */
    public function show(Request $request, Campaign $campaign): Response
    {
        $tenant = $request->user()->tenant;

        if ((string) $campaign->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $campaign->load(['messageTemplate', 'whatsappAccount']);

        $recipients = $campaign->recipients()
            ->latest()
            ->paginate(50)
            ->through(fn (CampaignRecipient $recipient): array => [
                'id' => (string) $recipient->id,
                'phone_number' => $recipient->phone_number,
                'status' => $recipient->status,
                'error_message' => $recipient->error_message,
                'sent_at' => $recipient->sent_at?->format('H:i:s'),
                'delivered_at' => $recipient->delivered_at?->format('H:i:s'),
                'read_at' => $recipient->read_at?->format('H:i:s'),
            ]);

        return Inertia::render('client/campaigns/show', [
            'campaign' => [
                'id' => (string) $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'message_type' => $campaign->message_type,
                'message_label' => $campaign->message_type === 'direct'
                    ? __('Direct message')
                    : $campaign->messageTemplate?->name,
                'direct_message_body' => $campaign->direct_message_body,
                'header_media_url' => $campaign->header_media_url,
                'phone_number' => $campaign->whatsappAccount->phone_number,
                'total_recipients' => $campaign->total_recipients,
                'sent_count' => $campaign->sent_count,
                'delivered_count' => $campaign->delivered_count,
                'failed_count' => $campaign->failed_count,
                'read_count' => $campaign->read_count,
                'total_cost' => number_format((float) $campaign->total_cost, 4),
                'progress' => $campaign->progressPercentage(),
                'scheduled_at' => $this->formatScheduledAt($campaign),
                'scheduled_timezone' => $campaign->scheduled_timezone,
                'started_at' => $campaign->started_at?->format('Y-m-d H:i'),
                'completed_at' => $campaign->completed_at?->format('Y-m-d H:i'),
                'created_at' => $campaign->created_at->format('Y-m-d H:i'),
            ],
            'recipients' => $recipients,
        ]);
    }

    /**
     * Start a campaign.
     */
    public function start(Request $request, Campaign $campaign): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $campaign->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        if (! in_array($campaign->status, ['draft', 'scheduled', 'paused'])) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Campaign cannot be started in its current state.')]);

            return to_route('client.campaigns.show', $campaign);
        }

        ProcessCampaign::dispatch($campaign);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Campaign started! Messages are being sent.')]);

        return to_route('client.campaigns.show', $campaign);
    }

    /**
     * Pause a campaign.
     */
    public function pause(Request $request, Campaign $campaign): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $campaign->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        if ($campaign->status !== 'processing') {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Only processing campaigns can be paused.')]);

            return to_route('client.campaigns.show', $campaign);
        }

        $campaign->update(['status' => 'paused']);

        Inertia::flash('toast', ['type' => 'info', 'message' => __('Campaign paused.')]);

        return to_route('client.campaigns.show', $campaign);
    }

    /**
     * Delete a campaign and its recipient delivery logs.
     */
    public function destroy(Request $request, Campaign $campaign): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if (! $tenant || (string) $campaign->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        // Delete associated recipients & logs
        $campaign->recipients()->delete();

        // Delete campaign
        $campaign->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Campaign deleted successfully.'),
        ]);

        return to_route('client.campaigns.index');
    }

    /**
     * Upload recipients from an Excel/CSV file.
     */
    public function uploadRecipients(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:5120'],
        ]);

        $file = $request->file('file');
        $recipients = [];

        // Parse CSV
        if (($handle = fopen($file->getPathname(), 'r')) !== false) {
            $header = fgetcsv($handle);

            while (($row = fgetcsv($handle)) !== false) {
                if (isset($row[0]) && ! empty(trim($row[0]))) {
                    $phoneNumber = trim($row[0]);

                    // Ensure phone number starts with +
                    if (! str_starts_with($phoneNumber, '+')) {
                        $phoneNumber = '+'.$phoneNumber;
                    }

                    $variables = array_slice($row, 1);
                    $variables = array_filter($variables, fn ($v): bool => $v !== null && $v !== '');

                    $recipients[] = [
                        'phone_number' => $phoneNumber,
                        'variables' => ! empty($variables) ? array_values($variables) : null,
                    ];
                }
            }

            fclose($handle);
        }

        return response()->json([
            'recipients' => $recipients,
            'count' => count($recipients),
        ]);
    }

    /**
     * Convert the user-selected local scheduled time into UTC storage time.
     *
     * @param  array<string, mixed>  $validated
     */
    protected function scheduledAtFromRequest(array $validated): ?CarbonImmutable
    {
        if (empty($validated['scheduled_at'])) {
            return null;
        }

        return CarbonImmutable::parse(
            $validated['scheduled_at'],
            $validated['scheduled_timezone'] ?? config('app.timezone', 'UTC'),
        )->utc();
    }

    /**
     * Format scheduled time in the timezone selected when the campaign was created.
     */
    protected function formatScheduledAt(Campaign $campaign): ?string
    {
        if (! $campaign->scheduled_at) {
            return null;
        }

        return $campaign->scheduled_at
            ->copy()
            ->timezone($campaign->scheduled_timezone ?? config('app.timezone', 'UTC'))
            ->format('Y-m-d H:i');
    }
}
