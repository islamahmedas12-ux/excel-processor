# Troubleshooting — excel-processor

This guide covers common issues with Docker, setup, and environment configuration.

## Port Conflicts

### PostgreSQL Port (5433)

**Symptom:** `docker-compose up` fails with error:
```
Error: Failed to bind port 0.0.0.0:5433
```

**Cause:** Port 5433 is already in use by another service.

**Solution:**

1. Check what is using port 5433:
   ```bash
   # Windows
   netstat -ano | findstr :5433

   # macOS/Linux
   lsof -i :5433
   ```

2. Stop the conflicting service or change the port in `docker-compose.yml`:
   ```yaml
   postgres:
     ports:
       - "5434:5432"  # Change host port from 5433 to 5434
   ```

3. Update your `.env` file to match:
   ```
   DATABASE_URL=postgresql://excel:localdevpassword@localhost:5434/excel_processor
   ```

### MinIO Console Port (9101)

**Symptom:** MinIO container starts but console is inaccessible.

**Cause:** Port 9101 is already in use.

**Solution:**

1. Check what is using port 9101:
   ```bash
   netstat -ano | findstr :9101
   ```

2. Change the port mapping in `docker-compose.yml`:
   ```yaml
   minio:
     ports:
       - "9102:9000"
       - "9103:9001"  # Change host port from 9101 to 9103
   ```

3. Update your `.env` file:
   ```
   S3_ENDPOINT_URL=http://localhost:9102
   ```

## Common Setup Issues

### Database Connection Failed

**Symptom:** Backend logs show:
```
psycopg2.OperationalError: could not connect to server
```

**Troubleshooting Steps:**

1. **Verify PostgreSQL is running:**
   ```bash
   docker ps | grep postgres
   ```

2. **Check database container logs:**
   ```bash
   docker logs excel-postgres-local
   ```

3. **Test connection from host:**
   ```bash
   psql -h localhost -p 5433 -U excel -d excel_processor
   ```

4. **Verify DATABASE_URL in .env:**
   ```
   DATABASE_URL=postgresql://excel:localdevpassword@localhost:5433/excel_processor
   ```

### MinIO/S3 Connection Failed

**Symptom:** Backend logs show:
```
botocore.exceptions.ClientError: Unable to locate credentials
```

**Troubleshooting Steps:**

1. **Verify MinIO is running:**
   ```bash
   docker ps | grep minio
   ```

2. **Check MinIO console:** Open http://localhost:9101 in browser

3. **Default credentials:**
   - Access Key: `excel`
   - Secret Key: `localdevpassword`

4. **Create a bucket named `excel-files` in MinIO console if not exists**

5. **Verify environment variables:**
   ```
   S3_ENDPOINT_URL=http://localhost:9100
   S3_ACCESS_KEY=excel
   S3_SECRET_KEY=localdevpassword
   ```

### Container Won't Start

**Symptom:** `docker-compose up` fails immediately.

**Troubleshooting Steps:**

1. **Check Docker is running:**
   ```bash
   docker info
   ```

2. **Rebuild containers:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Check for port conflicts:**
   ```bash
   docker-compose ps
   ```

4. **View logs for specific service:**
   ```bash
   docker-compose logs backend
   docker-compose logs postgres
   ```

## Environment Variable Issues

### JWT_SECRET_KEY Not Set

**Symptom:** Warning on startup:
```
JWT_SECRET_KEY is using insecure default value
```

**Solution:** Set a secure secret in `.env`:
```
JWT_SECRET_KEY=your-secure-random-string-here
```

### Email Not Sending

**Symptom:** Backend returns success but no email received.

**Troubleshooting Steps:**

1. **Verify RESEND_API_KEY is set:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

2. **Check Resend dashboard** for delivery status

3. **Verify ADMIN_EMAIL is set** for receiving notifications

4. **Check spam/junk folders**

## Permission Issues

### Docker Volume Permissions

**Symptom:** Application can't write to mounted volume.

**Solution:**

1. **Reset permissions:**
   ```bash
   docker-compose down -v  # Removes volumes
   docker-compose up -d
   ```

2. **On Windows, ensure shared drives are enabled** in Docker Desktop settings.

## Network Issues

### Services Can't Communicate

**Symptom:** Backend can't reach database or MinIO.

**Solution:**

1. **Ensure services are on same network:**
   ```bash
   docker network inspect excel-processor_excel-net
   ```

2. **Use service names for internal communication:**
   ```
   # Correct for internal Docker network
   DATABASE_URL=postgresql://excel:localdevpassword@postgres:5432/excel_processor

   # Correct for external access
   S3_ENDPOINT_URL=http://localhost:9100
   ```

## Reset Environment

If you encounter persistent issues:

1. **Stop all containers:**
   ```bash
   docker-compose down
   ```

2. **Remove volumes (clears database):**
   ```bash
   docker-compose down -v
   ```

3. **Remove images (force rebuild):**
   ```bash
   docker-compose down --rmi all
   ```

4. **Fresh start:**
   ```bash
   docker-compose up -d --build
   ```

## Getting Help

If issues persist:

1. **Check container logs:**
   ```bash
   docker-compose logs -f --tail=100
   ```

2. **Verify docker-compose.yml syntax:**
   ```bash
   docker-compose config
   ```

3. **Check system resources:**
   ```bash
   docker system df
   ```