<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function promptUser(string $name, ?Tenant $tenant = null): User
{
    return User::create([
        'name' => $name,
        'email' => strtolower($name).'@example.com',
        'password' => bcrypt('password'),
        'role' => 'client',
        'tenant_id' => $tenant?->id,
    ]);
}

$payload = [
    'system_prompt' => 'You are a careful assistant.',
    'ai_tone' => 'professional_consultative',
    'prohibited_topics' => 'politics',
    'temperature' => 0.4,
    'active_preset' => 'support_agent',
];

test('saving prompt settings actually persists them on the tenant', function () use ($payload) {
    $tenant = Tenant::create(['name' => 'Alpha', 'email' => 'alpha@example.com', 'status' => 'active']);

    $this->actingAs(promptUser('Alpha', $tenant))->post(route('client.prompt-tuning.update'), $payload)->assertRedirect();

    expect($tenant->fresh()->settings)->toMatchArray([
        'system_prompt' => 'You are a careful assistant.',
        'temperature' => 0.4,
        'active_preset' => 'support_agent',
    ]);
});

test('one tenant saving its prompt never changes another tenant', function () use ($payload) {
    $alpha = Tenant::create(['name' => 'Alpha', 'email' => 'alpha@example.com', 'status' => 'active']);
    $bravo = Tenant::create(['name' => 'Bravo', 'email' => 'bravo@example.com', 'status' => 'active']);

    $this->actingAs(promptUser('Alpha', $alpha))->post(route('client.prompt-tuning.update'), $payload)->assertRedirect();

    expect($bravo->fresh()->settings)->toBeNull();
});

test('a user with no workspace cannot read or write anyone\'s prompt', function () use ($payload) {
    Tenant::create(['name' => 'Alpha', 'email' => 'alpha@example.com', 'status' => 'active']);
    $orphan = promptUser('Orphan');

    $this->actingAs($orphan)->get(route('client.prompt-tuning.index'))->assertForbidden();
    $this->actingAs($orphan)->post(route('client.prompt-tuning.update'), $payload)->assertForbidden();
});

test('the tenant\'s prompt settings travel with every AI task', function () {
    config(['services.meta.inbound_ai_stream_key' => 'test_inbound_ai_jobs']);
    Illuminate\Support\Facades\Redis::del('test_inbound_ai_jobs');

    $tenant = Tenant::create([
        'name' => 'Alpha Co',
        'email' => 'alpha@example.com',
        'status' => 'active',
        'settings' => ['system_prompt' => 'You are Alpha\'s concierge.', 'ai_tone' => 'friendly_efficient', 'prohibited_topics' => 'politics', 'temperature' => 0.4],
    ]);
    App\Models\WhatsappAccount::create([
        'tenant_id' => $tenant->id,
        'phone_number' => '+15550001111',
        'phone_number_id' => '5550001111',
        'waba_id' => 'waba-1',
        'access_token' => 'token',
        'status' => 'active',
    ]);
    App\Models\ChannelIdentity::create([
        'tenant_id' => $tenant->id,
        'channel_type' => 'whatsapp',
        'account_name' => 'Alpha WhatsApp',
        'external_id' => '5550001111',
        'access_token' => 'token',
        'webhook_verify_token' => 'verify',
        'is_active' => true,
    ]);

    (new App\Jobs\PushInboundToAiJob(['entry' => [['changes' => [['value' => [
        'metadata' => ['phone_number_id' => '5550001111'],
        'contacts' => [['profile' => ['name' => 'Sam'], 'wa_id' => '15552223333']],
        'messages' => [['from' => '15552223333', 'id' => 'wamid.PROMPT1', 'type' => 'text', 'text' => ['body' => 'hello']]],
    ]]]]]]))->handle();

    $job = json_decode(Illuminate\Support\Facades\Redis::lpop('test_inbound_ai_jobs'), true);
    Illuminate\Support\Facades\Redis::del('test_inbound_ai_jobs');

    expect($job['ai_config'])->toMatchArray([
        'system_prompt' => 'You are Alpha\'s concierge.',
        'ai_tone' => 'friendly_efficient',
        'prohibited_topics' => 'politics',
        'temperature' => 0.4,
        'company_name' => 'Alpha Co',
    ]);
});
