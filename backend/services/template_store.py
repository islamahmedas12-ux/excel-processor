"""
Per-user Excel template library.
Metadata in Postgres; file content in MinIO ('templates' bucket, key = '<owner_email>/<id>.xlsx').

Unlike working files (file_store), templates are read-only — they cannot be
mutated by write operations. Instead, every operation on a template first copies
it into result_store so the original is always preserved.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, func

from ..db import session_scope
from ..models import Template
from . import storage


def _now_dt():
    return datetime.now(timezone.utc)


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _to_dict(t: Template) -> dict:
    return {
        'id':          t.id,
        'owner_email': t.owner_email,
        'name':        t.name,
        'description': t.description or '',
        'filename':    t.filename,
        'size_bytes':  t.size_bytes,
        'sha256':      t.sha256,
        'created_at':  _iso(t.created_at),
        'updated_at':  _iso(t.updated_at),
    }


def _key(owner_email: str, template_id: str) -> str:
    safe = owner_email.replace('/', '_').replace('\\', '_')
    return f"{safe}/{template_id}.xlsx"


# ── CRUD ─────────────────────────────────────────────────────────────────────

def save(
    owner_email: str,
    filename: str,
    content: bytes,
    name: str = '',
    description: str = '',
) -> dict:
    template_id = str(uuid.uuid4())
    now  = _now_dt()
    sha  = hashlib.sha256(content).hexdigest()
    name = name.strip() or filename

    storage.put(
        storage.BUCKET_TEMPLATES,
        _key(owner_email, template_id),
        content,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )

    with session_scope() as s:
        t = Template(
            id          = template_id,
            owner_email = owner_email,
            name        = name,
            description = description or '',
            filename    = filename,
            size_bytes  = len(content),
            sha256      = sha,
            created_at  = now,
            updated_at  = now,
        )
        s.add(t)
        s.flush()
        return _to_dict(t)


def get(template_id: str) -> Optional[dict]:
    with session_scope() as s:
        t = s.get(Template, template_id)
        return _to_dict(t) if t else None


def get_content(template_id: str) -> Optional[bytes]:
    meta = get(template_id)
    if not meta:
        return None
    return storage.get(storage.BUCKET_TEMPLATES, _key(meta['owner_email'], template_id))


def list_by_owner(owner_email: str) -> list[dict]:
    with session_scope() as s:
        rows = s.execute(
            select(Template)
            .where(Template.owner_email == owner_email)
            .order_by(func.lower(Template.name))
        ).scalars().all()
        return [_to_dict(t) for t in rows]


def update_meta(template_id: str, owner_email: str, name: str | None = None, description: str | None = None) -> Optional[dict]:
    with session_scope() as s:
        t = s.get(Template, template_id)
        if not t or t.owner_email != owner_email:
            return None
        if name:
            t.name = name.strip()
        if description is not None:
            t.description = description
        t.updated_at = _now_dt()
        s.flush()
        return _to_dict(t)


def delete(template_id: str, owner_email: str) -> bool:
    with session_scope() as s:
        t = s.get(Template, template_id)
        if not t or t.owner_email != owner_email:
            return False
        storage.delete(storage.BUCKET_TEMPLATES, _key(owner_email, template_id))
        s.delete(t)
    return True


def count(owner_email: str) -> int:
    with session_scope() as s:
        return s.execute(
            select(func.count()).select_from(Template).where(Template.owner_email == owner_email)
        ).scalar() or 0


def usage(owner_email: str) -> dict:
    """Return template count and total bytes for an owner."""
    with session_scope() as s:
        row = s.execute(
            select(func.count(), func.coalesce(func.sum(Template.size_bytes), 0))
            .where(Template.owner_email == owner_email)
        ).one()
        return {'count': int(row[0] or 0), 'bytes': int(row[1] or 0)}
