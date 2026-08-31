<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable([
    'tenant_id', 'name', 'phone', 'email', 'notes',
    'var1', 'var2', 'var3', 'var4', 'var5',
])]
class Contact extends Model
{
    use HasFactory;

    /**
     * The data type of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';



    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'tenant_id' => 'string',
        ];
    }

    /**
     * Get the tenant that owns the contact.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the groups that this contact belongs to.
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(
            ContactGroup::class,
            'contact_group_memberships',
            'contact_id',
            'contact_group_id'
        );
    }
}
