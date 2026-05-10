"""
Postgres-backed per-user file store.
Files live for FILE_TTL_HOURS then are pruned by cleanup_expired().
File content lives in MinIO ('files' bucket, key = '<safe_owner_email>/<file_id>.xlsx').
Metadata (name, category_id, size, timestamps) lives in the 'files' Postgres table.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, func, delete

from ..db import session_scope
from ..models import File
from . import storage

FILE_TTL_HOURS = 24


def _key(owner_email: str, file_id: str) -> str:
    """Generate MinIO object key for a file: <safe_owner_email>/<file_id>.xlsx"""
    safe = owner_email.replace('/', '_').replace('\\', '_')
    return f"{safe}/{file_id}.xlsx"


def _now_dt():
    return datetime.now(timezone.utc)


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _to_dict(f: File) -> dict:
    return {
        'id':          f.id,
        'owner_email': f.owner_email,
        'name':        f.name,
        'size_bytes':  f.size_bytes,
        'category_id': f.category_id,
        'created_at':  _iso(f.created_at),
        'expires_at':  _iso(f.expires_at),
    }


# ── Module-level functions (primary API) ─────────────────────────────────────

def upload(
    filename: str,
    content: bytes,
    owner_email: str = '',
    category_id: Optional[str] = None,
) -> dict:
    file_id = str(uuid.uuid4())
    now = _now_dt()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=FILE_TTL_HOURS)

    storage.put(
        storage.BUCKET_FILES,
        _key(owner_email, file_id),
        content,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )

    with session_scope() as s:
        f = File(
            id          = file_id,
            owner_email = owner_email.lower(),
            name        = filename,
            size_bytes  = len(content),
            category_id = category_id,
            created_at  = now,
            expires_at  = expires_at,
        )
        s.add(f)
        s.flush()
        return _to_dict(f)


def set_category(file_id: str, category_id: Optional[str], owner_email: str = '') -> bool:
    with session_scope() as s:
        f = s.get(File, file_id)
        if not f:
            return False
        if owner_email and f.owner_email != owner_email.lower():
            return False
        f.category_id = category_id
        s.flush()
        return True


def delete_file(file_id: str, owner_email: str = '') -> bool:
    with session_scope() as s:
        f = s.get(File, file_id)
        if not f:
            return False
        if owner_email and f.owner_email != owner_email.lower():
            return False
        storage.delete(storage.BUCKET_FILES, _key(f.owner_email, file_id))
        s.delete(f)
    return True


def get_content(file_id: str, owner_email: str = '') -> Optional[bytes]:
    meta = get_meta(file_id, owner_email)
    if not meta:
        return None
    return storage.get(storage.BUCKET_FILES, _key(meta['owner_email'], file_id))


def get_meta(file_id: str, owner_email: str = '') -> Optional[dict]:
    with session_scope() as s:
        f = s.get(File, file_id)
        if not f:
            return None
        if owner_email and f.owner_email != owner_email.lower():
            return None
        return _to_dict(f)


def list_all(owner_email: str = '') -> list[dict]:
    with session_scope() as s:
        q = select(File).order_by(File.created_at.desc())
        if owner_email:
            q = q.where(File.owner_email == owner_email.lower())
        rows = s.execute(q).scalars().all()
        return [_to_dict(f) for f in rows]


def usage(owner_email: str) -> dict:
    """Return file count and total bytes for an owner."""
    with session_scope() as s:
        row = s.execute(
            select(func.count(), func.coalesce(func.sum(File.size_bytes), 0))
            .where(File.owner_email == owner_email.lower())
        ).one()
        return {'file_count': int(row[0] or 0), 'total_bytes': int(row[1] or 0)}


def cleanup_expired():
    """Delete expired files from both MinIO and Postgres."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=FILE_TTL_HOURS)
    with session_scope() as s:
        old = s.execute(select(File).where(File.created_at < cutoff)).scalars().all()
        for f in old:
            storage.delete(storage.BUCKET_FILES, _key(f.owner_email, f.id))
        s.execute(delete(File).where(File.created_at < cutoff))


# ── Backward-compatibility shim (deprecated — use module functions directly) ──

class _FileStore:
    """Thin shim over module functions for backward compatibility with old file_store usage."""

    def upload(self, filename: str, content: bytes,
               owner_email: str = '', category_id: Optional[str] = None) -> dict:
        return upload(filename, content, owner_email=owner_email, category_id=category_id)

    def set_category(self, file_id: str, category_id: Optional[str],
                     owner_email: str = '') -> bool:
        return set_category(file_id, category_id, owner_email=owner_email)

    def delete(self, file_id: str, owner_email: str = '') -> bool:
        return delete_file(file_id, owner_email=owner_email)

    def get_content(self, file_id: str, owner_email: str = '') -> Optional[bytes]:
        return get_content(file_id, owner_email=owner_email)

    def get_meta(self, file_id: str, owner_email: str = '') -> Optional[dict]:
        return get_meta(file_id, owner_email=owner_email)

    def list_all(self, owner_email: str = '') -> list[dict]:
        return list_all(owner_email=owner_email)

    def usage(self, owner_email: str) -> dict:
        return usage(owner_email)


file_store = _FileStore()
