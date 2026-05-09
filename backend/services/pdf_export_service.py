import subprocess
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from excel_processor.errors import FileSaveError

# Snap LibreOffice cannot access hidden dirs (starting with '.') or /tmp.
# Use a non-hidden dir under home so snap's filesystem access works.
_TMPBASE = Path.home() / 'excel_processor_tmp'


def _filter_sheets(file_content: bytes, sheets: list) -> bytes:
    """Return a new xlsx with only the requested sheets visible (others hidden).
    Uses direct ZIP manipulation so images and drawings are never lost."""
    from .xlsx_patch import filter_sheets as _zip_filter
    return _zip_filter(file_content, sheets)


def _find_libreoffice() -> str:
    for candidate in ('/snap/bin/libreoffice', 'libreoffice', '/usr/bin/libreoffice', 'soffice'):
        if shutil.which(candidate) or os.path.isfile(candidate):
            return candidate
    raise FileSaveError("LibreOffice not found. Please install it to use PDF export.")


class PDFExportService:

    def convert_excel_to_pdf(
        self,
        excel_content: bytes,
        filename: str,
        output_name: Optional[str] = None,
        sheets: Optional[list] = None,
    ) -> bytes:
        libreoffice = _find_libreoffice()
        base_name = os.path.splitext(filename)[0]
        expected_pdf = f"{base_name}.pdf"

        if sheets:
            excel_content = _filter_sheets(excel_content, sheets)

        _TMPBASE.mkdir(parents=True, exist_ok=True)
        tmpdir = tempfile.mkdtemp(dir=_TMPBASE)
        profdir = os.path.join(tmpdir, 'lo_profile')
        os.makedirs(profdir)

        try:
            input_path = os.path.join(tmpdir, filename)
            output_path = os.path.join(tmpdir, expected_pdf)

            with open(input_path, 'wb') as f:
                f.write(excel_content)

            result = subprocess.run(
                [
                    libreoffice,
                    '--headless',
                    f'-env:UserInstallation=file://{profdir}',
                    '--convert-to', 'pdf',
                    '--outdir', tmpdir,
                    input_path,
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )

            if not os.path.exists(output_path):
                found = [f for f in os.listdir(tmpdir) if f.endswith('.pdf')]
                if found:
                    output_path = os.path.join(tmpdir, found[0])
                else:
                    raise FileSaveError(
                        f"PDF not created. stdout={result.stdout!r} stderr={result.stderr!r}"
                    )

            with open(output_path, 'rb') as f:
                return f.read()
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


def get_pdf_export_service() -> PDFExportService:
    return PDFExportService()
