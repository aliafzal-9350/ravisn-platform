<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when the AI embedding service cannot be reached or returns no
 * vector, so callers fail loudly instead of silently indexing a
 * non-semantic placeholder vector that would quietly break RAG retrieval.
 */
class EmbeddingUnavailableException extends RuntimeException
{
    //
}
