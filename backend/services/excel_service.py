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

    def batch_write(
        self,
        file_content: bytes,
        filename: str,
        operations: List[Dict[str, Any]],
        sheet_name: Optional[str] = None,
        preserve_format: bool = True
    ) -> Dict[str, Any]:
        """
        Apply multiple batch write operations (cell updates, formulas, styles)
        and return updated file.

        Args:
            file_content: Excel file bytes
            filename: Original filename
            operations: List of operations, each with 'type' and relevant fields:
                - type: 'update_cell' → cell, value
                - type: 'update_range' → range, value (e.g. a 2D array)
                - type: 'set_formula' → cell, formula
            sheet_name: Optional sheet name
            preserve_format: Whether to preserve formatting

        Returns:
            Dict with operation results
        """
        bytes_io = BytesIO(file_content)

        with ExcelEditor(bytes_io) as editor:
            sheet_name_to_use = sheet_name or editor.get_sheet_names()[0]
            results = []

            for op in operations:
                op_type = op.get('type', 'update_cell')

                if op_type == 'update_cell':
                    cell  = op.get('cell', '')
                    value = op.get('value')
                    editor.update_cell(
                        coordinates=cell,
                        value=value,
                        sheet_name=sheet_name_to_use,
                        preserve_format=preserve_format,
                    )
                    results.append({
                        'type': 'update_cell',
                        'cell': cell.upper(),
                        'value': value,
                        'sheet': sheet_name_to_use,
                    })

                elif op_type == 'update_range':
                    range_spec = op.get('range', '')
                    value = op.get('value')
                    # update_range is an alias for update_cell on a single anchor cell
                    # when given a range + 2D value (handled inline below)
                    if isinstance(value, list) and len(value) > 0:
                        first_row = range_spec
                        for row_offset, row_vals in enumerate(value):
                            if not isinstance(row_vals, list):
                                row_vals = [row_vals]
                            for col_offset, col_val in enumerate(row_vals):
                                col_letter = chr(ord('A') + col_offset)
                                cell_ref = f"{col_letter}{row_offset + 1}"
                                editor.update_cell(
                                    coordinates=cell_ref,
                                    value=col_val,
                                    sheet_name=sheet_name_to_use,
                                    preserve_format=preserve_format,
                                )
                                results.append({
                                    'type': 'update_cell',
                                    'cell': cell_ref,
                                    'value': col_val,
                                    'sheet': sheet_name_to_use,
                                })
                    else:
                        editor.update_cell(
                            coordinates=range_spec,
                            value=value,
                            sheet_name=sheet_name_to_use,
                            preserve_format=preserve_format,
                        )
                        results.append({
                            'type': 'update_cell',
                            'cell': range_spec,
                            'value': value,
                            'sheet': sheet_name_to_use,
                        })

                elif op_type == 'set_formula':
                    cell   = op.get('cell', '')
                    formula = op.get('formula', '')
                    editor.update_cell(
                        coordinates=cell,
                        value=formula,
                        sheet_name=sheet_name_to_use,
                        preserve_format=preserve_format,
                    )
                    results.append({
                        'type': 'set_formula',
                        'cell': cell.upper(),
                        'formula': formula,
                        'sheet': sheet_name_to_use,
                    })

            editor.save()

        # Re-apply via ZIP patching to preserve images/charts
        all_updates = {}
        for op in operations:
            op_type = op.get('type', 'update_cell')
            if op_type == 'update_cell':
                all_updates[op.get('cell', '')] = op.get('value')
            elif op_type == 'set_formula':
                all_updates[op.get('cell', '')] = op.get('formula', '')

        modified_bytes = _zip_write_cells(file_content, all_updates, sheet_name_to_use)

        return {
            "success": True,
            "sheet": sheet_name_to_use,
            "filename": filename,
            "operations": results,
            "_modified_bytes": modified_bytes,
        }


def get_excel_service() -> ExcelService:
    """Get ExcelService instance"""
    return ExcelService()