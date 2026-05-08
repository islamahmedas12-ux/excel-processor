import uuid
from datetime import datetime
from typing import Dict, List, Optional


class FileStore:
    """In-memory file repository — files stored per owner until server restart."""

    def __init__(self):
        self._files: Dict[str, dict] = {}

    # ── Write ─────────────────────────────────────────────────────────────────

    def upload(self, filename: str, content: bytes,
               owner_email: str = '',
               category_id: Optional[str] = None) -> dict:
        file_id = str(uuid.uuid4())
        entry = {
            'id':          file_id,
            'name':        filename,
            'size':        len(content),
            'uploaded_at': datetime.utcnow().isoformat() + 'Z',
            'category_id': category_id,
            'owner_email': owner_email.lower(),
            'content':     content,
        }
        self._files[file_id] = entry
        return self._public(entry)

    def set_category(self, file_id: str, category_id: Optional[str],
                     owner_email: str = '') -> bool:
        entry = self._files.get(file_id)
        if not entry:
            return False
        if owner_email and entry['owner_email'] != owner_email.lower():
            return False
        entry['category_id'] = category_id
        return True

    def delete(self, file_id: str, owner_email: str = '') -> bool:
        entry = self._files.get(file_id)
        if not entry:
            return False
        if owner_email and entry['owner_email'] != owner_email.lower():
            return False
        del self._files[file_id]
        return True

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_content(self, file_id: str, owner_email: str = '') -> Optional[bytes]:
        entry = self._files.get(file_id)
        if not entry:
            return None
        if owner_email and entry['owner_email'] != owner_email.lower():
            return None
        return entry['content']

    def get_meta(self, file_id: str, owner_email: str = '') -> Optional[dict]:
        entry = self._files.get(file_id)
        if not entry:
            return None
        if owner_email and entry['owner_email'] != owner_email.lower():
            return None
        return self._public(entry)

    def list_all(self, owner_email: str = '') -> List[dict]:
        entries = self._files.values()
        if owner_email:
            entries = [e for e in entries if e['owner_email'] == owner_email.lower()]
        return [self._public(e) for e in entries]

    def usage(self, owner_email: str) -> dict:
        """Return file count and total bytes for an owner."""
        entries = [e for e in self._files.values()
                   if e['owner_email'] == owner_email.lower()]
        return {
            'file_count':   len(entries),
            'total_bytes':  sum(e['size'] for e in entries),
        }

    def _public(self, entry: dict) -> dict:
        return {k: v for k, v in entry.items() if k != 'content'}


file_store = FileStore()
