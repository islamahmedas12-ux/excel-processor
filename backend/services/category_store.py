import uuid
from datetime import datetime
from typing import Dict, List, Optional


class CategoryStore:
    def __init__(self):
        self._cats: Dict[str, dict] = {}

    def create(self, name: str, color: str = '#6366f1') -> dict:
        cat_id = str(uuid.uuid4())
        cat = {'id': cat_id, 'name': name, 'color': color,
                'created_at': datetime.utcnow().isoformat() + 'Z'}
        self._cats[cat_id] = cat
        return cat

    def list_all(self) -> List[dict]:
        return list(self._cats.values())

    def get(self, cat_id: str) -> Optional[dict]:
        return self._cats.get(cat_id)

    def update(self, cat_id: str, name: Optional[str] = None, color: Optional[str] = None) -> Optional[dict]:
        cat = self._cats.get(cat_id)
        if not cat:
            return None
        if name is not None:
            cat['name'] = name
        if color is not None:
            cat['color'] = color
        return cat

    def delete(self, cat_id: str) -> bool:
        if cat_id in self._cats:
            del self._cats[cat_id]
            return True
        return False


category_store = CategoryStore()
