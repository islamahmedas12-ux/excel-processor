"""
وحدة التحقق من الصحة
====================
تتضمن هذه الوحدة دوال التحقق من صحة المدخلات مثل مسار الملف،
إحداثيات الخلايا، الصيغ المدعومة، وغيرها
"""

import re
import os
from pathlib import Path
from typing import Tuple, Any

from .errors import (
    InvalidFilePathError,
    UnsupportedFormatError,
    InvalidCellCoordinatesError,
    FileNotFoundError_,
    FilePermissionError,
    SheetNotFoundError
)


SUPPORTED_FORMATS = ['.xlsx', '.xls']
COORDINATE_PATTERN = re.compile(r'^[A-Za-z]+[1-9][0-9]*$')


def validate_file_path(file_path: str) -> Path:
    """
    التحقق من صحة مسار الملف

    المعلمات:
        file_path (str): مسار الملف المراد التحقق منه

    المخرجات:
        Path: كائن Path للملف

    الاستثناءات:
        InvalidFilePathError: إذا كان المسار فارغاً أو يحتوي على أحرف غير صالحة
        FileNotFoundError_: إذا كان الملف غير موجود
        FilePermissionError: إذا لم تكن هناك صلاحيات كافية
    """
    if not file_path or not isinstance(file_path, str):
        raise InvalidFilePathError(str(file_path))

    file_path = file_path.strip()

    if len(file_path) == 0:
        raise InvalidFilePathError(str(file_path))

    invalid_chars = ['<', '>', ':', '"', '|', '?', '*']
    if any(char in file_path for char in invalid_chars):
        raise InvalidFilePathError(file_path)

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError_(file_path)

    if not os.access(file_path, os.R_OK):
        raise FilePermissionError(file_path)

    return path


def validate_file_format(file_path: str | Path) -> str:
    """
    التحقق من صيغة الملف المدعومة

    المعلمات:
        file_path (str | Path): مسار الملف

    المخرجات:
        str: صيغة الملف (.xlsx أو .xls)

    الاستثناءات:
        UnsupportedFormatError: إذا كانت الصيغة غير مدعومة
    """
    if isinstance(file_path, str):
        file_path = Path(file_path)

    file_extension = file_path.suffix.lower()

    if file_extension not in SUPPORTED_FORMATS:
        raise UnsupportedFormatError(file_extension)

    return file_extension


def validate_cell_coordinates(coordinates: str) -> Tuple[str, int]:
    """
    التحقق من صحة إحداثيات الخلية

    المعلمات:
        coordinates (str): إحداثيات الخلية (مثل A1 أو B2 أو C10)

    المخرجات:
        Tuple[str, int]: tuple يحتوي على (اسم العمود، رقم الصف)

    الاستثناءات:
        InvalidCellCoordinatesError: إذا كانت الإحداثيات غير صالحة
    """
    if not coordinates or not isinstance(coordinates, str):
        raise InvalidCellCoordinatesError(str(coordinates))

    coordinates = coordinates.strip().upper()

    if not COORDINATE_PATTERN.match(coordinates):
        raise InvalidCellCoordinatesError(coordinates)

    match = re.match(r'^([A-Za-z]+)([1-9][0-9]*)$', coordinates)
    if not match:
        raise InvalidCellCoordinatesError(coordinates)

    column = match.group(1).upper()
    row = int(match.group(2))

    return column, row


def validate_language(lang: str) -> str:
    """
    التحقق من صحة اللغة المطلوبة

    المعلمات:
        lang (str): رمز اللغة ('ar' أو 'en')

    المخرجات:
        str: رمز اللغة الصالح

    الاستثناءات:
        ValueError: إذا كانت اللغة غير مدعومة
    """
    if lang not in ['ar', 'en']:
        raise ValueError(f"اللغة غير مدعومة: {lang}. اللغات المدعومة: 'ar' و 'en'")

    return lang


def validate_sheet_name(sheet_name: str | None) -> str | None:
    """
    التحقق من صحة اسم ورقة العمل

    المعلمات:
        sheet_name (str | None): اسم ورقة العمل

    المخرجات:
        str | None: اسم ورقة العمل أو None

    الاستثناءات:
        SheetNotFoundError: إذا لم يكن اسم ورقة العمل نصاً
    """
    if sheet_name is None:
        return None

    if not isinstance(sheet_name, str):
        raise SheetNotFoundError(sheet_name)

    sheet_name = sheet_name.strip()
    if len(sheet_name) == 0:
        return None

    return sheet_name


def validate_cell_value(value) -> Any:
    """
    التحقق من صحة قيمة الخلية

    المعلمات:
        value: القيمة المراد التحقق منها

    المخرجات:
        Any: القيمة نفسها إذا كانت صالحة
    """
    if value is None:
        return None

    allowed_types = (str, int, float, bool)
    if isinstance(value, allowed_types):
        if isinstance(value, str) and value and value[0] in '=+-@':
            return "'" + value
        return value

    if isinstance(value, (list, dict)):
        import json
        return json.dumps(value)

    return str(value)


def validate_row_and_column(row: int, column: str, max_row: int = None, max_col: int = None) -> Tuple[int, int]:
    """
    التحقق من صحة رقم الصف واسم العمود

    المعلمات:
        row (int): رقم الصف
        column (str): اسم العمود
        max_row (int, optional): الحد الأقصى لرقم الصف
        max_col (int, optional): الحد الأقصى لاسم العمود

    المخرجات:
        Tuple[int, int]: (رقم الصف, رقم العمود الرقمي)

    الاستثناءات:
        InvalidCellCoordinatesError: إذا كانت القيم خارج النطاق
    """
    if not isinstance(row, int) or row < 1:
        raise InvalidCellCoordinatesError(f"رقم الصف غير صالح: {row}")

    column_number = column_to_number(column)

    if max_row and row > max_row:
        raise InvalidCellCoordinatesError(f"رقم الصف يتجاوز الحد الأقصى: {row} > {max_row}")

    if max_col and column_number > max_col:
        raise InvalidCellCoordinatesError(f"رقم العمود يتجاوز الحد الأقصى: {column} > {max_col}")

    return row, column_number


def column_to_number(column: str) -> int:
    """
    تحويل اسم العمود إلى رقم

    المعلمات:
        column (str): اسم العمود (مثل A, B, AA)

    المخرجات:
        int: رقم العمود (A=1, B=2, AA=27, ...)
    """
    result = 0
    for char in column.upper():
        result = result * 26 + (ord(char) - ord('A') + 1)
    return result


def number_to_column(num: int) -> str:
    """
    تحويل رقم العمود إلى اسم

    المعلمات:
        num (int): رقم العمود (1=A, 2=B, 27=AA)

    المخرجات:
        str: اسم العمود
    """
    result = ""
    while num > 0:
        num -= 1
        result = chr(num % 26 + ord('A')) + result
        num //= 26
    return result


def parse_cell_reference(cell_ref: str) -> Tuple[str, int, int]:
    """
    تحليل مرجع الخلية إلى مكوناته

    المعلمات:
        cell_ref (str): مرجع الخلية (مثل A1 أو B2:D10)

    المخرجات:
        Tuple[str, int, int]: (اسم العمود، رقم الصف، رقم العمود الرقمي)

    الاستثناءات:
        InvalidCellCoordinatesError: إذا كان المرجع غير صالح
    """
    column, row = validate_cell_coordinates(cell_ref)
    col_num = column_to_number(column)
    return column, row, col_num
