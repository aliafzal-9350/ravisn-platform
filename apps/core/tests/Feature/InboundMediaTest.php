<?php

use App\Events\MessageMediaReadyEvent;
use App\Jobs\DownloadInboundMediaJob;
use App\Jobs\PushInboundToAiJob;
use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\Thread;
use App\Models\User;
use App\Services\AI\AiJobQueue;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

beforeEach(function () {
    Storage::fake('local');
    config(['services.meta.media_disk' => 'local', 'services.meta.inbound_ai_stream' => 'test:ai:inbound']);
    app(AiJobQueue::class)->clear();

    $this->user = User::factory()->for(Tenant::factory())->create();
    $this->channel = ChannelIdentity::create([
        'tenant_id' => $this->user->tenant_id,
        'channel_type' => 'whatsapp',
        'account_name' => 'Clinic',
        'external_id' => 'phone-'.Str::random(6),
        'access_token' => 'channel-token',
        'webhook_verify_token' => 'verify',
        'is_active' => true,
    ]);
    $contact = Contact::create(['tenant_id' => $this->user->tenant_id, 'phone' => '+15550001', 'phone_number' => '+15550001']);
    $this->thread = Thread::create([
        'contact_id' => $contact->id,
        'channel_identity_id' => $this->channel->id,
        'channel_type' => 'whatsapp',
        'status' => 'open',
        'bot_active' => true,
    ]);
});

afterEach(fn () => app(AiJobQueue::class)->clear());

function mediaMessage(object $test, array $overrides = []): Message
{
    return Message::create(array_merge([
        'thread_id' => $test->thread->id,
        'contact_id' => $test->thread->contact_id,
        'direction' => 'inbound',
        'channel_type' => 'whatsapp',
        'message_type' => 'image',
        'media_url' => 'meta-media-123',
        'media_mime_type' => 'image/jpeg',
        'status' => 'received',
    ], $overrides));
}

function fakeMetaMedia(string $mime = 'image/jpeg', int $size = 2048, string $host = 'lookaside.fbsbx.com'): void
{
    Http::fake([
        "https://{$host}/*" => Http::response('binary-image-bytes', 200, ['Content-Type' => $mime]),
        '*/meta-media-123' => Http::response(['url' => "https://{$host}/whatsapp_business/attachments/?mid=123", 'mime_type' => $mime, 'file_size' => $size]),
    ]);
}

test('an incoming WhatsApp image is queued for download', function () {
    Queue::fake([DownloadInboundMediaJob::class]);

    (new PushInboundToAiJob([
        'object' => 'whatsapp_business_account',
        'entry' => [['id' => '1', 'changes' => [[
            'field' => 'messages',
            'value' => [
                'metadata' => ['phone_number_id' => $this->channel->external_id],
                'messages' => [['from' => '15550001', 'id' => 'wamid.'.Str::random(10), 'type' => 'image', 'image' => ['id' => 'meta-media-123', 'mime_type' => 'image/jpeg']]],
            ],
        ]]]],
    ]))->handle();

    Queue::assertPushed(DownloadInboundMediaJob::class);
});

test('the media is copied into storage and the open conversation is told', function () {
    Event::fake([MessageMediaReadyEvent::class]);
    fakeMetaMedia();
    $message = mediaMessage($this);

    (new DownloadInboundMediaJob((string) $message->id))->handle(app(MetaGraphClient::class));

    $message->refresh();
    expect($message->media_path)->toStartWith("inbound-media/{$this->user->tenant_id}/")
        ->and($message->mediaUrl())->toBe(route('client.media.show', ['message' => $message->id]));
    Storage::disk('local')->assertExists($message->media_path);
    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer channel-token'));
    Event::assertDispatched(MessageMediaReadyEvent::class, fn ($event) => $event->messageId === (string) $message->id
        && $event->mediaUrl === $message->mediaUrl());

    // The conversation API now hands the browser a loadable URL, not Meta's id.
    $this->actingAs($this->user)->getJson("/api/v1/threads/{$this->thread->id}")
        ->assertJsonPath('messages.0.media_url', $message->mediaUrl());
});

test('files over the size limit are left out', function () {
    fakeMetaMedia(size: DownloadInboundMediaJob::MAX_BYTES + 1);
    $message = mediaMessage($this);

    (new DownloadInboundMediaJob((string) $message->id))->handle(app(MetaGraphClient::class));

    expect($message->fresh()->media_path)->toBeNull();
});

test('media is never fetched from outside Meta\'s CDN', function () {
    fakeMetaMedia(host: 'evil.example.com');
    $message = mediaMessage($this);

    (new DownloadInboundMediaJob((string) $message->id))->handle(app(MetaGraphClient::class));

    expect($message->fresh()->media_path)->toBeNull();
    Http::assertNotSent(fn ($request) => str_contains($request->url(), 'evil.example.com'));
});

test('images are shown inline to the workspace and hidden from others', function () {
    fakeMetaMedia();
    $message = mediaMessage($this);
    (new DownloadInboundMediaJob((string) $message->id))->handle(app(MetaGraphClient::class));
    $url = $message->fresh()->mediaUrl();

    $this->actingAs($this->user)->get($url)
        ->assertOk()
        ->assertHeader('Content-Type', 'image/jpeg');

    $stranger = User::factory()->for(Tenant::factory())->create();
    $this->actingAs($stranger)->get($url)->assertNotFound();
});

test('a document that is really HTML is downloaded, never rendered on our site', function () {
    fakeMetaMedia(mime: 'text/html');
    $message = mediaMessage($this, ['message_type' => 'document', 'media_mime_type' => 'text/html']);
    (new DownloadInboundMediaJob((string) $message->id))->handle(app(MetaGraphClient::class));

    $response = $this->actingAs($this->user)->get($message->fresh()->mediaUrl())->assertOk();

    expect($response->headers->get('Content-Type'))->toBe('application/octet-stream')
        ->and($response->headers->get('Content-Disposition'))->toStartWith('attachment')
        ->and($response->headers->get('Content-Security-Policy'))->toContain('sandbox');
});

test('a Messenger image attachment is stored and queued for download', function () {
    Queue::fake([DownloadInboundMediaJob::class]);
    $page = ChannelIdentity::create([
        'tenant_id' => $this->user->tenant_id,
        'channel_type' => 'messenger',
        'account_name' => 'Clinic Page',
        'external_id' => '900800700',
        'access_token' => 'page-token',
        'webhook_verify_token' => 'verify',
        'is_active' => true,
    ]);

    (new PushInboundToAiJob([
        'object' => 'page',
        'entry' => [['id' => '900800700', 'messaging' => [[
            'sender' => ['id' => 'psid-1'],
            'recipient' => ['id' => '900800700'],
            'message' => ['mid' => 'mid.'.Str::random(8), 'attachments' => [['type' => 'image', 'payload' => ['url' => 'https://scontent.xx.fbcdn.net/photo.jpg']]]],
        ]]]],
    ]))->handle();

    $message = Message::whereIn('thread_id', Thread::where('channel_identity_id', $page->id)->select('id'))->firstOrFail();
    expect($message->message_type)->toBe('image')
        ->and($message->media_url)->toBe('https://scontent.xx.fbcdn.net/photo.jpg');
    Queue::assertPushed(DownloadInboundMediaJob::class);
});
