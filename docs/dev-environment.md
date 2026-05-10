# Development Environment Reset Guide

This guide explains how to reset and reinitialize the excel-processor development environment when you encounter issues or want a clean start.

## When to Reset

Consider resetting your environment when you:

- Encounter persistent Docker or database issues
- Want to start fresh with a clean database
- Switch between branches with different schemas
- Encounter mysterious errors after updating code
- Move to a new machine or workspace

## Quick Reset (Preserve Data)

For most issues, a simple restart is sufficient:

```bash
# Stop all containers
docker-compose down

# Start fresh (images remain cached)
docker-compose up -d
```

## Full Reset (Remove All Data)

To completely reset and start from scratch:

```bash
# 1. Stop and remove containers
docker-compose down

# 2. Remove volumes (deletes database and MinIO data)
docker-compose down -v

# 3. Remove cached images (forces fresh build)
docker-compose down --rmi all

# 4. Clean up any dangling resources
docker system prune -f

# 5. Rebuild and start
docker-compose up -d --build
```

## Reset by Component

### Database Reset Only

```bash
# Stop the database container
docker-compose stop postgres

# Remove the database volume
docker volume rm excel-processor_postgres-data

# Restart database (will be fresh)
docker-compose up -d postgres
```

### MinIO Reset Only

```bash
# Stop MinIO
docker-compose stop minio

# Remove MinIO volume
docker volume rm excel-processor_minio-data

# Restart MinIO
docker-compose up -d minio
```

### Backend Reset Only

```bash
# Rebuild backend container
docker-compose build backend

# Restart backend
docker-compose up -d backend

# View logs
docker-compose logs -f backend
```

### Frontend Reset Only

```bash
# Rebuild frontend
docker-compose build frontend

# Restart frontend
docker-compose up -d frontend
```

## Clean Start Checklist

Follow this checklist for a guaranteed clean environment:

### 1. Stop Everything

```bash
docker-compose down -v
```

### 2. Clean Docker Resources

```bash
# Remove stopped containers
docker container prune -f

# Remove unused networks
docker network prune -f

# Remove unused images
docker image prune -f

# Remove all unused resources
docker system prune -af
```

### 3. Verify Cleanup

```bash
# Should show no running containers
docker ps -a

# Should show no volumes (except Docker system volumes)
docker volume ls
```

### 4. Fresh Environment File

```bash
# Remove old .env if it exists
rm -f .env

# Create from example
cp .env.example .env

# Edit with your values (see docs/env-vars.md)
```

### 5. Build and Start

```bash
# Build all images from scratch
docker-compose build --no-cache

# Start all services
docker-compose up -d

# Verify all services are healthy
docker-compose ps
```

## Environment Verification

After reset, verify each component:

### Backend Health

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status": "ok", "database": "connected", "timestamp": "..."}
```

### Database Connection

```bash
docker-compose exec postgres pg_isready -U excel
```

Expected: `accepting connections`

### MinIO Connection

```bash
docker-compose exec minio mc ready local
```

Expected: `local is ready`

### Frontend Access

Open http://localhost:3000 in your browser

### Admin Panel Access

Open http://localhost:3100 in your browser

## Common Reset Scenarios

### Scenario: Database Schema Changes

After pulling code with database migrations:

```bash
# Full reset to apply new schema
docker-compose down -v
docker-compose up -d --build
```

### Scenario: MinIO Not Working

```bash
# Reset MinIO volumes
docker-compose stop minio
docker volume rm excel-processor_minio-data
docker-compose up -d minio

# Recreate the bucket via MinIO console: http://localhost:9101
# Credentials: excel / localdevpassword
```

### Scenario: Port Conflicts After Reset

If ports are still in use after reset:

```bash
# Find and kill processes using our ports
netstat -ano | findstr :5433
netstat -ano | findstr :9100
netstat -ano | findstr :9101
netstat -ano | findstr :5000
netstat -ano | findstr :3000
netstat -ano | findstr :3100

# For each PID found, kill it
taskkill /PID <PID> /F
```

### Scenario: "No Space Left on Device"

```bash
# Remove all containers and volumes
docker-compose down -v

# Clean everything
docker system prune -af --volumes

# Restart
docker-compose up -d
```

## Preserving Data During Reset

### Export Database Before Reset

```bash
# Create backup
docker-compose exec postgres pg_dump -U excel excel_processor > backup.sql

# Store backup.sql in a safe location
```

### Import Database After Reset

```bash
# Restore from backup
cat backup.sql | docker-compose exec -T postgres psql -U excel -d excel_processor
```

### Export MinIO Files Before Reset

```bash
# Copy files from MinIO bucket
docker-compose exec minio mc mirror local/excel-files ./minio-backup/
```

## Automated Reset Script

Create a file `reset-dev.sh` for quick resets:

```bash
#!/bin/bash

echo "Stopping all containers..."
docker-compose down -v

echo "Cleaning Docker resources..."
docker system prune -af

echo "Building fresh images..."
docker-compose build --no-cache

echo "Starting all services..."
docker-compose up -d

echo "Verifying services..."
sleep 5
docker-compose ps

echo "Done! Access:"
echo "  Frontend: http://localhost:3000"
echo "  Admin:    http://localhost:3100"
echo "  MinIO:    http://localhost:9101"
```

Run with:
```bash
chmod +x reset-dev.sh
./reset-dev.sh
```

## Reset Without Docker (Manual Development)

If running services manually without Docker:

### Database

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS excel_processor;"
psql -U postgres -c "CREATE DATABASE excel_processor;"

# Run migrations
cd backend && flask db upgrade
```

### MinIO

```bash
# Via MinIO client (mc)
mc alias set local http://localhost:9000 excel localdevpassword
mc rb local/excel-files --force
mc mb local/excel-files
```

### Backend

```bash
# Kill existing process
pkill -f "flask run" || true

# Clear Python cache
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

# Start fresh
cd backend && FLASK_ENV=development flask run
```

## Troubleshooting Reset Issues

### Reset Fails with Permission Error

On Windows, run Docker Desktop as Administrator, then retry.

### Images Won't Rebuild

```bash
# Pull base images
docker-compose pull

# Then rebuild
docker-compose build --no-cache
```

### Services Exit Immediately After Reset

Check logs:
```bash
docker-compose logs --tail=50
```

Common causes:
- Missing environment variables
- Port conflicts
- Volume permission issues

## Environment Files Reference

After reset, ensure your `.env` file contains:

```bash
# Database
DATABASE_URL=postgresql://excel:localdevpassword@localhost:5433/excel_processor

# JWT (generate new for production)
JWT_SECRET_KEY=your-secret-key

# S3/MinIO
S3_ENDPOINT_URL=http://localhost:9100
S3_ACCESS_KEY=excel
S3_SECRET_KEY=localdevpassword
S3_REGION=us-east-1

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@example.com
ADMIN_EMAIL=admin@example.com

# Application
FLASK_ENV=development
PORT=5000
MAX_FILE_SIZE=52428800
FRONTEND_URL=http://localhost:3000

# Banking Info
BANK_NAME=Test Bank
BANK_ACCOUNT_NAME=Test Account
BANK_ACCOUNT_NUMBER=1234567890
BANK_IBAN=IBAN123456789
```

See `docs/env-vars.md` for complete documentation.

## Post-Reset Verification Steps

1. **Check container status:**
   ```bash
   docker-compose ps
   ```

2. **Test backend API:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Test file upload:**
   - Upload a test Excel file via the frontend
   - Verify file appears in MinIO console

4. **Check logs for errors:**
   ```bash
   docker-compose logs --tail=20
   ```

If all checks pass, your environment is ready for development.

## Getting Help

If reset doesn't resolve your issue:

1. Check `docs/troubleshooting.md` for specific error messages
2. Review `docs/common-errors.md` for known issues
3. Check Docker logs: `docker-compose logs -f`
4. Verify `.env` configuration matches requirements