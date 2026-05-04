"""
وحدة تعديل ملفات Excel
=====================
تتضمن هذه الوحدة دوال تعديل خلايا Excel مع الحفاظ على التنسيق الأصلي
"""

import xlrd
import xlwt
import copy
from pathlib import Path
from typing import Any, Dict, Optional, Union
from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.styles.numbers import FORMAT_GENERAL

from .errors import (
    CellWriteError,
    FileSaveError,
    InvalidCellCoordinatesError,
    SheetNotFoundError,
    UnsupportedFormatError,
    EmptyFileError
)
from .validators import (
    validate_file_path,
    validate_file_format,
    validate_cell_coordinates,
    validate_sheet_name,
    validate_cell_value,
    parse_cell_reference,
    column_to_number,
    number_to_column
)


class ExcelEditor:
    """
    فئة تعديل ملفات Excel
    تدعم التعديل على صيغتي .xlsx و .xls مع الحفاظ على التنسيق
    """

    def __init__(self, file_path: str):
        """
        تهيئة المحرر بمسار الملف

        المعلمات:
            file_path (str): مسار ملف Excel

        الاستثناءات:
            FileNotFoundError_: إذا كان الملف غير موجود
            UnsupportedFormatError: إذا كانت الصيغة غير مدعومة
        """
        self.file_path = validate_file_path(file_path)
        self.file_format = validate_file_format(file_path)
        self.workbook = None
        self.saved = False
        self._open()

    def _open(self):
        """فتح الملف للتحرير حسب صيغته"""
        if self.file_format == '.xlsx':
            self._open_xlsx()
        else:
            self._open_xls()

    def _open_xlsx(self):
        """فتح ملف .xlsx للتحرير"""
        self.workbook = load_workbook(
            filename=str(self.file_path),
            data_only=False,
            keep_vba=False
        )

    def _open_xls(self):
        """فتح ملف .xls للتحرير"""
        self.workbook = xlrd.open_workbook(
            filename=str(self.file_path),
            formatting_info=True,
            encoding_override='utf-8'
        )

    def get_sheet_names(self) -> list:
        """
        الحصول على قائمة أسماء أوراق العمل

        المخرجات:
            List[str]: قائمة بأسماء أوراق العمل
        """
        if self.file_format == '.xlsx':
            return self.workbook.sheetnames
        else:
            return self.workbook.sheet_names()

    def get_sheet(self, sheet_name: Optional[str] = None) -> Union[Worksheet, xlrd.sheet.Sheet]:
        """
        الحصول على ورقة عمل محددة

        المعلمات:
            sheet_name (str, optional): اسم ورقة العمل

        المخرجات:
            Worksheet | xlrd.sheet.Sheet: ورقة العمل
        """
        if sheet_name is None:
            if self.file_format == '.xlsx':
                return self.workbook.active
            else:
                return self.workbook.sheet_by_index(0)

        if self.file_format == '.xlsx':
            if sheet_name not in self.workbook.sheetnames:
                raise SheetNotFoundError(sheet_name)
            return self.workbook[sheet_name]
        else:
            try:
                return self.workbook.sheet_by_name(sheet_name)
            except xlrd.XLRDError:
                raise SheetNotFoundError(sheet_name)

    def update_cell(
        self,
        coordinates: str,
        value: Any,
        sheet_name: Optional[str] = None,
        preserve_format: bool = True
    ) -> Dict[str, Any]:
        """
        تحديث قيمة خلية مع الحفاظ على التنسيق

        المعلمات:
            coordinates (str): إحداثيات الخلية (مثل A1 أو B2)
            value: القيمة الجديدة للخلية
            sheet_name (str, optional): اسم ورقة العمل
            preserve_format (bool): الحفاظ على التنسيق الأصلي

        المخرجات:
            Dict[str, Any]: معلومات عن الخلية المحدثة

        الاستثناءات:
            CellWriteError: إذا حدث خطأ أثناء الكتابة
        """
        try:
            validate_cell_coordinates(coordinates)
            value = validate_cell_value(value)

            if self.file_format == '.xlsx':
                return self._update_cell_xlsx(coordinates, value, sheet_name, preserve_format)
            else:
                return self._update_cell_xls(coordinates, value, sheet_name)

        except Exception as e:
            if isinstance(e, (SheetNotFoundError, InvalidCellCoordinatesError)):
                raise
            raise CellWriteError(coordinates)

    def _update_cell_xlsx(
        self,
        coordinates: str,
        value: Any,
        sheet_name: Optional[str],
        preserve_format: bool
    ) -> Dict[str, Any]:
        """تحديث خلية في ملف .xlsx"""
        sheet = self.get_sheet(sheet_name)
        cell = sheet[coordinates]

        old_value = cell.value
        old_format = None

        if preserve_format:
            old_format = {
                'font': copy.copy(cell.font),
                'fill': copy.copy(cell.fill),
                'alignment': copy.copy(cell.alignment),
                'border': copy.copy(cell.border),
                'number_format': cell.number_format
            }

        cell.value = value

        if preserve_format and old_format:
            if old_format['font']:
                cell.font = old_format['font']
            if old_format['fill']:
                cell.fill = old_format['fill']
            if old_format['alignment']:
                cell.alignment = old_format['alignment']
            if old_format['border']:
                cell.border = old_format['border']
            if old_format['number_format']:
                cell.number_format = old_format['number_format']

        return {
            'coordinates': coordinates,
            'old_value': old_value,
            'new_value': value,
            'sheet': sheet_name or self.workbook.active.title,
            'format_preserved': preserve_format
        }

    def _update_cell_xls(
        self,
        coordinates: str,
        value: Any,
        sheet_name: Optional[str]
    ) -> Dict[str, Any]:
        """تحديث خلية في ملف .xls"""
        column, row, col_num = parse_cell_reference(coordinates)
        sheet = self.get_sheet(sheet_name)

        old_value = sheet.cell_value(row - 1, col_num - 1)

        self._update_xls_cell_value(row - 1, col_num - 1, value)

        return {
            'coordinates': coordinates,
            'old_value': old_value,
            'new_value': value,
            'sheet': sheet_name or self.workbook.sheet_names()[0],
            'format_preserved': False
        }

    def _update_xls_cell_value(self, row: int, col: int, value: Any):
        """تحديث قيمة خلية في ملف .xls"""
        if not hasattr(self, '_xls_changes'):
            self._xls_changes = {}

        if not hasattr(self, '_current_sheet_index'):
            self._current_sheet_index = 0

        if self._current_sheet_index not in self._xls_changes:
            self._xls_changes[self._current_sheet_index] = {}

        self._xls_changes[self._current_sheet_index][(row, col)] = value

    def update_multiple_cells(
        self,
        updates: Dict[str, Any],
        sheet_name: Optional[str] = None,
        preserve_format: bool = True
    ) -> Dict[str, Any]:
        """
        تحديث عدة خلايا دفعة واحدة

        المعلمات:
            updates (Dict[str, Any]): قاموس من الإحداثيات إلى القيم
            sheet_name (str, optional): اسم ورقة العمل
            preserve_format (bool): الحفاظ على التنسيق

        المخرجات:
            Dict[str, Any]: معلومات عن الخلايا المحدثة
        """
        results = []
        errors = []

        for coordinates, value in updates.items():
            try:
                result = self.update_cell(coordinates, value, sheet_name, preserve_format)
                results.append(result)
            except Exception as e:
                errors.append({
                    'coordinates': coordinates,
                    'error': str(e)
                })

        return {
            'successful': results,
            'failed': errors,
            'total_updated': len(results),
            'total_failed': len(errors)
        }

    def get_cell_format(self, coordinates: str, sheet_name: Optional[str] = None) -> Dict[str, Any]:
        """
        الحصول على تنسيق الخلية

        المعلمات:
            coordinates (str): إحداثيات الخلية
            sheet_name (str, optional): اسم ورقة العمل

        المخرجات:
            Dict[str, Any]: قاموس يحتوي على معلومات التنسيق
        """
        if self.file_format != '.xlsx':
            return {}

        sheet = self.get_sheet(sheet_name)

        if coordinates not in sheet:
            return {}

        cell = sheet[coordinates]

        return {
            "font": {
                "name": cell.font.name if cell.font else None,
                "size": cell.font.size if cell.font else None,
                "bold": cell.font.bold if cell.font else None,
                "italic": cell.font.italic if cell.font else None,
                "color": cell.font.color.rgb if cell.font and cell.font.color else None
            },
            "fill": {
                "pattern_type": cell.fill.patternType if cell.fill else None,
                "fg_color": cell.fill.fgColor.rgb if cell.fill and cell.fill.fgColor else None
            },
            "alignment": {
                "horizontal": cell.alignment.horizontal if cell.alignment else None,
                "vertical": cell.alignment.vertical if cell.alignment else None
            },
            "number_format": cell.number_format
        }

    def save(self, output_path: Optional[str] = None):
        """
        حفظ الملف

        المعلمات:
            output_path (str, optional): مسار الحفظ الجديد. إذا كان None، يتم الحفظ في المسار الأصلي

        الاستثناءات:
            FileSaveError: إذا حدث خطأ أثناء الحفظ
        """
        try:
            save_path = output_path or str(self.file_path)

            if self.file_format == '.xlsx':
                self.workbook.save(save_path)
            else:
                self._save_xls(save_path)

            self.saved = True

        except Exception as e:
            raise FileSaveError(save_path)

    def _save_xls(self, output_path: str):
        """حفظ ملف .xls"""
        if hasattr(self, '_xls_changes') and self._xls_changes:
            self._rebuild_xls_workbook(output_path)
        else:
            from xlutils.copy import copy as xl_copy
            wb = copy(self.workbook)
            wb.save(output_path)

    def _rebuild_xls_workbook(self, output_path: str):
        """إعادة بناء ملف .xls مع التغييرات"""
        style = xlwt.XFStyle()

        wb = xlwt.Workbook(encoding='utf-8')

        for sheet_index, sheet_name in enumerate(self.workbook.sheet_names()):
            original_sheet = self.workbook.sheet_by_name(sheet_name)
            ws = wb.add_sheet(sheet_name)

            for row in range(original_sheet.nrows):
                for col in range(original_sheet.ncols):
                    value = original_sheet.cell_value(row, col)

                    if sheet_index in getattr(self, '_xls_changes', {}) and \
                       (row, col) in self._xls_changes[sheet_index]:
                        value = self._xls_changes[sheet_index][(row, col)]

                    ws.write(row, col, value, style)

        wb.save(output_path)

    def close(self):
        """إغلاق الملف وإطلاق الموارد"""
        if self.workbook:
            if self.file_format == '.xlsx':
                self.workbook.close()
            self.workbook = None

    def __enter__(self):
        """دعم استخدام with statement"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """إغلاق الملف عند الخروج من with statement"""
        self.close()

    def __del__(self):
        """تدمير الكائن وإغلاق الملف"""
        if hasattr(self, 'workbook') and self.workbook:
            self.close()


def modify_excel_cell(
    file_path: str,
    coordinates: str,
    value: Any,
    sheet_name: Optional[str] = None,
    output_path: Optional[str] = None,
    preserve_format: bool = True
) -> Dict[str, Any]:
    """
    دالة تعديل خلية في ملف Excel

    المعلمات:
        file_path (str): مسار ملف Excel
        coordinates (str): إحداثيات الخلية
        value: القيمة الجديدة
        sheet_name (str, optional): اسم ورقة العمل
        output_path (str, optional): مسار الحفظ الجديد
        preserve_format (bool): الحفاظ على التنسيق

    المخرجات:
        Dict[str, Any]: معلومات عن الخلية المحدثة
    """
    with ExcelEditor(file_path) as editor:
        result = editor.update_cell(coordinates, value, sheet_name, preserve_format)
        editor.save(output_path)
        return result


def modify_multiple_excel_cells(
    file_path: str,
    updates: Dict[str, Any],
    sheet_name: Optional[str] = None,
    output_path: Optional[str] = None,
    preserve_format: bool = True
) -> Dict[str, Any]:
    """
    دالة تعديل عدة خلايا في ملف Excel

    المعلمات:
        file_path (str): مسار ملف Excel
        updates (Dict[str, Any]): قاموس من الإحداثيات إلى القيم
        sheet_name (str, optional): اسم ورقة العمل
        output_path (str, optional): مسار الحفظ الجديد
        preserve_format (bool): الحفاظ على التنسيق

    المخرجات:
        Dict[str, Any]: معلومات عن الخلايا المحدثة
    """
    with ExcelEditor(file_path) as editor:
        result = editor.update_multiple_cells(updates, sheet_name, preserve_format)
        editor.save(output_path)
        return result
