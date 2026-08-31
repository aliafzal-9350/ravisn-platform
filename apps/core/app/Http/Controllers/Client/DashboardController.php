<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\CampaignRecipient;
use App\Models\WhatsappChat;
use App\Models\WhatsappMessage;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the client dashboard with live real-time metrics.
     */
    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;
        $account = $tenant->whatsappAccounts()->where('status', 'active')->first();

        // 1. Sync live messaging limit tier from Meta (Cached for 1 hour)
        if ($account && $account->phone_number_id) {
            $this->syncMessagingLimitTier($account);
        }

        $activeNumbers = $tenant->whatsappAccounts()->where('status', 'active')->count();
        $totalCampaigns = $tenant->campaigns()->count();

        $chatIds = $tenant->whatsappChats()->pluck('id')->all();
        $campaignIds = $tenant->campaigns()->pluck('id')->all();

        // 2. Outbound Broadcast Messages (Campaigns)
        $campaignMarketingSent = empty($campaignIds) ? 0 : CampaignRecipient::whereIn('campaign_id', $campaignIds)
            ->whereHas('campaign', fn($q) => $q->whereNull('message_type')->orWhere('message_type', 'template'))
            ->whereIn('status', ['sent', 'delivered', 'read'])->count();

        $campaignUtilitySent = empty($campaignIds) ? 0 : CampaignRecipient::whereIn('campaign_id', $campaignIds)
            ->whereHas('campaign.messageTemplate', fn($q) => $q->where('category', 'UTILITY'))
            ->whereIn('status', ['sent', 'delivered', 'read'])->count();

        $campaignDelivered = empty($campaignIds) ? 0 : CampaignRecipient::whereIn('campaign_id', $campaignIds)
            ->whereIn('status', ['delivered', 'read'])->count();

        $campaignFailed = empty($campaignIds) ? 0 : CampaignRecipient::whereIn('campaign_id', $campaignIds)
            ->where('status', 'failed')->count();

        // 3. 1-on-1 Inbox Messages
        $inboxOutboundSent = empty($chatIds) ? 0 : WhatsappMessage::whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')->count();

        $inboxDelivered = empty($chatIds) ? 0 : WhatsappMessage::whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')
            ->whereIn('status', ['delivered', 'read'])->count();

        $inboxFailed = empty($chatIds) ? 0 : WhatsappMessage::whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')
            ->where('status', 'failed')->count();

        // 4. Dynamic Unique Customers Who Replied (Distinct Chats with Inbound Messages)
        $totalUniqueRepliedCustomers = $tenant->whatsappChats()
            ->whereHas('messages', fn ($q) => $q->where('direction', 'inbound'))
            ->count();

        // Summary Totals
        $totalMessagesSent = $campaignMarketingSent + $campaignUtilitySent + $inboxOutboundSent;
        $totalDelivered = $campaignDelivered + $inboxDelivered;
        $totalFailed = $campaignFailed + $inboxFailed;

        $recentCampaigns = $tenant->campaigns()
            ->with('messageTemplate')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($campaign): array => [
                'id' => (string) $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'message_label' => $campaign->message_type === 'direct'
                    ? __('Direct message')
                    : $campaign->messageTemplate?->name,
                'sent_count' => $campaign->sent_count,
                'delivered_count' => $campaign->delivered_count,
                'total_recipients' => $campaign->total_recipients,
                'progress' => $campaign->progressPercentage(),
                'created_at' => $campaign->created_at->diffForHumans(),
            ]);

        $weeklyActivity = $this->weeklyActivity($chatIds, $campaignIds);
        $deliveryStatus = $this->deliveryStatus($campaignIds, $inboxDelivered, $inboxFailed);
        $apiUsage = $this->calculateApiUsage($campaignMarketingSent, $campaignUtilitySent, $totalUniqueRepliedCustomers);

        return Inertia::render('client/dashboard', [
            'stats' => [
                'activeNumbers' => $activeNumbers,
                'totalCampaigns' => $totalCampaigns,
                'totalMessagesSent' => $totalMessagesSent,
                'totalDelivered' => $totalDelivered,
                'totalFailed' => $totalFailed,
                'totalReceived' => $totalUniqueRepliedCustomers,
            ],
            'recentCampaigns' => $recentCampaigns,
            'weeklyActivity' => $weeklyActivity,
            'deliveryStatus' => $deliveryStatus,
            'apiUsage' => $apiUsage,
        ]);
    }

    /**
     * Auto-sync messaging limit tier from Meta Graph API.
     */
    private function syncMessagingLimitTier($account): void
    {
        Cache::remember('meta_tier_sync_' . $account->id, 3600, function () use ($account) {
            $token = $account->access_token ?? config('whatsapp.token');
            if (! $token) return null;

            try {
                $res = Http::withToken($token)
                    ->timeout(4)
                    ->get("https://graph.facebook.com/v20.0/{$account->phone_number_id}?fields=messaging_limit_tier");

                if ($res->successful()) {
                    $tier = $res->json('messaging_limit_tier');
                    $limitMap = [
                        'TIER_250' => 250,
                        'TIER_1K' => 1000,
                        'TIER_2K' => 2000,
                        'TIER_10K' => 10000,
                        'TIER_100K' => 100000,
                        'TIER_UNLIMITED' => 1000000,
                    ];
                    $account->update([
                        'messaging_limit_tier' => $tier,
                        'messaging_limit' => $limitMap[$tier] ?? 2000,
                    ]);
                }
            } catch (\Throwable $e) {
                // Ignore temporary network timeouts
            }
            return true;
        });
    }

    /**
     * 7-day outbound & delivered message trends.
     */
    private function weeklyActivity(array $chatIds, array $campaignIds): array
    {
        $start = now()->subDays(6)->startOfDay();
        $end = now()->endOfDay();

        $inboxMessages = empty($chatIds) ? collect() : WhatsappMessage::query()
            ->whereIn('whatsapp_chat_id', $chatIds)
            ->where('direction', 'outbound')
            ->whereBetween('created_at', [$start, $end])
            ->get(['status', 'created_at']);

        $campaignMessages = empty($campaignIds) ? collect() : CampaignRecipient::query()
            ->whereIn('campaign_id', $campaignIds)
            ->whereBetween('created_at', [$start, $end])
            ->get(['status', 'created_at']);

        $allOutbound = $inboxMessages->concat($campaignMessages);
        $grouped = $allOutbound->groupBy(fn ($msg) => $msg->created_at->toDateString());

        return collect(CarbonPeriod::create($start, '1 day', $end))
            ->map(function (Carbon $date) use ($grouped): array {
                $dayMessages = $grouped->get($date->toDateString(), collect());
                return [
                    'day' => $date->format('D'),
                    'date' => $date->toDateString(),
                    'sent' => $dayMessages->count(),
                    'delivered' => $dayMessages->whereIn('status', ['delivered', 'read'])->count(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Delivery rate gauge.
     */
    private function deliveryStatus(array $campaignIds, int $inboxDelivered, int $inboxFailed): array
    {
        $counts = empty($campaignIds)
            ? collect()
            : CampaignRecipient::query()
                ->whereIn('campaign_id', $campaignIds)
                ->selectRaw('status, count(*) as aggregate')
                ->groupBy('status')
                ->pluck('aggregate', 'status');

        $delivered = (int) ($counts['delivered'] ?? 0) + (int) ($counts['read'] ?? 0) + $inboxDelivered;
        $failed = (int) ($counts['failed'] ?? 0) + $inboxFailed;
        $sent = (int) ($counts['sent'] ?? 0);
        $pending = (int) ($counts['pending'] ?? 0);
        $total = $delivered + $failed + $sent + $pending;

        return [
            'total' => $total,
            'delivered' => $delivered,
            'failed' => $failed,
            'pending' => $pending,
            'sent' => $sent,
            'deliveryRate' => $total > 0 ? (int) round(($delivered / $total) * 100) : 100,
            'unresolvedRate' => $total > 0 ? (int) round((($failed + $pending + $sent) / $total) * 100) : 0,
        ];
    }

    /**
     * Accurate WhatsApp API Usage calculation.
     */
    private function calculateApiUsage(int $marketingSent, int $utilitySent, int $serviceReceived): array
    {
        $marketingCost = $marketingSent * 0.025;
        $utilityCost = $utilitySent * 0.004;

        // Meta free monthly tier applies to first 1,000 service conversations
        $billableService = max(0, $serviceReceived - 1000);
        $serviceCost = $billableService * 0.005;

        $totalOutboundSent = $marketingSent + $utilitySent;
        $totalCost = $marketingCost + $utilityCost + $serviceCost;

        return [
            'categories' => [
                'marketing' => [
                    'count' => $marketingSent,
                    'cost' => number_format($marketingCost, 2, '.', ''),
                ],
                'authentication' => [
                    'count' => 0,
                    'cost' => '0.00',
                ],
                'utility' => [
                    'count' => $utilitySent,
                    'cost' => number_format($utilityCost, 2, '.', ''),
                ],
                'service' => [
                    'count' => $serviceReceived,
                    'cost' => '0.00',
                ],
            ],
            'total_sent' => $totalOutboundSent,
            'total_cost' => number_format($totalCost, 2, '.', ''),
        ];
    }
}
