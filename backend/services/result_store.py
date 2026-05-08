import uuid
from datetime import datetime
from typing import Dict, List, Literal, Optional


ResultKind = Literal['xlsx', 'pdf']


class ResultStore:
    """Stores processed files (modified xlsx & generated PDFs) separately from templates."""

    def __init__(self):
        self._results: Dict[str, dict] = {}

    def save(self, kind: ResultKind, source_file_id: str, source_file_name: str,
             filename: str, content: bytes) -> dict:
        result_id = str(uuid.uuid4())
        entry = {
            'id': result_id,
            'kind': kind,
            'source_file_id': source_file_id,
            'source_file_name': source_file_name,
            'filename': filename,
            'size': len(content),
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'content': content,
        }
        self._results[result_id] = entry
        return self._public(entry)

    def get_content(self, result_id: str) -> Optional[bytes]:
        entry = self._results.get(result_id)
        return entry['content'] if entry else None

    def get_meta(self, result_id: str) -> Optional[dict]:
        entry = self._results.get(result_id)
        return self._public(entry) if entry else None

    def list_all(self, kind: Optional[ResultKind] = None) -> List[dict]:
        entries = self._results.values()
        if kind:
            entries = [e for e in entries if e['kind'] == kind]
        return [self._public(e) for e in entries]

    def delete(self, result_id: str) -> bool:
        if result_id in self._results:
            del self._results[result_id]
            return True
        return False

    def _public(self, entry: dict) -> dict:
        return {k: v for k, v in entry.items() if k != 'content'}


result_store = ResultStore()
