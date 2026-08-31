<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\WhatsappAccount;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappAccountController extends Controller
{
    /**
     * Display a listing of WhatsApp accounts.
     */
    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        $accounts = $tenant->whatsappAccounts()
            ->latest()
            ->get()
            ->map(fn (WhatsappAccount $account): array => [
                'id' => (string) $account->id,
                'phone_number' => $account->phone_number,
                'display_name' => $account->display_name,
                'status' => $account->status,
                'quality_rating' => $account->quality_rating,
                'messaging_limit_tier' => $account->messaging_limit_tier ?? 'TIER_250',
                'phone_number_id' => $account->phone_number_id,
                'waba_id' => $account->waba_id,
                'app_id' => $account->app_id,
                'app_secret' => $account->app_secret,
                'access_token' => $account->access_token,
                'verified_at' => $account->verified_at?->format('Y-m-d H:i'),
                'created_at' => $account->created_at->format('Y-m-d'),
            ]);

        return Inertia::render('client/whatsapp-accounts/index', [
            'accounts' => $accounts,
            'webhook_url' => $tenant->webhook_token ? url("webhook/whatsapp/{$tenant->webhook_token}") : url('webhook/whatsapp'),
        ]);
    }

    public function create(): RedirectResponse
    {
        return to_route('client.whatsapp-accounts.index');
    }

    /**
     * Store a new WhatsApp account and request verification code.
     */
    public function requestCode(Request $request, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $validated = $request->validate([
            'phone_number_id' => ['required', 'string', 'max:255'],
            'waba_id' => ['required', 'string', 'max:255'],
            'access_token' => ['nullable', 'string'],
            'app_id' => ['nullable', 'string', 'max:255'],
            'app_secret' => ['nullable', 'string', 'max:255'],
        ]);

        $tenant = $request->user()->tenant;

        if (! empty($validated['access_token'])) {
            $whatsAppApi->withToken($validated['access_token']);
        }

        $phoneNumber = null;
        $displayName = null;
        $wabaId = null;
        $qualityRating = 'GREEN';
        $messagingLimitTier = 'TIER_250';

        try {
            $data = $whatsAppApi->getPhoneNumberDetails($validated['phone_number_id']);

            if (! empty($data)) {
                $phoneNumber = $data['display_phone_number'] ?? null;
                if ($phoneNumber && ! str_starts_with($phoneNumber, '+')) {
                    $phoneNumber = '+'.preg_replace('/[^0-9]/', '', $phoneNumber);
                }
                $displayName = $data['verified_name'] ?? null;
                $qualityRating = $data['quality_rating'] ?? 'GREEN';
                $messagingLimitTier = $data['messaging_limit_tier'] ?? 'TIER_250';
            }

            // Find WABA ID automatically
            if (! empty($validated['access_token'])) {
                $wabaResponse = Http::withToken($validated['access_token'])
                    ->get('https://graph.facebook.com/v21.0/me/client_whatsapp_business_accounts');

                $wabaAccounts = $wabaResponse->json('data', []);
                if (empty($wabaAccounts)) {
                    $wabaResponse = Http::withToken($validated['access_token'])
                        ->get('https://graph.facebook.com/v21.0/me/accounts');
                    $wabaAccounts = $wabaResponse->json('data', []);
                }

                foreach ($wabaAccounts as $waba) {
                    $possibleWabaId = $waba['id'] ?? null;
                    if ($possibleWabaId) {
                        try {
                            $numbers = $whatsAppApi->getPhoneNumbers($possibleWabaId);
                            foreach ($numbers as $num) {
                                if (($num['id'] ?? '') === $validated['phone_number_id']) {
                                    $wabaId = $possibleWabaId;
                                    break 2;
                                }
                            }
                        } catch (\Exception $ex) {
                            // Skip if this WABA is not accessible
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning('Failed to fetch details from Meta API: '.$e->getMessage());
        }

        $account = $tenant->whatsappAccounts()->create([
            'phone_number' => $phoneNumber,
            'phone_number_id' => $validated['phone_number_id'],
            'waba_id' => $validated['waba_id'],
            'display_name' => $displayName,
            'access_token' => $validated['access_token'] ?? null,
            'app_id' => $validated['app_id'] ?? null,
            'app_secret' => $validated['app_secret'] ?? null,
            'quality_rating' => $qualityRating,
            'messaging_limit_tier' => $messagingLimitTier,
            'status' => 'active',
            'verified_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('WhatsApp number linked and activated successfully!')]);

        return to_route('client.whatsapp-accounts.index');
    }

    /**
     * Verify a WhatsApp account with the received code.
     */
    public function verify(Request $request, WhatsappAccount $account, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $tenant = $request->user()->tenant;

        // Ensure the account belongs to the tenant
        if ((string) $account->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        try {
            if ($account->access_token) {
                $whatsAppApi->withToken($account->access_token);
            }

            $whatsAppApi->verifyCode($account->phone_number_id, $validated['code']);

            // Register the phone number
            $whatsAppApi->registerPhoneNumber($account->phone_number_id, '000000');

            $account->update([
                'status' => 'active',
                'verified_at' => now(),
                'verification_code' => null,
            ]);

            Inertia::flash('toast', ['type' => 'success', 'message' => __('Phone number verified and activated successfully!')]);
        } catch (\Exception $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Verification failed: ').$e->getMessage()]);
        }

        return to_route('client.whatsapp-accounts.index');
    }

    /**
     * Sync WhatsApp accounts from Meta for a given WABA ID.
     */
    public function sync(Request $request, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $validated = $request->validate([
            'waba_id' => ['required', 'string', 'max:255'],
        ]);

        $tenant = $request->user()->tenant;
        $wabaId = $validated['waba_id'];

        try {
            $numbers = $whatsAppApi->getPhoneNumbers($wabaId);

            if (empty($numbers)) {
                Inertia::flash('toast', ['type' => 'warning', 'message' => __('No phone numbers found or access denied for this WABA ID.')]);

                return to_route('client.whatsapp-accounts.index');
            }

            $syncedCount = 0;

            foreach ($numbers as $num) {
                $phoneNumberId = $num['id'] ?? null;
                if (! $phoneNumberId) {
                    continue;
                }

                $rawPhone = $num['display_phone_number'] ?? '';
                // Ensure phone number starts with +
                $formattedPhone = $rawPhone;
                if ($rawPhone && ! str_starts_with($rawPhone, '+')) {
                    $formattedPhone = '+'.preg_replace('/[^0-9]/', '', $rawPhone);
                }

                $metaStatus = strtoupper($num['status'] ?? '');
                $localStatus = 'pending';
                if (in_array($metaStatus, ['CONNECTED', 'VERIFIED', 'APPROVED'])) {
                    $localStatus = 'active';
                } elseif (in_array($metaStatus, ['BANNED', 'BLOCKED'])) {
                    $localStatus = 'banned';
                }

                $tenant->whatsappAccounts()->updateOrCreate(
                    [
                        'waba_id' => $wabaId,
                        'phone_number_id' => $phoneNumberId,
                    ],
                    [
                        'phone_number' => $formattedPhone,
                        'display_name' => $num['verified_name'] ?? ($num['friendly_name'] ?? null),
                        'status' => $localStatus,
                        'quality_rating' => $num['quality_rating'] ?? 'GREEN',
                        'messaging_limit_tier' => $num['messaging_limit_tier'] ?? 'TIER_250',
                        'verified_at' => $localStatus === 'active' ? now() : null,
                    ]
                );

                $syncedCount++;
            }

            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __(':count phone numbers synced successfully from Meta!', ['count' => $syncedCount]),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to sync WABA phone numbers', [
                'waba_id' => $wabaId,
                'exception' => $e->getMessage(),
            ]);
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Failed to sync from Meta: ').$e->getMessage()]);
        }

        return to_route('client.whatsapp-accounts.index');
    }

    /**
     * Handle Facebook Login Embedded Signup access token.
     */
    public function embeddedSignup(Request $request, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $validated = $request->validate([
            'access_token' => ['nullable', 'string'],
            'code' => ['nullable', 'string'],
        ]);

        $accessToken = $request->access_token;
        $tenant = $request->user()->tenant;

        try {
            if ($request->code) {
                // Exchange authorization code for access token
                $graphVersion = config('whatsapp.api_version', 'v21.0');
                $clientId = config('whatsapp.app_id', config('services.whatsapp.app_id'));
                $clientSecret = config('whatsapp.app_secret', config('services.whatsapp.app_secret'));
                // Allow a configurable redirect URI for embedded signup (recommended)
                $redirectUri = config('whatsapp.embedded_redirect_uri', env('WHATSAPP_EMBEDDED_REDIRECT_URI', ''));

                $exchangeResponse = Http::post("https://graph.facebook.com/{$graphVersion}/oauth/access_token", [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'grant_type' => 'authorization_code',
                    'code' => $request->code,
                    'redirect_uri' => $redirectUri, // use configured redirect URI
                ]);

                if ($exchangeResponse->failed()) {
                    Log::error('Facebook OAuth Code Exchange failed', [
                        'response' => $exchangeResponse->json(),
                        'status' => $exchangeResponse->status(),
                    ]);
                    throw new \Exception('Failed to exchange authorization code: '.($exchangeResponse->json('error.message') ?? 'Unknown error'));
                }

                $accessToken = $exchangeResponse->json('access_token');
            }

            if (! $accessToken) {
                throw new \Exception('Access token or authorization code is required.');
            }

            // Configure API client to use the user's specific token
            $whatsAppApi->withToken($accessToken);

            // Fetch WABA accounts using the access token
            $apiVersion = config('whatsapp.api_version', 'v21.0');
            $response = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/{$apiVersion}/me/client_whatsapp_business_accounts");

            $wabaAccounts = $response->json('data', []);

            if (empty($wabaAccounts)) {
                // Fallback: check personal page WABA accounts
                $wabaResponse = Http::withToken($accessToken)
                    ->get("https://graph.facebook.com/{$apiVersion}/me/accounts");
                $wabaAccounts = $wabaResponse->json('data', []);
            }

            $syncedCount = 0;

            foreach ($wabaAccounts as $waba) {
                $wabaId = $waba['id'] ?? null;
                if (! $wabaId) {
                    continue;
                }

                // Get phone numbers for this WABA
                $numbers = $whatsAppApi->getPhoneNumbers($wabaId);

                foreach ($numbers as $num) {
                    $phoneNumberId = $num['id'] ?? null;
                    if (! $phoneNumberId) {
                        continue;
                    }

                    $rawPhone = $num['display_phone_number'] ?? '';
                    $formattedPhone = $rawPhone;
                    if ($rawPhone && ! str_starts_with($rawPhone, '+')) {
                        $formattedPhone = '+'.preg_replace('/[^0-9]/', '', $rawPhone);
                    }

                    $metaStatus = strtoupper($num['status'] ?? '');
                    $localStatus = 'pending';
                    if (in_array($metaStatus, ['CONNECTED', 'VERIFIED', 'APPROVED'])) {
                        $localStatus = 'active';
                    } elseif (in_array($metaStatus, ['BANNED', 'BLOCKED'])) {
                        $localStatus = 'banned';
                    }

                    $tenant->whatsappAccounts()->updateOrCreate(
                        [
                            'waba_id' => $wabaId,
                            'phone_number_id' => $phoneNumberId,
                        ],
                        [
                            'phone_number' => $formattedPhone,
                            'display_name' => $num['verified_name'] ?? ($num['friendly_name'] ?? 'WhatsApp Number'),
                            'status' => $localStatus,
                            'quality_rating' => $num['quality_rating'] ?? 'GREEN',
                            'messaging_limit_tier' => $num['messaging_limit_tier'] ?? 'TIER_250',
                            'verified_at' => $localStatus === 'active' ? now() : null,
                            'access_token' => $accessToken,
                        ]
                    );

                    $syncedCount++;
                }
            }

            if ($syncedCount > 0) {
                Inertia::flash('toast', [
                    'type' => 'success',
                    'message' => __(':count phone numbers synced successfully via Facebook Login!', ['count' => $syncedCount]),
                ]);
            } else {
                Inertia::flash('toast', [
                    'type' => 'warning',
                    'message' => __('No WhatsApp accounts or numbers found in your Facebook profile.'),
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Facebook Embedded Signup failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Facebook authentication failed: ').$e->getMessage()]);
        }

        return to_route('client.whatsapp-accounts.index');
    }

    /**
     * Update the credentials/details of a WhatsApp account.
     */
    public function update(Request $request, WhatsappAccount $account, WhatsAppCloudApi $whatsAppApi): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $account->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $validated = $request->validate([
            'phone_number_id' => ['required', 'string', 'max:255'],
            'waba_id' => ['required', 'string', 'max:255'],
            'access_token' => ['nullable', 'string'],
            'app_id' => ['nullable', 'string', 'max:255'],
            'app_secret' => ['nullable', 'string', 'max:255'],
        ]);

        if (! empty($validated['access_token'])) {
            $whatsAppApi->withToken($validated['access_token']);
        }

        $phoneNumber = $account->phone_number;
        $displayName = $account->display_name;
        $qualityRating = $account->quality_rating;
        $messagingLimitTier = $account->messaging_limit_tier ?? 'TIER_250';

        try {
            $data = $whatsAppApi->getPhoneNumberDetails($validated['phone_number_id']);

            if (! empty($data)) {
                $phoneNumber = $data['display_phone_number'] ?? $phoneNumber;
                if ($phoneNumber && ! str_starts_with($phoneNumber, '+')) {
                    $phoneNumber = '+'.preg_replace('/[^0-9]/', '', $phoneNumber);
                }
                $displayName = $data['verified_name'] ?? $displayName;
                $qualityRating = $data['quality_rating'] ?? $qualityRating;
                $messagingLimitTier = $data['messaging_limit_tier'] ?? $messagingLimitTier;
            }
        } catch (\Exception $e) {
            Log::warning('Failed to fetch details from Meta API during update: '.$e->getMessage());
        }

        $account->update([
            'phone_number' => $phoneNumber,
            'phone_number_id' => $validated['phone_number_id'],
            'waba_id' => $validated['waba_id'],
            'display_name' => $displayName,
            'access_token' => $validated['access_token'] ?? $account->access_token,
            'app_id' => $validated['app_id'] ?? $account->app_id,
            'app_secret' => $validated['app_secret'] ?? $account->app_secret,
            'quality_rating' => $qualityRating,
            'messaging_limit_tier' => $messagingLimitTier,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('WhatsApp number updated successfully!')]);

        return to_route('client.whatsapp-accounts.index');
    }

    /**
     * Delete a WhatsApp account.
     */
    public function destroy(Request $request, WhatsappAccount $account): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if ((string) $account->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $account->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('WhatsApp number deleted successfully.')]);

        return to_route('client.whatsapp-accounts.index');
    }
}
