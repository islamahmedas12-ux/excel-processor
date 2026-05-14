import subprocess
import os
import shutil
import tempfile
from pathlib import Path
from io import BytesIO

from excel_processor.errors import FileSaveError

_TMPBASE = Path.home() / 'excel_processor_tmp'


def _find_libreoffice() -> str:
    for candidate in ('/snap/bin/libreoffice', 'libreoffice', '/usr/bin/libreoffice', 'soffice'):
        if os.path.isfile(candidate) or (candidate != 'libreoffice' and shutil.which(candidate)):
            return candidate
    raise FileSaveError("LibreOffice not found. Please install it to use recalculation.")


def recalc_xlsx(xlsx_bytes: bytes, filename: str) -> bytes:
    libreoffice = _find_libreoffice()
    base_name = os.path.splitext(filename)[0]
    expected_xlsx = f"{base_name}.xlsx"

    _TMPBASE.mkdir(parents=True, exist_ok=True)
    tmpdir = tempfile.mkdtemp(dir=_TMPBASE)
    profdir = os.path.join(tmpdir, 'lo_profile')
    os.makedirs(profdir)

    try:
        input_path = os.path.join(tmpdir, filename)
        output_path = os.path.join(tmpdir, expected_xlsx)

        with open(input_path, 'wb') as f:
            f.write(xlsx_bytes)

        result = subprocess.run(
            [
                libreoffice,
                '--headless',
                f'-env:UserInstallation=file://{profdir}',
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
            return f.read()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def get_recalc_service() -> "RecalcService":
    return RecalcService()


class RecalcService:
    def recalc(self, xlsx_bytes: bytes, filename: str) -> bytes:
        return recalc_xlsx(xlsx_bytes, filename)