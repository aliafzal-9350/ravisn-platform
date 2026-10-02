<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Thread;
use Carbon\CarbonPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the enterprise-grade dual-engine operational dashboard.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = Auth::user();

        // Auto-provision workspace for legacy users without one
        if ($user && ! $user->tenant_id) {
            $tenant = \App\Models\Tenant::create([
                'name' => "{$user->name} Workspace",
                'email' => $user->email,
                'status' => 'active',
            ]);
            $user->update([
                'tenant_id' => $tenant->id,
                'role' => \App\Models\User::ROLE_ADMIN,
            ]);
            $user->refresh();
        }

        // Agents work from the inbox; the analytics dashboard is an admin surface.
        if ($user->isAgent()) {
            return redirect()->route('client.inbox.index');
        }

        // Every figure below is confined to this tenant. There is deliberately no
        // fallback to global data: a new workspace must see zeros, never another
        // tenant's numbers.
        $tenantId = (string) $user->tenant_id;

        // 1. Multi-Tenant Channel Connections
        $channels = ChannelIdentity::forTenant($tenantId)->get();

        $whatsappChannel = $channels->first(fn ($c) => ($c->channel ?? $c->channel_type) === 'whatsapp');
        $instagramChannel = $channels->first(fn ($c) => ($c->channel ?? $c->channel_type) === 'instagram');
        $messengerChannel = $channels->first(fn ($c) => ($c->channel ?? $c->channel_type) === 'messenger');

        $campaignsCount = Campaign::where('tenant_id', $tenantId)->count();

        // Threads belong to a tenant through their channel; messages through their thread.
        $threadsQuery = fn () => Thread::forTenant($tenantId);
        $messagesQuery = fn () => Message::whereIn('thread_id', Thread::forTenant($tenantId)->select('threads.id'));

        // 2. Meta WABA Safeguards & Health
        $rolling24hStart = Carbon::now()->subHours(24);
        $dailySent24h = $messagesQuery()
            ->where('direction', 'outbound')
            ->where('created_at', '>=', $rolling24hStart)
            ->count();

        $tierLimit = $whatsappChannel?->meta_tier_limit ?? 100000;
        $consumptionPercent = $tierLimit > 0 ? round(($dailySent24h / $tierLimit) * 100, 2) : 0;

        // 3. Meta API Usage & Category Cost (USD), only when messages record their
        // Meta pricing category. Without it the split and spend are unknown, and
        // the dashboard says so instead of estimating.
        $costTracked = Schema::hasColumn('messages', 'category') && Schema::hasColumn('messages', 'cost_usd');
        $marketingCount = $marketingCost = $authCount = $authCost = null;
        $utilityCount = $utilityCost = $serviceCount = $totalCostUsd = null;

        if ($costTracked) {
            $categoryBreakdown = $messagesQuery()
                ->select('category', DB::raw('count(*) as count'), DB::raw('sum(cost_usd) as total_cost'))
                ->groupBy('category')
                ->get()
                ->keyBy('category');

            $marketingCount = (int) ($categoryBreakdown->get('marketing')?->count ?? 0);
            $marketingCost = (float) ($categoryBreakdown->get('marketing')?->total_cost ?? 0.00);
            $authCount = (int) ($categoryBreakdown->get('authentication')?->count ?? 0);
            $authCost = (float) ($categoryBreakdown->get('authentication')?->total_cost ?? 0.00);
            $utilityCount = (int) ($categoryBreakdown->get('utility')?->count ?? 0);
            $utilityCost = (float) ($categoryBreakdown->get('utility')?->total_cost ?? 0.00);
            $serviceCount = (int) ($categoryBreakdown->get('service')?->count ?? 0);
            $totalCostUsd = (float) ($messagesQuery()->sum('cost_usd') ?? 0.00);
        }

        $totalSentOutbound = $messagesQuery()->where('direction', 'outbound')->count();

        // 4. Delivery & AI Telemetry
        $totalDelivered = $messagesQuery()
            ->where('direction', 'outbound')
            ->whereIn('status', ['delivered', 'read'])
            ->count();

        $deliveryRate = $totalSentOutbound > 0 ? round(($totalDelivered / $totalSentOutbound) * 100, 1) : null;
        $totalReceivedInbound = $messagesQuery()->where('direction', 'inbound')->count();
        $totalFailed = $messagesQuery()->where('status', 'failed')->count();

        $aiResolvedCount = $threadsQuery()->where('bot_active', true)->where('status', 'resolved')->count();
        $totalClosedThreads = $threadsQuery()->whereIn('status', ['resolved', 'closed'])->count();
        $resolutionRate = $totalClosedThreads > 0 ? round(($aiResolvedCount / $totalClosedThreads) * 100, 1) : null;

        $avgLatencyMs = $messagesQuery()
            ->whereNotNull('latency_ms')
            ->avg('latency_ms');

        // 5. 7-Day Trend Series (Every day guaranteed)
        $sevenDaysAgo = Carbon::now()->subDays(6)->startOfDay();
        $now = Carbon::now()->endOfDay();

        $activityRecords = $messagesQuery()
            ->where('created_at', '>=', $sevenDaysAgo)
            ->select(
                DB::raw('DATE(created_at) as date_val'),
                DB::raw("COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_count"),
                DB::raw("COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_count"),
                DB::raw("COUNT(CASE WHEN status IN ('delivered', 'read') THEN 1 END) as delivered_count")
            )
            ->groupBy('date_val')
            ->get()
            ->keyBy('date_val');

        $dailyActivity = collect(CarbonPeriod::create($sevenDaysAgo, '1 day', $now))->map(function (Carbon $day) use ($activityRecords) {
            $key = $day->toDateString();
            $rec = $activityRecords->get($key);

            return [
                'date' => $key,
                'day' => $day->format('D'),
                'outbound_count' => (int) ($rec?->outbound_count ?? 0),
                'inbound_count' => (int) ($rec?->inbound_count ?? 0),
                'delivered_count' => (int) ($rec?->delivered_count ?? 0),
            ];
        })->values()->all();

        // 6. Lead Conversion Engine
        $qualifiedLeads = Contact::where('tenant_id', $tenantId)
            ->where(function ($q) {
                $q->whereIn('lead_stage', ['qualified', 'Qualified Lead', 'Enterprise Lead (High Priority)', 'qualified_lead'])
                    ->orWhereRaw("custom_attributes->>'lead_stage' ILIKE '%qualified%'")
                    ->orWhereRaw("custom_attributes->>'lead_stage' ILIKE '%enterprise%'");
            })
            ->count();

        $demosBooked = Contact::where('tenant_id', $tenantId)
            ->where(function ($q) {
                $q->whereIn('lead_stage', ['demo_booked', 'Demo Scheduled', 'scheduled', 'demo_scheduled'])
                    ->orWhereRaw("custom_attributes->>'lead_stage' ILIKE '%demo%'")
                    ->orWhereRaw("custom_attributes->>'lead_stage' ILIKE '%scheduled%'");
            })
            ->count();

        // 7. Recent Campaigns
        $recentCampaigns = Campaign::where('tenant_id', $tenantId)
            ->latest()
            ->take(3)
            ->get()
            ->map(function ($camp) {
                return [
                    'id' => (string) $camp->id,
                    'name' => $camp->name,
                    'template_name' => $camp->messageTemplate?->name ?? $camp->name,
                    'status' => $camp->status ?? 'Completed',
                    'sent_count' => (int) ($camp->sent_count ?? 0),
                    'delivered_count' => (int) ($camp->delivered_count ?? 0),
                    'target_count' => (int) ($camp->total_recipients ?? 0),
                    'created_at' => $camp->created_at?->diffForHumans() ?? 'Recently',
                ];
            })
            ->all();

        // 8. Live Active Queue
        $totalContacts = Contact::where('tenant_id', $tenantId)->count();
        $openThreadsCount = $threadsQuery()
            ->where(function ($q) {
                $q->where('status', 'open')->orWhereNull('status');
            })
            ->count();

        $liveQueue = $threadsQuery()
            ->where(function ($q) {
                $q->where('status', 'open')->orWhereNull('status');
            })
            ->with(['contact'])
            ->latest('last_message_at')
            ->take(5)
            ->get()
            ->map(function ($thread) {
                $contact = $thread->contact;
                $latestMsg = Message::where('thread_id', $thread->id)->latest('created_at')->first();

                $intentTag = $latestMsg?->detected_intent
                    ? ucwords(str_replace('_', ' ', $latestMsg->detected_intent))
                    : 'Customer Inquiry';

                return [
                    'id' => (string) $thread->id,
                    'channel' => in_array($thread->channel_type, ['whatsapp', 'instagram', 'messenger'])
                        ? $thread->channel_type
                        : 'whatsapp',
                    'bot_active' => (bool) $thread->bot_active,
                    'assigned_agent' => $thread->assignedUser?->name ?? 'Unassigned',
                    'intent_tag' => $intentTag,
                    'last_message' => $latestMsg?->content ?? 'No message body',
                    'updated_at' => $thread->last_message_at?->diffForHumans() ?? $thread->updated_at?->diffForHumans() ?? 'Just now',
                    'contact' => [
                        'name' => $contact?->name ?? $contact?->full_name ?? ($contact?->phone_number ? $contact->phone_number : 'Customer #' . $thread->id),
                        'phone' => $contact?->phone_number ?? $contact?->phone,
                        'username' => $contact?->instagram_igsid ?? $contact?->messenger_psid,
                    ],
                ];
            })
            ->all();

        $isWhatsappActive = (bool) ($whatsappChannel && $whatsappChannel->is_active);
        $isInstagramActive = (bool) ($instagramChannel && $instagramChannel->is_active);
        $isMessengerActive = (bool) ($messengerChannel && $messengerChannel->is_active);

        $tenant = $user->tenant;
        $chatIds = $tenant ? $tenant->whatsappChats()->pluck('id')->all() : [];
        $campaignIds = $tenant ? $tenant->campaigns()->pluck('id')->all() : [];

        $chatOutbound = empty($chatIds) ? 0 : \App\Models\WhatsappMessage::whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')->count();

        $chatDelivered = empty($chatIds) ? 0 : \App\Models\WhatsappMessage::whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')
            ->whereIn('status', ['delivered', 'read'])->count();

        $chatFailed = empty($chatIds) ? 0 : \App\Models\WhatsappMessage::whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')
            ->where('status', 'failed')->count();

        $chatReceived = empty($chatIds) ? 0 : \App\Models\WhatsappMessage::whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'inbound')->count();

        $statsSent = max($totalSentOutbound, $chatOutbound);
        $statsDelivered = max($totalDelivered, $chatDelivered);
        $statsFailed = max($totalFailed, $chatFailed);
        $statsReceived = max($totalReceivedInbound, $chatReceived);

        $start = Carbon::now()->subDays(6)->startOfDay();
        $end = Carbon::now()->endOfDay();

        $inboxWeekly = empty($chatIds) ? collect() : \App\Models\WhatsappMessage::query()
            ->whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')
            ->whereBetween('created_at', [$start, $end])
            ->get(['status', 'created_at']);

        $campaignWeekly = empty($campaignIds) ? collect() : \App\Models\CampaignRecipient::query()
            ->whereIn('campaign_id', $campaignIds)
            ->whereBetween('created_at', [$start, $end])
            ->get(['status', 'created_at']);

        $weeklyActivity = collect(CarbonPeriod::create($start, '1 day', $end))
            ->map(function (Carbon $date) use ($inboxWeekly, $campaignWeekly): array {
                $dayMessages = $inboxWeekly->filter(fn ($msg) => $msg->created_at->toDateString() === $date->toDateString());
                if ($dayMessages->isEmpty() && $campaignWeekly->isNotEmpty()) {
                    $dayMessages = $campaignWeekly->filter(fn ($msg) => $msg->created_at->toDateString() === $date->toDateString());
                }
                return [
                    'day' => $date->format('D'),
                    'date' => $date->toDateString(),
                    'sent' => $dayMessages->count(),
                    'delivered' => $dayMessages->whereIn('status', ['delivered', 'read'])->count(),
                ];
            })
            ->values()
            ->all();

        $recipientCounts = empty($campaignIds)
            ? collect()
            : \App\Models\CampaignRecipient::query()
                ->whereIn('campaign_id', $campaignIds)
                ->selectRaw('status, count(*) as aggregate')
                ->groupBy('status')
                ->pluck('aggregate', 'status');

        $dsDelivered = (int) ($recipientCounts['delivered'] ?? 0) + (int) ($recipientCounts['read'] ?? 0);
        $dsFailed = (int) ($recipientCounts['failed'] ?? 0);
        $dsSent = (int) ($recipientCounts['sent'] ?? 0);
        $dsPending = (int) ($recipientCounts['pending'] ?? 0);
        $dsTotal = $dsDelivered + $dsFailed + $dsSent + $dsPending;

        $deliveryStatus = [
            'total' => $dsTotal,
            'delivered' => $dsDelivered,
            'failed' => $dsFailed,
            'pending' => $dsPending,
            'sent' => $dsSent,
            'deliveryRate' => $dsTotal > 0 ? (int) round(($dsDelivered / $dsTotal) * 100) : null,
            'unresolvedRate' => $dsTotal > 0 ? (int) round((($dsFailed + $dsPending + $dsSent) / $dsTotal) * 100) : 0,
        ];

        $money = fn (?float $amount) => $amount === null ? null : number_format($amount, 2);

        $pageProps = [
            'stats' => [
                'totalMessagesSent' => $statsSent,
                'totalDelivered' => $statsDelivered,
                'totalFailed' => $statsFailed,
                'totalReceived' => $statsReceived,
            ],
            'weeklyActivity' => $weeklyActivity,
            'deliveryStatus' => $deliveryStatus,
            'overview' => [
                'whatsapp' => [
                    'connected' => $isWhatsappActive,
                    'status' => $isWhatsappActive ? 'active' : 'disconnected',
                    'display_number' => $isWhatsappActive ? ($whatsappChannel->account_identifier ?? $whatsappChannel->external_id) : null,
                    'quality_rating' => $whatsappChannel?->quality_rating,
                    'tier_limit' => $tierLimit,
                    'daily_sent' => $dailySent24h,
                    'consumption_pct' => $consumptionPercent,
                    'profile_picture_url' => $isWhatsappActive ? ($whatsappChannel->settings['profile_picture_url'] ?? null) : null,
                ],
                'instagram' => [
                    'connected' => $isInstagramActive,
                    'status' => $isInstagramActive ? 'active' : 'disconnected',
                    'username' => $isInstagramActive ? ($instagramChannel->account_identifier ?? $instagramChannel->account_name) : null,
                    'profile_picture_url' => $isInstagramActive ? ($instagramChannel->settings['profile_picture_url'] ?? null) : null,
                ],
                'messenger' => [
                    'connected' => $isMessengerActive,
                    'status' => $isMessengerActive ? 'active' : 'disconnected',
                    'page_name' => $isMessengerActive ? ($messengerChannel->account_name) : null,
                    'profile_picture_url' => $isMessengerActive ? ($messengerChannel->settings['profile_picture_url'] ?? null) : null,
                ],
                'campaigns_count' => $campaignsCount,
            ],
            'usage' => [
                'tracked' => $costTracked,
                'marketing' => ['count' => $marketingCount, 'cost' => $money($marketingCost)],
                'auth' => ['count' => $authCount, 'cost' => $money($authCost)],
                'utility' => ['count' => $utilityCount, 'cost' => $money($utilityCost)],
                'service' => ['count' => $serviceCount, 'cost' => $costTracked ? '0.00' : null],
                'total_sent' => $totalSentOutbound,
                'total_cost_usd' => $money($totalCostUsd),
            ],
            'telemetry' => [
                'total_contacts' => $totalContacts,
                'open_threads' => $openThreadsCount,
                'total_sent' => $totalSentOutbound,
                'total_delivered' => $totalDelivered,
                'delivery_rate' => $deliveryRate,
                'total_inbound' => $totalReceivedInbound,
                'avg_latency_ms' => $avgLatencyMs === null ? null : (int) round($avgLatencyMs),
                'total_failed' => $totalFailed,
                'resolution_rate' => $resolutionRate,
                'qualified_leads' => $qualifiedLeads,
                'demos_booked' => $demosBooked,
            ],
            'trends' => $dailyActivity,
            'recentCampaigns' => $recentCampaigns,
            'liveQueue' => $liveQueue,
        ];

        return Inertia::render('dashboard', $pageProps);
    }
}
