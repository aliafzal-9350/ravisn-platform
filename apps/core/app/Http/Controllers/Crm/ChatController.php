<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Thread;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function __construct(
        protected MetaGraphClient $metaClient
    ) {}

    /**
     * Display CRM Omni-Channel Inbox.
     */
    public function index(Request $request): Response
    {
        $threads = Thread::with(['contact', 'channelIdentity'])
            ->orderBy('last_message_at', 'desc')
            ->paginate(30);

        return Inertia::render('client/inbox/index', [
            'threads' => $threads,
        ]);
    }

    /**
     * Retrieve messages for a given conversation thread.
     */
    public function messages(string $threadId): JsonResponse
    {
        $thread = Thread::with(['contact', 'channelIdentity'])->findOrFail($threadId);
        $messages = Message::where('thread_id', $threadId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'thread' => $thread,
            'messages' => $messages,
        ]);
    }

    /**
     * Send outbound message from Human CRM Agent.
     */
    public function sendMessage(Request $request, string $threadId): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $thread = Thread::with(['contact', 'channelIdentity'])->findOrFail($threadId);
        $channel = $thread->channelIdentity;
        $contact = $thread->contact;

        $recipientPhone = $contact->phone_number ?: $contact->phone;
        $externalId = null;

        if ($thread->channel_type === 'whatsapp' && $recipientPhone && $channel) {
            $resp = $this->metaClient->sendWhatsAppMessage(
                phoneNumberId: $channel->external_id,
                toPhone: $recipientPhone,
                text: $validated['content'],
                accessToken: $channel->access_token
            );
            $externalId = $resp['messages'][0]['id'] ?? null;
        }

        $message = Message::create([
            'thread_id' => $thread->id,
            'contact_id' => $contact->id,
            'user_id' => $request->user()?->id,
            'direction' => 'outbound',
            'channel_type' => $thread->channel_type,
            'external_message_id' => $externalId,
            'message_type' => 'text',
            'content' => $validated['content'],
            'status' => $externalId ? 'sent' : 'delivered',
            'is_ai_generated' => false,
        ]);

        $thread->update(['last_message_at' => now()]);

        // Publish to Redis Pub/Sub for instant UI refresh
        try {
            Redis::publish('crm_channel_updates', json_encode([
                'event' => 'MessageCreated',
                'thread_id' => (string) $thread->id,
                'message_id' => (string) $message->id,
                'direction' => 'outbound',
                'content' => $message->content,
            ]));
        } catch (\Throwable $e) {
            // Redis broadcast fallback
        }

        return response()->json($message, 201);
    }

    /**
     * Toggle Human Takeover / Bot Active state.
     */
    public function toggleTakeover(Request $request, string $threadId): JsonResponse
    {
        $thread = Thread::findOrFail($threadId);
        $newBotState = ! $thread->bot_active;

        $thread->update([
            'bot_active' => $newBotState,
            'status' => $newBotState ? 'open' : 'human_takeover',
        ]);

        try {
            Redis::publish('crm_channel_updates', json_encode([
                'event' => 'ThreadStatusChanged',
                'thread_id' => (string) $thread->id,
                'bot_active' => $newBotState,
                'status' => $thread->status,
            ]));
        } catch (\Throwable $e) {
            // Redis broadcast fallback
        }

        return response()->json([
            'status' => 'success',
            'thread_id' => $thread->id,
            'bot_active' => $thread->bot_active,
            'thread_status' => $thread->status,
        ]);
    }
}
