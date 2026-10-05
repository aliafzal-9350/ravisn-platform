<?php

use App\Broadcasting\KnowledgeIngestionChannel;
use App\Broadcasting\TenantInboxChannel;
use App\Broadcasting\ThreadChannel;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Every channel is scoped to the user's own tenant. There is deliberately no
| global/admin bypass: no role may listen to another tenant's conversations.
| Authorization lives in app/Broadcasting so it can be unit tested.
|
*/

// private-tenant.{id}.inbox
Broadcast::channel('tenant.{id}.inbox', TenantInboxChannel::class);

// private-chat.thread.{id}
Broadcast::channel('chat.thread.{id}', ThreadChannel::class);

// private-knowledge.ingestion.{id}
Broadcast::channel('knowledge.ingestion.{id}', KnowledgeIngestionChannel::class);
