<?php

namespace App\Jobs;

use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Thread;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DispatchOutboundBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $channelIdentityId,
        public string $contactId,
        public string $messageContent,
        public ?string $templateName = null,
        public array $templateComponents = [],
        public string $languageCode = 'en_US'
    ) {}

    public function handle(MetaGraphClient $metaClient): void
    {
        $channel = ChannelIdentity::find($this->channelIdentityId);
        $contact = Contact::find($this->contactId);

        if (! $channel || ! $contact) {
            Log::error('[DispatchOutboundBroadcastJob] Channel or Contact not found');
            return;
        }

        $recipientPhone = $contact->phone_number ?: $contact->phone;
        if (! $recipientPhone) {
            Log::error('[DispatchOutboundBroadcastJob] Contact has no phone number');
            return;
        }

        $thread = Thread::firstOrCreate(
            [
                'contact_id' => $contact->id,
                'channel_identity_id' => $channel->id,
            ],
            [
                'channel_type' => $channel->channel_type,
                'status' => 'open',
                'bot_active' => false,
            ]
        );

        $response = [];
        if ($this->templateName) {
            $response = $metaClient->sendWhatsAppTemplate(
                phoneNumberId: $channel->external_id,
                toPhone: $recipientPhone,
                templateName: $this->templateName,
                languageCode: $this->languageCode,
                components: $this->templateComponents,
                accessToken: $channel->access_token
            );
        } else {
            $response = $metaClient->sendWhatsAppMessage(
                phoneNumberId: $channel->external_id,
                toPhone: $recipientPhone,
                text: $this->messageContent,
                accessToken: $channel->access_token
            );
        }

        $wamid = $response['messages'][0]['id'] ?? null;

        Message::create([
            'thread_id' => $thread->id,
            'contact_id' => $contact->id,
            'direction' => 'outbound',
            'channel_type' => $channel->channel_type,
            'external_message_id' => $wamid,
            'message_type' => $this->templateName ? 'template' : 'text',
            'content' => $this->messageContent,
            'status' => $wamid ? 'sent' : 'failed',
            'is_ai_generated' => false,
            'raw_payload' => $response,
        ]);

        $thread->update(['last_message_at' => now()]);
    }
}
