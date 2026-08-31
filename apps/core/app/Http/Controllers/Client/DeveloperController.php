<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\OutgoingWebhook;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DeveloperController extends Controller
{
    /**
     * Show developer panel.
     */
    public function index(Request $request): InertiaResponse
    {
        $tenant = $request->user()->tenant;

        $apiKeys = $tenant->apiKeys()
            ->latest()
            ->get()
            ->map(fn (ApiKey $key) => [
                'id' => (string) $key->id,
                'name' => $key->name,
                'last_used_at' => $key->last_used_at?->format('Y-m-d H:i'),
                'created_at' => $key->created_at->format('Y-m-d H:i'),
            ]);

        $webhooks = $tenant->outgoingWebhooks()
            ->latest()
            ->get()
            ->map(fn (OutgoingWebhook $webhook) => [
                'id' => (string) $webhook->id,
                'url' => $webhook->url,
                'secret_token' => $webhook->secret_token,
                'is_active' => $webhook->is_active,
                'created_at' => $webhook->created_at->format('Y-m-d H:i'),
            ]);

        return Inertia::render('client/developer/index', [
            'apiKeys' => $apiKeys,
            'webhooks' => $webhooks,
            // Pass generated key if it exists in the session flash
            'plainApiKey' => session('plainApiKey'),
        ]);
    }

    /**
     * Generate a new API key.
     */
    public function storeKey(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $tenant = $request->user()->tenant;

        // Generate raw key zm_live_...
        $rawKey = 'zm_live_'.bin2hex(random_bytes(20));
        $hashedKey = hash('sha256', $rawKey);

        $tenant->apiKeys()->create([
            'name' => $validated['name'],
            'key' => $hashedKey,
        ]);

        // Flash plain API key to session to display to user once
        return back()->with('plainApiKey', $rawKey)
            ->with('toast', ['type' => 'success', 'message' => __('API key generated successfully!')]);
    }

    /**
     * Revoke an API key.
     */
    public function destroyKey(Request $request, ApiKey $key): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $key->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $key->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('API key revoked successfully.')]);

        return to_route('client.developer.index');
    }

    /**
     * Store a new webhook endpoint.
     */
    public function storeWebhook(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'url', 'max:2000'],
        ]);

        $tenant = $request->user()->tenant;

        $tenant->outgoingWebhooks()->create([
            'url' => $validated['url'],
            'secret_token' => 'whsec_'.bin2hex(random_bytes(16)),
            'is_active' => true,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Webhook registered successfully!')]);

        return to_route('client.developer.index');
    }

    /**
     * Toggle active state of a webhook.
     */
    public function toggleWebhook(Request $request, OutgoingWebhook $webhook): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $webhook->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $webhook->update([
            'is_active' => ! $webhook->is_active,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Webhook status updated!')]);

        return to_route('client.developer.index');
    }

    /**
     * Delete a webhook.
     */
    public function destroyWebhook(Request $request, OutgoingWebhook $webhook): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $webhook->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $webhook->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Webhook deleted successfully.')]);

        return to_route('client.developer.index');
    }
}
