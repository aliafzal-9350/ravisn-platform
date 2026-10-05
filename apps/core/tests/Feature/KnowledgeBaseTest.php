<?php

use App\Models\KnowledgeBase;
use App\Models\KnowledgeChunk;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated user can view knowledge base page', function () {
    $user = User::factory()->for(Tenant::factory())->create();

    $this->actingAs($user)
        ->get('/dashboard/knowledge')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client/knowledge/index')
            ->has('entries')
            ->has('stats')
        );
});

test('authenticated user can store and retrieve a qa knowledge entry', function () {
    Http::fake([
        '*/api/v1/knowledge/embed' => Http::response(['embedding' => array_fill(0, 1536, 0.01)], 200),
    ]);

    $user = User::factory()->for(Tenant::factory())->create();

    $response = $this->actingAs($user)
        ->postJson('/dashboard/knowledge/entry', [
            'question' => 'What is your business email address?',
            'answer' => 'You can reach us at business@ravisn.com anytime.',
        ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'entry' => [
                'question' => 'What is your business email address?',
                'answer' => 'You can reach us at business@ravisn.com anytime.',
            ],
        ]);

    $this->assertDatabaseHas('knowledge_chunks', [
        'content' => "Question: What is your business email address?\n\nAnswer: You can reach us at business@ravisn.com anytime.",
    ]);
});

test('authenticated user can update a qa knowledge entry', function () {
    Http::fake([
        '*/api/v1/knowledge/embed' => Http::response(['embedding' => array_fill(0, 1536, 0.01)], 200),
    ]);

    $user = User::factory()->for(Tenant::factory())->create();
    $kb = KnowledgeBase::forTenantOrCreate($user->tenant);

    $chunk = KnowledgeChunk::create([
        'knowledge_base_id' => $kb->id,
        'content' => "Question: Initial Q\n\nAnswer: Initial A",
        'metadata' => [
            'type' => 'qa',
            'question' => 'Initial Q',
            'answer' => 'Initial A',
        ],
    ]);

    $response = $this->actingAs($user)
        ->putJson("/dashboard/knowledge/entry/{$chunk->id}", [
            'question' => 'Updated Q',
            'answer' => 'Updated Answer with hours',
        ]);

    $response->assertOk();

    $this->assertDatabaseHas('knowledge_chunks', [
        'id' => $chunk->id,
        'content' => "Question: Updated Q\n\nAnswer: Updated Answer with hours",
    ]);

    // Clean up
    $chunk->delete();
});

test('authenticated user can delete a single qa knowledge entry', function () {
    $user = User::factory()->for(Tenant::factory())->create();
    $kb = KnowledgeBase::forTenantOrCreate($user->tenant);

    $chunk = KnowledgeChunk::create([
        'knowledge_base_id' => $kb->id,
        'content' => "Question: Temporary Q\n\nAnswer: Temporary A",
        'metadata' => ['question' => 'Temporary Q'],
    ]);

    $response = $this->actingAs($user)
        ->deleteJson("/dashboard/knowledge/entry/{$chunk->id}");

    $response->assertOk();

    $this->assertDatabaseMissing('knowledge_chunks', [
        'id' => $chunk->id,
    ]);
});
