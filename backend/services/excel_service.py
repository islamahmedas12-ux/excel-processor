"""
Excel Service
=============
Handles Excel operations with Supabase integration
"""

import tempfile
import os
from io import BytesIO
from typing import Dict, List, Any, Optional

from excel_processor.file_reader import ExcelReader
from excel_processor.file_editor import ExcelEditor


class ExcelService:
    """Service for Excel operations using files from Supabase"""

    def __init__(self, bucket_service):
        self.bucket_service = bucket_service
        self._file_cache = {}

    def execute(
        self,
        file_id: str,
        inputs: List[Dict[str, Any]],
        outputs: List[str],
        sheet_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fill inputs → Excel calculates → Return outputs

        Args:
            file_id: File ID in Supabase bucket
            inputs: List of {cell, value} dicts
            outputs: List of cell coordinates to read
            sheet_name: Optional sheet name

        Returns:
            Dict with results
        """
        file_bytes = self.bucket_service.download_file(file_id)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            with ExcelEditor(tmp_path) as editor:
                for inp in inputs:
                    editor.update_cell(
                        coordinates=inp['cell'],
                        value=inp['value'],
                        sheet_name=sheet_name,
                        preserve_format=True
                    )

                results = {}
                for output_cell in outputs:
                    value = editor.get_sheet(sheet_name)[output_cell].value
                    results[output_cell] = value

                editor.save()

            with open(tmp_path, 'rb') as f:
                updated_bytes = f.read()

            self.bucket_service.upload_file(updated_bytes, f"{file_id}")

            return {
                "success": True,
                "results": results,
                "file_id": file_id,
                "sheet": sheet_name or editor.get_sheet_names()[0]
            }
        finally:
            os.unlink(tmp_path)

    def read_cells(
        self,
        file_id: str,
        cells: List[str],
        sheet_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Read specific cells from file

        Args:
            file_id: File ID in Supabase bucket
            cells: List of cell coordinates
            sheet_name: Optional sheet name

        Returns:
            Dict with cell values
        """
        file_bytes = self.bucket_service.download_file(file_id)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            with ExcelReader(tmp_path) as reader:
                results = {}
                for cell in cells:
                    results[cell] = reader.read_cell(cell, sheet_name)

                return {
                    "success": True,
                    "file_id": file_id,
                    "sheet": sheet_name or reader.get_sheet_names()[0],
                    "cells": results
                }
        finally:
            os.unlink(tmp_path)

    def write_cells(
        self,
        file_id: str,
        updates: List[Dict[str, Any]],
        sheet_name: Optional[str] = None,
        preserve_format: bool = True
    ) -> Dict[str, Any]:
        """
        Write to specific cells in file

        Args:
            file_id: File ID in Supabase bucket
            updates: List of {cell, value} dicts
            sheet_name: Optional sheet name
            preserve_format: Whether to preserve formatting

        Returns:
            Dict with updated cells info
        """
        file_bytes = self.bucket_service.download_file(file_id)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            with ExcelEditor(tmp_path) as editor:
                successful = []
                for upd in updates:
                    result = editor.update_cell(
                        coordinates=upd['cell'],
                        value=upd['value'],
                        sheet_name=sheet_name,
                        preserve_format=preserve_format
                    )
                    successful.append(result)

                editor.save()

            with open(tmp_path, 'rb') as f:
                updated_bytes = f.read()

            self.bucket_service.upload_file(updated_bytes, f"{file_id}")

            return {
                "success": True,
                "file_id": file_id,
                "updated": successful
            }
        finally:
            os.unlink(tmp_path)

    def get_file_info(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get file info from cache or bucket"""
        if file_id in self._file_cache:
            return self._file_cache[file_id]
        return None


def get_excel_service(bucket_service) -> ExcelService:
    """Get ExcelService instance"""
    return ExcelService(bucket_service)