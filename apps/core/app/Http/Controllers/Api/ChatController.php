<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageCreatedEvent;
use App\Events\ThreadUpdatedEvent;
use App\Http\Controllers\Controller;
use App\Models\ChannelIdentity;
use App\Models\Message;
use App\Models\MessageTemplate;
use App\Models\Thread;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ChatController extends Controller
{
    /**
     * The authenticated user's tenant; every thread lookup below is confined to it.
     */
    protected function tenantId(Request $request): string
    {
        $tenantId = $request->user()?->tenant_id;

        abort_if($tenantId === null, 403, 'Your account is not attached to a workspace.');

        return (string) $tenantId;
    }

    /**
     * Load a thread that belongs to the caller's tenant, or 404. A thread of
     * another tenant is indistinguishable from one that does not exist.
     *
     * @param  array<int, string>  $with
     */
    protected function tenantThread(Request $request, string $id, array $with = []): Thread
    {
        abort_unless(Str::isUuid($id), 404);

        return Thread::forTenant($this->tenantId($request))->with($with)->findOrFail($id);
    }

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
        $query = Thread::forTenant($this->tenantId($request))->with([
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
            'open_count' => Thread::forTenant($this->tenantId($request))->where(function ($q) {
                $q->where('status', 'open')->orWhereNull('status');
            })->count(),
        ]);
    }

    /**
     * Get thread details, chronological message history, and contact attributes.
     */
    public function showThread(Request $request, string $id): JsonResponse
    {
        $thread = $this->tenantThread($request, $id, ['contact', 'channelIdentity']);
        $contact = $thread->contact;
        $session = self::computeSessionWindow($thread);

        $messages = Message::where('thread_id', $thread->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function (Message $m) {
                $rawPayload = $m->raw_payload;
                $whisperTranscript = is_array($rawPayload)
                    ? ($rawPayload['transcript'] ?? $rawPayload['whisper_transcript'] ?? null)
                    : null;
                if (! $whisperTranscript && in_array($m->message_type, ['audio', 'voice'])) {
                    $whisperTranscript = $m->content;
                }

                $telemetry = is_array($rawPayload) ? ($rawPayload['telemetry'] ?? null) : null;
                $citedChunk = is_array($telemetry) ? ($telemetry['cited_chunk'] ?? null) : null;

                return [
                    'id' => (string) $m->id,
                    'thread_id' => (string) $m->thread_id,
                    'direction' => $m->direction,
                    'message_type' => $m->message_type ?? 'text',
                    'content' => $m->content ?? '',
                    'media_url' => $m->media_url,
                    'media_mime_type' => $m->media_mime_type,
                    'whisper_transcript' => $whisperTranscript,
                    'status' => $m->status ?? 'sent',
                    'is_ai_generated' => (bool) $m->is_ai_generated,
                    'ai_model' => $m->ai_model,
                    'detected_intent' => $m->detected_intent,
                    'latency_ms' => $m->latency_ms,
                    'confidence_score' => $m->confidence_score,
                    'telemetry' => $telemetry,
                    'rag_chunk' => $citedChunk,
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
    public function messages(Request $request, string $id): JsonResponse
    {
        return $this->showThread($request, $id);
    }

    /**
     * Send a manual outbound agent message (human takeover).
     */
    public function sendMessage(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'content' => 'required_without_all:template_id,template_name|nullable|string|max:4000',
            'template_id' => 'nullable|string',
            'template_name' => 'nullable|string',
            'variables' => 'nullable|array',
            'media_url' => 'nullable|string',
        ]);

        $tenantId = $this->tenantId($request);
        $thread = $this->tenantThread($request, $id, ['contact', 'channelIdentity']);
        $channel = $thread->channelIdentity ?? ChannelIdentity::forTenant($tenantId)->find($thread->channel_identity_id);

        $contact = $thread->contact;
        $lastInboundAt = $contact?->last_inbound_at;

        if (! $lastInboundAt) {
            $lastInboundMsg = $thread->messages()
                ->where('direction', 'inbound')
                ->latest('created_at')
                ->first();
            $lastInboundAt = $lastInboundMsg?->created_at;
        }

        $hoursDiff = $lastInboundAt ? abs(Carbon::now()->diffInHours($lastInboundAt)) : 999;
        $isWindowExpired = (! $lastInboundAt || $hoursDiff >= 24);

        $templateId = $request->input('template_id');
        $templateName = $request->input('template_name');
        $isTemplatePayload = ! empty($templateId) || ! empty($templateName);
        $isNote = $request->input('type') === 'note'
            || $request->input('message_type') === 'note'
            || $request->boolean('is_note');

        // Enforce Meta 24-Hour Messaging Window (Error 131047) - Not applicable to internal staff notes
        if (! $isNote && $isWindowExpired && ! $isTemplatePayload) {
            throw ValidationException::withMessages([
                'content' => ['The 24-hour Meta messaging window has expired (Error 131047). You must submit a registered Meta Template ID to initiate contact.'],
                'template_id' => ['A registered Meta Template ID is required when outside the 24-hour window.'],
            ]);
        }

        $content = $request->input('content');
        $mediaUrl = $request->input('media_url');
        $senderId = $thread->contact?->phone_number ?? $thread->contact?->messenger_psid ?? $thread->contact?->instagram_igsid ?? $thread->contact?->phone;

        // Resolve template if template payload
        $template = null;
        if ($isTemplatePayload) {
            $tenantTemplates = MessageTemplate::where('tenant_id', $tenantId);
            if ($templateId) {
                $template = (clone $tenantTemplates)->find($templateId);
            }
            if (! $template && $templateName) {
                $template = (clone $tenantTemplates)->where('name', $templateName)->first();
            }

            if ($template && empty($content)) {
                $content = $template->formatBodyText($request->input('variables', []));
                if (empty($content)) {
                    $content = "Template: {$template->name}";
                }
            }
        }

        $externalMsgId = null;

        // 1. Dispatch outbound reply via Meta Graph API v21.0 if channel token exists (Strictly skipped for internal notes)
        if (! $isNote && $channel && $channel->access_token && $senderId && ! str_contains($channel->access_token, 'sandbox')) {
            try {
                $apiVersion = config('services.meta.api_version', 'v21.0');
                $url = $thread->channel_type === 'whatsapp'
                    ? "https://graph.facebook.com/{$apiVersion}/{$channel->external_id}/messages"
                    : "https://graph.facebook.com/{$apiVersion}/me/messages";

                if ($isTemplatePayload && $template && $thread->channel_type === 'whatsapp') {
                    $templateComponents = [];
                    $templateVars = $request->input('variables', []);
                    if (! empty($templateVars) && method_exists($template, 'getTemplateComponents')) {
                        $templateComponents = $template->getTemplateComponents($templateVars);
                    }
                    $payload = [
                        'messaging_product' => 'whatsapp',
                        'recipient_type' => 'individual',
                        'to' => $senderId,
                        'type' => 'template',
                        'template' => [
                            'name' => $template->name,
                            'language' => ['code' => $template->language ?? 'en'],
                            'components' => $templateComponents,
                        ],
                    ];
                } else {
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
                }

                $response = Http::withToken($channel->access_token)
                    ->timeout(10)
                    ->post($url, $payload);

                if ($response->successful()) {
                    $externalMsgId = $response->json('messages.0.id') ?? $response->json('message_id');
                } else {
                    Log::warning('[ChatController] Meta Graph API error: '.$response->body());
                }
            } catch (\Throwable $e) {
                Log::error('[ChatController] Failed to dispatch Meta Graph message: '.$e->getMessage());
            }
        }

        // 2. Persist Message & update Thread state in PostgreSQL
        $messageType = $isNote ? 'note' : ($isTemplatePayload ? 'template' : 'text');
        $initialStatus = $isNote ? 'delivered' : 'sent';
        $aiModel = $isNote ? 'staff_note' : 'human_agent';

        $message = DB::transaction(function () use ($thread, $request, $content, $mediaUrl, $externalMsgId, $messageType, $initialStatus, $aiModel, $isNote) {
            $msg = Message::create([
                'thread_id' => $thread->id,
                'contact_id' => $thread->contact_id,
                'user_id' => (Str::isUuid($request->user()?->id ?? '') ? $request->user()?->id : null),
                'direction' => 'outbound',
                'channel_type' => $thread->channel_type ?? 'whatsapp',
                'external_message_id' => $externalMsgId,
                'message_type' => $messageType,
                'content' => $content,
                'media_url' => $mediaUrl,
                'status' => $initialStatus,
                'is_ai_generated' => false,
                'ai_model' => $aiModel,
            ]);

            // Human manual reply sets bot_active = false (Human Takeover)
            if (! $isNote) {
                $thread->update([
                    'bot_active' => false,
                    'status' => 'human_takeover',
                    'last_message_at' => now(),
                ]);
            }

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
                'message_type' => $message->message_type,
                'content' => $message->content,
                'media_url' => $message->media_url,
                'media_mime_type' => $message->media_mime_type,
                'whisper_transcript' => null,
                'status' => $message->status,
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

    /**
     * Toggle bot active state (human takeover vs autonomous AI).
     */
    public function toggleBot(Request $request, string $id): JsonResponse
    {
        $thread = $this->tenantThread($request, $id);

        $botActive = $request->has('bot_active')
            ? (bool) $request->input('bot_active')
            : ! $thread->bot_active;

        $newStatus = $botActive ? 'open' : 'human_takeover';

        $thread->update([
            'bot_active' => $botActive,
            'status' => $newStatus,
        ]);

        event(new ThreadUpdatedEvent($thread));

        try {
            Redis::publish(
                config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                json_encode([
                    'event' => 'ThreadUpdated',
                    'thread_id' => (string) $thread->id,
                    'bot_active' => $botActive,
                    'status' => $newStatus,
                ])
            );
        } catch (\Throwable $e) {
            Log::warning('[ChatController] Redis broadcast skipped: '.$e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'thread_id' => (string) $thread->id,
            'bot_active' => $botActive,
            'thread_status' => $newStatus,
        ]);
    }
}
