"""
Binding resolver — turns a v2 api_config + run params into concrete
{sheet: {cell: value}} writes for the workbook.

Each data source is fetched at most once per run (cached by source id).
Manual `inputs` passed at run time override any binding that targets the
same (sheet, cell), so a caller can always hand-tune individual cells.
"""

from __future__ import annotations

import re
from typing import Any

from . import data_source
from .jsonpath_util import extract

_REF_RE = re.compile(r"^([A-Za-z]{1,3})([1-9][0-9]*)$")


class BindingError(Exception):
    """A binding could not be resolved (bad path, missing source, etc.)."""


# ── cell-reference arithmetic ────────────────────────────────────────────────

def _split_ref(ref: str) -> tuple[str, int]:
    m = _REF_RE.match(ref.strip())
    if not m:
        raise BindingError(f"Invalid cell reference: {ref!r}")
    return m.group(1).upper(), int(m.group(2))


def _col_to_num(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return n


def _num_to_col(n: int) -> str:
    out = ""
    while n > 0:
        n, rem = divmod(n - 1, 26)
        out = chr(rem + ord("A")) + out
    return out


def _layout_cells(layout: dict, count: int) -> list[str]:
    """Expand an array layout into exactly `count` cell references."""
    mode = layout.get("mode")
    if mode == "explicit":
        return list(layout.get("cells", []))[:count]
    anchor = layout.get("anchor", "")
    col, row = _split_ref(anchor)
    if mode == "down":
        return [f"{col}{row + i}" for i in range(count)]
    if mode == "right":
        base = _col_to_num(col)
        return [f"{_num_to_col(base + i)}{row}" for i in range(count)]
    raise BindingError(f"Unknown array layout mode: {mode!r}")


# ── source resolution ────────────────────────────────────────────────────────

def _resolve_one(src: dict, params: dict, cache: dict) -> Any:
    stype = src.get("type")

    if stype == "constant":
        return src.get("value")

    if stype == "param":
        return params.get(src.get("name"))

    if stype in ("jsonpath", "jsonpath_array"):
        sid = src.get("source")
        if sid not in cache:
            raise BindingError(f"data source {sid!r} was not fetched")
        return extract(cache[sid], src.get("path", ""))

    raise BindingError(f"Unknown binding source type: {stype!r}")


def resolve(
    config: dict,
    params: dict | None = None,
    manual_inputs: dict | None = None,
) -> dict[str | None, dict[str, Any]]:
    """
    Resolve all bindings.

    Returns { sheet_name_or_None: { cell: value, ... }, ... }.
    `manual_inputs` is a flat {cell: value} dict applied last (override),
    targeting the default sheet (None).
    """
    params = params or {}
    manual_inputs = manual_inputs or {}

    # Fetch each referenced data source exactly once.
    needed = {
        b["source"]["source"]
        for b in config.get("inputs", [])
        if b.get("source", {}).get("type", "").startswith("jsonpath")
    }
    by_id = {s["id"]: s for s in config.get("data_sources", [])}
    cache: dict[str, Any] = {}
    for sid in needed:
        if sid not in by_id:
            raise BindingError(f"binding references unknown data source {sid!r}")
        cache[sid] = data_source.fetch(by_id[sid], params)

    writes: dict[str | None, dict[str, Any]] = {}

    def _put(sheet: str | None, cell: str, value: Any) -> None:
        writes.setdefault(sheet, {})[cell] = value

    for b in config.get("inputs", []):
        target = b.get("target", {})
        sheet = target.get("sheet")
        cell = target.get("cell")
        src = b.get("source", {})

        if src.get("type") == "jsonpath_array":
            values = _resolve_one(src, params, cache)
            if values is None:
                values = []
            if not isinstance(values, list):
                values = [values]
            cells = _layout_cells(src.get("layout", {}), len(values))
            for c, v in zip(cells, values):
                _put(sheet, c, v)
        else:
            _put(sheet, cell, _resolve_one(src, params, cache))

    # Manual run-time overrides win.
    for cell, value in manual_inputs.items():
        _put(None, cell, value)

    return writes
