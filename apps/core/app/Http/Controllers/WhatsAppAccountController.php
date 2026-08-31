<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppAccountController extends Controller
{
    public function handleEmbeddedSignup(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $code = $request->input('code');

        try {
            // 1. Exchange temporary code for Access Token
            $tokenResponse = Http::post('https://graph.facebook.com/v20.0/oauth/access_token', [
                'client_id'     => config('services.whatsapp.app_id'),
                'client_secret' => config('services.whatsapp.app_secret'),
                'code'          => $code,
            ]);

            if ($tokenResponse->failed()) {
                Log::error('Meta Token Exchange Failed', $tokenResponse->json());
                return redirect()->back()->withErrors(['message' => 'Failed to exchange authorization code with Meta.']);
            }

            $accessToken = $tokenResponse->json()['access_token'];

            // 2. Debug Token to inspect target WABA ID
            $debugResponse = Http::get('https://graph.facebook.com/v20.0/debug_token', [
                'input_token'  => $accessToken,
                'access_token' => config('services.whatsapp.app_id') . '|' . config('services.whatsapp.app_secret'),
            ]);

            $debugData = $debugResponse->json()['data'] ?? [];
            $granularScopes = $debugData['granular_scopes'] ?? [];

            $wabaId = null;
            foreach ($granularScopes as $scope) {
                if (in_array($scope['scope'], ['whatsapp_business_management', 'whatsapp_business_messaging'])) {
                    $wabaId = $scope['target_ids'][0] ?? null;
                    break;
                }
            }

            // 3. Fetch Phone Numbers associated with the WABA ID
            $phoneNumbersResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/v20.0/{$wabaId}/phone_numbers");

            $phoneData = $phoneNumbersResponse->json()['data'][0] ?? null;
            $phoneNumberId = $phoneData['id'] ?? null;
            $displayPhoneNumber = $phoneData['display_phone_number'] ?? null;

            // 4. Save or Update the WhatsApp Account record in Database
            $user = auth()->user();
            
            \App\Models\WhatsAppAccount::updateOrCreate(
                ['waba_id' => $wabaId],
                [
                    'user_id'              => $user->id,
                    'phone_number_id'      => $phoneNumberId,
                    'display_phone_number' => $displayPhoneNumber,
                    'access_token'         => $accessToken,
                    'status'               => 'active',
                ]
            );

            return redirect()->back()->with('success', 'WhatsApp Business Account connected successfully!');

        } catch (\Exception $e) {
            Log::error('Embedded Signup Exception: ' . $e->getMessage());
            return redirect()->back()->withErrors(['message' => 'An error occurred during Embedded Signup.']);
        }
    }
}
