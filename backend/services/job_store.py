"""
Postgres-backed async job store.
Jobs live for JOB_TTL_HOURS then are pruned by cleanup_expired().
Result files live in MinIO ('job-results' bucket, key = '<job_id><result_ext>').
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, delete

from ..db import session_scope
from ..models import Job
from . import storage

JOB_TTL_HOURS = 24


def _result_key(job_id: str, result_ext: str) -> str:
    return f"{job_id}{result_ext}"


def _now_dt():
    return datetime.now(timezone.utc)


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _to_dict(j: Job) -> dict:
    return {
        'id':          j.id,
        'owner_email': j.owner_email,
        'job_type':    j.job_type,
        'status':      j.status,
        'params':      j.params if isinstance(j.params, dict) else (j.params or {}),
        'error':       j.error,
        'result_ext':  j.result_ext,
        'created_at':  _iso(j.created_at),
        'updated_at':  _iso(j.updated_at),
    }


# ── CRUD ─────────────────────────────────────────────────────────────────────

def create(owner_email: str, job_type: str, params: dict | None = None) -> dict:
    job_id = str(uuid.uuid4())
    now    = _now_dt()
    with session_scope() as s:
        j = Job(
            id          = job_id,
            owner_email = owner_email,
            job_type    = job_type,
            status      = 'pending',
            params      = params or {},
            created_at  = now,
            updated_at  = now,
        )
        s.add(j)
        s.flush()
        return _to_dict(j)


def update_status(job_id: str, status: str, error: str | None = None, result_ext: str | None = None):
    with session_scope() as s:
        j = s.get(Job, job_id)
        if not j:
            return
        j.status     = status
        j.error      = error
        j.result_ext = result_ext
        j.updated_at = _now_dt()


def get(job_id: str) -> Optional[dict]:
    with session_scope() as s:
        j = s.get(Job, job_id)
        return _to_dict(j) if j else None


def list_by_owner(owner_email: str) -> list[dict]:
    with session_scope() as s:
        rows = s.execute(
            select(Job).where(Job.owner_email == owner_email).order_by(Job.created_at.desc())
        ).scalars().all()
        return [_to_dict(j) for j in rows]


def count_active(owner_email: str) -> int:
    with session_scope() as s:
        return s.execute(
            select(Job).where(
                Job.owner_email == owner_email,
                Job.status.in_(('pending', 'running')),
            )
        ).scalars().all().__len__()


def delete_job(job_id: str, owner_email: str) -> bool:
    with session_scope() as s:
        j = s.get(Job, job_id)
        if not j or j.owner_email != owner_email:
            return False
        if j.result_ext:
            storage.delete(storage.BUCKET_RESULTS, _result_key(j.id, j.result_ext))
        s.delete(j)
    return True


def save_result(job_id: str, content: bytes, result_ext: str, content_type: str | None = None) -> None:
    """Write the result bytes to object storage. Caller updates the job row separately."""
    storage.put(storage.BUCKET_RESULTS, _result_key(job_id, result_ext), content, content_type=content_type)


def get_result_bytes(job_id: str) -> Optional[bytes]:
    with session_scope() as s:
        j = s.get(Job, job_id)
        if not j or not j.result_ext:
            return None
    return storage.get(storage.BUCKET_RESULTS, _result_key(job_id, j.result_ext))


def cleanup_expired():
    cutoff = datetime.now(timezone.utc) - timedelta(hours=JOB_TTL_HOURS)
    with session_scope() as s:
        old = s.execute(select(Job).where(Job.created_at < cutoff)).scalars().all()
        for j in old:
            if j.result_ext:
                storage.delete(storage.BUCKET_RESULTS, _result_key(j.id, j.result_ext))
        s.execute(delete(Job).where(Job.created_at < cutoff))
