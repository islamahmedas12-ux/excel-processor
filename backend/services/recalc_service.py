import subprocess
import os
import shutil
import tempfile
import re
import zipfile
from pathlib import Path
from io import BytesIO

from excel_processor.errors import FileSaveError

_TMPBASE = Path('/tmp/excel_processor_tmp')


def _find_libreoffice() -> str:
    for candidate in ('/snap/bin/libreoffice', 'libreoffice', '/usr/bin/libreoffice', 'soffice'):
        if os.path.isfile(candidate) or (candidate != 'libreoffice' and shutil.which(candidate)):
            return candidate
    raise FileSaveError("LibreOffice not found. Please install it to use recalculation.")


def _eval_formula(formula: str, cell_values: dict) -> 'float | None':
    """Evaluate a simple Excel formula with Python arithmetic."""
    try:
        # Normalize cross-sheet references (Sheet!Cell -> Cell)
        normalized = re.sub(r'([A-Za-z0-9_]+)!([A-Z]+\d+)', r'\2', formula)

        # Replace cell references with their values
        expr = normalized
        for ref, val in cell_values.items():
            expr = re.sub(r'\b' + re.escape(ref) + r'\b', str(val if val is not None else 0), expr)

        # Support SUM with cell ranges: SUM(A1:A3) -> sum of range
        def sum_range(m):
            start, end = m.group(1), m.group(2)
            start_col = re.match(r'^([A-Z]+)', start).group(1)
            start_row = int(re.match(r'^[A-Z]+(\d+)', start).group(1))
            end_col = re.match(r'^([A-Z]+)', end).group(1)
            end_row = int(re.match(r'^[A-Z]+(\d+)', end).group(1))
            total = 0
            for row in range(start_row, end_row + 1):
                for col in range(_col_to_num(start_col), _col_to_num(end_col) + 1):
                    ref = _num_to_col(col) + str(row)
                    total += cell_values.get(ref, 0) or 0
            return str(total)

        expr = re.sub(r'SUM\(([A-Z]+\d+):([A-Z]+\d+)\)', sum_range, expr)

        # Also handle SUM(a,b,c,...) with comma-separated values
        def sum_args(m):
            args_str = m.group(1)
            args = re.split(r',', args_str)
            total = 0
            for arg in args:
                arg = arg.strip()
                if arg in cell_values:
                    total += cell_values.get(arg, 0) or 0
                else:
                    try:
                        total += float(arg)
                    except (ValueError, TypeError):
                        return '0'
            return str(total)

        expr = re.sub(r'SUM\(([^)]+)\)', sum_args, expr)

        # Only allow safe arithmetic expressions
        if not re.match(r'^[\d\s+\-*/().,]+$', expr):
            return None

        return eval(expr)
    except Exception:
        return None


def _col_to_num(col: str) -> int:
    num = 0
    for c in col:
        num = num * 26 + (ord(c) - ord('A') + 1)
    return num


def _num_to_col(num: int) -> str:
    result = ''
    while num > 0:
        num -= 1
        result = chr(num % 26 + ord('A')) + result
        num //= 26
    return result


def _patch_cached_values(xlsx_bytes: bytes, filename: str) -> bytes:
    """
    Patch formula cells in an xlsx file by computing cached values in Python.
    LibreOffice headless conversion writes <v/> (empty) for all formula results.
    """
    buf_in = BytesIO(xlsx_bytes)

    # Build cell value map from ALL sheets' XML
    cell_values = {}
    sheet_names = []
    sheet_pattern = re.compile(r'<c r="([A-Z]+\d+)"[^>]*>(?:<f[^>]*>[^<]*</f>)?(?:<v>([^<]*)</v>|<v/>)')
    with zipfile.ZipFile(buf_in, 'r') as zin:
        for name in zin.namelist():
            if re.match(r'xl/worksheets/sheet\d+\.xml', name):
                xml = zin.read(name).decode('utf-8')
                for m in sheet_pattern.finditer(xml):
                    ref = m.group(1)
                    value = m.group(2) if m.group(2) is not None else 0
                    try:
                        cell_values[ref] = float(value) if value else 0
                    except (ValueError, TypeError):
                        cell_values[ref] = value

    buf_in.seek(0)

    buf_out = BytesIO()
    with zipfile.ZipFile(buf_in, 'r') as zin:
        with zipfile.ZipFile(buf_out, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                xml = None
                if re.match(r'xl/worksheets/sheet\d+\.xml', item.filename):
                    xml = zin.read(item.filename).decode('utf-8')

                    def replacer(m):
                        full = m.group(0)
                        f_m = re.search(r'<f[^>]*>([^<]*)</f>', full)
                        if not f_m:
                            return full
                        formula = f_m.group(1)
                        computed = _eval_formula(formula, cell_values)
                        if computed is not None:
                            new_val = f'<v>{computed}</v>'
                            result = re.sub(r'<v\s*/>', new_val, full)
                            result = re.sub(r'<v>[^<]*</v>', new_val, result)
                            return result
                        return full

                    xml = re.sub(
                        r'<c r="[^"]*"[^>]*>.*?</c>',
                        replacer,
                        xml,
                        flags=re.DOTALL
                    )
                    zout.writestr(item, xml.encode('utf-8'))
                else:
                    zout.writestr(item, zin.read(item.filename))

    buf_out.seek(0)
    return buf_out.read()


def recalc_xlsx(xlsx_bytes: bytes, filename: str) -> bytes:
    libreoffice = _find_libreoffice()
    base_name = os.path.splitext(filename)[0]
    expected_xlsx = f"{base_name}.xlsx"

    _TMPBASE.mkdir(parents=True, exist_ok=True)
    tmpdir = tempfile.mkdtemp(dir=_TMPBASE)

    try:
        input_path = os.path.join(tmpdir, filename)
        output_path = os.path.join(tmpdir, expected_xlsx)

        with open(input_path, 'wb') as f:
            f.write(xlsx_bytes)

        result = subprocess.run(
            [
                libreoffice,
                '--headless',
                '--norestore',
                '--convert-to', 'xlsx',
                '--outdir', tmpdir,
                input_path,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if not os.path.exists(output_path):
            found = [f for f in os.listdir(tmpdir) if f.endswith('.xlsx')]
            if found:
                output_path = os.path.join(tmpdir, found[0])
            else:
                raise FileSaveError(
                    f"Recalc failed. stdout={result.stdout!r} stderr={result.stderr!r}"
                )

        with open(output_path, 'rb') as f:
            recalc_bytes = f.read()

        return _patch_cached_values(recalc_bytes, filename)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def get_recalc_service() -> "RecalcService":
    return RecalcService()


class RecalcService:
    def recalc(self, xlsx_bytes: bytes, filename: str) -> bytes:
        return recalc_xlsx(xlsx_bytes, filename)