<?php

namespace App\Services\Inbox;

use App\Models\ChannelIdentity;
use App\Models\WhatsappAccount;
use Illuminate\Support\Facades\Log;

/**
 * Maps an inbound webhook's destination id (WhatsApp phone_number_id, or a
 * Messenger/Instagram page id) to the tenant-owned ChannelIdentity that
 * should receive it. Unknown destinations are rejected instead of being
 * auto-registered against a shared system token, which previously attached
 * unrelated traffic to no tenant at all.
 */
class InboundChannelResolver
{
    public function resolve(string $channelType, ?string $externalId): ?ChannelIdentity
    {
        if (! $externalId) {
            return null;
        }

        $channel = ChannelIdentity::where('external_id', $externalId)->first();

        if ($channel) {
            return $this->backfillTenant($channel);
        }

        // Messenger/Instagram channels only exist once connected by a tenant.
        if ($channelType !== 'whatsapp') {
            Log::warning('[InboundChannelResolver] Inbound event for an unconnected channel was dropped', [
                'channel_type' => $channelType,
                'external_id' => $externalId,
            ]);

            return null;
        }

        $account = WhatsappAccount::where('phone_number_id', $externalId)->first();

        if (! $account) {
            Log::warning('[InboundChannelResolver] Inbound WhatsApp event for an unknown phone_number_id was dropped', [
                'phone_number_id' => $externalId,
            ]);

            return null;
        }

        return ChannelIdentity::create([
            'tenant_id' => (string) $account->tenant_id,
            'channel_type' => 'whatsapp',
            'account_name' => $account->display_name ?: ($account->phone_number ?: 'WhatsApp Channel'),
            'external_id' => $externalId,
            'business_account_id' => $account->waba_id,
            'access_token' => (string) $account->access_token,
            'webhook_verify_token' => (string) config('services.meta.webhook_verify_token', env('META_WEBHOOK_VERIFY_TOKEN', 'token')),
            'is_active' => true,
        ]);
    }

    /**
     * A channel created before tenancy existed has no owner; adopt the owner
     * of the matching WhatsApp account, if there is one.
     */
    protected function backfillTenant(ChannelIdentity $channel): ChannelIdentity
    {
        if ($channel->tenant_id || $channel->channel_type !== 'whatsapp') {
            return $channel;
        }

        $account = WhatsappAccount::where('phone_number_id', $channel->external_id)->first();

        if ($account) {
            $channel->update(['tenant_id' => (string) $account->tenant_id]);
        }

        return $channel;
    }
}
