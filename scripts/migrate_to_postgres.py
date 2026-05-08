"""
One-shot migration: JSON + SQLite → Postgres.

Reads from backend/data/{users.json, plans.json, subscriptions.json, *.db}
and inserts into the Postgres tables defined in backend/models.py.

Idempotent at the row level (skips rows whose primary key already exists).
File contents (avatars, proofs, templates, job_results) stay on disk untouched.
"""

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / '.env')

from backend.db import init_db, session_scope, engine  # noqa: E402
from backend.models import (                            # noqa: E402
    User, Plan, Subscription, VerificationToken, Job, Template,
)

DATA_DIR = ROOT / 'backend' / 'data'


def _parse_dt(iso: str | None):
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def migrate_users() -> int:
    path = DATA_DIR / 'users.json'
    if not path.exists():
        return 0
    with open(path, 'r', encoding='utf-8') as f:
        users = json.load(f)

    count = 0
    with session_scope() as s:
        for key, entry in users.items():
            if s.get(User, key):
                continue
            s.add(User(
                email                  = key,
                display_email          = entry.get('email', key),
                username               = entry.get('username', ''),
                password_hash          = entry.get('password_hash', ''),
                role                   = entry.get('role', 'user'),
                active                 = entry.get('active', True),
                plan                   = entry.get('plan', 'free'),
                plan_expires_at        = _parse_dt(entry.get('plan_expires_at')),
                email_verified         = entry.get('email_verified', False),
                verification_token     = entry.get('verification_token'),
                verification_token_exp = _parse_dt(entry.get('verification_token_exp')),
                reset_token            = entry.get('reset_token'),
                reset_token_exp        = _parse_dt(entry.get('reset_token_exp')),
                bio                    = entry.get('bio', '') or '',
                created_at             = _parse_dt(entry.get('created_at')) or datetime.now(timezone.utc),
            ))
            count += 1
    return count


def migrate_plans() -> int:
    path = DATA_DIR / 'plans.json'
    if not path.exists():
        return 0
    with open(path, 'r', encoding='utf-8') as f:
        plans = json.load(f)

    count = 0
    with session_scope() as s:
        for plan_id, data in plans.items():
            if s.get(Plan, plan_id):
                continue
            s.add(Plan(id=plan_id, data=data))
            count += 1
    return count


def migrate_subscriptions() -> int:
    path = DATA_DIR / 'subscriptions.json'
    if not path.exists():
        return 0
    with open(path, 'r', encoding='utf-8') as f:
        subs = json.load(f)

    count = 0
    with session_scope() as s:
        for entry in subs:
            if s.get(Subscription, entry['id']):
                continue
            s.add(Subscription(
                id           = entry['id'],
                email        = entry['email'],
                username     = entry.get('username', ''),
                plan         = entry['plan'],
                months       = int(entry.get('months', 1)),
                proof_file   = entry['proof_file'],
                status       = entry.get('status', 'pending'),
                notes        = entry.get('notes', '') or '',
                created_at   = _parse_dt(entry.get('created_at')) or datetime.now(timezone.utc),
                processed_at = _parse_dt(entry.get('processed_at')),
            ))
            count += 1
    return count


def _sqlite_rows(db_path: Path, table: str) -> list[dict]:
    if not db_path.exists():
        return []
    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row
    try:
        rows = con.execute(f"SELECT * FROM {table}").fetchall()
        return [dict(r) for r in rows]
    finally:
        con.close()


def migrate_tokens() -> int:
    rows = _sqlite_rows(DATA_DIR / 'tokens.db', 'tokens')
    count = 0
    with session_scope() as s:
        for r in rows:
            if s.get(VerificationToken, r['id']):
                continue
            s.add(VerificationToken(
                id            = r['id'],
                access_code   = r['access_code'],
                owner_email   = r['owner_email'],
                resource_type = r['resource_type'],
                resource_id   = r['resource_id'],
                filename      = r['filename'],
                size_bytes    = r.get('size_bytes', 0) or 0,
                is_active     = bool(r.get('is_active', 1)),
                created_at    = _parse_dt(r['created_at']) or datetime.now(timezone.utc),
            ))
            count += 1
    return count


def migrate_jobs() -> int:
    rows = _sqlite_rows(DATA_DIR / 'jobs.db', 'jobs')
    count = 0
    with session_scope() as s:
        for r in rows:
            if s.get(Job, r['id']):
                continue
            params = r.get('params')
            if isinstance(params, str):
                try:
                    params = json.loads(params)
                except (ValueError, TypeError):
                    params = {}
            s.add(Job(
                id          = r['id'],
                owner_email = r['owner_email'],
                job_type    = r['job_type'],
                status      = r.get('status', 'pending'),
                params      = params or {},
                error       = r.get('error'),
                result_ext  = r.get('result_ext'),
                created_at  = _parse_dt(r['created_at']) or datetime.now(timezone.utc),
                updated_at  = _parse_dt(r.get('updated_at')) or datetime.now(timezone.utc),
            ))
            count += 1
    return count


def migrate_templates() -> int:
    rows = _sqlite_rows(DATA_DIR / 'templates.db', 'templates')
    count = 0
    with session_scope() as s:
        for r in rows:
            if s.get(Template, r['id']):
                continue
            s.add(Template(
                id          = r['id'],
                owner_email = r['owner_email'],
                name        = r['name'],
                description = r.get('description', '') or '',
                filename    = r['filename'],
                size_bytes  = r.get('size_bytes', 0) or 0,
                sha256      = r['sha256'],
                created_at  = _parse_dt(r['created_at']) or datetime.now(timezone.utc),
                updated_at  = _parse_dt(r.get('updated_at')) or datetime.now(timezone.utc),
            ))
            count += 1
    return count


if __name__ == '__main__':
    print(f"DATABASE_URL: {engine.url}")
    print("Ensuring schema...")
    init_db()

    print(f"Users:         {migrate_users()} migrated")
    print(f"Plans:         {migrate_plans()} migrated")
    print(f"Subscriptions: {migrate_subscriptions()} migrated")
    print(f"Tokens:        {migrate_tokens()} migrated")
    print(f"Jobs:          {migrate_jobs()} migrated")
    print(f"Templates:     {migrate_templates()} migrated")
    print("Done.")
