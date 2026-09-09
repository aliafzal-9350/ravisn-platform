# Database Architecture & pgvector Reference — RAVISN

## 1. Database Overview

RAVISN uses **PostgreSQL 16** with the **`pgvector`** extension enabled (`CREATE EXTENSION IF NOT EXISTS vector;`).
All database schema migrations are maintained under `apps/core/database/migrations/` and shared with `apps/agent` via SQLAlchemy models (`apps/agent/src/db/models.py`).

---

## 2. Core Entity Relationship Model

```text
  +------------------+         +------------------+         +------------------+
  |     tenants      | 1 --- * |channel_identities|         |     contacts     |
  +------------------+         +------------------+         +------------------+
          | 1                           | 1                          | 1
          |                             |                            |
          *                             *                            *
  +------------------+         +------------------+         +------------------+
  |  knowledge_bases |         |     threads      | * --- 1 |     contacts     |
  +------------------+         +------------------+         +------------------+
          | 1                           | 1
          |                             |
          *                             *
  +------------------+         +------------------+
  | knowledge_chunks |         |     messages     |
  | (vector(1536))   |         | (AI telemetry)   |
  +------------------+         +------------------+
```

---

## 3. Key Table Specifications

### 3.1 `knowledge_chunks` (pgvector RAG Store)
Stores segmented document embeddings and metadata for Hybrid RAG:
```sql
CREATE TABLE knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    knowledge_base_id BIGINT REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast Approximate Nearest Neighbor Index (Cosine Distance)
CREATE INDEX idx_knowledge_chunks_embedding_hnsw 
ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Lexical Full-Text Search Index
CREATE INDEX idx_knowledge_chunks_fts 
ON knowledge_chunks 
USING gin (to_tsvector('english', content));
```

### 3.2 `threads` (Conversation State & Human Takeover)
Controls conversation flow and staff takeover state:
```sql
CREATE TABLE threads (
    id BIGSERIAL PRIMARY KEY,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    channel_identity_id BIGINT REFERENCES channel_identities(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL,
    external_thread_id VARCHAR(255) NOT NULL,
    bot_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 3.3 `messages` (Omnichannel Audit & AI Telemetry)
Captures every message exchange with token counts and inference telemetry:
- `direction`: `inbound` | `outbound`
- `message_type`: `text` | `audio` | `image` | `document` | `template`
- `ai_model`: Model provider string (e.g. `llama-3.3-70b-versatile`, `gemini-2.5-flash`)
- `prompt_tokens`: Input tokens billed
- `completion_tokens`: Output tokens generated
- `latency_ms`: Total execution time in milliseconds
- `detected_intent`: Classified user intent (`sales`, `support`, `pricing`, `human_agent`)

---

## 4. Database Maintenance & Operations

```bash
# Execute Migrations
docker compose exec core php artisan migrate

# Seed Initial Data
docker compose exec core php artisan db:seed

# Automated Backup
./deploy/backup_postgres.sh

# Database Restoration
./deploy/restore_postgres.sh /var/backups/ravisn/ravisn_backup_20260901_120000.sql.gz
```
