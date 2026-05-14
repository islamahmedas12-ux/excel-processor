# Excel Processor — Backend as a Service

**Turn any Excel file into a calculated REST API in minutes.**

Upload your Excel file, define which cells are inputs and which are outputs,
then call the API — LibreOffice recalculates every formula and returns the results.

---

## Quick Start

```bash
# 1. Start all services
docker compose up -d

# 2. Open the UI and create your first API
open http://localhost:3000

# 3. Or call the API directly with a key
curl -X POST http://localhost:5000/api/v1/files/<FILE_ID>/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ek_live_YOUR_KEY_HERE" \
  -d '{"inputs": {"A1": "John", "B2": 5000}}'
```

---

## How It Works — 3 Steps

### Step 1 — Upload
Upload your Excel file via the portal (`http://localhost:3000`) or:

```bash
curl -X POST http://localhost:5000/api/v1/files \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@myfile.xlsx"
```

### Step 2 — Configure
Tell the system which cells are **inputs** and which are **outputs**:

```bash
curl -X PUT http://localhost:5000/api/v1/files/<FILE_ID>/config \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": ["C11", "C12"],
    "outputs": ["C13"],
    "sheet": "Sheet1"
  }'
```

### Step 3 — Call
Call the `/run` endpoint with an API key. LibreOffice recalculates the file and returns computed values:

```bash
curl -X POST http://localhost:5000/api/v1/files/<FILE_ID>/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ek_live_YOUR_KEY_HERE" \
  -d '{"inputs": {"C11": 5000, "C12": 750}}'
```

**Response:**
```json
{ "outputs": { "C13": 5750 } }
```

---

## Example: Salary Calculator

Your Excel file has:
- `C11` = base salary (input)
- `C12` = bonus (input)
- `C13` = `=SUM(C11,C12)` → tax-free total (output)

```
C11: 5000   ← input
C12: 750    ← input
C13: =SUM(C11,C12) → 5750  ← output (recalculated by LibreOffice)
```

Call the API:

```bash
curl -X POST http://localhost:5000/api/v1/files/<FILE_ID>/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ek_live_YOUR_KEY_HERE" \
  -d '{"inputs": {"C11": 5000, "C12": 750}}'
```

Returns `{"outputs": {"C13": 5750}}` — **the actual computed value**, not the formula.

---

## Authentication

### Portal (JWT)
```bash
-H "Authorization: Bearer <JWT>"
```
Login at `http://localhost:3000`.

### Programmatic (API Key)
```bash
-H "X-API-Key: ek_live_YOUR_KEY_HERE"
```
Generate keys at `http://localhost:3000` → API Keys section.
The raw key is shown only once at creation — store it immediately.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/files` | JWT | Upload a file |
| `GET` | `/api/v1/files` | JWT | List your files |
| `PUT` | `/api/v1/files/<id>/config` | JWT | Configure inputs/outputs |
| `GET` | `/api/v1/files/<id>/config` | JWT | Get current config |
| `DELETE` | `/api/v1/files/<id>/config` | JWT | Clear config, re-apply TTL |
| `POST` | `/api/v1/files/<id>/run` | JWT **or** API Key | Execute with inputs |
| `GET` | `/api/v1/auth/api-keys` | JWT | List your API keys |
| `POST` | `/api/v1/auth/api-keys` | JWT | Create a new API key |
| `DELETE` | `/api/v1/auth/api-keys/<key_id>` | JWT | Revoke a key |
| `GET` | `/api/v1/health` | None | Health check |

Full interactive docs: `http://localhost:5000/swagger/`

---

## Architecture

| Component | Technology | Role |
|-----------|------------|------|
| Backend API | Flask + Python | REST endpoints, business logic |
| Excel Engine | LibreOffice (headless) | Formula recalculation |
| Cell Reader | openpyxl (`data_only=True`) | Read computed values from recalculated file |
| File Storage | MinIO (S3-compatible) | Store uploaded Excel files |
| Metadata DB | PostgreSQL + SQLAlchemy | User data, file configs, API keys |
| Portal UI | React + Vite + Tailwind | Bilingual (EN/AR) user interface |

### How recalculation works
1. openpyxl patches input cells directly into the XLSX ZIP
2. LibreOffice headless recalculates the entire workbook (per-call profile dirs avoid concurrency conflicts)
3. openpyxl reads the cached values back with `data_only=True`
4. Results returned via `/run` endpoint

---

## Services

| Service | URL |
|---------|-----|
| Portal UI | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Swagger UI | http://localhost:5000/swagger/ |
| Admin | http://localhost:3100 |
| Landing (opt-in) | `docker compose --profile landing up -d` |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `MINIO_ENDPOINT` | `localhost:9100` | MinIO server address |
| `JWT_SECRET` | — | Secret for signing JWT tokens |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

---

## License

MIT — [@islamahmedas12-ux](https://github.com/islamahmedas12-ux)

---

# Arabic — العربية

**برنامج Excel كخدمة خلفية (Backend as a Service)**

حوّل أي ملف Excel إلى API REST محسوب في دقائق.

## الخطوات الثلاث

### الخطوة 1 — رفع الملف
```bash
curl -X POST http://localhost:5000/api/v1/files \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@myfile.xlsx"
```

### الخطوة 2 — تحديد الإدخالات والمخرجات
```bash
curl -X PUT http://localhost:5000/api/v1/files/<FILE_ID>/config \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"inputs": ["C11", "C12"], "outputs": ["C13"], "sheet": "Sheet1"}'
```

### الخطوة 3 — استدعاء API
```bash
curl -X POST http://localhost:5000/api/v1/files/<FILE_ID>/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ek_live_YOUR_KEY_HERE" \
  -d '{"inputs": {"C11": 5000, "C12": 750}}'
```

النتيجة: `{"outputs": {"C13": 5750}}`

## المصادقة

- **الواجهة (JWT):** `Authorization: Bearer <token>`
- **البرمجي (مفتاح API):** `X-API-Key: ek_live_...`

## الخدمات

| الخدمة | الرابط |
|--------|--------|
| الواجهة | http://localhost:3000 |
| API الخلفي | http://localhost:5000 |
| توثيق Swagger | http://localhost:5000/swagger/ |
| لوحة الإدارة | http://localhost:3100 |

## البنية التقنية

| المكوّن | التقنية |
|---------|---------|
| API الخلفي | Flask + Python |
| محرك Excel | LibreOffice (بدون واجهة) |
| قراءة الخلايا | openpyxl (`data_only=True`) |
| تخزين الملفات | MinIO (S3) |
| قاعدة البيانات | PostgreSQL + SQLAlchemy |
| الواجهة | React + Vite + Tailwind |

**Excel كـ Backend — الآن!** 🎉