<?php

use App\Models\AutomationFlow;
use App\Models\ContactGroup;
use App\Models\Tenant;
use App\Models\User;
use App\Services\WhatsApp\WebhookHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tenant = Tenant::create([
        'name' => 'Test Tenant',
        'email' => 'tenant@test.com',
        'status' => 'active',
    ]);

    $this->user = User::create([
        'name' => 'Test User',
        'email' => 'test@test.com',
        'password' => bcrypt('password'),
        'role' => 'client',
        'tenant_id' => $this->tenant->id,
    ]);

    $this->group = ContactGroup::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Test Group',
    ]);
});

test('client can create an automation flow', function () {
    $response = $this->actingAs($this->user)
        ->post(route('client.automations.store'), [
            'name' => 'Price Query Flow',
            'actions' => [
                [
                    'type' => 'condition',
                    'condition' => 'message contains price',
                    'conditions' => [
                        [
                            'operator' => 'contains',
                            'value' => 'price',
                        ],
                    ],
                    'conditions_relation' => 'OR',
                ],
                [
                    'type' => 'send_message',
                    'text' => 'The price is $10.',
                ],
                [
                    'type' => 'add_to_group',
                    'group_id' => $this->group->id,
                ],
            ],
        ]);

    $response->assertRedirect(route('client.automations.index'));

    $this->assertDatabaseHas('automation_flows', [
        'tenant_id' => $this->tenant->id,
        'name' => 'Price Query Flow',
        'trigger_keyword' => '*',
        'trigger_match_type' => 'contains',
    ]);

    $flow = AutomationFlow::first();
    expect($flow->actions)->toHaveCount(3);
    expect($flow->actions[0]['type'])->toBe('condition');
    expect($flow->actions[0]['conditions'][0]['value'])->toBe('price');
    expect($flow->actions[1]['type'])->toBe('send_message');
    expect($flow->actions[2]['group_id'])->toBe($this->group->id);
});

test('client can view create and edit flow builder pages', function () {
    $flow = AutomationFlow::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Test Flow',
        'trigger_keyword' => 'hi',
        'trigger_match_type' => 'exact',
        'actions' => [['type' => 'send_message', 'text' => 'hello']],
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->get(route('client.automations.create'))
        ->assertOk();

    $this->actingAs($this->user)
        ->get(route('client.automations.edit', $flow))
        ->assertOk();
});

test('client can save advanced automation flow nodes', function () {
    $response = $this->actingAs($this->user)
        ->post(route('client.automations.store'), [
            'name' => 'Lead Routing Flow',
            'actions' => [
                [
                    'type' => 'http_request',
                    'method' => 'POST',
                    'url' => 'https://example.com/webhook',
                    'body' => '{"phone":"{{{senderMobile}}}"}',
                ],
                [
                    'type' => 'save_response',
                    'response_field' => 'var1',
                ],
                [
                    'type' => 'delay',
                    'delay_seconds' => 30,
                ],
            ],
            'visual_graph' => [
                'nodes' => [
                    [
                        'id' => 'start',
                        'type' => 'startNode',
                        'position' => ['x' => 120, 'y' => 160],
                        'data' => ['title' => 'البداية'],
                    ],
                ],
                'edges' => [],
            ],
        ]);

    $response->assertRedirect(route('client.automations.index'));

    $flow = AutomationFlow::where('name', 'Lead Routing Flow')->first();

    expect($flow)->not->toBeNull()
        ->and($flow->actions)->toHaveCount(3)
        ->and($flow->actions[0]['type'])->toBe('http_request')
        ->and($flow->actions[1]['response_field'])->toBe('var1')
        ->and($flow->visual_graph['nodes'][0]['type'])->toBe('startNode');
});

test('client can export and import an automation flow', function () {
    $flow = AutomationFlow::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Exported Flow',
        'trigger_keyword' => 'export',
        'trigger_match_type' => 'contains',
        'actions' => [
            ['type' => 'send_message', 'text' => 'hello'],
            ['type' => 'delay', 'delay_seconds' => 10],
        ],
        'visual_graph' => ['nodes' => [], 'edges' => []],
        'is_active' => true,
    ]);

    $export = $this->actingAs($this->user)
        ->get(route('client.automations.export', $flow));

    $export->assertOk()
        ->assertHeader('content-disposition');

    $payload = json_decode($export->getContent(), true);

    expect($payload['type'])->toBe('ravisn.automation_flow')
        ->and($payload['flow']['name'])->toBe('Exported Flow');

    $file = UploadedFile::fake()->createWithContent('flow.json', json_encode($payload));

    $this->actingAs($this->user)
        ->post(route('client.automations.import'), [
            'flow_file' => $file,
        ])
        ->assertRedirect(route('client.automations.index'));

    $imported = AutomationFlow::where('name', 'Exported Flow (Imported)')->first();

    expect($imported)->not->toBeNull()
        ->and($imported->is_active)->toBeFalse()
        ->and($imported->actions)->toHaveCount(2);
});

test('client can import a logic flow without trigger fields', function () {
    $payload = [
        'type' => 'ravisn.automation_flow',
        'flow' => [
            'name' => 'Logic Only',
            'actions' => [
                ['type' => 'condition', 'condition' => 'message contains support'],
                ['type' => 'send_message', 'text' => 'Support will reply shortly.'],
            ],
            'visual_graph' => ['nodes' => [], 'edges' => []],
        ],
    ];

    $file = UploadedFile::fake()->createWithContent('logic-flow.json', json_encode($payload));

    $this->actingAs($this->user)
        ->post(route('client.automations.import'), [
            'flow_file' => $file,
        ])
        ->assertRedirect(route('client.automations.index'));

    $flow = AutomationFlow::where('name', 'Logic Only (Imported)')->first();

    expect($flow)->not->toBeNull()
        ->and($flow->trigger_keyword)->toBe('*')
        ->and($flow->actions[0]['type'])->toBe('condition');
});

test('automation condition matches incoming message text', function () {
    $handler = new class extends WebhookHandler
    {
        public function matches(?string $condition, string $message): bool
        {
            return $this->automationConditionMatches($condition, $message);
        }
    };

    expect($handler->matches('message contains price', 'What is the price?'))->toBeTrue()
        ->and($handler->matches('message equals yes', 'yes'))->toBeTrue()
        ->and($handler->matches('message starts_with order', 'order 123'))->toBeTrue()
        ->and($handler->matches('message contains support', 'hello sales'))->toBeFalse();
});

test('automation condition returns the matched branch index', function () {
    $handler = new class extends WebhookHandler
    {
        /**
         * @return array{matched: bool, branch_index: int|null}
         */
        public function outcome(array $action, string $message): array
        {
            return $this->automationConditionOutcome($action, $message);
        }
    };

    $outcome = $handler->outcome([
        'type' => 'condition',
        'conditions_relation' => 'OR',
        'conditions' => [
            ['operator' => 'contains', 'value' => 'price'],
            ['operator' => 'contains', 'value' => 'support'],
        ],
    ], 'I need support');

    expect($outcome['matched'])->toBeTrue()
        ->and($outcome['branch_index'])->toBe(1);
});

test('client can toggle an automation flow status', function () {
    $flow = AutomationFlow::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Test Flow',
        'trigger_keyword' => 'hi',
        'trigger_match_type' => 'exact',
        'actions' => [['type' => 'send_message', 'text' => 'hello']],
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('client.automations.toggle', $flow));

    $response->assertRedirect(route('client.automations.index'));
    expect($flow->fresh()->is_active)->toBeFalse();
});

test('client can delete an automation flow', function () {
    $flow = AutomationFlow::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Test Flow',
        'trigger_keyword' => 'hi',
        'trigger_match_type' => 'exact',
        'actions' => [['type' => 'send_message', 'text' => 'hello']],
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->delete(route('client.automations.destroy', $flow));

    $response->assertRedirect(route('client.automations.index'));
    $this->assertDatabaseMissing('automation_flows', ['id' => $flow->id]);
});
