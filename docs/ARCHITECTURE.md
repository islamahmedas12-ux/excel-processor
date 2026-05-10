# Excel Processor - Architecture Documentation

**Excel as a Backend Service** - 让公司将他们的 Excel 文件变成强大的 API。

## System Overview

Excel Processor transforms complex Excel files into programmable backend services. Users upload Excel files, modify input cells via API, and receive calculated outputs without needing to understand the underlying Excel logic.

```
Company Excel System
    ↓
Upload Excel file
    ↓
API: Update input cells → Excel auto-calculates → Read output results
    ↓
Developers consume API — no Excel expertise required
```

## Service Architecture

The system consists of multiple Docker services communicating over a bridge network (`excel-net`):

```
┌─────────────────────────────────────────────────────────────────┐
│                        Excel-Net Network                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │  Frontend   │     │   Admin     │     │  Landing    │       │
│   │  :3000:80   │     │  :3100:80   │     │  :4200:4200 │       │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘       │
│          │                   │                   │              │
│          └───────────────────┼───────────────────┘              │
│                              │                                  │
│                              ▼                                  │
│                      ┌─────────────┐                           │
│                      │   Backend    │                           │
│                      │  :5000:5000 │                           │
│                      └──────┬──────┘                           │
│                             │                                   │
│          ┌──────────────────┼──────────────────┐               │
│          │                  │                  │               │
│          ▼                  ▼                  ▼               │
│   ┌─────────────┐     ┌─────────────┐                           │
│   │  Postgres   │     │   MinIO     │                           │
│   │  :5433:5432 │     │  :9100:9000 │                           │
│   │             │     │  :9101:9001 │                           │
│   └─────────────┘     └─────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Service Details

### Backend Service (Flask API)

**Container:** `excel-backend`  
**Port:** `5000`  
**Tech Stack:** Python, Flask, flask-cors

The backend is the core API server handling all Excel processing operations. It depends on PostgreSQL and MinIO services.

**Environment Variables:**
- `FRONTEND_URL` — Set to `http://localhost:3000`
- `S3_ENDPOINT_URL` — Points to MinIO (`http://minio:9000` in Docker)
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` — MinIO credentials
- `DATABASE_URL` — PostgreSQL connection string

**Core Modules:**
```
backend/
├── api/
│   └── endpoints.py      # All API routes
├── services/
│   ├── excel_service.py   # Excel execute/read/write operations
│   ├── file_store.py      # File repository management
│   ├── result_store.py   # Computation result storage
│   ├── category_store.py # File categorization
│   ├── auth_service.py   # JWT authentication
│   ├── email_service.py  # Email notifications
│   ├── pdf_export_service.py  # Excel to PDF conversion
│   ├── pdf_merge_service.py   # PDF merging
│   ├── image_service.py  # Image/QR injection into Excel
│   └── template_store.py # Template library
├── db.py                 # SQLAlchemy database setup
└── models.py             # Database models (User, etc.)
```

### Excel Processing Module

```
excel_processor/
├── file_reader.py   # Reading cells and sheet names from Excel
├── file_editor.py   # Writing/modifying Excel files
├── validators.py   # Input validation
└── errors.py        # Error definitions
```

**ExcelService Operations:**
- `execute()` — Fill input cells → Excel calculates → Return outputs
- `read_cells()` — Read specific cell values from Excel
- `write_cells()` — Update cells and save modified file
- PDF export, image injection, QR code embedding

### Frontend Service

**Container:** `excel-frontend`  
**Port:** `3000` (mapped to internal port 80)  
**Tech Stack:** Vite, React, TypeScript, TailwindCSS

User-facing web application for file management and Excel processing.

### Admin Service

**Container:** `excel-admin`  
**Port:** `3100` (mapped to internal port 80)  
**Tech Stack:** Vite, React, TypeScript, TailwindCSS

Administrative interface for system management.

### Landing Service

**Container:** `excel-landing`  
**Port:** `4200`  
**Tech Stack:** Next.js

Marketing landing page with information about the service.

### PostgreSQL Database

**Container:** `excel-postgres-local`  
**Port:** `5433` (host) → `5432` (container)  
**Image:** `postgres:16-alpine`

Stores:
- User accounts and authentication
- Subscription and plan information
- Usage statistics

**Health Check:**
```bash
pg_isready -U excel -d excel_processor
```

### MinIO Object Storage

**Container:** `excel-minio-local`  
**Ports:** `9100` (API), `9101` (Console)  
**Image:** `minio/minio:latest`

S3-compatible object storage for:
- Excel file repository
- Computation results
- Generated PDFs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/execute` | **Core** — Upload Excel + fill inputs → get calculated outputs |
| `POST` | `/api/v1/read` | Read specific cells from Excel |
| `POST` | `/api/v1/write` | Write to cells and get updated file |
| `POST` | `/api/v1/sheets` | Get list of sheet names |
| `POST` | `/api/v1/export/pdf` | Export Excel to PDF |
| `POST` | `/api/v1/files` | Upload file to repository |
| `GET` | `/api/v1/files` | List user's files |
| `POST` | `/api/v1/categories` | Create file category |
| `POST` | `/api/v1/templates` | Upload template |
| `POST` | `/api/v1/jobs` | Create async job |
| `POST` | `/api/v1/insert/image` | Embed image into Excel |
| `POST` | `/api/v1/insert/qr` | Embed QR code into Excel |
| `POST` | `/api/v1/pdf/merge` | Merge multiple PDFs |
| `GET` | `/api/v1/verify/<code>` | Verify document (public, rate-limited) |
| `GET` | `/api/v1/health` | Health check |

## Data Flow

### Execute Operation Flow

```
1. User uploads Excel file (multipart/form-data)
       ↓
2. Backend receives file + inputs JSON + output cells specification
       ↓
3. ExcelService executes:
   a. Load Excel into memory (openpyxl)
   b. Write input values to specified cells
   c. Excel formulas auto-calculate
   d. Read output cell values
       ↓
4. Return results as JSON
   {
     "success": true,
     "results": {"C13": 5750},
     "sheet": "Sheet1",
     "filename": "salary_calc.xlsx"
   }
```

### File Repository Flow

```
User uploads file
       ↓
FileStore saves to MinIO + metadata to Postgres
       ↓
User receives file_id for future operations
       ↓
User can reference file by ID instead of uploading each time
```

## Network Configuration

All services communicate over the `excel-net` bridge network:

| Service | Internal Hostname | Ports Exposed |
|---------|-------------------|---------------|
| Backend | `backend:5000` | 5000 |
| Frontend | `frontend:80` | 3000 |
| Admin | `admin:80` | 3100 |
| Landing | `landing:4200` | 4200 |
| Postgres | `postgres:5432` | 5433 |
| MinIO | `minio:9000` | 9100, 9101 |

## Environment Configuration

**Development (.env):**
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS` — Comma-separated allowed origins

**Docker Compose Overrides:**
In development, Docker Compose overrides `.env` settings to use in-compose services (`postgres`, `minio`) instead of remote infrastructure.

## Security

- JWT-based authentication for all API endpoints (except public `/verify`)
- Rate limiting on public verification endpoint
- Plan-based upload limits (file count, file size, storage)
- Document verification tokens with 6-character access codes

## Scaling Considerations

- Backend uses ThreadPoolExecutor for async PDF jobs
- In-memory rate limiting with thread-safe locks
- MinIO provides S3-compatible distributed storage
- PostgreSQL handles relational data and user management

## Project Structure

```
excel-processor/
├── backend/
│   ├── api/
│   │   └── endpoints.py      # API routes
│   ├── services/              # Business logic services
│   ├── db.py                 # Database setup
│   └── models.py             # SQLAlchemy models
├── excel_processor/           # Excel processing core
│   ├── file_reader.py
│   ├── file_editor.py
│   └── validators.py
├── frontend/                  # User-facing React app
├── admin/                    # Admin React app
├── landing/                  # Next.js landing page
├── docs/
│   └── ARCHITECTURE.md       # This document
├── main.py                   # Application entry point
├── docker-compose.yml        # Container orchestration
└── requirements.txt         # Python dependencies
```
