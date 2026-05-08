"""
Plans — thin shim so existing imports keep working.
All data lives in plan_store (file-backed JSON).
"""

from .plan_store import list_plans, get_plan as _get_plan

# PLANS is a live property — always reads from disk
class _PlanProxy:
    def get(self, key, default=None):
        return list_plans().get(key, default)
    def __contains__(self, key):
        return key in list_plans()
    def __iter__(self):
        return iter(list_plans())
    def items(self):
        return list_plans().items()
    def keys(self):
        return list_plans().keys()
    def __getitem__(self, key):
        return list_plans()[key]

PLANS = _PlanProxy()


def get_plan(name: str) -> dict:
    return _get_plan(name)
