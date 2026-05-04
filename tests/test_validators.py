"""
اختبارات التحقق من الصحة
========================
اختبارات وحدة للتحقق من صحة المدخلات
"""

import pytest
import os
import tempfile
from pathlib import Path

from excel_processor.validators import (
    validate_file_path,
    validate_file_format,
    validate_cell_coordinates,
    validate_language,
    validate_sheet_name,
    column_to_number,
    number_to_column,
    parse_cell_reference,
    SUPPORTED_FORMATS
)
from excel_processor.errors import (
    InvalidFilePathError,
    FileNotFoundError_,
    UnsupportedFormatError,
    InvalidCellCoordinatesError,
    FilePermissionError
)


class TestFilePathValidation:
    """اختبارات التحقق من مسار الملف"""

    def test_validate_file_path_success(self, temp_excel_file):
        """اختبار نجاح التحقق من مسار ملف موجود"""
        file_path = temp_excel_file
        result = validate_file_path(file_path)
        assert isinstance(result, Path)
        assert result.exists()

    def test_validate_file_path_not_found(self):
        """اختبار خطأ الملف غير موجود"""
        with pytest.raises(FileNotFoundError_) as exc_info:
            validate_file_path("/non/existent/path/file.xlsx")
        assert "غير موجود" in str(exc_info.value.message_ar) or "not found" in str(exc_info.value.message_en)

    def test_validate_file_path_empty(self):
        """اختبار مسار فارغ"""
        with pytest.raises(InvalidFilePathError):
            validate_file_path("")
        with pytest.raises(InvalidFilePathError):
            validate_file_path(None)

    def test_validate_file_path_invalid_chars(self):
        """اختبار مسار بأحرف غير صالحة"""
        with pytest.raises(InvalidFilePathError):
            validate_file_path("/path/with|invalid:char.xlsx")


class TestFileFormatValidation:
    """اختبارات التحقق من صيغة الملف"""

    def test_validate_xlsx_format(self, temp_excel_file):
        """اختبار التحقق من صيغة .xlsx"""
        result = validate_file_format(temp_excel_file)
        assert result == '.xlsx'

    def test_validate_xls_format(self, temp_old_excel_file):
        """اختبار التحقق من صيغة .xls"""
        result = validate_file_format(temp_old_excel_file)
        assert result == '.xls'

    def test_validate_unsupported_format(self):
        """اختبار صيغة غير مدعومة"""
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
            f.write(b"test")
            temp_path = f.name

        try:
            with pytest.raises(UnsupportedFormatError):
                validate_file_format(temp_path)
        finally:
            os.unlink(temp_path)


class TestCellCoordinatesValidation:
    """اختبارات التحقق من إحداثيات الخلايا"""

    def test_validate_single_letter_column(self):
        """اختبار عمود بحرف واحد"""
        column, row = validate_cell_coordinates("A1")
        assert column == "A"
        assert row == 1

    def test_validate_double_letter_column(self):
        """اختبار عمود بحرفين"""
        column, row = validate_cell_coordinates("AA100")
        assert column == "AA"
        assert row == 100

    def test_validate_lowercase_coordinates(self):
        """اختبار إحداثيات بحروف صغيرة"""
        column, row = validate_cell_coordinates("b5")
        assert column == "B"
        assert row == 5

    def test_validate_invalid_coordinates_empty(self):
        """اختبار إحداثيات فارغة"""
        with pytest.raises(InvalidCellCoordinatesError):
            validate_cell_coordinates("")

    def test_validate_invalid_coordinates_format(self):
        """اختبار إحداثيات بتنسيق خاطئ"""
        invalid_coords = ["1A", "A", "A0", "A1.5", "AA", ""]
        for coord in invalid_coords:
            if coord:
                with pytest.raises(InvalidCellCoordinatesError):
                    validate_cell_coordinates(coord)


class TestLanguageValidation:
    """اختبارات التحقق من اللغة"""

    def test_validate_arabic_language(self):
        """اختبار اللغة العربية"""
        result = validate_language("ar")
        assert result == "ar"

    def test_validate_english_language(self):
        """اختبار اللغة الإنجليزية"""
        result = validate_language("en")
        assert result == "en"

    def test_validate_invalid_language(self):
        """اختبار لغة غير صالحة"""
        with pytest.raises(ValueError):
            validate_language("fr")


class TestColumnConversion:
    """اختبارات تحويل الأعمدة"""

    def test_column_to_number(self):
        """اختبار تحويل اسم العمود إلى رقم"""
        assert column_to_number("A") == 1
        assert column_to_number("B") == 2
        assert column_to_number("Z") == 26
        assert column_to_number("AA") == 27
        assert column_to_number("AZ") == 52
        assert column_to_number("BA") == 53

    def test_number_to_column(self):
        """اختبار تحويل رقم العمود إلى اسم"""
        assert number_to_column(1) == "A"
        assert number_to_column(2) == "B"
        assert number_to_column(26) == "Z"
        assert number_to_column(27) == "AA"
        assert number_to_column(52) == "AZ"
        assert number_to_column(53) == "BA"

    def test_column_conversion_roundtrip(self):
        """اختبار التحويل ذهاباً وإياباً"""
        for i in [1, 10, 50, 100, 500, 1000]:
            col_name = number_to_column(i)
            col_num = column_to_number(col_name)
            assert col_num == i


class TestParseCellReference:
    """اختبارات تحليل مرجع الخلية"""

    def test_parse_simple_reference(self):
        """اختبار تحليل مرجع بسيط"""
        column, row, col_num = parse_cell_reference("A1")
        assert column == "A"
        assert row == 1
        assert col_num == 1

    def test_parse_complex_reference(self):
        """اختبار تحليل مرجع معقد"""
        column, row, col_num = parse_cell_reference("XYZ123")
        assert column == "XYZ"
        assert row == 123
        assert col_num == column_to_number("XYZ")
