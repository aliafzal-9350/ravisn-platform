<?php

use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('thread history includes AI reasoning telemetry and the cited RAG chunk', function () {
    $tenant = Tenant::create([
        'name' => 'Telemetry Test Tenant',
        'email' => 'telemetry@test.com',
        'status' => 'active',
    ]);

    $user = User::create([
        'name' => 'Telemetry Agent',
        'email' => 'telemetry-agent@test.com',
        'password' => bcrypt('password'),
        'role' => 'client',
        'tenant_id' => $tenant->id,
    ]);

    $channel = ChannelIdentity::create([
        'tenant_id' => $tenant->id,
        'channel_type' => 'whatsapp',
        'account_name' => 'Telemetry Channel',
        'external_id' => '1000999888111',
        'webhook_verify_token' => 'telemetry_token',
        'access_token' => 'telemetry_access_token',
        'is_active' => true,
    ]);

    $contact = Contact::create([
        'tenant_id' => $tenant->id,
        'phone' => '+15551239999',
        'phone_number' => '+15551239999',
        'name' => 'Telemetry Customer',
    ]);

    $thread = Thread::create([
        'contact_id' => $contact->id,
        'channel_identity_id' => $channel->id,
        'channel_type' => 'whatsapp',
        'status' => 'open',
        'bot_active' => true,
    ]);

    $telemetry = [
        'confidence_score' => 0.95,
        'crag_quality' => 'HIGH',
        'crag_score' => 0.81,
        'rag_chunks_found' => 3,
        'cited_chunk' => [
            'id' => 'chunk-123',
            'title' => 'Refund Policy',
            'snippet' => 'Refunds are processed within 7 business days.',
            'score' => 0.81,
            'source' => 'policy.txt',
        ],
    ];

    Message::create([
        'thread_id' => $thread->id,
        'contact_id' => $contact->id,
        'direction' => 'outbound',
        'channel_type' => 'whatsapp',
        'message_type' => 'text',
        'content' => 'Refunds take 7 business days.',
        'is_ai_generated' => true,
        'ai_model' => 'llama-3.3-70b-versatile',
        'detected_intent' => 'support',
        'latency_ms' => 842,
        'confidence_score' => 0.95,
        'raw_payload' => ['telemetry' => $telemetry],
        'status' => 'sent',
    ]);

    $response = $this->actingAs($user)->getJson("/api/v1/threads/{$thread->id}");

    $response->assertOk();
    $message = collect($response->json('messages'))->first();

    expect($message['detected_intent'])->toBe('support');
    expect($message['latency_ms'])->toBe(842);
    expect((float) $message['confidence_score'])->toBe(0.95);
    expect($message['telemetry']['crag_quality'])->toBe('HIGH');
    expect($message['rag_chunk']['title'])->toBe('Refund Policy');
    expect($message['rag_chunk']['snippet'])->toBe('Refunds are processed within 7 business days.');
});
