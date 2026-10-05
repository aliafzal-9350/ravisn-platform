<?php

use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\SystemNotification;
use App\Models\Tenant;
use App\Models\Thread;
use App\Services\AI\AiIntelligenceEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tenant = Tenant::create([
        'name' => 'Escalation Test Tenant',
        'email' => 'escalation@test.com',
        'status' => 'active',
    ]);

    $this->channel = ChannelIdentity::create([
        'tenant_id' => $this->tenant->id,
        'channel_type' => 'whatsapp',
        'account_name' => 'Support Channel',
        'external_id' => '1000999888000',
        'webhook_verify_token' => 'test_webhook_token_escalation',
        'access_token' => 'test_access_token',
        'is_active' => true,
    ]);

    $this->contact = Contact::create([
        'tenant_id' => $this->tenant->id,
        'phone' => '+15551230000',
        'phone_number' => '+15551230000',
        'name' => 'Escalation Customer',
    ]);

    $this->thread = Thread::create([
        'contact_id' => $this->contact->id,
        'channel_identity_id' => $this->channel->id,
        'channel_type' => 'whatsapp',
        'status' => 'open',
        'bot_active' => true,
    ]);

    $this->engine = new AiIntelligenceEngine;
});

test('explicit human request phrase escalates with high confidence', function () {
    $result = $this->engine->evaluate('Can I talk to a human please?', $this->thread);

    expect($result['is_escalated'])->toBeTrue();
    expect($result['sentiment'])->toBe('escalation_requested');
    expect($result['confidence'])->toBe(0.99);
});

test('roman-urdu human request phrase escalates', function () {
    $result = $this->engine->evaluate('please insan se baat karadain', $this->thread);

    expect($result['is_escalated'])->toBeTrue();
    expect($result['sentiment'])->toBe('escalation_requested');
});

test('frustration phrase escalates with high confidence', function () {
    $result = $this->engine->evaluate('This is the worst service ever, I am furious.', $this->thread);

    expect($result['is_escalated'])->toBeTrue();
    expect($result['sentiment'])->toBe('frustrated');
    expect($result['confidence'])->toBe(0.95);
});

test('neutral message does not escalate', function () {
    $result = $this->engine->evaluate('What are your business hours?', $this->thread);

    expect($result['is_escalated'])->toBeFalse();
    expect($result['sentiment'])->toBe('neutral');
});

test('triggering escalation pauses the bot and marks the thread for human takeover', function () {
    $this->engine->triggerHumanEscalation($this->thread, 'Customer requested a human agent.');

    $this->thread->refresh();
    expect($this->thread->bot_active)->toBeFalse();
    expect($this->thread->status)->toBe('human_takeover');

    $this->assertDatabaseHas('system_notifications', [
        'tenant_id' => $this->tenant->id,
        'type' => 'warning',
    ]);
    expect(SystemNotification::where('tenant_id', $this->tenant->id)->count())->toBe(1);
});
