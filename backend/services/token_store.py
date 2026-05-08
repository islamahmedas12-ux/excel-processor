"""
Postgres-backed document verification token store.
Each token has a 6-char uppercase access code that anyone can use
to verify a document's authenticity on the public /verify page.
"""

import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..db import session_scope
from ..models import VerificationToken

_CODE_CHARS = string.ascii_uppercase + string.digits


def _now_dt():
    return datetime.now(timezone.utc)


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _to_dict(t: VerificationToken) -> dict:
    return {
        'id':            t.id,
        'access_code':   t.access_code,
        'owner_email':   t.owner_email,
        'resource_type': t.resource_type,
        'resource_id':   t.resource_id,
        'filename':      t.filename,
        'size_bytes':    t.size_bytes,
        'is_active':     bool(t.is_active),
        'created_at':    _iso(t.created_at),
    }


# ── CRUD ─────────────────────────────────────────────────────────────────────

def create(
    owner_email: str,
    resource_type: str,
    resource_id: str,
    filename: str,
    size_bytes: int = 0,
) -> dict:
    token_id = str(uuid.uuid4())
    now      = _now_dt()
    for _ in range(10):
        code = ''.join(secrets.choice(_CODE_CHARS) for _ in range(6))
        try:
            with session_scope() as s:
                t = VerificationToken(
                    id            = token_id,
                    access_code   = code,
                    owner_email   = owner_email,
                    resource_type = resource_type,
                    resource_id   = resource_id,
                    filename      = filename,
                    size_bytes    = size_bytes,
                    is_active     = True,
                    created_at    = now,
                )
                s.add(t)
                s.flush()
                return _to_dict(t)
        except IntegrityError:
            continue
    raise RuntimeError("Failed to generate a unique access code after 10 attempts")


def get_by_code(access_code: str) -> Optional[dict]:
    with session_scope() as s:
        t = s.execute(
            select(VerificationToken).where(
                VerificationToken.access_code == access_code.upper(),
                VerificationToken.is_active.is_(True),
            )
        ).scalar_one_or_none()
        return _to_dict(t) if t else None


def get_by_id(token_id: str) -> Optional[dict]:
    with session_scope() as s:
        t = s.get(VerificationToken, token_id)
        return _to_dict(t) if t else None


def get_by_resource(resource_id: str, owner_email: str) -> Optional[dict]:
    with session_scope() as s:
        t = s.execute(
            select(VerificationToken).where(
                VerificationToken.resource_id == resource_id,
                VerificationToken.owner_email == owner_email,
                VerificationToken.is_active.is_(True),
            )
        ).scalar_one_or_none()
        return _to_dict(t) if t else None


def list_by_owner(owner_email: str) -> list[dict]:
    with session_scope() as s:
        rows = s.execute(
            select(VerificationToken)
            .where(VerificationToken.owner_email == owner_email)
            .order_by(VerificationToken.created_at.desc())
        ).scalars().all()
        return [_to_dict(t) for t in rows]


def delete_token(token_id: str, owner_email: str) -> bool:
    with session_scope() as s:
        t = s.get(VerificationToken, token_id)
        if not t or t.owner_email != owner_email:
            return False
        s.delete(t)
    return True
