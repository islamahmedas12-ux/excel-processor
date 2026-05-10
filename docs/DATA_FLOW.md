# Data Flow & Storage Architecture

This document describes how data moves through the system and where different types of data are stored.

## Storage Layers Overview

The system uses three distinct storage mechanisms, each optimized for different data types:

| Storage Type | Technology | Purpose | Persistence |
|-------------|------------|---------|-------------|
| **Relational DB** | PostgreSQL | User data, metadata, jobs, subscriptions | Permanent |
| **Object Storage** | MinIO (S3-compatible) | Files, templates, results, avatars | Permanent |
| **In-Memory Cache** | Python Dict | Temporary file staging | Session-only |

## PostgreSQL — Relational Metadata Store

**Connection:** `backend/db.py`

PostgreSQL stores all structural metadata and user information. It never stores file content directly.

### Connection Pool Configuration

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=10,        # maintain 10 persistent connections
    max_overflow=20,     # allow 20 overflow connections under load
    pool_recycle=300,     # recycle connections every 5 minutes
    future=True,
)
```

### Database Models

```
users                  # User accounts and authentication
plans                  # Subscription plan definitions (JSONB)
subscriptions          # User subscriptions with proof references
verification_tokens    # Public document access tokens
jobs                   # Async job queue and status tracking
templates              # Excel template metadata with SHA256 hashes
```

### Key Design Decisions

- **Session management** via `session_scope()` context manager ensures proper commit/rollback
- **Pool recycling** at 300s prevents stale connections without requiring ping-on-checkout
- **JSONB columns** (`params`, `data`) store flexible structured data without schema migrations
- **String primary keys** (UUIDs) used throughout for consistent external referencing

## MinIO — Object Storage for File Content

**Module:** `backend/services/storage.py`

All binary content lives in MinIO, accessed via S3-compatible API. PostgreSQL stores references (keys) to MinIO objects.

### Bucket Architecture

```
avatars/         → User profile images
proofs/          → Subscription payment proof files
templates/       → Excel template files (with SHA256 for dedup)
job-results/     → Computed Excel results and exports
```

### Storage Operations

```python
# Write
storage.put(bucket, key, content, content_type)

# Read
content = storage.get(bucket, key)

# Stream (for large files, 64KB chunks)
for chunk in storage.stream(bucket, key):
    yield chunk

# Check existence
exists = storage.exists(bucket, key)

# Delete
storage.delete(bucket, key)
```

### Auto-Bucket Initialization

Buckets are created idempotently on first use via `ensure_buckets()`. This runs once per process lifetime.

### Error Handling

- `NoSuchKey` / `404` on `get()` returns `None` instead of raising
- `NoSuchKey` / `404` on `delete()` is silently ignored
- Other S3 errors propagate as `ClientError`

## FileStore — In-Memory Temporary Storage

**Module:** `backend/services/file_store.py`

A singleton `FileStore` instance (`file_store`) provides ephemeral in-memory file storage. Files exist only until the server restarts.

### Use Cases

- Temporary file staging before MinIO upload
- Development/testing without MinIO dependency
- Short-lived file operations that don't require persistence

### FileStore Operations

```python
# Upload returns public metadata (no content in response)
entry = file_store.upload(filename, content, owner_email, category_id)
# Returns: {id, name, size, uploaded_at, category_id, owner_email}

# List files by owner
files = file_store.list_all(owner_email)

# Get file metadata
meta = file_store.get_meta(file_id, owner_email)

# Get file content
content = file_store.get_content(file_id, owner_email)

# Delete file
deleted = file_store.delete(file_id, owner_email)

# Check storage usage
usage = file_store.usage(owner_email)
# Returns: {file_count, total_bytes}
```

### Data Structure

```python
_files: Dict[str, dict] = {
    "uuid-1": {
        "id":          "uuid-1",
        "name":        "salary.xlsx",
        "size":        45000,
        "uploaded_at": "2026-05-10T12:00:00Z",
        "category_id": "cat-123",
        "owner_email":  "user@example.com",
        "content":      <bytes>,   # hidden from public API
    },
}
```

### Security

All operations accept `owner_email` parameter for ownership validation. Unauthorized access returns `None`/`False`.

## Data Flow Patterns

### Pattern 1: User Uploads Excel File for Processing

```
User API Request (multipart/form-data)
         ↓
Backend receives file bytes + inputs JSON
         ↓
FileStore.upload() → stores in memory temporarily
         ↓
ExcelService.execute() → processes in-memory
         ↓
Results returned to user (no persistent storage needed)
```

### Pattern 2: User Saves File to Repository

```
User API Request (file + category_id)
         ↓
FileStore.upload() → temporary in-memory storage
         ↓
storage.put(BUCKET_TEMPLATES, key, content) → MinIO
         ↓
Template record created in PostgreSQL (metadata only)
         ↓
FileStore.delete() → cleanup temporary copy
```

### Pattern 3: Document Verification (Public Access)

```
External user accesses /verify/<access_code>
         ↓
Lookup verification_token by access_code
         ↓
storage.get(BUCKET_PROOFS, resource_key) → fetch from MinIO
         ↓
File content returned or 404 if expired/missing
```

### Pattern 4: Async Job Processing

```
User POST /jobs → creates Job record in PostgreSQL
         ↓
Background worker picks up job
         ↓
ExcelService executes → may use MinIO for large files
         ↓
Job record updated (status, result_ext, error)
         ↓
User polls GET /jobs/<id> for results
```

## Storage Selection Guide

| Data Type | Storage | Rationale |
|-----------|---------|------------|
| User accounts | PostgreSQL | Relational, queryable, indexed |
| File content | MinIO | Large binary blobs, S3-compatible |
| File metadata | PostgreSQL | Searchable, joinable with users |
| Session tokens | PostgreSQL | Persistent across restarts |
| Verification codes | PostgreSQL | Indexed lookup, expiration |
| Async job queue | PostgreSQL | Status tracking, retry support |
| Template definitions | PostgreSQL | SHA256 dedup, owner relationship |
| Temporary staging | FileStore (memory) | Fast, no persistence needed |
| Avatar images | MinIO | Binary large objects |

## Environment Configuration

### PostgreSQL

```bash
DATABASE_URL=postgresql://excel:dev@localhost:5432/excel_processor
# or in Docker:
DATABASE_URL=postgresql://excel:dev@postgres:5432/excel_processor
```

### MinIO / S3

```bash
S3_ENDPOINT_URL=http://localhost:9000          # local dev
S3_ENDPOINT_URL=http://minio:9000             # Docker
S3_ACCESS_KEY=excel
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1
```

### In-Memory (No Configuration)

FileStore requires no environment variables. It initializes as an empty dict on module import.

## Performance Considerations

- **Connection pooling** in PostgreSQL avoids connection overhead per request
- **Stream downloads** from MinIO use 64KB chunks to handle large files without memory spikes
- **FileStore in-memory** operations are fastest but lose data on restart
- **Bucket auto-creation** uses `head_bucket` to avoid unnecessary `create_bucket` calls

## Failure Modes

| Component | Failure | Impact | Mitigation |
|-----------|---------|--------|------------|
| PostgreSQL down | All metadata unavailable | Service degradation | Health check endpoint reports status |
| MinIO down | Cannot read/write files | File operations fail | Graceful error with user feedback |
| FileStore | Server restart | Temporary files lost | Re-upload required |
| Network partition | S3 operations timeout | Request failures | Timeout handling with retries |