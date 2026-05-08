"""
Subscription Store — Postgres-backed storage for subscription requests.
Proof images live in MinIO under the 'proofs' bucket.
"""

import mimetypes
import uuid
from datetime import datetime, timezone
from sqlalchemy import select

from ..db import session_scope
from ..models import Subscription
from . import storage


def _now_dt():
    return datetime.now(timezone.utc)


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _to_dict(sub: Subscription) -> dict:
    return {
        'id':           sub.id,
        'email':        sub.email,
        'username':     sub.username,
        'plan':         sub.plan,
        'months':       sub.months,
        'proof_file':   sub.proof_file,
        'status':       sub.status,
        'created_at':   _iso(sub.created_at),
        'processed_at': _iso(sub.processed_at),
        'notes':        sub.notes or '',
    }


def create_request(email: str, username: str, plan: str, months: int, proof_bytes: bytes, proof_ext: str) -> dict:
    sub_id   = str(uuid.uuid4())
    filename = f"{sub_id}{proof_ext}"
    mime     = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
    storage.put(storage.BUCKET_PROOFS, filename, proof_bytes, content_type=mime)

    with session_scope() as s:
        sub = Subscription(
            id           = sub_id,
            email        = email,
            username     = username,
            plan         = plan,
            months       = months,
            proof_file   = filename,
            status       = 'pending',
            notes        = '',
            created_at   = _now_dt(),
            processed_at = None,
        )
        s.add(sub)
        s.flush()
        return _to_dict(sub)


def list_requests(status: str | None = None) -> list:
    with session_scope() as s:
        stmt = select(Subscription).order_by(Subscription.created_at.desc())
        if status:
            stmt = stmt.where(Subscription.status == status)
        return [_to_dict(r) for r in s.execute(stmt).scalars().all()]


def get_request(sub_id: str) -> dict | None:
    with session_scope() as s:
        sub = s.get(Subscription, sub_id)
        return _to_dict(sub) if sub else None


def get_proof_bytes(sub_id: str) -> tuple[bytes, str] | None:
    """Return (bytes, mime_type) for the proof image, or None if missing."""
    req = get_request(sub_id)
    if not req:
        return None
    data = storage.get(storage.BUCKET_PROOFS, req['proof_file'])
    if data is None:
        return None
    mime = mimetypes.guess_type(req['proof_file'])[0] or 'image/jpeg'
    return data, mime


def update_status(sub_id: str, status: str, notes: str = '') -> bool:
    with session_scope() as s:
        sub = s.get(Subscription, sub_id)
        if not sub:
            return False
        sub.status       = status
        sub.processed_at = _now_dt()
        sub.notes        = notes
    return True
