"""
api_config schema: detection and validation.

Two shapes are accepted on a file:

  v1 (legacy, manual-only):
      { "inputs": ["A1","B2"], "outputs": ["C1"], "sheet": "Sheet1" }

  v2 (dynamic bindings):
      {
        "version": 2,
        "run_params":   [ { "name": "exam_id", "required": true } ],
        "data_sources": [ { "id","name","method","url","auth","headers","query","body" } ],
        "inputs":       [ { "target": {"sheet","cell"}, "source": {...} } ],
        "outputs":      [ { "sheet","cell","name"? } ]
      }

A v2 input "source" is one of:
  { "type":"constant",       "value": <any> }
  { "type":"param",          "name":  "<run param>" }
  { "type":"jsonpath",       "source":"<data_source id>", "path":"items[0].f07" }
  { "type":"jsonpath_array", "source":"<data_source id>", "path":"items[*].n01",
        "layout": { "mode":"down|right|explicit",
                    "anchor":"C5",                # down|right
                    "cells":["C5","C6",...] } }   # explicit
"""

from __future__ import annotations

import re

_CELL_RE = re.compile(r"^[A-Za-z]{1,3}[1-9][0-9]*$")
_SOURCE_TYPES = {"constant", "param", "jsonpath", "jsonpath_array"}
_AUTH_TYPES = {"none", "bearer", "api_key_header", "query_param", "basic", "custom_header"}
_LAYOUT_MODES = {"down", "right", "explicit"}


def is_v2(config: dict) -> bool:
    """True when the config uses the dynamic-binding shape."""
    if not isinstance(config, dict):
        return False
    if config.get("version") == 2:
        return True
    if "data_sources" in config:
        return True
    inputs = config.get("inputs")
    return isinstance(inputs, list) and len(inputs) > 0 and isinstance(inputs[0], dict)


def _err(msg: str) -> tuple[bool, str]:
    return False, msg


def _valid_cell(cell: str) -> bool:
    return isinstance(cell, str) and bool(_CELL_RE.match(cell.strip()))


def validate_v1(config: dict) -> tuple[bool, str]:
    if not isinstance(config.get("inputs"), list) or not isinstance(config.get("outputs"), list):
        return _err("v1 config requires list 'inputs' and 'outputs'")
    for c in config["inputs"] + config["outputs"]:
        if not _valid_cell(c):
            return _err(f"Invalid cell coordinate: {c!r}")
    if config.get("inputs") and config.get("outputs"):
        if set(config["inputs"]) & set(config["outputs"]):
            return _err("inputs and outputs must be disjoint")
    return True, ""


def validate_v2(config: dict) -> tuple[bool, str]:
    sources = config.get("data_sources", [])
    if not isinstance(sources, list):
        return _err("'data_sources' must be a list")
    source_ids: set[str] = set()
    for s in sources:
        if not isinstance(s, dict) or not s.get("id") or not s.get("url"):
            return _err("each data_source needs an 'id' and 'url'")
        if s["id"] in source_ids:
            return _err(f"duplicate data_source id: {s['id']!r}")
        source_ids.add(s["id"])
        atype = ((s.get("auth") or {}).get("type") or "none").lower()
        if atype not in _AUTH_TYPES:
            return _err(f"unsupported auth type {atype!r} on source {s['id']!r}")

    params = config.get("run_params", [])
    if not isinstance(params, list):
        return _err("'run_params' must be a list")
    param_names = set()
    for p in params:
        if not isinstance(p, dict) or not p.get("name"):
            return _err("each run_param needs a 'name'")
        param_names.add(p["name"])

    inputs = config.get("inputs", [])
    if not isinstance(inputs, list) or not inputs:
        return _err("v2 config needs a non-empty 'inputs' list")
    for b in inputs:
        if not isinstance(b, dict):
            return _err("each input binding must be an object")
        tgt = b.get("target") or {}
        if not _valid_cell(tgt.get("cell", "")):
            return _err(f"binding target needs a valid 'cell' (got {tgt.get('cell')!r})")
        src = b.get("source") or {}
        stype = src.get("type")
        if stype not in _SOURCE_TYPES:
            return _err(f"binding source.type must be one of {sorted(_SOURCE_TYPES)}")
        if stype == "param" and src.get("name") not in param_names:
            return _err(f"binding references unknown run param {src.get('name')!r}")
        if stype in ("jsonpath", "jsonpath_array"):
            if src.get("source") not in source_ids:
                return _err(f"binding references unknown data_source {src.get('source')!r}")
            if not src.get("path"):
                return _err("jsonpath binding needs a 'path'")
        if stype == "jsonpath_array":
            layout = src.get("layout") or {}
            mode = layout.get("mode")
            if mode not in _LAYOUT_MODES:
                return _err(f"array layout.mode must be one of {sorted(_LAYOUT_MODES)}")
            if mode in ("down", "right") and not _valid_cell(layout.get("anchor", "")):
                return _err("array layout needs a valid 'anchor' cell")
            if mode == "explicit":
                cells = layout.get("cells")
                if not isinstance(cells, list) or not all(_valid_cell(c) for c in cells):
                    return _err("explicit array layout needs a 'cells' list of valid cells")

    outputs = config.get("outputs", [])
    if not isinstance(outputs, list) or not outputs:
        return _err("v2 config needs a non-empty 'outputs' list")
    for o in outputs:
        if not isinstance(o, dict) or not _valid_cell(o.get("cell", "")):
            return _err("each output needs a valid 'cell'")

    return True, ""


def validate(config: dict) -> tuple[bool, str]:
    """Validate either shape. Returns (ok, error_message)."""
    if not isinstance(config, dict):
        return _err("config must be an object")
    return validate_v2(config) if is_v2(config) else validate_v1(config)
