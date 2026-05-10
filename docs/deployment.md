# Production Deployment Guide

This guide covers deploying excel-processor using Docker Compose in production environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimum 4GB RAM available
- 10GB disk space

## Quick Start

```bash
# Clone and configure
git clone <repository-url>
cd excel-processor

# Create production environment file
cp .env.example .env
# Edit .env with production values (see Environment Variables below)

# Start all services
docker-compose up -d

# Check service health
docker-compose ps
```

## Environment Variables

### Required for Production

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/excel_processor

# JWT Authentication
JWT_SECRET_KEY=<generate-secure-random-string>

# S3/MinIO Storage
S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=<your-access-key>
S3_SECRET_KEY=<your-secret-key>
S3_REGION=us-east-1

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Application
FRONTEND_URL=https://your-frontend-domain.com
FLASK_ENV=production
PORT=5000
MAX_FILE_SIZE=52428800

# Banking (optional - for payment display)
BANK_NAME=Your Bank Name
BANK_ACCOUNT_NAME=Your Account Name
BANK_ACCOUNT_NUMBER=1234567890
BANK_IBAN=IBAN123456789
```

### Generating Secure Values

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate S3 credentials
openssl rand -hex 24
```

## Docker Compose Production Deployment

### Standard Deployment

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Deployment with Custom Port Mapping

```yaml
# docker-compose.prod.yml excerpt
postgres:
  ports:
    - "5432:5432"  # Use standard PostgreSQL port

minio:
  ports:
    - "9000:9000"  # Use standard MinIO port
    - "9001:9001"  # Use standard MinIO console port
```

### External Services

To use external PostgreSQL or MinIO instead of containers:

```bash
# Override DATABASE_URL in environment
DATABASE_URL=postgresql://user:password@external-host:5432/excel_processor

# Override S3 configuration
S3_ENDPOINT_URL=https://s3.amazonaws.com
S3_ACCESS_KEY=<external-key>
S3_SECRET_KEY=<external-secret>
```

## Service URLs

| Service | Internal URL | Default External URL |
|---------|-------------|---------------------|
| Backend API | http://backend:5000 | http://localhost:5000 |
| Frontend | http://frontend:80 | http://localhost:3000 |
| Admin Panel | http://admin:80 | http://localhost:3100 |
| Landing | http://landing:4200 | http://localhost:4200 |
| PostgreSQL | postgres:5432 | localhost:5433 |
| MinIO API | http://minio:9000 | http://localhost:9100 |
| MinIO Console | http://minio:9001 | http://localhost:9101 |

## Network Configuration

All services communicate via the `excel-net` Docker network using service names:

```bash
# From backend to postgres
DATABASE_URL=postgresql://user:password@postgres:5432/excel_processor

# From backend to minio
S3_ENDPOINT_URL=http://minio:9000
```

## Health Checks

### Verify All Services Running

```bash
# Check container status
docker-compose ps

# Expected output:
# NAME                STATUS          PORTS
# excel-backend       running         0.0.0.0:5000->5000/tcp
# excel-frontend      running         0.0.0.0:3000->80/tcp
# excel-admin         running         0.0.0.0:3100->80/tcp
# excel-landing       running         0.0.0.0:4200->4200/tcp
# excel-postgres-local running         0.0.0.0:5433->5432/tcp
# excel-minio-local   running         0.0.0.0:9100->9000/tcp
```

### Verify Backend Health

```bash
curl http://localhost:5000/api/health
# or
curl http://localhost:5000/api/stats
```

### Verify Database Connection

```bash
docker-compose exec postgres pg_isready -U excel
```

### Verify MinIO

Access MinIO console at http://localhost:9101 with credentials from environment.

## Production Checklist

### Security

- [ ] Change default JWT_SECRET_KEY
- [ ] Use strong database passwords
- [ ] Configure firewall rules
- [ ] Enable HTTPS via reverse proxy (nginx, traefik)
- [ ] Set RESEND_API_KEY for email delivery

### Storage

- [ ] Create `excel-files` bucket in MinIO
- [ ] Configure bucket lifecycle policies
- [ ] Set up regular backups

### Database

- [ ] Configure connection pooling
- [ ] Enable SSL connections for external Postgres
- [ ] Set up regular backups

### Monitoring

```bash
# View resource usage
docker stats

# Monitor specific service
docker-compose logs -f backend

# Check disk space
docker system df
```

## Docker Compose Commands

### Start Services

```bash
# Start in background
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# Start specific service
docker-compose up -d backend
```

### Stop Services

```bash
# Stop without removing containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove volumes (clears data)
docker-compose down -v

# Stop and remove everything including images
docker-compose down --rmi all
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Troubleshooting

### Container Won't Start

1. Check Docker is running: `docker info`
2. Verify .env file exists with all required variables
3. Check port conflicts: `docker-compose ps`
4. View logs: `docker-compose logs backend`

### Database Connection Failed

1. Verify PostgreSQL container is healthy: `docker-compose ps`
2. Check DATABASE_URL format
3. Test connection: `docker-compose exec postgres psql -U excel -d excel_processor`

### Storage Not Working

1. Verify MinIO is running: `docker-compose ps`
2. Check S3_* environment variables
3. Verify `excel-files` bucket exists in MinIO console
4. Check bucket permissions

### Services Can't Communicate

Ensure all services are on the `excel-net` network:
```bash
docker network inspect excel-processor_excel-net
```

## SSL/TLS Configuration

For production HTTPS, configure a reverse proxy:

```yaml
# nginx/docker-compose.yml excerpt
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - backend
      - frontend
```

## Backup Strategy

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U excel excel_processor > backup.sql

# Restore backup
cat backup.sql | docker-compose exec -T postgres psql -U excel excel_processor
```

### MinIO Backup

```bash
# Use mc client
docker-compose exec minio mc mirror local/excel-files /backup/excel-files
```

## Updating Deployment

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# View changelog
docker-compose logs --tail=50 | less
```

## Support

For deployment issues, check:

1. `docker-compose logs -f` for error messages
2. `docker-compose config` to validate configuration
3. Documentation in `docs/troubleshooting.md`