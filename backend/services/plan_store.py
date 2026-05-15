"""
Plan Store — Postgres-backed plan registry.
Each plan's data is stored as JSONB so the schema can evolve freely.
On first use the table is seeded with hardcoded defaults.
"""

from sqlalchemy import select, func

from ..db import session_scope
from ..models import Plan

_DEFAULTS: dict[str, dict] = {
    'free': {
        'label': 'Free', 'label_ar': 'مجاني',
        'price_usd': 0, 'max_files': 3, 'max_file_mb': 100,
        'storage_gb': 0.3, 'max_concurrent_jobs': 1,
        'description': '3 ملفات، كل ملف حتى 100 MB',
        'description_en': '3 files, up to 100 MB each',
        'features': ['3 ملفات مرفوعة', 'حجم أقصى 100 MB للملف', 'قراءة وكتابة الخلايا', 'تصدير PDF'],
        'features_en': ['3 uploaded files', 'Max 100 MB per file', 'Read & write cells', 'Export to PDF'],
        'popular': False, 'active': True, 'order': 0,
    },
    'basic': {
        'label': 'Basic', 'label_ar': 'أساسي',
        'price_usd': 9, 'max_files': 50, 'max_file_mb': 500,
        'storage_gb': 5, 'max_concurrent_jobs': 3,
        'description': '50 ملفاً، كل ملف حتى 500 MB',
        'description_en': '50 files, up to 500 MB each',
        'features': ['50 ملفاً مرفوعاً', 'حجم أقصى 500 MB للملف', '5 GB مساحة تخزين', 'دعم فني بالإيميل'],
        'features_en': ['50 uploaded files', 'Max 500 MB per file', '5 GB storage', 'Email support'],
        'popular': False, 'active': True, 'order': 1,
    },
    'pro': {
        'label': 'Pro', 'label_ar': 'احترافي',
        'price_usd': 29, 'max_files': 200, 'max_file_mb': 1024,
        'storage_gb': 20, 'max_concurrent_jobs': 10,
        'description': '200 ملفاً، كل ملف حتى 1 GB',
        'description_en': '200 files, up to 1 GB each',
        'features': ['200 ملفاً مرفوعاً', 'حجم أقصى 1 GB للملف', '20 GB مساحة تخزين', 'دعم فني ذو أولوية'],
        'features_en': ['200 uploaded files', 'Max 1 GB per file', '20 GB storage', 'Priority support'],
        'popular': True, 'active': True, 'order': 2,
    },
    'business': {
        'label': 'Business', 'label_ar': 'أعمال',
        'price_usd': 79, 'max_files': 999, 'max_file_mb': 2048,
        'storage_gb': 100, 'max_concurrent_jobs': 50,
        'description': 'ملفات غير محدودة، كل ملف حتى 2 GB',
        'description_en': 'Unlimited files, up to 2 GB each',
        'features': ['ملفات غير محدودة', 'حجم أقصى 2 GB للملف', '100 GB مساحة تخزين', 'دعم فني 24/7'],
        'features_en': ['Unlimited files', 'Max 2 GB per file', '100 GB storage', '24/7 support'],
        'popular': False, 'active': True, 'order': 3,
    },
}


def _seed_if_empty(s) -> None:
    if s.execute(select(Plan).limit(1)).scalar_one_or_none() is None:
        for plan_id, data in _DEFAULTS.items():
            s.add(Plan(id=plan_id, data=data))


# ── Public API ────────────────────────────────────────────────────────────────

# Tiny in-process cache: plans are read very often, written rarely.
_CACHE: dict = {'data': None, 'ts': 0.0}
_CACHE_TTL = 30.0  # seconds


def _invalidate_cache() -> None:
    _CACHE['data'] = None
    _CACHE['ts']   = 0.0


def list_plans() -> dict:
    import time
    now = time.time()
    if _CACHE['data'] is not None and (now - _CACHE['ts']) < _CACHE_TTL:
        return _CACHE['data']
    with session_scope() as s:
        _seed_if_empty(s)
        s.flush()
        rows = s.execute(select(Plan)).scalars().all()
        result = {p.id: dict(p.data) for p in rows}
    _CACHE['data'] = result
    _CACHE['ts']   = now
    return result


def get_plan(name: str) -> dict:
    plans = list_plans()
    return plans.get(name, plans.get('free', _DEFAULTS['free']))


def create_plan(plan_id: str, data: dict) -> bool:
    """Returns False if plan_id already exists."""
    with session_scope() as s:
        if s.get(Plan, plan_id) is not None:
            return False
        data.setdefault('active', True)
        data.setdefault('popular', False)
        if 'order' not in data:
            data['order'] = s.execute(select(func.count()).select_from(Plan)).scalar() or 0
        s.add(Plan(id=plan_id, data=data))
    _invalidate_cache()
    return True


def update_plan(plan_id: str, data: dict) -> bool:
    """Returns False if plan not found."""
    with session_scope() as s:
        p = s.get(Plan, plan_id)
        if p is None:
            return False
        merged = dict(p.data)
        merged.update(data)
        p.data = merged
    _invalidate_cache()
    return True


def delete_plan(plan_id: str) -> bool:
    """Returns False if plan not found or is 'free' (protected)."""
    if plan_id == 'free':
        return False
    with session_scope() as s:
        p = s.get(Plan, plan_id)
        if p is None:
            return False
        s.delete(p)
    _invalidate_cache()
    return True
