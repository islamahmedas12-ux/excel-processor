"""
Minimal, dependency-free JSON path extraction.

Supports the subset needed to map external API responses onto Excel cells:

    a.b.c            nested object access
    a[0].b           list index then key
    items[*].n01     wildcard over a list -> returns a list of values
    a.b[*]           wildcard returning the list itself

`extract()` returns a scalar for a concrete path and a list for any path
containing a `[*]` wildcard. Missing keys/indexes yield None (scalars) or
skip the element (wildcards) rather than raising — callers decide how strict
to be.
"""

from __future__ import annotations

import re
from typing import Any

_TOKEN_RE = re.compile(r"""
      (?P<key>[^.\[\]]+)            # a bare object key
    | \[\s*(?P<index>\d+)\s*\]      # [12]  list index
    | \[\s*(?P<wild>\*)\s*\]        # [*]   wildcard
""", re.VERBOSE)


def _tokenize(path: str) -> list[tuple[str, Any]]:
    """Turn 'items[*].n01' into [('key','items'),('wild',None),('key','n01')]."""
    tokens: list[tuple[str, Any]] = []
    for m in _TOKEN_RE.finditer(path):
        if m.group("key") is not None:
            tokens.append(("key", m.group("key")))
        elif m.group("index") is not None:
            tokens.append(("index", int(m.group("index"))))
        elif m.group("wild") is not None:
            tokens.append(("wild", None))
    return tokens


def _walk(value: Any, tokens: list[tuple[str, Any]]) -> Any:
    if not tokens:
        return value
    kind, arg = tokens[0]
    rest = tokens[1:]

    if value is None:
        return None

    if kind == "key":
        if isinstance(value, dict):
            return _walk(value.get(arg), rest)
        return None

    if kind == "index":
        if isinstance(value, (list, tuple)) and -len(value) <= arg < len(value):
            return _walk(value[arg], rest)
        return None

    if kind == "wild":
        if not isinstance(value, (list, tuple)):
            return []
        return [_walk(item, rest) for item in value]

    return None


def has_wildcard(path: str) -> bool:
    return "[*]" in path.replace(" ", "")


def extract(data: Any, path: str) -> Any:
    """
    Extract `path` from `data`.

    Returns a list when the path contains `[*]`, otherwise a single value
    (or None when any segment is missing).
    """
    path = (path or "").strip()
    if not path:
        return data
    return _walk(data, _tokenize(path))
