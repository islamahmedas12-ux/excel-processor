"""
وحدة قراءة ملفات Excel
=====================
تتضمن هذه الوحدة دوال قراءة ملفات Excel بصيغتي .xlsx و .xls
مع الحفاظ على التنسيق والأنماط
"""

import xlrd
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet

from .errors import (
    CorruptedFileError,
    EmptyFileError,
    CellReadError,
    SheetNotFoundError,
    UnsupportedFormatError
)
from .validators import validate_file_path, validate_file_format, validate_sheet_name


class ExcelReader:
    """
    فئة قراءة ملفات Excel
    تدعم صيغتي .xlsx و .xls مع الحفاظ على التنسيق
    """

    def __init__(self, file_source: Union[str, bytes, BytesIO], is_bytes: bool = False):
        """
        تهيئة القارئ بمسار الملف أو البيانات الثنائية

        المعلمات:
            file_source (str | bytes | BytesIO): مسار الملف أو البيانات الثنائية
            is_bytes (bool): إذا كان True، يتم التعامل مع file_source كبيانات ثنائية

        الاستثناءات:
            FileNotFoundError_: إذا كان الملف غير موجود
            UnsupportedFormatError: إذا كانت الصيغة غير مدعومة
            CorruptedFileError: إذا كان الملف تالفاً
        """
        if is_bytes or isinstance(file_source, (bytes, BytesIO)):
            if isinstance(file_source, bytes):
                self._bytes_data = BytesIO(file_source)
            else:
                self._bytes_data = file_source
            self.file_path = None
            self.file_format = None
        else:
            self.file_path = validate_file_path(file_source)
            self.file_format = validate_file_format(file_source)
            self._bytes_data = None
        self.workbook = None
        self._open()

    def _open(self):
        """فتح الملف حسب صيغته"""
        try:
            if self._bytes_data is not None:
                self._bytes_data.seek(0)
                self.workbook = load_workbook(
                    filename=self._bytes_data,
                    data_only=False,
                    keep_vba=False
                )
                self.file_format = '.xlsx'
            elif self.file_format == '.xlsx':
                self._open_xlsx()
            else:
                self._open_xls()
        except Exception as e:
            raise CorruptedFileError(str(self.file_path) if self.file_path else "bytes data")

    def _open_xlsx(self):
        """فتح ملف .xlsx باستخدام openpyxl"""
        self.workbook = load_workbook(
            filename=str(self.file_path),
            data_only=False,
            keep_vba=False
        )

    def _open_xls(self):
        """فتح ملف .xls باستخدام xlrd"""
        self.workbook = xlrd.open_workbook(
            filename=str(self.file_path)
        )

    def get_sheet_names(self) -> List[str]:
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
            sheet_name (str, optional): اسم ورقة العمل. إذا كان None، يتم إرجاع الورقة النشطة

        المخرجات:
            Worksheet | xlrd.sheet.Sheet: ورقة العمل

        الاستثناءات:
            SheetNotFoundError: إذا كانت ورقة العمل غير موجودة
        """
        if self.file_format == '.xlsx':
            if sheet_name is None:
                return self.workbook.active
            if sheet_name not in self.workbook.sheetnames:
                raise SheetNotFoundError(sheet_name)
            return self.workbook[sheet_name]
        else:
            if sheet_name is None:
                return self.workbook.sheet_by_index(0)
            try:
                return self.workbook.sheet_by_name(sheet_name)
            except xlrd.XLRDError:
                raise SheetNotFoundError(sheet_name)

    def read_cell(self, coordinates: str, sheet_name: Optional[str] = None) -> Any:
        """
        قراءة قيمة خلية محددة

        المعلمات:
            coordinates (str): إحداثيات الخلية (مثل A1 أو B2)
            sheet_name (str, optional): اسم ورقة العمل

        المخرجات:
            Any: قيمة الخلية

        الاستثناءات:
            CellReadError: إذا حدث خطأ أثناء قراءة الخلية
        """
        try:
            sheet = self.get_sheet(sheet_name)

            if self.file_format == '.xlsx':
                cell = sheet[coordinates]
                return cell.value if cell else None
            else:
                from .validators import parse_cell_reference
                column, row, col_num = parse_cell_reference(coordinates)
                if 0 <= row - 1 < sheet.nrows and 0 <= col_num - 1 < sheet.ncols:
                    return sheet.cell_value(row - 1, col_num - 1)
                return None

        except Exception as e:
            if isinstance(e, (SheetNotFoundError,)):
                raise
            raise CellReadError(coordinates)

    def read_range(self, start_cell: str, end_cell: str, sheet_name: Optional[str] = None) -> List[List[Any]]:
        """
        قراءة نطاق من الخلايا

        المعلمات:
            start_cell (str): خلية البداية (مثل A1)
            end_cell (str): خلية النهاية (مثل C10)
            sheet_name (str, optional): اسم ورقة العمل

        المخرجات:
            List[List[Any]]: مصفوفة ثنائية الأبعاد بقيم الخلايا
        """
        from .validators import parse_cell_reference

        sheet = self.get_sheet(sheet_name)
        start_col, start_row, _ = parse_cell_reference(start_cell)
        end_col, end_row, _ = parse_cell_reference(end_cell)

        start_col_num = self._column_to_num(start_col)
        end_col_num = self._column_to_num(end_col)

        result = []

        if self.file_format == '.xlsx':
            for row in range(start_row, end_row + 1):
                row_data = []
                for col in range(start_col_num, end_col_num + 1):
                    col_letter = self._num_to_column(col)
                    cell_ref = f"{col_letter}{row}"
                    if cell_ref in sheet:
                        row_data.append(sheet[cell_ref].value)
                    else:
                        row_data.append(None)
                result.append(row_data)
        else:
            for row in range(start_row - 1, end_row):
                row_data = []
                for col in range(start_col_num - 1, end_col_num):
                    if 0 <= row < sheet.nrows and 0 <= col < sheet.ncols:
                        row_data.append(sheet.cell_value(row, col))
                    else:
                        row_data.append(None)
                result.append(row_data)

        return result

    def read_all_data(self, sheet_name: Optional[str] = None) -> Dict[str, Any]:
        """
        قراءة جميع البيانات من ورقة عمل

        المعلمات:
            sheet_name (str, optional): اسم ورقة العمل

        المخرجات:
            Dict[str, Any]: قاموس يحتوي على البيانات
        """
        sheet = self.get_sheet(sheet_name)

        if self.file_format == '.xlsx':
            max_row = sheet.max_row
            max_col = sheet.max_column
        else:
            max_row = sheet.nrows
            max_col = sheet.ncols

        if max_row == 0 or max_col == 0:
            return {"data": [], "dimensions": {"rows": 0, "columns": 0}}

        start_cell = "A1"
        end_cell = f"{self._num_to_column(max_col)}{max_row}"

        data = self.read_range(start_cell, end_cell, sheet_name)

        return {
            "data": data,
            "dimensions": {
                "rows": max_row,
                "columns": max_col
            }
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

    def _column_to_num(self, column: str) -> int:
        """تحويل اسم العمود إلى رقم"""
        from .validators import column_to_number
        return column_to_number(column)

    def _num_to_column(self, num: int) -> str:
        """تحويل رقم العمود إلى اسم"""
        from .validators import number_to_column
        return number_to_column(num)

    def close(self):
        """إغلاق الملف وإطلاق الموارد"""
        if self.workbook:
            if self.file_format == '.xlsx':
                self.workbook.close()
            self.workbook = None
        if hasattr(self, '_bytes_data') and self._bytes_data:
            try:
                self._bytes_data.close()
            except Exception:
                pass
            self._bytes_data = None

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


def read_excel_file(file_path: str, sheet_name: Optional[str] = None) -> Dict[str, Any]:
    """
    دالة قراءة ملف Excel

    المعلمات:
        file_path (str): مسار ملف Excel
        sheet_name (str, optional): اسم ورقة العمل

    المخرجات:
        Dict[str, Any]: قاموس يحتوي على البيانات

    الاستثناءات:
        FileNotFoundError_: إذا كان الملف غير موجود
        UnsupportedFormatError: إذا كانت الصيغة غير مدعومة
        CorruptedFileError: إذا كان الملف تالفاً
    """
    with ExcelReader(file_path) as reader:
        return reader.read_all_data(sheet_name)


def read_cell_value(file_path: str, coordinates: str, sheet_name: Optional[str] = None) -> Any:
    """
    دالة قراءة قيمة خلية

    المعلمات:
        file_path (str): مسار ملف Excel
        coordinates (str): إحداثيات الخلية
        sheet_name (str, optional): اسم ورقة العمل

    المخرجات:
        Any: قيمة الخلية
    """
    with ExcelReader(file_path) as reader:
        return reader.read_cell(coordinates, sheet_name)
