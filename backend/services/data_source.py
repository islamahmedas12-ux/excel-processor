"""
External data source fetcher.

A "data source" is a user-defined HTTP request whose JSON response feeds
Excel input cells. URLs may contain {param} placeholders filled from the
run's params. Every common auth style is supported; the user picks one
per source and supplies its secret.

This module only performs the request and returns parsed JSON — mapping
JSON fields onto cells is the binding_resolver's job.
"""

from __future__ import annotations

import re
from typing import Any

import requests

DEFAULT_TIMEOUT = int(__import__("os").getenv("DATA_SOURCE_TIMEOUT", "30"))

_PLACEHOLDER_RE = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


class DataSourceError(Exception):
    """Raised when a source cannot be fetched or returns a non-2xx status."""


def find_placeholders(url: str) -> list[str]:
    """Return the {param} names referenced in a URL template."""
    return list(dict.fromkeys(_PLACEHOLDER_RE.findall(url or "")))


def _substitute(url: str, params: dict) -> str:
    def repl(m: re.Match) -> str:
        name = m.group(1)
        if name not in params or params[name] is None:
            raise DataSourceError(f"Missing run param '{name}' for URL template")
        return str(params[name])

    return _PLACEHOLDER_RE.sub(repl, url or "")


def _apply_auth(auth: dict, headers: dict, query: dict) -> tuple[dict, dict, Any]:
    """
    Mutate/extend headers & query for the chosen auth type.
    Returns (headers, query, requests_auth) where requests_auth is passed
    to requests' `auth=` (used only for basic auth).
    """
    auth = auth or {}
    atype = (auth.get("type") or "none").lower()

    if atype in ("none", ""):
        return headers, query, None

    if atype == "bearer":
        token = auth.get("token", "")
        headers["Authorization"] = f"Bearer {token}"
        return headers, query, None

    if atype == "api_key_header":
        name = auth.get("header_name") or "X-API-Key"
        headers[name] = auth.get("value", "")
        return headers, query, None

    if atype == "query_param":
        name = auth.get("param_name") or "api_key"
        query[name] = auth.get("value", "")
        return headers, query, None

    if atype == "basic":
        return headers, query, (auth.get("username", ""), auth.get("password", ""))

    if atype == "custom_header":
        # Free-form headers: {"headers": {"X-Foo": "bar", ...}}
        for k, v in (auth.get("headers") or {}).items():
            headers[str(k)] = str(v)
        return headers, query, None

    raise DataSourceError(f"Unsupported auth type: {atype}")


def fetch(source: dict, params: dict) -> Any:
    """
    Execute one data source and return its parsed JSON body.

    `source` shape:
        {
          "id": "...", "name": "...",
          "method": "GET" | "POST" | ...,
          "url": "https://.../{exam_id}",
          "headers": { ... },                 # static extra headers (optional)
          "query":   { ... },                 # static query params (optional)
          "body":    { ... },                 # JSON body for POST/PUT (optional)
          "auth":    { "type": "...", ... },
        }
    """
    method = (source.get("method") or "GET").upper()
    url = _substitute(source.get("url", ""), params)

    headers = dict(source.get("headers") or {})
    query = dict(source.get("query") or {})
    headers, query, requests_auth = _apply_auth(source.get("auth") or {}, headers, query)

    body = source.get("body")

    try:
        resp = requests.request(
            method,
            url,
            headers=headers or None,
            params=query or None,
            json=body if body and method in ("POST", "PUT", "PATCH") else None,
            auth=requests_auth,
            timeout=DEFAULT_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise DataSourceError(f"Request to '{source.get('name') or url}' failed: {exc}")

    if resp.status_code >= 400:
        raise DataSourceError(
            f"Source '{source.get('name') or url}' returned HTTP {resp.status_code}: "
            f"{resp.text[:300]}"
        )

    try:
        return resp.json()
    except ValueError:
        raise DataSourceError(
            f"Source '{source.get('name') or url}' did not return JSON"
        )
