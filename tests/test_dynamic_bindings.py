"""
Unit tests for the v2 dynamic-binding engine: jsonpath extraction,
api_config validation, and binding resolution (with data sources mocked).
Pure logic — no network, no LibreOffice — so these always run fast.
"""

import pytest

from backend.services import jsonpath_util as jp
from backend.services import api_config_schema as schema
from backend.services import binding_resolver as br


# ── jsonpath_util ─────────────────────────────────────────────────────────────

LIMS = {
    "items": [
        {"seq": 1, "n01": 71.85, "n02": 68.57},
        {"seq": 2, "n01": 71.56, "n02": 68.55},
        {"seq": 3, "n01": 72.40, "n02": 69.40},
    ],
    "count": 3,
    "meta": {"exam": {"f07": "28"}},
}


class TestJsonPath:
    def test_nested_key(self):
        assert jp.extract(LIMS, "meta.exam.f07") == "28"

    def test_index_then_key(self):
        assert jp.extract(LIMS, "items[0].n01") == 71.85
        assert jp.extract(LIMS, "items[2].n02") == 69.40

    def test_wildcard_returns_list(self):
        assert jp.extract(LIMS, "items[*].n01") == [71.85, 71.56, 72.40]

    def test_missing_is_none(self):
        assert jp.extract(LIMS, "meta.exam.nope") is None
        assert jp.extract(LIMS, "items[99].n01") is None

    def test_has_wildcard(self):
        assert jp.has_wildcard("items[*].n01") is True
        assert jp.has_wildcard("items[0].n01") is False

    def test_empty_path_returns_root(self):
        assert jp.extract(LIMS, "") is LIMS


# ── api_config_schema ─────────────────────────────────────────────────────────

V2_OK = {
    "version": 2,
    "run_params": [{"name": "exam_id", "required": True}],
    "data_sources": [{"id": "results", "url": "https://x/{exam_id}", "auth": {"type": "none"}}],
    "inputs": [
        {"target": {"sheet": "Calc", "cell": "B2"},
         "source": {"type": "jsonpath_array", "source": "results",
                    "path": "items[*].n01", "layout": {"mode": "down", "anchor": "B2"}}},
        {"target": {"cell": "A1"}, "source": {"type": "constant", "value": 5}},
        {"target": {"cell": "A2"}, "source": {"type": "param", "name": "exam_id"}},
    ],
    "outputs": [{"sheet": "Calc", "cell": "E2", "name": "avg"}],
}


class TestSchema:
    def test_detects_v2(self):
        assert schema.is_v2(V2_OK) is True
        assert schema.is_v2({"inputs": ["A1"], "outputs": ["B1"], "sheet": "S"}) is False

    def test_v2_valid(self):
        ok, err = schema.validate(V2_OK)
        assert ok, err

    def test_v1_valid(self):
        ok, err = schema.validate({"inputs": ["A1"], "outputs": ["B1"], "sheet": "S1"})
        assert ok, err

    def test_v1_disjoint(self):
        ok, _ = schema.validate({"inputs": ["A1"], "outputs": ["A1"]})
        assert not ok

    def test_v2_unknown_source(self):
        bad = {**V2_OK, "inputs": [
            {"target": {"cell": "B2"},
             "source": {"type": "jsonpath", "source": "ghost", "path": "a"}}]}
        ok, err = schema.validate(bad)
        assert not ok and "ghost" in err

    def test_v2_bad_layout(self):
        bad = {**V2_OK, "inputs": [
            {"target": {"cell": "B2"},
             "source": {"type": "jsonpath_array", "source": "results",
                        "path": "items[*].n01", "layout": {"mode": "sideways"}}}]}
        ok, _ = schema.validate(bad)
        assert not ok

    def test_v2_unknown_param(self):
        bad = {**V2_OK, "inputs": [
            {"target": {"cell": "A2"}, "source": {"type": "param", "name": "nope"}}]}
        ok, _ = schema.validate(bad)
        assert not ok


# ── binding_resolver (data_source mocked) ────────────────────────────────────

class TestResolver:
    @pytest.fixture(autouse=True)
    def _mock_fetch(self, monkeypatch):
        monkeypatch.setattr(br.data_source, "fetch", lambda src, params: LIMS)

    def test_constant_and_param(self):
        cfg = {
            "version": 2, "data_sources": [], "run_params": [{"name": "k"}],
            "inputs": [
                {"target": {"cell": "A1"}, "source": {"type": "constant", "value": 42}},
                {"target": {"cell": "A2"}, "source": {"type": "param", "name": "k"}},
            ],
            "outputs": [{"cell": "Z1"}],
        }
        w = br.resolve(cfg, params={"k": "hello"})
        assert w[None]["A1"] == 42
        assert w[None]["A2"] == "hello"

    def test_jsonpath_scalar_and_array_down(self):
        w = br.resolve(V2_OK, params={"exam_id": 6869})
        assert w["Calc"]["B2"] == 71.85
        assert w["Calc"]["B3"] == 71.56
        assert w["Calc"]["B4"] == 72.40
        assert w[None]["A1"] == 5            # constant
        assert w[None]["A2"] == 6869         # param

    def test_array_right_layout(self):
        cfg = {
            "version": 2,
            "data_sources": [{"id": "r", "url": "x"}],
            "run_params": [],
            "inputs": [{"target": {"sheet": "S", "cell": "B2"},
                        "source": {"type": "jsonpath_array", "source": "r",
                                   "path": "items[*].n01",
                                   "layout": {"mode": "right", "anchor": "B2"}}}],
            "outputs": [{"cell": "Z1"}],
        }
        w = br.resolve(cfg)
        assert w["S"] == {"B2": 71.85, "C2": 71.56, "D2": 72.40}

    def test_array_explicit_layout(self):
        cfg = {
            "version": 2,
            "data_sources": [{"id": "r", "url": "x"}],
            "run_params": [],
            "inputs": [{"target": {"cell": "Q1"},
                        "source": {"type": "jsonpath_array", "source": "r",
                                   "path": "items[*].n02",
                                   "layout": {"mode": "explicit",
                                              "cells": ["X1", "X5", "X9"]}}}],
            "outputs": [{"cell": "Z1"}],
        }
        w = br.resolve(cfg)
        assert w[None] == {"X1": 68.57, "X5": 68.55, "X9": 69.40}

    def test_manual_inputs_override(self):
        w = br.resolve(V2_OK, params={"exam_id": 1}, manual_inputs={"A1": 999})
        assert w[None]["A1"] == 999
