<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageCreatedEvent;
use App\Events\ThreadUpdatedEvent;
use App\Http\Controllers\Controller;
use App\Models\ChannelIdentity;
use App\Models\Message;
use App\Models\Thread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    /**
     * Helper to compute remaining Meta 24-hour customer messaging window.
     */
    public static function computeSessionWindow(Thread $thread): array
    {
        // 24-hour window starts from the customer's last inbound message
        $lastInbound = $thread->messages()
            ->where('direction', 'inbound')
            ->latest('created_at')
            ->first();

        $sessionRemaining = 0;
        $isSessionOpen = false;
        $sessionFormatted = 'Expired';
        $sessionCountdown = '00:00:00';

        if ($lastInbound && $lastInbound->created_at) {
            $diffSeconds = 86400 - (int) now()->diffInSeconds($lastInbound->created_at);
            if ($diffSeconds > 0) {
                $sessionRemaining = $diffSeconds;
                $isSessionOpen = true;
                $hours = floor($diffSeconds / 3600);
                $mins = floor(($diffSeconds % 3600) / 60);
                $secs = $diffSeconds % 60;
                $sessionFormatted = sprintf('%02dh %02dm', $hours, $mins);
                $sessionCountdown = sprintf('%02d:%02d:%02d', $hours, $mins, $secs);
            }
        } elseif ($thread->last_message_at) {
            // If no message tagged inbound yet, fallback to thread last_message_at
            $diffSeconds = 86400 - (int) now()->diffInSeconds($thread->last_message_at);
            if ($diffSeconds > 0) {
                $sessionRemaining = $diffSeconds;
                $isSessionOpen = true;
                $hours = floor($diffSeconds / 3600);
                $mins = floor(($diffSeconds % 3600) / 60);
                $secs = $diffSeconds % 60;
                $sessionFormatted = sprintf('%02dh %02dm', $hours, $mins);
                $sessionCountdown = sprintf('%02d:%02d:%02d', $hours, $mins, $secs);
            }
        }

        return [
            'session_remaining' => $sessionRemaining,
            'is_session_open' => $isSessionOpen,
            'session_formatted' => $sessionFormatted,
            'session_countdown' => $sessionCountdown,
        ];
    }

    /**
     * List all conversation threads with eager loaded contact, channel identity, latest message,
     * and computed Meta 24-hour messaging window.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Thread::with([
            'contact',
            'channelIdentity',
            'messages' => function ($q) {
                $q->latest('created_at')->limit(1);
            },
        ]);

        // Channel filter
        if ($request->filled('channel') && $request->channel !== 'all') {
            $query->where('channel_type', $request->channel);
        }

        // Status filter (open, unassigned, resolved)
        if ($request->filled('status')) {
            $status = $request->status;
            if ($status === 'unassigned') {
                $query->whereNull('assigned_user_id');
            } elseif ($status === 'resolved') {
                $query->where('status', 'resolved');
            } else {
                $query->where(function ($q) {
                    $q->where('status', 'open')->orWhereNull('status');
                });
            }
        }

        // Search query
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('contact', function ($cq) use ($search) {
                    $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('phone_number', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })->orWhereHas('messages', function ($mq) use ($search) {
                    $mq->where('content', 'like', "%{$search}%");
                });
            });
        }

        $paginated = $query->orderByDesc('last_message_at')
            ->paginate(30);

        $transformedItems = collect($paginated->items())->map(function (Thread $thread) {
            $contact = $thread->contact;
            $latestMsg = $thread->messages->first();
            $session = self::computeSessionWindow($thread);

            // Compute unread count (unread inbound messages)
            $unreadCount = $thread->messages()
                ->where('direction', 'inbound')
                ->where('status', '!=', 'read')
                ->count();

            return [
                'id' => (string) $thread->id,
                'channel_type' => $thread->channel_type ?? 'whatsapp',
                'status' => $thread->status ?? 'open',
                'bot_active' => (bool) $thread->bot_active,
                'last_message_at' => $thread->last_message_at?->toISOString() ?? $thread->created_at?->toISOString(),
                'last_message_preview' => $latestMsg?->content ?? 'Conversation started',
                'unread_count' => $unreadCount,
                'session_remaining' => $session['session_remaining'],
                'is_session_open' => $session['is_session_open'],
                'session_formatted' => $session['session_formatted'],
                'session_countdown' => $session['session_countdown'],
                'contact' => $contact ? [
                    'id' => (string) $contact->id,
                    'name' => $contact->name ?? $contact->full_name,
                    'full_name' => $contact->full_name,
                    'phone_number' => $contact->phone_number ?? $contact->phone,
                    'phone' => $contact->phone ?? $contact->phone_number,
                    'email' => $contact->email,
                    'company_name' => $contact->company_name,
                    'industry' => $contact->industry,
                    'lead_stage' => $contact->lead_stage ?? 'Enterprise Lead (High Priority)',
                    'internal_notes' => $contact->internal_notes,
                    'notes' => $contact->notes,
                    'updated_at' => $contact->updated_at?->toISOString(),
                ] : null,
                'channel_identity' => $thread->channelIdentity ? [
                    'id' => (string) $thread->channelIdentity->id,
                    'channel_type' => $thread->channelIdentity->channel_type,
                    'name' => $thread->channelIdentity->name,
                ] : null,
            ];
        });

        return response()->json([
            'data' => $transformedItems,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
            'open_count' => Thread::where(function ($q) {
                $q->where('status', 'open')->orWhereNull('status');
            })->count(),
        ]);
    }

    /**
     * Get thread details, chronological message history, and contact attributes.
     */
    public function showThread(string $id): JsonResponse
    {
        $thread = Thread::with(['contact', 'channelIdentity'])->findOrFail($id);
        $contact = $thread->contact;
        $session = self::computeSessionWindow($thread);

        $messages = Message::where('thread_id', $thread->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function (Message $m) {
                return [
                    'id' => (string) $m->id,
                    'thread_id' => (string) $m->thread_id,
                    'direction' => $m->direction,
                    'message_type' => $m->message_type ?? 'text',
                    'content' => $m->content ?? '',
                    'status' => $m->status ?? 'sent',
                    'is_ai_generated' => (bool) $m->is_ai_generated,
                    'ai_model' => $m->ai_model,
                    'created_at' => $m->created_at?->toISOString() ?? now()->toISOString(),
                    'formatted_time' => $m->created_at ? $m->created_at->format('g:i A') : now()->format('g:i A'),
                    'date_group' => $m->created_at && $m->created_at->isToday() ? 'TODAY' : ($m->created_at ? $m->created_at->format('M d, Y') : 'TODAY'),
                ];
            });

        return response()->json([
            'thread' => [
                'id' => (string) $thread->id,
                'channel_type' => $thread->channel_type ?? 'whatsapp',
                'status' => $thread->status ?? 'open',
                'bot_active' => (bool) $thread->bot_active,
                'last_message_at' => $thread->last_message_at?->toISOString() ?? $thread->created_at?->toISOString(),
                'session_remaining' => $session['session_remaining'],
                'is_session_open' => $session['is_session_open'],
                'session_formatted' => $session['session_formatted'],
                'session_countdown' => $session['session_countdown'],
            ],
            'contact' => $contact ? [
                'id' => (string) $contact->id,
                'name' => $contact->name ?? $contact->full_name,
                'full_name' => $contact->full_name,
                'phone_number' => $contact->phone_number ?? $contact->phone,
                'phone' => $contact->phone ?? $contact->phone_number,
                'email' => $contact->email,
                'company_name' => $contact->company_name,
                'industry' => $contact->industry,
                'lead_stage' => $contact->lead_stage ?? 'Enterprise Lead (High Priority)',
                'internal_notes' => $contact->internal_notes,
                'notes' => $contact->notes,
                'updated_at' => $contact->updated_at?->toISOString(),
            ] : null,
            'messages' => $messages,
        ]);
    }

    /**
     * Alias for messages listing.
     */
    public function messages(string $id): JsonResponse
    {
        return $this->showThread($id);
    }

    /**
     * Toggle AI Autonomy / Human Takeover on a thread.
     */
    public function toggleBot(string $id): JsonResponse
    {
        $thread = Thread::findOrFail($id);
        $thread->bot_active = ! $thread->bot_active;
        $thread->save();

        // Broadcast thread change to Reverb and CRM UI
        event(new ThreadUpdatedEvent($thread));

        return response()->json([
            'status' => 'success',
            'id' => (string) $thread->id,
            'bot_active' => (bool) $thread->bot_active,
            'message' => $thread->bot_active ? 'AI bot resumed.' : 'Human takeover active (AI paused).',
        ]);
    }

    /**
     * Send a manual outbound agent message (human takeover).
     */
    public function sendMessage(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'content' => 'required|string|max:4000',
            'media_url' => 'nullable|string',
        ]);

        $thread = Thread::with('contact')->findOrFail($id);
        $channel = ChannelIdentity::find($thread->channel_identity_id);

        $content = $request->input('content');
        $mediaUrl = $request->input('media_url');
        $senderId = $thread->contact?->phone_number ?? $thread->contact?->messenger_psid ?? $thread->contact?->instagram_igsid ?? $thread->contact?->phone;

        $externalMsgId = null;

        // 1. Dispatch outbound reply via Meta Graph API v21.0 if channel token exists
        if ($channel && $channel->access_token && $senderId && ! str_contains($channel->access_token, 'sandbox')) {
            try {
                $apiVersion = config('services.meta.api_version', 'v21.0');
                $url = $thread->channel_type === 'whatsapp'
                    ? "https://graph.facebook.com/{$apiVersion}/{$channel->external_id}/messages"
                    : "https://graph.facebook.com/{$apiVersion}/me/messages";

                $payload = $thread->channel_type === 'whatsapp'
                    ? [
                        'messaging_product' => 'whatsapp',
                        'recipient_type' => 'individual',
                        'to' => $senderId,
                        'type' => 'text',
                        'text' => ['body' => $content],
                    ]
                    : [
                        'recipient' => ['id' => $senderId],
                        'message' => ['text' => $content],
                    ];

                $response = Http::withToken($channel->access_token)
                    ->timeout(10)
                    ->post($url, $payload);

                if ($response->successful()) {
                    $externalMsgId = $response->json('messages.0.id') ?? $response->json('message_id');
                } else {
                    Log::warning('[ChatController] Meta Graph API error: ' . $response->body());
                }
            } catch (\Throwable $e) {
                Log::error('[ChatController] Failed to dispatch Meta Graph message: ' . $e->getMessage());
            }
        }

        // 2. Persist Message & update Thread state in PostgreSQL
        $message = DB::transaction(function () use ($thread, $request, $content, $mediaUrl, $externalMsgId) {
            $msg = Message::create([
                'thread_id' => $thread->id,
                'contact_id' => $thread->contact_id,
                'user_id' => (\Illuminate\Support\Str::isUuid($request->user()?->id ?? '') ? $request->user()?->id : null),
                'direction' => 'outbound',
                'channel_type' => $thread->channel_type ?? 'whatsapp',
                'external_message_id' => $externalMsgId,
                'message_type' => 'text',
                'content' => $content,
                'media_url' => $mediaUrl,
                'status' => 'sent',
                'is_ai_generated' => false,
                'ai_model' => 'human_agent',
            ]);

            // Human manual reply sets bot_active = false (Human Takeover)
            $thread->update([
                'bot_active' => false,
                'last_message_at' => now(),
            ]);

            return $msg;
        });

        // 3. Broadcast real-time WebSocket events to Reverb
        event(new MessageCreatedEvent($message));
        event(new ThreadUpdatedEvent($thread));

        return response()->json([
            'status' => 'sent',
            'message' => [
                'id' => (string) $message->id,
                'thread_id' => (string) $message->thread_id,
                'direction' => 'outbound',
                'message_type' => 'text',
                'content' => $message->content,
                'status' => 'sent',
                'is_ai_generated' => false,
                'created_at' => $message->created_at->toISOString(),
                'formatted_time' => $message->created_at->format('g:i A'),
                'date_group' => 'TODAY',
            ],
            'thread' => [
                'id' => (string) $thread->id,
                'bot_active' => (bool) $thread->bot_active,
                'last_message_at' => $thread->last_message_at->toISOString(),
            ],
        ], 201);
    }
}
