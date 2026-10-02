<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Api\ChatController as ApiChatController;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Message;
use App\Models\MessageTemplate;
use App\Models\Thread;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use App\Models\WhatsappMessage;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class InboxController extends Controller
{
    /**
     * Legacy WhatsappChat lookup, confined to the caller's tenant.
     */
    protected function tenantChat(Request $request, string $chatId): ?WhatsappChat
    {
        $tenantId = $request->user()?->tenant_id;

        if ($tenantId === null) {
            return null;
        }

        return WhatsappChat::where('tenant_id', (string) $tenantId)->find($chatId);
    }

    /**
     * Display the omnichannel inbox (React 19 + Inertia).
     */
    public function index(Request $request): Response|JsonResponse
    {
        $apiChatController = new ApiChatController();

        // If client specifically requests JSON (e.g. API caller), return JSON
        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return $apiChatController->index($request);
        }

        $tenant = $request->user()?->tenant;
        $tenantId = $request->user()?->tenant_id;

        // Fetch threads eager-loading contact, channelIdentity, and latest message
        $threadsQuery = Thread::forTenant($tenantId)->with([
            'contact',
            'channelIdentity',
            'messages' => function ($q) {
                $q->latest('created_at')->limit(1);
            },
        ])->orderByDesc('last_message_at');

        $threadsCollection = $threadsQuery->get()->map(function (Thread $thread) {
            $contact = $thread->contact;
            $latestMsg = $thread->messages->first();
            $session = ApiChatController::computeSessionWindow($thread);

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

        $selectedThreadId = $request->query('thread_id');
        if (empty($selectedThreadId) && $threadsCollection->isNotEmpty()) {
            $selectedThreadId = (string) $threadsCollection->first()['id'];
        }

        // Fetch initial active thread messages if thread exists
        $initialThreadData = null;
        if ($selectedThreadId) {
            $initialThread = Str::isUuid((string) $selectedThreadId)
                ? Thread::forTenant($tenantId)->with(['contact', 'channelIdentity'])->find($selectedThreadId)
                : null;
            if ($initialThread) {
                $session = ApiChatController::computeSessionWindow($initialThread);
                $messages = Message::where('thread_id', $initialThread->id)
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
                            'created_at' => $m->created_at?->toISOString() ?? now()->toISOString(),
                            'formatted_time' => $m->created_at ? $m->created_at->format('g:i A') : now()->format('g:i A'),
                            'date_group' => $m->created_at && $m->created_at->isToday() ? 'TODAY' : ($m->created_at ? $m->created_at->format('M d, Y') : 'TODAY'),
                        ];
                    });

                $c = $initialThread->contact;
                $initialThreadData = [
                    'thread' => [
                        'id' => (string) $initialThread->id,
                        'channel_type' => $initialThread->channel_type ?? 'whatsapp',
                        'status' => $initialThread->status ?? 'open',
                        'bot_active' => (bool) $initialThread->bot_active,
                        'last_message_at' => $initialThread->last_message_at?->toISOString() ?? $initialThread->created_at?->toISOString(),
                        'session_remaining' => $session['session_remaining'],
                        'is_session_open' => $session['is_session_open'],
                        'session_formatted' => $session['session_formatted'],
                        'session_countdown' => $session['session_countdown'],
                    ],
                    'contact' => $c ? [
                        'id' => (string) $c->id,
                        'name' => $c->name ?? $c->full_name,
                        'full_name' => $c->full_name,
                        'phone_number' => $c->phone_number ?? $c->phone,
                        'phone' => $c->phone ?? $c->phone_number,
                        'email' => $c->email,
                        'company_name' => $c->company_name,
                        'industry' => $c->industry,
                        'lead_stage' => $c->lead_stage ?? 'Enterprise Lead (High Priority)',
                        'internal_notes' => $c->internal_notes,
                        'notes' => $c->notes,
                        'updated_at' => $c->updated_at?->toISOString(),
                    ] : null,
                    'messages' => $messages,
                ];
            }
        }

        // Available WhatsApp Accounts
        $accounts = $tenant ? $tenant->whatsappAccounts()
            ->whereIn('status', ['active', 'ACTIVE'])
            ->get()
            ->map(fn ($acc) => [
                'id' => (string) $acc->id,
                'phone_number' => $acc->phone_number,
                'display_name' => $acc->display_name,
                'channel_type' => 'whatsapp',
            ]) : collect();

        // Templates
        $templates = $tenant ? $tenant->messageTemplates()
            ->whereIn('status', ['approved', 'APPROVED'])
            ->get()
            ->map(fn ($template) => [
                'id' => (string) $template->id,
                'name' => $template->name,
                'language' => $template->language,
                'category' => $template->category,
                'status' => strtoupper($template->status),
                'components' => $template->components,
            ]) : collect();

        return Inertia::render('Chat/Inbox', [
            'threads' => $threadsCollection,
            'initialThreadId' => $selectedThreadId,
            'initialThread' => $initialThreadData,
            'accounts' => $accounts,
            'templates' => $templates,
            'openCount' => Thread::forTenant($tenantId)->where(function ($q) {
                $q->where('status', 'open')->orWhereNull('status');
            })->count(),
        ]);
    }

    /**
     * Get messages for a specific chat or thread.
     */
    public function messages(Request $request, string $chatId): JsonResponse
    {
        $tenantId = $request->user()?->tenant_id;
        $thread = Str::isUuid($chatId) ? Thread::forTenant($tenantId)->find($chatId) : null;
        if ($thread) {
            $apiChatController = new ApiChatController();
            return $apiChatController->showThread($request, $chatId);
        }

        // Check fallback WhatsappChat
        $waChat = $this->tenantChat($request, $chatId);
        if ($waChat) {
            $messages = $waChat->messages()
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(fn ($m) => [
                    'id' => (string) $m->id,
                    'thread_id' => (string) $chatId,
                    'direction' => $m->direction,
                    'message_type' => $m->message_type ?? 'text',
                    'content' => $m->body ?? $m->content ?? '',
                    'status' => $m->status ?? 'delivered',
                    'is_ai_generated' => (bool) ($m->is_ai_generated ?? false),
                    'created_at' => $m->created_at->toIso8601String(),
                    'formatted_time' => $m->created_at ? $m->created_at->format('g:i A') : now()->format('g:i A'),
                    'date_group' => $m->created_at && $m->created_at->isToday() ? 'TODAY' : ($m->created_at ? $m->created_at->format('M d, Y') : 'TODAY'),
                ]);

            return response()->json([
                'thread' => [
                    'id' => (string) $waChat->id,
                    'channel_type' => 'whatsapp',
                    'status' => 'open',
                    'bot_active' => !(bool) ($waChat->is_ai_active ?? true),
                    'session_remaining' => 86400,
                    'is_session_open' => true,
                    'session_formatted' => '24h 00m',
                    'session_countdown' => '24:00:00',
                ],
                'contact' => [
                    'id' => (string) $waChat->id,
                    'name' => $waChat->customer_name ?: $waChat->customer_phone,
                    'phone_number' => $waChat->customer_phone,
                    'email' => null,
                    'company_name' => null,
                    'industry' => null,
                    'lead_stage' => 'Enterprise Lead (High Priority)',
                    'internal_notes' => null,
                ],
                'messages' => $messages,
            ]);
        }

        return response()->json(['error' => 'Thread not found'], 404);
    }

    /**
     * Send a text message to a customer.
     */
    public function sendMessage(Request $request, string $chatId, WhatsAppCloudApi $whatsAppApi): JsonResponse
    {
        $thread = Str::isUuid($chatId) ? Thread::forTenant($request->user()?->tenant_id)->find($chatId) : null;
        if ($thread) {
            $apiChatController = new ApiChatController();
            return $apiChatController->sendMessage($request, $chatId);
        }

        // Fallback WhatsappChat send
        $waChat = $this->tenantChat($request, $chatId);
        if ($waChat) {
            // Check 24-hour free-text session window
            $msgType = $request->input('type') ?? $request->input('message_type') ?? 'text';
            if ($msgType === 'text') {
                $lastInbound = $waChat->messages()
                    ->where('direction', 'inbound')
                    ->latest('created_at')
                    ->first();

                if (! $lastInbound || $lastInbound->created_at->lt(now()->subHours(24))) {
                    return response()->json([
                        'error' => 'The 24-hour free-text session window is closed. Please send a template message instead.',
                    ], 403);
                }
            }

            $bodyText = $request->input('content') ?? $request->input('body') ?? '';
            $account = $waChat->whatsappAccount;
            $metaMessageId = 'staff_' . bin2hex(random_bytes(8));
            try {
                if ($account?->access_token) {
                    $whatsAppApi->withToken($account->access_token);
                }
                $apiRes = $whatsAppApi->sendTextMessage(
                    $account?->phone_number_id ?? 'phone-123',
                    $waChat->customer_phone,
                    $bodyText
                );
                if ($apiRes && method_exists($apiRes, 'json')) {
                    $metaMessageId = $apiRes->json('messages.0.id') ?? $metaMessageId;
                }
            } catch (\Throwable $e) {
                Log::warning('WhatsApp live send error: ' . $e->getMessage());
            }

            $message = $waChat->messages()->create([
                'direction' => 'outbound',
                'message_type' => $msgType,
                'body' => $bodyText,
                'meta_message_id' => $metaMessageId,
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            $waChat->update([
                'last_message_at' => now(),
                'is_ai_active' => false,
            ]);

            return response()->json([
                'id' => (string) $message->id,
                'direction' => 'outbound',
                'message_type' => $msgType,
                'content' => $bodyText,
                'status' => 'sent',
                'is_ai_generated' => false,
                'created_at' => now()->toIso8601String(),
                'formatted_time' => now()->format('g:i A'),
                'date_group' => 'TODAY',
            ]);
        }

        return response()->json(['error' => 'Chat not found'], 404);
    }

    /**
     * Toggle or set AI active state for a specific chat or thread.
     */
    public function toggleAi(Request $request, string $chatId): JsonResponse
    {
        if (Str::isUuid($chatId)) {
            $apiChatController = new ApiChatController();
            return $apiChatController->toggleBot($request, $chatId);
        }

        $waChat = $this->tenantChat($request, $chatId);
        if ($waChat) {
            $state = $request->has('is_ai_active')
                ? (bool) $request->input('is_ai_active')
                : !($waChat->is_ai_active ?? true);

            $waChat->update(['is_ai_active' => $state]);

            return response()->json([
                'success' => true,
                'is_ai_active' => $state,
                'bot_active' => $state,
            ]);
        }

        return response()->json(['error' => 'Chat not found'], 404);
    }
}
