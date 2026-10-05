<?php

namespace App\Broadcasting;

use App\Models\Thread;
use App\Models\User;
use Illuminate\Support\Str;

class ThreadChannel
{
    /**
     * A user may listen to a conversation only if it belongs to their tenant.
     */
    public function join(User $user, string $id): bool
    {
        return Str::isUuid($id)
            && Thread::forTenant($user->tenant_id)->whereKey($id)->exists();
    }
}
