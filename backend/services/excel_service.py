"""
Excel Service
============
Handles Excel operations with in-memory file processing
"""

from io import BytesIO
from typing import Dict, List, Any, Optional

from excel_processor.file_reader import ExcelReader
from excel_processor.file_editor import ExcelEditor
from .xlsx_patch import write_cells as _zip_write_cells


class ExcelService:
    """Service for Excel operations - files processed in memory"""

    def execute(
        self,
        file_content: bytes,
        filename: str,
        inputs: Dict[str, Any],
        outputs: List[str],
        sheet_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fill inputs → Excel calculates → Return outputs

        Args:
            file_content: Excel file bytes
            filename: Original filename
            inputs: Dict of {cell: value} to update
            outputs: List of cell coordinates to read
            sheet_name: Optional sheet name

        Returns:
            Dict with results
        """
        bytes_io = BytesIO(file_content)

        with ExcelEditor(bytes_io) as editor:
            sheet_name_to_use = sheet_name or editor.get_sheet_names()[0]

            for cell, value in inputs.items():
                editor.update_cell(
                    coordinates=cell,
                    value=value,
                    sheet_name=sheet_name_to_use,
                    preserve_format=True
                )

            results = {}
            for output_cell in outputs:
                value = editor.get_sheet(sheet_name_to_use)[output_cell].value
                results[output_cell] = value

            editor.save()

        return {
            "success": True,
            "results": results,
            "sheet": sheet_name_to_use,
            "filename": filename
        }

    def read_cells(
        self,
        file_content: bytes,
        filename: str,
        cells: List[str],
        sheet_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Read specific cells from Excel file

        Args:
            file_content: Excel file bytes
            filename: Original filename
            cells: List of cell coordinates
            sheet_name: Optional sheet name

        Returns:
            Dict with cell values
        """
        bytes_io = BytesIO(file_content)

        with ExcelReader(bytes_io) as reader:
            sheet_name_to_use = sheet_name or reader.get_sheet_names()[0]

            results = {}
            for cell in cells:
                results[cell] = reader.read_cell(cell, sheet_name_to_use)

            return {
                "success": True,
                "sheet": sheet_name_to_use,
                "filename": filename,
                "cells": results
            }

    def write_cells(
        self,
        file_content: bytes,
        filename: str,
        updates: Dict[str, Any],
        sheet_name: Optional[str] = None,
        preserve_format: bool = True
    ) -> Dict[str, Any]:
        """
        Write to specific cells and return updated file

        Args:
            file_content: Excel file bytes
            filename: Original filename
            updates: Dict of {cell: value} to update
            sheet_name: Optional sheet name
            preserve_format: Whether to preserve formatting

        Returns:
            Dict with updated cells info
        """
        bytes_io = BytesIO(file_content)

        # Read old values and resolve sheet name via openpyxl (no save → no image loss)
        with ExcelEditor(bytes_io) as editor:
            sheet_name_to_use = sheet_name or editor.get_sheet_names()[0]
            sheet = editor.get_sheet(sheet_name_to_use)
            successful = []
            for cell, value in updates.items():
                old_value = sheet[cell.upper()].value
                successful.append({
                    'coordinates': cell.upper(),
                    'old_value': old_value,
                    'new_value': value,
                    'sheet': sheet_name_to_use,
                    'format_preserved': True,
                })

        # Write via direct ZIP patching — preserves images, charts, drawings byte-for-byte
        modified_bytes = _zip_write_cells(file_content, updates, sheet_name_to_use)

        return {
            "success": True,
            "sheet": sheet_name_to_use,
            "filename": filename,
            "updated": successful,
            "_modified_bytes": modified_bytes,  # internal — stripped before sending to client
        }


def get_excel_service() -> ExcelService:
    """Get ExcelService instance"""
    return ExcelService()