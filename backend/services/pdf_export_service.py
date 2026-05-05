import subprocess
import os
from io import BytesIO
from typing import Optional

from excel_processor.errors import FileSaveError


class PDFExportService:

    def __init__(self, libreoffice_path: str = "libreoffice"):
        self.libreoffice_path = libreoffice_path

    def convert_excel_to_pdf(
        self,
        excel_content: bytes,
        filename: str,
        output_name: Optional[str] = None
    ) -> bytes:
        """
        Convert Excel file to PDF using LibreOffice

        Args:
            excel_content: Excel file bytes
            filename: Original filename
            output_name: Optional output PDF name

        Returns:
            PDF file bytes
        """
        import tempfile

        base_name = os.path.splitext(filename)[0]
        pdf_name = output_name or f"{base_name}.pdf"

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, filename)
            output_path = os.path.join(tmpdir, pdf_name)

            with open(input_path, 'wb') as f:
                f.write(excel_content)

            result = subprocess.run(
                [
                    self.libreoffice_path,
                    '--headless',
                    '--convert-to', 'pdf',
                    '--outdir', tmpdir,
                    input_path
                ],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                raise FileSaveError(f"LibreOffice conversion failed: {result.stderr}")

            if not os.path.exists(output_path):
                raise FileSaveError(f"PDF was not created at {output_path}")

            with open(output_path, 'rb') as f:
                return f.read()


def get_pdf_export_service() -> PDFExportService:
    return PDFExportService()