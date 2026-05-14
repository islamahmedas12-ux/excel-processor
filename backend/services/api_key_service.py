"""
API Key Service — generation, verification, and revocation.
Raw keys are never persisted — only sha256 hash + 12-char prefix are stored.
"""

from __future__ import annotations

import uuid
import hashlib
import hmac
import secrets
import string
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from ..db import session_scope
from ..models import ApiKey

KEY_PREFIX = 'ek_live_'
KEY_SUFFIX_CHARS = string.ascii_letters + string.digits  # 62 chars
KEY_LENGTH = 32  # suffix length after prefix


def _random_key() -> str:
    suffix = ''.join(secrets.choice(KEY_SUFFIX_CHARS) for _ in range(KEY_LENGTH))
    return f"{KEY_PREFIX}{suffix}"


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _prefix(raw_key: str) -> str:
    return raw_key[:len(KEY_PREFIX) + 12]


def _utc_now():
    return datetime.now(timezone.utc)


def create(owner_email: str, name: str) -> tuple[str, dict]:
    """Create a new API key. Returns (raw_key, key_meta). Raw key shown only once."""
    raw_key = _random_key()
    key_hash = _hash_key(raw_key)
    key_prefix = _prefix(raw_key)
    key_id = str(uuid.uuid4())

    with session_scope() as s:
        ak = ApiKey(
            id=key_id,
            owner_email=owner_email.lower(),
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            created_at=_utc_now(),
        )
        s.add(ak)
        s.flush()
        meta = {
            'id': ak.id,
            'owner_email': ak.owner_email,
            'name': ak.name,
            'key_prefix': ak.key_prefix,
            'created_at': ak.created_at.isoformat() if ak.created_at else None,
            'revoked_at': None,
        }
    return raw_key, meta


def verify(raw_key: str) -> Optional[dict]:
    """Verify a raw API key. Returns key meta or None. Updates last_used_at."""
    if not raw_key or not raw_key.startswith(KEY_PREFIX):
        return None

    key_prefix = _prefix(raw_key)

    with session_scope() as s:
        ak = s.execute(
            select(ApiKey).where(ApiKey.key_prefix == key_prefix)
        ).scalar_one_or_none()

        if not ak:
            return None

        if ak.revoked_at is not None:
            return None

        if not hmac.compare_digest(ak.key_hash, _hash_key(raw_key)):
            return None

        ak.last_used_at = _utc_now()
        s.flush()

        return {
            'id': ak.id,
            'owner_email': ak.owner_email,
            'name': ak.name,
            'key_prefix': ak.key_prefix,
            'created_at': ak.created_at.isoformat() if ak.created_at else None,
            'last_used_at': ak.last_used_at.isoformat() if ak.last_used_at else None,
            'revoked_at': None,
        }


def list_by_owner(owner_email: str) -> list[dict]:
    """List all API keys for an owner. Never exposes key_hash."""
    with session_scope() as s:
        rows = s.execute(
            select(ApiKey)
            .where(ApiKey.owner_email == owner_email.lower())
            .order_by(ApiKey.created_at.desc())
        ).scalars().all()

        return [
            {
                'id': ak.id,
                'name': ak.name,
                'key_prefix': ak.key_prefix,
                'created_at': ak.created_at.isoformat() if ak.created_at else None,
                'last_used_at': ak.last_used_at.isoformat() if ak.last_used_at else None,
                'revoked_at': ak.revoked_at.isoformat() if ak.revoked_at else None,
            }
            for ak in rows
        ]


def revoke(key_id: str, owner_email: str) -> bool:
    """Revoke an API key. Returns True if revoked, False if not found or not owner."""
    with session_scope() as s:
        ak = s.get(ApiKey, key_id)
        if not ak or ak.owner_email != owner_email.lower():
            return False
        ak.revoked_at = _utc_now()
        s.flush()
        return True


def get_by_id(key_id: str, owner_email: str) -> Optional[dict]:
    """Get a single key by ID (for display purposes)."""
    with session_scope() as s:
        ak = s.get(ApiKey, key_id)
        if not ak or ak.owner_email != owner_email.lower():
            return None
        return {
            'id': ak.id,
            'name': ak.name,
            'key_prefix': ak.key_prefix,
            'created_at': ak.created_at.isoformat() if ak.created_at else None,
            'last_used_at': ak.last_used_at.isoformat() if ak.last_used_at else None,
            'revoked_at': ak.revoked_at.isoformat() if ak.revoked_at else None,
        }