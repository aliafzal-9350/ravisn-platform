<?php

use App\Jobs\ExecuteWorkflowNodeJob;
use App\Models\AutomationFlow;
use App\Models\Tenant;
use App\Models\WhatsappAccount;
use App\Models\WorkflowRun;
use App\Models\WorkflowRunStep;
use App\Services\Automation\ActionExecutor;
use App\Services\Automation\WorkflowEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tenant = Tenant::create([
        'name' => 'Workflow Test Tenant',
        'email' => 'workflow@test.com',
        'status' => 'active',
    ]);

    $this->account = WhatsappAccount::create([
        'tenant_id' => $this->tenant->id,
        'phone_number' => '+15551230000',
        'phone_number_id' => '1234567890',
        'waba_id' => '987654321',
        'access_token' => 'dummy_token',
        'status' => 'active',
    ]);

    $this->flow = AutomationFlow::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Trigger -> Delay -> Send Message',
        'trigger_type' => 'keyword',
        'trigger_keyword' => 'hi',
        'trigger_match_type' => 'contains',
        'actions' => [
            ['type' => 'delay', 'delay_seconds' => 2],
            ['type' => 'send_message', 'text' => 'Thanks for reaching out, {{{senderName}}}!'],
        ],
        'is_active' => true,
    ]);
});

test('starting a run dispatches the first node without a delay', function () {
    Queue::fake();

    $run = app(WorkflowEngine::class)->startRun($this->flow, [
        'customer_phone' => '+15559998888',
        'message_text' => 'hi there',
        'whatsapp_account_id' => (string) $this->account->id,
    ]);

    expect($run->status)->toBe('running');

    Queue::assertPushed(ExecuteWorkflowNodeJob::class, function (ExecuteWorkflowNodeJob $job) use ($run) {
        return $job->workflowRunId === $run->id && $job->nodeId === 'seq:0' && $job->hop === 0;
    });
});

test('a delay node schedules the next node with the configured delay and does not run the action inline', function () {
    Queue::fake();

    $run = app(WorkflowEngine::class)->startRun($this->flow, [
        'customer_phone' => '+15559998888',
        'message_text' => 'hi there',
        'whatsapp_account_id' => (string) $this->account->id,
    ]);

    // Simulate the queue worker picking up the first (delay) node job.
    (new ExecuteWorkflowNodeJob($run->id, 'seq:0'))->handle(app(WorkflowEngine::class), app(ActionExecutor::class));

    $delayStep = WorkflowRunStep::where('workflow_run_id', $run->id)->where('node_id', 'seq:0')->first();
    expect($delayStep->status)->toBe('completed');
    expect($delayStep->action_type)->toBe('delay');

    Queue::assertPushed(ExecuteWorkflowNodeJob::class, function (ExecuteWorkflowNodeJob $job) use ($run) {
        return $job->workflowRunId === $run->id
            && $job->nodeId === 'seq:1'
            && $job->hop === 1
            && $job->delay !== null;
    });
});

test('the send_message node executes the action and completes the run', function () {
    Http::fake([
        '*' => Http::response(['messages' => [['id' => 'wamid.TEST123']]], 200),
    ]);

    $run = WorkflowRun::create([
        'automation_flow_id' => $this->flow->id,
        'tenant_id' => $this->tenant->id,
        'customer_phone' => '+15559998888',
        'trigger_context' => [
            'customer_phone' => '+15559998888',
            'message_text' => 'hi there',
            'whatsapp_account_id' => (string) $this->account->id,
        ],
        'status' => 'running',
        'started_at' => now(),
    ]);

    (new ExecuteWorkflowNodeJob($run->id, 'seq:1', 1))->handle(app(WorkflowEngine::class), app(ActionExecutor::class));

    $step = WorkflowRunStep::where('workflow_run_id', $run->id)->where('node_id', 'seq:1')->first();
    expect($step->status)->toBe('completed');
    expect($step->action_type)->toBe('send_message');
    expect($step->output['status'])->toBe('sent');

    $run->refresh();
    expect($run->status)->toBe('completed');

    Http::assertSent(function ($request) {
        return str_contains($request->url(), '1234567890/messages')
            && $request['text']['body'] === 'Thanks for reaching out, +15559998888!';
    });
});
