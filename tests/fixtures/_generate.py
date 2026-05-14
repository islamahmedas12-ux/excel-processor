"""
tests/fixtures/_generate.py
Generates the 3 .xlsx fixture files for test_recalc.py using openpyxl.
Run: python tests/fixtures/_generate.py
"""

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.series import SeriesLabel
from pathlib import Path

FIXTURE_DIR = Path(__file__).parent


def make_formula_test():
    """Sheet1: A1=10, A2=20, B1=2 (literals), C1=SUM(A1,A2)*B1 -> 60"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws["A1"] = 10
    ws["A2"] = 20
    ws["B1"] = 2
    ws["C1"] = "=SUM(A1,A2)*B1"
    wb.save(FIXTURE_DIR / "formula_test.xlsx")
    print("Created formula_test.xlsx")


def make_cross_sheet():
    """Sheet1 (Data): A1=5, A2=2; Sheet2 (Calc): B1=1+1 (independent), C1=(Data!A1+Data!A2)*4"""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "Data"
    ws1["A1"] = 5
    ws1["A2"] = 2

    ws2 = wb.create_sheet("Calc")
    ws2["B1"] = "=1+1"
    ws2["C1"] = "=(Data!A1+Data!A2)*4"

    wb.save(FIXTURE_DIR / "formula_cross_sheet.xlsx")
    print("Created formula_cross_sheet.xlsx")


def make_formula_with_chart():
    """A workbook with a chart and at least one formula cell."""
    wb = Workbook()
    ws = wb.active
    ws["A1"] = 1
    ws["A2"] = 2
    ws["A3"] = 3
    ws["B1"] = "=SUM(A1:A3)"

    data = Reference(ws, min_col=1, min_row=1, max_col=1, max_row=3)
    chart = BarChart()
    chart.add_data(data)
    ws.add_chart(chart, "D1")

    wb.save(FIXTURE_DIR / "formula_with_chart.xlsx")
    print("Created formula_with_chart.xlsx")


if __name__ == "__main__":
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    make_formula_test()
    make_cross_sheet()
    make_formula_with_chart()
    print("All fixtures generated.")