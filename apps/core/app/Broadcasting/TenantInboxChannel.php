<?php

namespace App\Broadcasting;

use App\Models\User;

class TenantInboxChannel
{
    /**
     * The tenant-wide inbox stream is private to that tenant's own users.
     * There is deliberately no admin/global bypass.
     */
    public function join(User $user, string $id): bool
    {
        return $user->tenant_id !== null && (string) $user->tenant_id === $id;
    }
}
