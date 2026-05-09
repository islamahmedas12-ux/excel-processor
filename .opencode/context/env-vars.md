# Environment Variables — excel-processor

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| FLASK_ENV | Environment mode (development/production) | No | development |
| FLASK_DEBUG | Enable Flask debug mode | No | false |
| PORT | Server port | No | 5000 |
| MAX_FILE_SIZE | Max upload size in MB | No | 50 |
| CORS_ORIGINS | Comma-separated list of allowed CORS origins | No | (empty) |

## Authentication

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| JWT_SECRET_KEY | Secret key for JWT token signing | Yes | (insecure default) |
| TOKEN_EXPIRY_HOURS | JWT token expiry time in hours | No | 24 |
| ADMIN_USERNAME | Admin login username | No | admin |
| ADMIN_PASSWORD | Admin login password | No | admin123 |

## Database

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DATABASE_URL | PostgreSQL database connection URL | Yes | - |

## Email (Resend)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| RESEND_API_KEY | Resend API key for sending emails | Yes | (empty) |
| ADMIN_EMAIL | Admin email address for notifications | No | (empty) |
| RESEND_FROM_EMAIL | Sender email address | No | noreply@authme.dev |
| FRONTEND_URL | Frontend URL for email links | No | http://localhost:5173 |

## Storage (S3/MinIO)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| S3_ENDPOINT_URL | S3 endpoint URL | No | http://localhost:9000 |
| S3_ACCESS_KEY | S3 access key | No | excel |
| S3_SECRET_KEY | S3 secret key | Yes | (empty) |
| S3_REGION | S3 region | No | us-east-1 |

## Banking Info

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| BANK_NAME | Bank name for invoice/verification | No | (empty) |
| BANK_ACCOUNT_NAME | Bank account holder name | No | (empty) |
| BANK_ACCOUNT_NUMBER | Bank account number | No | (empty) |
| BANK_IBAN | International Bank Account Number | No | (empty) |
| VERIFY_BASE_URL | Base URL for verification page | No | http://localhost:3001/verify |
