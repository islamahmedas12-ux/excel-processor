"""
Stores processed files (modified xlsx & generated PDFs) separately from templates.
Metadata in Postgres; file content in MinIO ('job-results' bucket, key = '<owner_email>/<result_id><ext>').
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, func

from ..db import session_scope
from ..models import Result
from . import storage


ResultKind = 'xlsx' | 'pdf'


def _now_dt():
    return datetime.now(timezone.utc)


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _to_dict(r: Result) -> dict:
    return {
        'id':             r.id,
        'owner_email':    r.owner_email,
        'kind':           r.kind,
        'source_file_id': r.source_file_id,
        'source_file_name': r.source_file_name,
        'name':           r.name,
        'size_bytes':     r.size_bytes,
        'created_at':     _iso(r.created_at),
        'updated_at':     _iso(r.updated_at),
        'expires_at':     _iso(r.expires_at),
    }


def _key(owner_email: str, result_id: str, kind: str) -> str:
    safe = owner_email.replace('/', '_').replace('\\', '_')
    ext  = '.xlsx' if kind == 'xlsx' else '.pdf'
    return f"{safe}/{result_id}{ext}"


def _content_type(kind: str) -> str:
    if kind == 'pdf':
        return 'application/pdf'
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


# ── CRUD ─────────────────────────────────────────────────────────────────────

def save(
    owner_email: str,
    kind: ResultKind,
    source_file_id: str,
    source_file_name: str,
    name: str,
    content: bytes,
) -> dict:
    result_id = str(uuid.uuid4())
    now       = _now_dt()
    size      = len(content)

    storage.put(
        storage.BUCKET_RESULTS,
        _key(owner_email, result_id, kind),
        content,
        content_type=_content_type(kind),
    )

    with session_scope() as s:
        r = Result(
            id              = result_id,
            owner_email     = owner_email,
            kind            = kind,
            source_file_id  = source_file_id,
            source_file_name = source_file_name,
            name            = name,
            size_bytes      = size,
            created_at      = now,
            updated_at      = now,
        )
        s.add(r)
        s.flush()
        return _to_dict(r)


def get(result_id: str) -> Optional[dict]:
    with session_scope() as s:
        r = s.get(Result, result_id)
        return _to_dict(r) if r else None


def get_content(result_id: str) -> Optional[bytes]:
    meta = get(result_id)
    if not meta:
        return None
    return storage.get(storage.BUCKET_RESULTS, _key(meta['owner_email'], result_id, meta['kind']))


def list_all(kind: Optional[ResultKind] = None) -> list[dict]:
    with session_scope() as s:
        query = select(Result).order_by(Result.created_at.desc())
        if kind:
            query = query.where(Result.kind == kind)
        rows = s.execute(query).scalars().all()
        return [_to_dict(r) for r in rows]


def delete(result_id: str, owner_email: Optional[str] = None) -> bool:
    """Delete a result. If owner_email is provided, verify ownership."""
    with session_scope() as s:
        r = s.get(Result, result_id)
        if not r:
            return False
        if owner_email is not None and r.owner_email != owner_email:
            return False
        storage.delete(storage.BUCKET_RESULTS, _key(r.owner_email, result_id, r.kind))
        s.delete(r)
    return True


def count(owner_email: str) -> int:
    with session_scope() as s:
        return s.execute(
            select(func.count()).select_from(Result).where(Result.owner_email == owner_email)
        ).scalar() or 0


def usage(owner_email: str) -> dict:
    """Return result count and total bytes for an owner."""
    with session_scope() as s:
        row = s.execute(
            select(func.count(), func.coalesce(func.sum(Result.size_bytes), 0))
            .where(Result.owner_email == owner_email)
        ).one()
        return {'count': int(row[0] or 0), 'bytes': int(row[1] or 0)}