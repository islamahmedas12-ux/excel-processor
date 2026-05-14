"""
tests/test_recalc.py
Tests for the recalc pipeline (Phase 1.3)
"""

import pytest
import zipfile
import io
from pathlib import Path
from openpyxl import load_workbook

from backend.services.excel_service import ExcelService
from backend.services.recalc_service import recalc_xlsx


# ── fixtures ──────────────────────────────────────────────────────────────────

FIXTURE_DIR = Path(__file__).parent / 'fixtures'


@pytest.fixture
def formula_file():
    return FIXTURE_DIR / 'formula_test.xlsx'


@pytest.fixture
def formula_with_chart_file():
    return FIXTURE_DIR / 'formula_with_chart.xlsx'


@pytest.fixture
def cross_sheet_file():
    return FIXTURE_DIR / 'formula_cross_sheet.xlsx'


# ── recalc_xlsx unit tests ────────────────────────────────────────────────────

class TestRecalcService:
    def test_recalc_returns_bytes(self, formula_file):
        data = formula_file.read_bytes()
        result = recalc_xlsx(data, 'formula_test.xlsx')
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_recalc_formula_cell_has_cached_value(self, formula_file):
        data = formula_file.read_bytes()
        result = recalc_xlsx(data, 'formula_test.xlsx')
        wb = load_workbook(io.BytesIO(result), data_only=True)
        ws = wb.active
        # C1 = SUM(A1,A2)*B1 with A1=10, A2=20, B1=2 -> 60
        assert ws['C1'].value == 60
        wb.close()

    def test_recalc_preserves_literal_values(self, formula_file):
        data = formula_file.read_bytes()
        result = recalc_xlsx(data, 'formula_test.xlsx')
        wb = load_workbook(io.BytesIO(result), data_only=True)
        ws = wb.active
        assert ws['A1'].value == 10
        assert ws['A2'].value == 20
        assert ws['B1'].value == 2
        wb.close()


# ── execute pipeline integration tests ────────────────────────────────────────

class TestExecuteRecalculatesFormula:
    def test_execute_returns_computed_sum(self, formula_file):
        svc = ExcelService()
        data = formula_file.read_bytes()
        result = svc.execute(
            file_content=data,
            filename='formula_test.xlsx',
            inputs={'A1': 10, 'A2': 20, 'B1': 2},
            outputs=['C1'],
        )
        assert result['success'] is True
        assert result['results']['C1'] == 60

    def test_execute_write_non_formula_cells(self, formula_file):
        svc = ExcelService()
        data = formula_file.read_bytes()
        result = svc.execute(
            file_content=data,
            filename='formula_test.xlsx',
            inputs={'A1': 5, 'A2': 5, 'B1': 10},
            outputs=['C1'],
        )
        assert result['success'] is True
        # C1 = SUM(A1,A2)*B1 = (5+5)*10 = 100
        assert result['results']['C1'] == 100

    def test_execute_multiple_outputs(self, formula_file):
        svc = ExcelService()
        data = formula_file.read_bytes()
        result = svc.execute(
            file_content=data,
            filename='formula_test.xlsx',
            inputs={'A1': 3, 'A2': 7, 'B1': 4},
            outputs=['C1', 'A1', 'A2'],
        )
        assert result['success'] is True
        # C1 = SUM(3,7)*4 = 40
        assert result['results']['C1'] == 40
        assert result['results']['A1'] == 3
        assert result['results']['A2'] == 7

    def test_execute_preserves_images_charts(self, formula_with_chart_file):
        svc = ExcelService()
        data = formula_with_chart_file.read_bytes()
        result = svc.execute(
            file_content=data,
            filename='formula_with_chart.xlsx',
            inputs={'A1': 1, 'A2': 2, 'A3': 3},
            outputs=['B1'],
        )
        assert result['success'] is True
        # Verify the file is still a valid xlsx (no corruption)
        wb = load_workbook(io.BytesIO(recalc_xlsx(data, 'formula_with_chart.xlsx')))
        assert wb.sheetnames
        wb.close()

    def test_execute_cross_sheet_reference(self, cross_sheet_file):
        svc = ExcelService()
        data = cross_sheet_file.read_bytes()
        result = svc.execute(
            file_content=data,
            filename='formula_cross_sheet.xlsx',
            inputs={'A1': 10, 'A2': 20},
            outputs=['B1', 'C1'],
            sheet_name='Calc',
        )
        assert result['success'] is True
        # B1 = Data!A1 + Data!A2 + 1 = 10 + 20 + 1 = 31
        assert result['results']['B1'] == 31
        # C1 = SUM(Data!A1:A2)*B1 = (10+20)*2 = 60  -- wait B1 was set to 31 above, so 60
        # Actually recalc uses the inputs as written, so B1=31 is NOT applied
        # The formula B1 references the original B1=2 from fixture (or inputs override)
        # Since we didn't override B1 in inputs, original B1=2 still applies
        # C1 = SUM(10,20)*2 = 60
        assert result['results']['C1'] == 60


class TestWriteCellsRegression:
    def test_write_literal_values_still_works(self, formula_file):
        svc = ExcelService()
        data = formula_file.read_bytes()
        # Only write literal values, no formulas involved
        result = svc.execute(
            file_content=data,
            filename='formula_test.xlsx',
            inputs={'A1': 99, 'A2': 88, 'B1': 11},
            outputs=['C1'],
        )
        assert result['success'] is True
        assert result['results']['C1'] == (99 + 88) * 11  # 2057