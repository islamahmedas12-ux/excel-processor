# Background Job Processing System

Documentation for the async job system that handles long-running operations like PDF export and merging.

## Overview

The async job system decouples time-consuming operations from the request-response cycle. Jobs are created via API, queued for background processing, and results are stored for later retrieval. This prevents HTTP timeouts and allows users to continue other work while processing completes.

```
User creates job
     ↓
API returns job_id immediately (status: pending)
     ↓
Background worker picks up job
     ↓
Worker executes operation (Excel→PDF, PDF merge, etc.)
     ↓
Result saved to MinIO, job status updated
     ↓
User polls for status, downloads result when ready
```

## Architecture

### Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend    │────▶│  PostgreSQL │     │    MinIO    │
│  (API/Worker)│     │  (Job Queue)│     │ (Results)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Job Queue** | PostgreSQL `jobs` table | Persistent job metadata |
| **Result Storage** | MinIO `job-results` bucket | Binary results (PDFs, images) |
| **Background Worker** | ThreadPoolExecutor | Async execution within Flask |
| **Result Expiry** | cleanup_expired() cron | Auto-prune old jobs |

### Module: `backend/services/job_store.py`

Postgres-backed async job store. Jobs live for 24 hours then are pruned by cleanup_expired(). Result files live in MinIO (`job-results` bucket, key = `<job_id><result_ext>`).

## Job Model

### Database Schema

The `jobs` table stores all job metadata:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique job identifier |
| `owner_email` | VARCHAR(255) | Job owner's email |
| `job_type` | VARCHAR(100) | Job type: `pdf_export`, `pdf_merge`, etc. |
| `status` | VARCHAR(50) | `pending`, `running`, `completed`, `failed` |
| `params` | JSONB | Job-specific parameters (inputs, options) |
| `error` | TEXT | Error message if failed |
| `result_ext` | VARCHAR(50) | Result file extension (`.pdf`, `.xlsx`) |
| `created_at` | TIMESTAMP | UTC creation timestamp |
| `updated_at` | TIMESTAMP | UTC last update timestamp |

### Job Lifecycle

```
pending ──▶ running ──▶ completed
              │
              └──────────▶ failed
```

| Status | Meaning |
|--------|---------|
| `pending` | Job created, awaiting worker pickup |
| `running` | Worker is executing the job |
| `completed` | Job finished successfully, result available |
| `failed` | Job failed, `error` field contains message |

## Storage

### MinIO Bucket: `job-results`

Binary results are stored separately from PostgreSQL:

```
Key format:  <job_id><result_ext>
Example:    550e8400-e29b-41d4-a716-446655440000.pdf

Content-Type: Set per operation (application/pdf, etc.)
```

### Job TTL

Jobs and their results are automatically cleaned up after **24 hours** by `cleanup_expired()`. This runs on a schedule (typically via cron or systemd timer) to prevent storage bloat.

## API Endpoints

### Job Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/jobs` | Create a new async job |
| `GET` | `/api/v1/jobs` | List user's jobs |
| `GET` | `/api/v1/jobs/<job_id>` | Get job status and details |
| `DELETE` | `/api/v1/jobs/<job_id>` | Delete a job and its result |
| `GET` | `/api/v1/jobs/<job_id>/download` | Download job result |

### Create Job Request

```json
POST /api/v1/jobs
{
  "job_type": "pdf_export",
  "params": {
    "file_id": "abc123",
    "sheet": "Sheet1",
    "landscape": false
  }
}
```

### Create Job Response

```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_type": "pdf_export",
    "status": "pending",
    "created_at": "2026-05-10T12:00:00Z"
  }
}
```

### Job Status Response

```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_type": "pdf_export",
    "status": "completed",
    "params": { "file_id": "abc123" },
    "result_ext": ".pdf",
    "created_at": "2026-05-10T12:00:00Z",
    "updated_at": "2026-05-10T12:01:30Z"
  }
}
```

### Error Response

```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "failed",
    "error": "File not found or invalid Excel format"
  }
}
```

## Job Types

### PDF Export (`pdf_export`)

Exports an Excel file to PDF format.

**Params:**
```json
{
  "file_id": "string",       // Excel file ID in repository
  "sheet": "string",         // Sheet name (optional, default first sheet)
  "landscape": boolean,      // Landscape orientation (default false)
  "fit_to_page": boolean     // Fit content to page (default true)
}
```

**Result:** PDF file (`<job_id>.pdf`)

### PDF Merge (`pdf_merge`)

Merges multiple PDF files into one.

**Params:**
```json
{
  "result_ids": ["id1", "id2", "..."]  // Array of result/file IDs
}
```

**Result:** Merged PDF file (`<job_id>.pdf`)

## Code Examples

### Creating a Job

```python
from backend.services import job_store

# Create a PDF export job
job = job_store.create(
    owner_email = "user@example.com",
    job_type    = "pdf_export",
    params      = {"file_id": "abc123", "sheet": "Sheet1"}
)

job_id = job['id']  # Use this to poll for status
```

### Updating Job Status

```python
from backend.services import job_store

# Mark job as running
job_store.update_status(job_id, "running")

# Mark job as completed with result
job_store.update_status(job_id, "completed", result_ext=".pdf")

# Mark job as failed
job_store.update_status(job_id, "failed", error="Invalid Excel format")
```

### Saving Results

```python
from backend.services import job_store

# Save PDF result to MinIO
job_store.save_result(
    job_id      = "550e8400-e29b-41d4-a716-446655440000",
    content     = pdf_bytes,
    result_ext  = ".pdf",
    content_type = "application/pdf"
)

# Update job status after saving result
job_store.update_status(job_id, "completed", result_ext=".pdf")
```

### Retrieving Results

```python
from backend.services import job_store

# Get job details
job = job_store.get(job_id)
if job['status'] == 'completed':
    # Download result bytes
    result_bytes = job_store.get_result_bytes(job_id)
    # result_bytes is bytes, not file path

# List all jobs for user
jobs = job_store.list_by_owner("user@example.com")
```

### Polling Pattern

```python
import time
from backend.services import job_store

job = job_store.create(owner_email, "pdf_export", params)
job_id = job['id']

while True:
    job = job_store.get(job_id)
    if job['status'] in ('completed', 'failed'):
        break
    time.sleep(2)  # Poll every 2 seconds

if job['status'] == 'completed':
    result = job_store.get_result_bytes(job_id)
    # Process result...
else:
    print(f"Job failed: {job['error']}")
```

## Cleanup Cron

Jobs older than 24 hours are automatically deleted:

```python
# backend/services/job_store.py
JOB_TTL_HOURS = 24

def cleanup_expired():
    """Delete jobs and their results older than JOB_TTL_HOURS."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=JOB_TTL_HOURS)
    with session_scope() as s:
        old = s.execute(select(Job).where(Job.created_at < cutoff)).scalars().all()
        for j in old:
            if j.result_ext:
                storage.delete(storage.BUCKET_RESULTS, _result_key(j.id, j.result_ext))
        s.execute(delete(Job).where(Job.created_at < cutoff))
```

### Systemd Timer (Recommended for Production)

```ini
# /etc/systemd/system/excel-processor-cleanup.timer
[Timer]
OnBootSec=5min
OnUnitActiveSec=1h
Unit=excel-processor-cleanup.service

[Service]
Type=oneshot
WorkingDirectory=/opt/excel-processor
ExecStart=/opt/excel-processor/venv/bin/python -c "from backend.services import job_store; job_store.cleanup_expired()"
```

Or via cron:

```bash
# /etc/cron.d/excel-processor-cleanup
0 * * * * excel-processor /opt/excel-processor/venv/bin/python -c "from backend.services import job_store; job_store.cleanup_expired()"
```

## Rate Limiting

Active jobs are counted per user to prevent queue flooding:

```python
from backend.services import job_store

active_count = job_store.count_active("user@example.com")
if active_count >= MAX_CONCURRENT_JOBS:
    return jsonify({"error": "Too many active jobs"}), 429
```

Default limit: 5 concurrent jobs per user.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `File not found` | Referenced file_id doesn't exist | Check file_id validity |
| `Invalid Excel format` | File cannot be opened by openpyxl | Re-upload valid .xlsx/.xls |
| `PDF conversion failed` | Excel sheet too complex | Simplify formulas/charts |
| `No result yet` | Polling before completion | Wait and retry |
| `Job expired` | Job exceeded 24-hour TTL | Create new job |

## Performance Considerations

- **ThreadPoolExecutor**: Background work runs in threads, not blocking the main request
- **Result Streaming**: Large PDFs use 64KB chunked reads from MinIO
- **Efficient Pruning**: `cleanup_expired()` deletes in batches with single transaction
- **Max Active Jobs**: Prevents resource exhaustion from queue flooding

## Security

- Jobs are owned by a specific user; cross-user access is denied
- Results are only downloadable by the job owner
- File IDs in job params are validated against ownership
- Cleanup removes expired jobs regardless of owner

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — System overview
- [DATA_FLOW.md](DATA_FLOW.md) — Storage and data flow patterns
- [AUTHENTICATION.md](AUTHENTICATION.md) — JWT authentication
