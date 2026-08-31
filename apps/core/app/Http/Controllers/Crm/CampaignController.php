<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchOutboundBroadcastJob;
use App\Models\ChannelIdentity;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CampaignController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('client/campaigns/index');
    }

    public function dispatchBroadcast(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel_identity_id' => 'required|uuid',
            'contact_ids' => 'required|array|min:1',
            'message_content' => 'required|string',
            'template_name' => 'nullable|string',
        ]);

        $channel = ChannelIdentity::findOrFail($validated['channel_identity_id']);
        $contacts = Contact::whereIn('id', $validated['contact_ids'])->get();

        foreach ($contacts as $contact) {
            DispatchOutboundBroadcastJob::dispatch(
                channelIdentityId: (string) $channel->id,
                contactId: (string) $contact->id,
                messageContent: $validated['message_content'],
                templateName: $validated['template_name'] ?? null
            );
        }

        return response()->json([
            'status' => 'queued',
            'queued_recipients' => $contacts->count(),
        ]);
    }
}
