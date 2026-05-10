# Admin Portal Documentation

Administrative interface for managing users, plans, and subscriptions.

## Overview

The Admin Portal is a React-based administrative interface that communicates with the backend via REST API. It provides tools for:
- Managing user accounts (view, update plan, enable/disable, delete)
- Managing subscription plans
- Reviewing and approving/rejecting subscription requests
- Viewing system statistics

## Architecture

```
Admin Portal (React)
       ↓ HTTP/REST
Backend Flask API (admin blueprint)
       ↓
File-based Storage + Postgres + MinIO
```

### Key Files

| Path | Description |
|------|-------------|
| `backend/api/admin.py` | Flask blueprint with all admin endpoints |
| `admin/src/services/api.ts` | TypeScript API client for admin operations |

## Authentication

### Admin Login Flow

```
Admin Portal Client
     ↓ POST /api/v1/auth/admin/login {email, password}
     ↓
Backend verifies credentials against ADMIN_USERNAME/ADMIN_PASSWORD
     ↓
Returns JWT token with role='admin'
     ↓
Admin client stores token in localStorage (key: 'excel_admin_token')
     ↓
All subsequent requests include: Authorization: Bearer <token>
```

### Login API

```typescript
// admin/src/services/api.ts
async login(email: string, password: string): Promise<{
  token: string;
  username: string;
  role: string;
}> {
  const res = await client.post('/api/v1/auth/admin/login', { email, password });
  return { token: res.data.token, ...res.data.user };
}
```

### Token Interceptor

```typescript
const TOKEN_KEY = 'excel_admin_token';

client.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// On 401 response, clear token and force re-login
client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();
    }
    return Promise.reject(err);
  },
);
```

## API Endpoints

All admin endpoints require `Authorization: Bearer <token>` header with admin role.

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/stats` | Get system statistics |

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 42,
    "active_users": 38,
    "total_files": 156,
    "total_execution_count": 1247
  }
}
```

**Frontend Usage:**
```typescript
async getStats(): Promise<any> {
  const res = await client.get('/api/v1/admin/stats');
  return res.data.data;
}
```

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/users` | List all users |
| `PATCH` | `/api/v1/admin/users/<email>/plan` | Update user plan |
| `PATCH` | `/api/v1/admin/users/<email>/status` | Enable/disable user |
| `DELETE` | `/api/v1/admin/users/<email>` | Delete user |

#### List Users

```typescript
async listUsers(): Promise<any[]> {
  const res = await client.get('/api/v1/admin/users');
  return res.data.users ?? [];
}
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "email": "user@example.com",
      "username": "John Doe",
      "plan": "premium",
      "expires_at": "2025-06-15T00:00:00Z",
      "active": true
    }
  ]
}
```

#### Update User Plan

```typescript
async setUserPlan(email: string, plan: string, months = 1): Promise<void> {
  await client.patch(
    `/api/v1/admin/users/${encodeURIComponent(email)}/plan`,
    { plan, months }
  );
}
```

**Request:**
```json
{
  "plan": "premium",
  "months": 6
}
```

**Available Plans:** `free`, `basic`, `premium`, `enterprise` (configurable via plans API)

**Response:**
```json
{
  "success": true,
  "plan": "premium",
  "expires_at": "2025-11-15T00:00:00Z"
}
```

#### Update User Status

```typescript
async setUserActive(email: string, active: boolean): Promise<void> {
  await client.patch(
    `/api/v1/admin/users/${encodeURIComponent(email)}/status`,
    { active }
  );
}
```

**Request:**
```json
{ "active": false }
```

**Response:**
```json
{
  "success": true,
  "active": false
}
```

#### Delete User

```typescript
async deleteUser(email: string): Promise<void> {
  await client.delete(`/api/v1/admin/users/${encodeURIComponent(email)}`);
}
```

**Response:**
```json
{ "success": true }
```

**Error Handling:**
```json
{ "error": "User not found" }  // 404
```

### Plan Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/plans` | List all plans |
| `POST` | `/api/v1/admin/plans` | Create new plan |
| `PATCH` | `/api/v1/admin/plans/<plan_id>` | Update plan |
| `DELETE` | `/api/v1/admin/plans/<plan_id>` | Delete plan |

#### List Plans

```typescript
async listPlans(): Promise<Record<string, any>> {
  const res = await client.get('/api/v1/admin/plans');
  return res.data.plans ?? {};
}
```

**Response:**
```json
{
  "success": true,
  "plans": {
    "free": {
      "name": "Free",
      "max_files": 5,
      "max_file_size_mb": 10,
      "storage_mb": 100
    },
    "premium": {
      "name": "Premium",
      "max_files": 100,
      "max_file_size_mb": 100,
      "storage_mb": 5000
    }
  }
}
```

#### Create Plan

```typescript
async createPlan(id: string, data: Record<string, any>): Promise<void> {
  await client.post('/api/v1/admin/plans', { id, ...data });
}
```

**Request:**
```json
{
  "id": "enterprise",
  "name": "Enterprise",
  "max_files": 500,
  "max_file_size_mb": 500,
  "storage_mb": 50000
}
```

**Response:**
```json
{ "success": true, "id": "enterprise" }
```

**Errors:**
```json
{ "error": "Plan id is required" }      // 400
{ "error": "Plan 'enterprise' already exists" }  // 409
```

#### Update Plan

```typescript
async updatePlan(id: string, data: Record<string, any>): Promise<void> {
  await client.patch(`/api/v1/admin/plans/${encodeURIComponent(id)}`, data);
}
```

**Request:**
```json
{
  "name": "Enterprise Pro",
  "max_files": 1000
}
```

**Response:**
```json
{
  "success": true,
  "plan": { ... }
}
```

#### Delete Plan

```typescript
async deletePlan(id: string): Promise<void> {
  await client.delete(`/api/v1/admin/plans/${encodeURIComponent(id)}`);
}
```

**Response:**
```json
{ "success": true }
```

**Errors:**
```json
{ "error": "Plan not found or protected" }  // 404
```

### Subscription Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/subscriptions` | List subscription requests |
| `GET` | `/api/v1/admin/subscriptions/<id>/proof` | View payment proof image |
| `POST` | `/api/v1/admin/subscriptions/<id>/approve` | Approve subscription |
| `POST` | `/api/v1/admin/subscriptions/<id>/reject` | Reject subscription |

#### List Subscription Requests

```typescript
async listSubscriptions(status?: string): Promise<any[]> {
  const res = await client.get('/api/v1/admin/subscriptions', {
    params: status ? { status } : {}
  });
  return res.data.requests ?? [];
}
```

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `approved`, `rejected`)

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "sub_abc123",
      "email": "user@example.com",
      "username": "John Doe",
      "plan": "premium",
      "months": 12,
      "status": "pending",
      "created_at": "2025-01-15T10:30:00Z",
      "notes": ""
    }
  ]
}
```

#### View Payment Proof

```typescript
proofImageUrl(id: string): string {
  const token = localStorage.getItem(TOKEN_KEY) ?? '';
  return `/api/v1/admin/subscriptions/${id}/proof?token=${token}`;
}
```

**Note:** The proof image endpoint uses token via query parameter for image display, not via Authorization header (since `<img>` tags don't send custom headers).

**Response:** Binary image data (PNG/JPEG)

#### Approve Subscription

```typescript
async approveSubscription(id: string): Promise<void> {
  await client.post(`/api/v1/admin/subscriptions/${id}/approve`);
}
```

**Actions on Approval:**
1. Sets user plan in user store with calculated `expires_at` (current time + 30 days * months)
2. Updates subscription status to `approved`
3. Sends email notification to user via `send_plan_activated_email()`

**Response:**
```json
{
  "success": true,
  "plan": "premium",
  "expires_at": "2026-05-15T00:00:00Z"
}
```

#### Reject Subscription

```typescript
async rejectSubscription(id: string, notes = ''): Promise<void> {
  await client.post(`/api/v1/admin/subscriptions/${id}/reject`, { notes });
}
```

**Request:**
```json
{
  "notes": "Payment proof unclear, please resubmit"
}
```

**Response:**
```json
{ "success": true }
```

## Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Invalid plan. Choose from: ...` | Invalid plan name |
| 400 | `Plan id is required` | Missing plan ID |
| 400 | `'active' field required` | Missing active field |
| 401 | `Authentication required` | Missing or invalid token |
| 403 | `Forbidden` | Token valid but user is not admin |
| 403 | `wrong_portal` | User token used in admin context |
| 404 | `User not found` | Email not in user store |
| 404 | `Plan not found` | Plan ID doesn't exist |
| 404 | `Request not found` | Subscription ID doesn't exist |
| 409 | `Plan '...' already exists` | Plan ID already taken |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `admin123` |

## Backend Implementation

The admin API is implemented as a Flask blueprint (`admin_bp`) with the URL prefix `/api/v1/admin`:

```python
# backend/api/admin.py
admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')
```

All endpoints use the `@require_role('admin')` decorator for authorization, except:
- `proof_image()` which manually validates admin token via query parameter

### Role Check Decorator

```python
from ..services.auth_service import require_role

@admin_bp.route('/users', methods=['GET'])
@require_role('admin')
def users():
    return jsonify({"success": True, "users": list_users()})
```

## Frontend Integration

### Setup Example

```typescript
// admin/src/services/api.ts
import axios from 'axios';

const client = axios.create({ baseURL: '/' });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('excel_admin_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const adminApi = {
  // ... all methods
};
```

### Usage in React Component

```typescript
import { adminApi } from '../services/api';

// Login
const { token, username } = await adminApi.login(email, password);
localStorage.setItem('excel_admin_token', token);

// Get stats
const stats = await adminApi.getStats();

// List users
const users = await adminApi.listUsers();

// Update user plan
await adminApi.setUserPlan('user@example.com', 'premium', 12);
```

## Security Considerations

1. **Separate Portal**: Admin portal is strictly separated from user frontend
2. **Role Validation**: All admin endpoints require admin role in JWT
3. **Token Storage**: Admin tokens stored in separate localStorage key
4. **Auto-Logout**: 401 responses automatically clear token and reload
5. **Email Encoding**: User emails URL-encoded in paths for special characters

## Default Plans

The system ships with these default plans:

| Plan | Max Files | Max File Size | Storage |
|------|-----------|--------------|---------|
| `free` | 5 | 10 MB | 100 MB |
| `basic` | 20 | 50 MB | 500 MB |
| `premium` | 100 | 100 MB | 5 GB |
| `enterprise` | 500 | 500 MB | 50 GB |