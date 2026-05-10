# Authentication Documentation

JWT-based authentication across services (Frontend, Admin, Backend).

## Overview

The system uses stateless JWT tokens for authentication across all services. Users login via the frontend portal, while admins use a separate admin portal. Both portals share the same backend authentication endpoints but use different token storage keys and login endpoints.

## Token Structure

### JWT Payload

```json
{
  "sub": "user@example.com",
  "username": "John Doe",
  "role": "user",
  "iat": 1700000000,
  "exp": 1700086400
}
```

| Field | Description |
|-------|-------------|
| `sub` | Immutable identifier (always email) |
| `username` | Display name (may be updated) |
| `role` | `user` or `admin` |
| `iat` | Issued-at timestamp (UTC) |
| `exp` | Expiration timestamp (UTC) |

### Environment Configuration

```bash
JWT_SECRET_KEY=your-secret-key           # Default: excel-processor-secret-key-change-in-production
TOKEN_EXPIRY_HOURS=24                     # Default: 24
ADMIN_USERNAME=admin                     # Default: admin
ADMIN_PASSWORD=admin123                  # Default: admin123
```

## Authentication Flow

### User Login Flow

```
Frontend Client
     ↓ POST /api/v1/auth/login {email, password}
     ↓
Backend auth_service.verify_credentials()
     ↓
1. Check user_store (file-backed) for email/password
2. If not found, check env admin fallback
     ↓
verify_credentials() returns user object or error dict
     ↓
Backend creates JWT via create_token(email, username, role)
     ↓
Frontend stores token in localStorage
     ↓
All subsequent requests include: Authorization: Bearer <token>
```

### Admin Login Flow

```
Admin Client
     ↓ POST /api/v1/auth/admin/login {email, password}
     ↓
Backend _do_login() with allowed_roles={'admin'}
     ↓
verify_credentials() validates credentials
     ↓
Role check: result['role'] must be 'admin'
     ↓
Returns token only if role matches
```

### Token Storage Keys

| Portal | localStorage Key |
|--------|------------------|
| Frontend | `excel_processor_token` |
| Admin | `excel_admin_token` |

### Request Interceptor Pattern

```typescript
// Frontend (frontend/src/services/api.ts)
client.interceptors.request.use(config => {
  const token = localStorage.getItem('excel_processor_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Admin (admin/src/services/api.ts)
client.interceptors.request.use(config => {
  const token = localStorage.getItem('excel_admin_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
```

### Response Interceptor Pattern

```typescript
// Frontend / Admin shared pattern
client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();  // Force re-login
    }
    return Promise.reject(err);
  }
);
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/auth/login` | User login | No |
| `POST` | `/api/v1/auth/admin/login` | Admin login | No |
| `POST` | `/api/v1/auth/register` | User registration | No |
| `POST` | `/api/v1/auth/verify-email` | Verify email with token | No |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset | No |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token | No |
| `GET` | `/api/v1/auth/me` | Get current user info | Yes |
| `POST` | `/api/v1/auth/logout` | Logout (client-side) | Yes |
| `GET` | `/api/v1/auth/profile` | Get user profile | Yes |
| `PATCH` | `/api/v1/auth/profile` | Update profile | Yes |
| `POST` | `/api/v1/auth/profile/avatar` | Upload avatar | Yes |
| `POST` | `/api/v1/auth/change-password` | Change password | Yes |

### Login Request/Response

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "John Doe",
    "role": "user"
  }
}
```

**Error Responses:**

| Error | Status | Description |
|-------|--------|-------------|
| `Invalid username or password` | 401 | Wrong credentials |
| `account_disabled` | 403 | Account is disabled |
| `email_not_verified` | 403 | Email not verified yet |
| `wrong_portal` | 403 | User tried admin portal or vice versa |

## Registration & Email Verification

### Registration Flow

```
User POST /register {username, email, password}
     ↓
Backend validates input (email format, password min 6 chars)
     ↓
user_store.register_user() creates entry (email_verified=false)
     ↓
Backend generates verification token
     ↓
send_welcome_email() and send_verification_email() called
     ↓
Returns: "Account created. Please check your email to verify."
```

### Email Verification Flow

```
User clicks verification link
     ↓
User POST /verify-email {token}
     ↓
user_store.confirm_email(token) marks email as verified
     ↓
User can now login
```

## Password Reset Flow

```
User POST /forgot-password {email}
     ↓
Backend creates reset token (if email exists)
     ↓
send_reset_email() sends link
     ↓
Always returns success (prevents email enumeration)
     ↓
User POST /reset-password {token, password}
     ↓
user_store.reset_password() updates password
```

## Role-Based Access Control

### Decorators (Backend)

```python
@require_auth          # Requires valid JWT, any role
@require_role('admin') # Requires specific role
```

### Frontend/Admin Portal Separation

Users are strictly separated by role:
- Users can only login via `/api/v1/auth/login` → returns user tokens
- Admins can only login via `/api/v1/auth/admin/login` → returns admin tokens

If a user tries to access admin endpoints, they receive `wrong_portal` error.

## Profile Management

### Get Profile

```typescript
// Frontend
GET /api/v1/auth/profile
Response: { success: true, profile: { username, email, bio, avatar_url } }
```

### Update Profile

```typescript
PATCH /api/v1/auth/profile
Body: { username?: string, bio?: string }
```

### Upload Avatar

```typescript
POST /api/v1/auth/profile/avatar
Body: FormData with 'avatar' file
- Max size: 5MB
- Auto-converted to PNG, cropped to square, resized to 256x256
- Returns: { success: true, avatar_url: "/api/v1/auth/profile/avatar/filename.png" }
```

### Change Password

```typescript
POST /api/v1/auth/change-password
Body: { old_password, new_password }
- Requires current password
- New password minimum: 6 characters
```

## Token Verification

### Backend Token Verification

```python
# auth_service.py
def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
```

### Extract Token from Request

```python
def _extract_token() -> Optional[str]:
    header = request.headers.get('Authorization', '')
    if header.startswith('Bearer '):
        return header[7:]
    return None
```

## Error Handling

### Authentication Errors

| Status Code | Error | Action |
|-------------|-------|--------|
| 401 | `Authentication required` | Client shows login |
| 401 | `Invalid or expired token` | Client clears token, shows login |
| 403 | `Forbidden` | Client shows access denied |
| 403 | `wrong_portal` | Redirect to correct portal |
| 403 | `email_not_verified` | Prompt email verification |
| 403 | `account_disabled` | Show disabled message |

### Client-Side Handling

```typescript
// On any 401 response
localStorage.removeItem(TOKEN_KEY);
window.location.reload();  // Force login
```

## Security Considerations

1. **Token Expiry**: Default 24 hours. Reduce via `TOKEN_EXPIRY_HOURS` for higher security
2. **Secret Key**: Always use strong `JWT_SECRET_KEY` in production
3. **Admin Credentials**: Change default `ADMIN_USERNAME` and `ADMIN_PASSWORD`
4. **Password Requirements**: Minimum 6 characters (consider strengthening)
5. **Email Enumeration Prevention**: Forgot password always returns success
6. **Portal Separation**: Prevents users accessing admin portal and vice versa

## Development vs Production

### Development Defaults
```bash
JWT_SECRET_KEY=excel-processor-secret-key-change-in-production
TOKEN_EXPIRY_HOURS=24
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### Production Recommendations
```bash
JWT_SECRET_KEY=<generate-256-bit-random-key>
TOKEN_EXPIRY_HOURS=1    # Short-lived tokens
ADMIN_USERNAME=<unique-admin-user>
ADMIN_PASSWORD=<strong-random-password>
```