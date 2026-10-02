<?php

namespace App\Broadcasting;

use App\Models\KnowledgeIngestionJob;
use App\Models\User;
use Illuminate\Support\Str;

class KnowledgeIngestionChannel
{
    /**
     * Ingestion progress is visible only to the user who started the upload.
     */
    public function join(User $user, string $id): bool
    {
        return Str::isUuid($id)
            && KnowledgeIngestionJob::whereKey($id)->where('uploaded_by_user_id', $user->id)->exists();
    }
}
