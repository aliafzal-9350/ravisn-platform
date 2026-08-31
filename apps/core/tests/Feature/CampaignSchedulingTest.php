<?php

use App\Jobs\ProcessCampaign;
use App\Models\Campaign;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappAccount;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Queue;

function createSchedulingTenant(): array
{
    $tenant = Tenant::create([
        'name' => 'Acme',
        'email' => 'billing@example.com',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'tenant_id' => $tenant->id,
        'role' => 'client',
    ]);

    $account = WhatsappAccount::create([
        'tenant_id' => $tenant->id,
        'waba_id' => '123456789',
        'app_id' => 'app-id',
        'app_secret' => 'app-secret',
        'phone_number_id' => 'phone-number-id',
        'phone_number' => '+15551234567',
        'display_name' => 'Sales',
        'status' => 'active',
        'quality_rating' => 'GREEN',
    ]);

    return [$tenant, $user, $account];
}

it('stores scheduled campaign times in utc using the selected timezone', function () {
    [$tenant, $user, $account] = createSchedulingTenant();

    $this->actingAs($user)
        ->post(route('client.campaigns.store'), [
            'name' => 'Scheduled follow up',
            'whatsapp_account_id' => $account->id,
            'message_type' => 'direct',
            'direct_message_body' => 'We will send this later.',
            'scheduled_at' => '2030-01-01T10:00',
            'scheduled_timezone' => 'Africa/Cairo',
            'recipients' => [
                ['phone_number' => '+15557654321'],
            ],
        ])
        ->assertRedirect();

    $campaign = $tenant->campaigns()->firstOrFail();
    $expectedUtc = CarbonImmutable::parse('2030-01-01T10:00', 'Africa/Cairo')->utc();

    expect($campaign)
        ->status->toBe('scheduled')
        ->scheduled_timezone->toBe('Africa/Cairo')
        ->and($campaign->scheduled_at->timestamp)->toBe($expectedUtc->timestamp);
});

it('dispatches due scheduled campaigns automatically', function () {
    Queue::fake();
    [$tenant, , $account] = createSchedulingTenant();

    $dueCampaign = Campaign::create([
        'tenant_id' => $tenant->id,
        'whatsapp_account_id' => $account->id,
        'message_type' => 'direct',
        'direct_message_body' => 'Due now.',
        'name' => 'Due campaign',
        'status' => 'scheduled',
        'total_recipients' => 1,
        'scheduled_at' => now()->subMinute(),
        'scheduled_timezone' => 'UTC',
    ]);

    Campaign::create([
        'tenant_id' => $tenant->id,
        'whatsapp_account_id' => $account->id,
        'message_type' => 'direct',
        'direct_message_body' => 'Later.',
        'name' => 'Future campaign',
        'status' => 'scheduled',
        'total_recipients' => 1,
        'scheduled_at' => now()->addHour(),
        'scheduled_timezone' => 'UTC',
    ]);

    $this->artisan('campaigns:dispatch-scheduled')
        ->expectsOutput('Dispatched 1 scheduled campaign(s).')
        ->assertSuccessful();

    expect($dueCampaign->refresh())->status->toBe('processing');

    Queue::assertPushed(ProcessCampaign::class, function (ProcessCampaign $job) use ($dueCampaign): bool {
        return $job->campaign->is($dueCampaign);
    });
});
