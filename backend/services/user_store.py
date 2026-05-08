"""
User Store — Postgres-backed user registry.
Email is the unique identifier; username is a display name (may repeat).
"""

import secrets
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import select, func

from ..db import session_scope
from ..models import User
from . import storage


def _now_dt():
    return datetime.now(timezone.utc)


def _expires_dt(hours: int):
    return datetime.now(timezone.utc) + timedelta(hours=hours)


def _is_expired(dt) -> bool:
    if not dt:
        return True
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt < datetime.now(timezone.utc)


def _iso(dt) -> str | None:
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _user_to_dict(u: User) -> dict:
    """Match the shape the rest of the code expects from the old JSON store."""
    return {
        'username':               u.username,
        'email':                  u.display_email,
        'password_hash':          u.password_hash,
        'role':                   u.role,
        'active':                 u.active,
        'plan':                   u.plan,
        'plan_expires_at':        _iso(u.plan_expires_at),
        'email_verified':         u.email_verified,
        'verification_token':     u.verification_token,
        'verification_token_exp': _iso(u.verification_token_exp),
        'reset_token':            u.reset_token,
        'reset_token_exp':        _iso(u.reset_token_exp),
        'bio':                    u.bio or '',
        'created_at':             _iso(u.created_at),
    }


def _load() -> dict:
    """Backwards-compat: returns {email_lower: user_dict}."""
    with session_scope() as s:
        rows = s.execute(select(User)).scalars().all()
        return {u.email: _user_to_dict(u) for u in rows}


# ── Public API ────────────────────────────────────────────────────────────────

def email_exists(email: str) -> bool:
    with session_scope() as s:
        return s.get(User, email.lower()) is not None


def register_user(username: str, email: str, password: str, role: str = 'user') -> bool:
    """Returns False if the email is already registered."""
    key = email.lower()
    with session_scope() as s:
        if s.get(User, key) is not None:
            return False
        u = User(
            email                  = key,
            display_email          = email,
            username               = username,
            password_hash          = generate_password_hash(password),
            role                   = role,
            active                 = True,
            plan                   = 'free',
            plan_expires_at        = None,
            email_verified         = False,
            verification_token     = secrets.token_urlsafe(32),
            verification_token_exp = _expires_dt(24),
            reset_token            = None,
            reset_token_exp        = None,
            bio                    = '',
            created_at             = _now_dt(),
        )
        s.add(u)
    return True


def get_verification_token(email: str) -> str | None:
    with session_scope() as s:
        u = s.get(User, email.lower())
        return u.verification_token if u else None


def verify_user(email: str, password: str) -> dict | None:
    """Returns the user dict on success, None on failure."""
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return None
        if not check_password_hash(u.password_hash, password):
            return None
        return _user_to_dict(u)


def confirm_email(token: str) -> bool:
    with session_scope() as s:
        u = s.execute(select(User).where(User.verification_token == token)).scalar_one_or_none()
        if not u:
            return False
        if _is_expired(u.verification_token_exp):
            return False
        u.email_verified         = True
        u.verification_token     = None
        u.verification_token_exp = None
        return True


def create_reset_token(email: str) -> tuple[str, str] | None:
    """Returns (username, token) or None if email not found."""
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return None
        token = secrets.token_urlsafe(32)
        u.reset_token     = token
        u.reset_token_exp = _expires_dt(1)
        return u.username, token


def reset_password(token: str, new_password: str) -> bool:
    with session_scope() as s:
        u = s.execute(select(User).where(User.reset_token == token)).scalar_one_or_none()
        if not u:
            return False
        if _is_expired(u.reset_token_exp):
            return False
        u.password_hash   = generate_password_hash(new_password)
        u.reset_token     = None
        u.reset_token_exp = None
        return True


# ── Profile API ───────────────────────────────────────────────────────────────

def find_email_by_username(username: str) -> str | None:
    """Return the email key for a given username, or None."""
    with session_scope() as s:
        u = s.execute(
            select(User).where(func.lower(User.username) == username.lower())
        ).scalars().first()
        return u.email if u else None


def _avatar_key(email: str) -> str:
    safe = email.lower().replace('@', '_').replace('.', '_')
    return f"{safe}.png"


def get_profile(email: str) -> dict | None:
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return None
        return {
            'email':      u.display_email,
            'username':   u.username,
            'bio':        u.bio or '',
            'plan':       u.plan,
            'role':       u.role,
            'created_at': _iso(u.created_at) or '',
            'has_avatar': storage.exists(storage.BUCKET_AVATARS, _avatar_key(u.email)),
        }


def update_profile(email: str, username: str | None = None, bio: str | None = None) -> bool:
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return False
        if username is not None:
            u.username = username.strip()
        if bio is not None:
            u.bio = bio.strip()
        return True


def save_avatar(email: str, image_bytes: bytes) -> str:
    """Upload avatar PNG to object storage, return relative URL."""
    key = _avatar_key(email)
    storage.put(storage.BUCKET_AVATARS, key, image_bytes, content_type='image/png')
    return f"/api/v1/auth/profile/avatar/{key}"


def get_avatar_bytes(email_safe_key: str) -> bytes | None:
    """Fetch avatar bytes by the safe key (filename)."""
    return storage.get(storage.BUCKET_AVATARS, email_safe_key)


def change_password(email: str, old_password: str, new_password: str) -> bool:
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return False
        if not check_password_hash(u.password_hash, old_password):
            return False
        u.password_hash = generate_password_hash(new_password)
        return True


# ── Admin API ─────────────────────────────────────────────────────────────────

def list_users() -> list:
    """Return all users (password_hash + tokens stripped) sorted by created_at desc."""
    with session_scope() as s:
        rows = s.execute(select(User).order_by(User.created_at.desc())).scalars().all()
        result = []
        for u in rows:
            d = _user_to_dict(u)
            d.pop('password_hash', None)
            d.pop('verification_token', None)
            d.pop('reset_token', None)
            result.append(d)
        return result


def set_user_plan(email: str, plan: str, expires_at: str | None) -> bool:
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return False
        u.plan = plan
        u.plan_expires_at = datetime.fromisoformat(expires_at) if expires_at else None
        return True


def set_user_active(email: str, active: bool) -> bool:
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return False
        u.active = active
        return True


def delete_user(email: str) -> bool:
    with session_scope() as s:
        u = s.get(User, email.lower())
        if not u:
            return False
        s.delete(u)
        return True


def get_stats() -> dict:
    from ..services.file_store import file_store
    with session_scope() as s:
        rows = s.execute(select(User)).scalars().all()
        total    = len(rows)
        active   = sum(1 for u in rows if u.active)
        verified = sum(1 for u in rows if u.email_verified)
        plans: dict = {}
        for u in rows:
            plans[u.plan] = plans.get(u.plan, 0) + 1

    all_files = file_store.list_all()
    return {
        'total_users':         total,
        'active_users':        active,
        'verified_users':      verified,
        'plans':               plans,
        'total_files':         len(all_files),
        'total_storage_bytes': sum(f.get('size', 0) for f in all_files),
    }
