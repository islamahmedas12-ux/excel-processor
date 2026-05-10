# Common Errors and Solutions — excel-processor

This guide provides quick solutions for common error messages you may encounter when running excel-processor.

## Authentication Errors

### "Invalid token" / "Token expired"

**Symptom:** API requests return 401 Unauthorized with message about invalid or expired token.

**Cause:** JWT token has expired (tokens expire after 24 hours by default).

**Solution:**

1. **For users:** Log out and log back in to get a new token.

2. **For API clients:** Refresh the token using the refresh endpoint:
   ```bash
   curl -X POST http://localhost:5000/api/auth/refresh \
     -H "Authorization: Bearer <refresh_token>"
   ```

3. **To extend token lifetime**, modify in `.env`:
   ```
   JWT_ACCESS_TOKEN_EXPIRES=86400  # 24 hours in seconds
   ```

### "Missing Authorization header"

**Symptom:** API returns 401 with "Missing Authorization header".

**Cause:** Request is missing the Bearer token.

**Solution:**

Add the Authorization header to your request:
```bash
curl -H "Authorization: Bearer <your-token>" http://localhost:5000/api/protected-endpoint
```

### "JWT_SECRET_KEY is using insecure default value"

**Symptom:** Warning appears during application startup.

**Cause:** Using the default JWT secret key instead of a secure one.

**Solution:**

Generate and set a secure secret in `.env`:
```bash
# Generate a secure secret
openssl rand -hex 32
```

Then add to `.env`:
```
JWT_SECRET_KEY=<generated-secret>
```

## File Processing Errors

### "File too large"

**Symptom:** Upload fails with error message about file size.

**Cause:** File exceeds the maximum allowed size (default 50MB).

**Solution:**

1. **Check current limit:**
   ```bash
   grep MAX_FILE_SIZE .env
   ```

2. **Increase the limit in `.env`:**
   ```
   MAX_FILE_SIZE=104857600  # 100MB in bytes
   ```

3. **Restart the backend:**
   ```bash
   docker-compose restart backend
   ```

### "Unsupported file format"

**Symptom:** Upload fails with message about unsupported file type.

**Cause:** File is not a valid Excel format (.xlsx, .xls, .csv).

**Solution:**

1. Verify the file is a valid Excel or CSV file
2. If using .xlsb format, convert to .xlsx first
3. Ensure the file is not corrupted by opening it in Excel first

### "File parsing error"

**Symptom:** Upload succeeds but processing fails with parsing error.

**Cause:** Excel file may be corrupted, password-protected, or have complex features not supported.

**Solution:**

1. Open the file in Microsoft Excel and re-save it
2. Remove password protection if present
3. Remove macros, external links, or complex formulas
4. Try exporting as .xlsx if originally .xls

### "Empty file"

**Symptom:** Upload fails with "File contains no data" or similar.

**Cause:** The uploaded file has no data rows.

**Solution:**

1. Verify the file contains data in rows (not just headers)
2. Check that data rows are not filtered out by processing rules
3. Ensure the file wasn't saved with only formatting but no data

## Database Errors

### "relation does not exist"

**Symptom:** API returns 500 error with "relation 'tablename' does not exist".

**Cause:** Database tables have not been created (migration not run).

**Solution:**

Run database migrations:
```bash
docker-compose exec backend flask db upgrade
```

Or if using Alembic:
```bash
docker-compose exec backend alembic upgrade head
```

### "connection refused"

**Symptom:** Application cannot connect to database.

**Cause:** PostgreSQL is not running or DATABASE_URL is incorrect.

**Solution:**

1. **Check if PostgreSQL is running:**
   ```bash
   docker-compose ps postgres
   ```

2. **Verify DATABASE_URL format:**
   ```
   DATABASE_URL=postgresql://excel:localdevpassword@postgres:5432/excel_processor
   ```

3. **Restart the database:**
   ```bash
   docker-compose restart postgres
   ```

### "password authentication failed"

**Symptom:** Database connection fails with authentication error.

**Cause:** Incorrect database credentials.

**Solution:**

1. Check credentials in `.env` match those in `docker-compose.yml`:
   ```yaml
   environment:
     POSTGRES_USER: excel
     POSTGRES_PASSWORD: localdevpassword
   ```

2. Update `.env` if needed:
   ```
   DATABASE_URL=postgresql://excel:localdevpassword@postgres:5432/excel_processor
   ```

3. If credentials were changed, you may need to recreate the database:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

## Storage Errors

### "Unable to locate credentials"

**Symptom:** File upload/download fails with S3/MinIO credential error.

**Cause:** S3/MinIO access keys are not configured.

**Solution:**

Verify these environment variables are set in `.env`:
```
S3_ENDPOINT_URL=http://localhost:9100
S3_ACCESS_KEY=excel
S3_SECRET_KEY=localdevpassword
S3_BUCKET_NAME=excel-files
```

### "Bucket does not exist"

**Symptom:** Storage operations fail with "No such bucket".

**Cause:** The `excel-files` bucket has not been created in MinIO.

**Solution:**

1. Open MinIO console at http://localhost:9101
2. Login with access credentials
3. Click "Buckets" → "Create Bucket"
4. Name it `excel-files`
5. Set appropriate access policy (public or private)

### "Connection timeout"

**Symptom:** Storage operations hang and eventually timeout.

**Cause:** MinIO container is not responding.

**Solution:**

1. Check MinIO status:
   ```bash
   docker-compose ps minio
   ```

2. View MinIO logs:
   ```bash
   docker-compose logs minio
   ```

3. Restart MinIO:
   ```bash
   docker-compose restart minio
   ```

## Email Errors

### "Email not delivered"

**Symptom:** Application sends emails but they are never received.

**Cause:** Email service not configured or email rejected by recipient.

**Solution:**

1. **Verify Resend API key is set:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

2. **Check sending domain is verified** in Resend dashboard

3. **Verify sender email:**
   ```
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

4. **Check spam folders** on recipient side

5. **Review delivery status** in Resend dashboard

### "Resend API error"

**Symptom:** Error message about Resend API failure.

**Cause:** Invalid Resend API key or rate limit exceeded.

**Solution:**

1. Verify `RESEND_API_KEY` in `.env` is correct
2. Check Resend dashboard for API usage and limits
3. Wait and retry if rate limited

## Subscription/Payment Errors

### "Subscription not found"

**Symptom:** User subscription operations fail.

**Cause:** User account exists but has no subscription record.

**Solution:**

1. Verify user is logged in with correct account
2. Check subscription status in admin panel
3. Manually create subscription record if needed via admin

### "Payment processing failed"

**Symptom:** Payment cannot be processed during subscription creation.

**Cause:** Bank details not configured or payment gateway error.

**Solution:**

1. Verify banking configuration in `.env`:
   ```
   BANK_NAME=Your Bank
   BANK_ACCOUNT_NAME=Your Account
   BANK_ACCOUNT_NUMBER=1234567890
   BANK_IBAN=IBAN123456789
   ```

2. Check system logs for payment gateway errors
3. Verify bank account details are valid

### "Invalid pricing"

**Symptom:** Price lookup fails when subscribing.

**Cause:** Pricing configuration is missing or invalid.

**Solution:**

1. Check if pricing constants are defined in the backend
2. Verify database has valid pricing records
3. Review subscription tier configuration

## API Errors

### "404 Not Found"

**Symptom:** API endpoint returns 404 error.

**Cause:** Endpoint does not exist or URL is misspelled.

**Solution:**

1. Check the URL is correct (include `/api/` prefix if required)
2. Verify the endpoint exists in the Flask routes
3. Check API documentation for correct endpoint paths

### "500 Internal Server Error"

**Symptom:** API request fails with 500 error.

**Cause:** Server-side error, often in application logic or database.

**Solution:**

1. Check backend logs:
   ```bash
   docker-compose logs backend | tail -100
   ```

2. Look for stack traces in the logs to identify the error

3. Common causes:
   - Missing required database records
   - Code bug or exception
   - Resource exhaustion (memory, disk)

### "503 Service Unavailable"

**Symptom:** API returns 503 error.

**Cause:** Backend service is not running or overloaded.

**Solution:**

1. Check backend status:
   ```bash
   docker-compose ps backend
   ```

2. Restart the backend:
   ```bash
   docker-compose restart backend
   ```

3. Check resource usage:
   ```bash
   docker stats
   ```

## Docker Errors

### "Port is already allocated"

**Symptom:** Container fails to start with port binding error.

**Cause:** Another process is using the required port.

**Solution:**

See "Port Conflicts" in `docs/troubleshooting.md` for detailed solutions.

### "Volume mount failed"

**Symptom:** Container cannot access mounted directories.

**Cause:** Path does not exist or permission denied.

**Solution:**

1. Verify the host path exists:
   ```bash
   ls -la /path/to/mount
   ```

2. Check Docker has access to the directory

3. On Windows, ensure the drive is shared with Docker Desktop

### "Image pull failed"

**Symptom:** Cannot pull Docker image from registry.

**Cause:** Network issue or image not found.

**Solution:**

1. Check internet connectivity
2. Verify image name and tag are correct
3. Try pulling manually:
   ```bash
   docker pull <image-name>
   ```

## CORS Errors

### "No 'Access-Control-Allow-Origin' header"

**Symptom:** Browser blocks API requests due to CORS policy.

**Cause:** Backend CORS not configured for the frontend domain.

**Solution:**

1. Verify `FRONTEND_URL` is set in `.env`:
   ```
   FRONTEND_URL=http://localhost:3000
   ```

2. Check backend CORS configuration allows the frontend origin

3. For development, ensure backend is running on port 5000

## SSL/TLS Errors (Production)

### "Certificate verify failed"

**Symptom:** HTTPS requests fail with certificate verification error.

**Cause:** Self-signed certificates or certificate mismatch.

**Solution:**

1. For development, use HTTP instead of HTTPS
2. For production, configure valid SSL certificates
3. If behind a reverse proxy, ensure proxy handles SSL termination

### "Mixed content" warnings

**Symptom:** Browser shows warnings about insecure content on HTTPS page.

**Cause:** Page loaded over HTTPS but requests HTTP resources.

**Solution:**

1. Ensure all resource URLs use HTTPS
2. Update `S3_ENDPOINT_URL` and other URLs to use HTTPS
3. Configure application to generate HTTPS URLs when behind SSL proxy

## Getting Help with Errors

If you've tried the above solutions and still encounter issues:

1. **Check container logs:**
   ```bash
   docker-compose logs -f --tail=100
   ```

2. **Search existing issues** in the project repository

3. **Collect diagnostic information:**
   ```bash
   docker-compose ps
   docker-compose logs > debug.log
   ```

4. **Include in your issue report:**
   - Full error message and stack trace
   - Steps to reproduce
   - Environment details (OS, Docker version)
   - Relevant `.env` settings (without secrets)