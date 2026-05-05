# API Contracts — excel-processor

> Updated: auto-maintained by backend agents

## Existing Endpoints (working ✅)

### POST /api/v1/execute
Request: multipart — file (Excel), inputs (JSON: {cell: value})
Response: { results: {cell: value}, ... }
Auth: none

### POST /api/v1/read
Request: multipart — file (Excel), cells (JSON: ["A1", "B2"])
Response: { values: {cell: value} }
Auth: none

### POST /api/v1/write
Request: multipart — file (Excel), updates (JSON: {cell: value})
Response: updated Excel file (binary)
Auth: none

### POST /api/v1/sheets
Request: multipart — file (Excel)
Response: { sheets: ["Sheet1", "Sheet2"] }
Auth: none

### GET /api/v1/health
Response: { status: "ok" }
Auth: none

## Planned Endpoints (not built yet ❌)

### POST /api/v1/export/pdf
Request: multipart — file (Excel), sheets ("all" | "Sheet1" | "Sheet1,Sheet2")
Response: PDF file (application/pdf)
Auth: none (TBD)

### POST /api/v1/execute/batch
Request: multipart — file (Excel), batch_inputs (JSON: [{cell: value}])
Response: { results: [{cell: value}] }
Auth: none (TBD)
