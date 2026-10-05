<?php

namespace App\Models;

use Database\Factories\TeamInvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['tenant_id', 'email', 'role', 'token', 'invited_by', 'expires_at', 'accepted_at'])]
class TeamInvitation extends Model
{
    /** @use HasFactory<TeamInvitationFactory> */
    use HasFactory;

    public const VALID_DAYS = 7;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Invitations that can still be accepted.
     *
     * @param  Builder<TeamInvitation>  $query
     * @return Builder<TeamInvitation>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')->where('expires_at', '>', now());
    }

    public static function hashToken(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }

    /**
     * Create (or refresh) the invitation for an email and return the plain token,
     * which is only ever available here and in the emailed link.
     *
     * @return array{0: TeamInvitation, 1: string}
     */
    public static function issue(Tenant $tenant, string $email, string $role, ?User $inviter): array
    {
        $plainToken = Str::random(48);

        $invitation = static::updateOrCreate(
            ['tenant_id' => $tenant->id, 'email' => strtolower($email)],
            [
                'role' => $role,
                'token' => static::hashToken($plainToken),
                'invited_by' => $inviter?->id,
                'expires_at' => now()->addDays(static::VALID_DAYS),
                'accepted_at' => null,
            ],
        );

        return [$invitation, $plainToken];
    }

    public static function findPendingByToken(string $plainToken): ?self
    {
        return static::pending()->where('token', static::hashToken($plainToken))->first();
    }
}
