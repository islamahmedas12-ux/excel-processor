"""
Auth Service — JWT-based authentication.
Checks the file-backed user store first, then falls back to the env admin.
"""

import jwt
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from functools import wraps
from flask import request, jsonify

SECRET_KEY     = os.getenv('JWT_SECRET_KEY', '')
EXPIRY_HOURS   = int(os.getenv('TOKEN_EXPIRY_HOURS', '24'))
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '')

# Reject empty values and the known-bad legacy default.
if not SECRET_KEY or SECRET_KEY == 'excel-processor-secret-key-change-in-production':
    raise ValueError('JWT_SECRET_KEY must be set to a strong random value')

if not ADMIN_PASSWORD:
    raise ValueError('ADMIN_PASSWORD must be set')


def verify_credentials(email: str, password: str) -> dict | None:
    """
    Login is by email + password.
    Returns {'username', 'email', 'role'} on success.
    Returns {'error': 'email_not_verified'} if password is right but unverified.
    Returns None if credentials are wrong.
    """
    from .user_store import verify_user
    entry = verify_user(email, password)
    if entry:
        if not entry.get('active', True):
            return {'error': 'account_disabled'}
        if not entry.get('email_verified', False):
            return {'error': 'email_not_verified', 'email': entry.get('email', '')}
        return {'username': entry['username'], 'email': entry['email'], 'role': entry['role']}

    # env admin fallback — identified by username, always verified
    if email == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return {'username': ADMIN_USERNAME, 'email': ADMIN_USERNAME, 'role': 'admin'}

    return None


def create_token(email: str, username: str, role: str = 'user') -> str:
    """sub stores the immutable email; username stores the display name."""
    payload = {
        'sub':      email,
        'username': username,
        'role':     role,
        'iat':      datetime.now(timezone.utc),
        'exp':      datetime.now(timezone.utc) + timedelta(hours=EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _extract_token() -> Optional[str]:
    header = request.headers.get('Authorization', '')
    if header.startswith('Bearer '):
        return header[7:]
    return None


def require_auth(f):
    """Decorator — rejects requests without a valid JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(role: str):
    """Decorator factory — requires a specific role in the JWT."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = _extract_token()
            if not token:
                return jsonify({"error": "Authentication required"}), 401
            payload = verify_token(token)
            if not payload:
                return jsonify({"error": "Invalid or expired token"}), 401
            if payload.get('role') != role:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
