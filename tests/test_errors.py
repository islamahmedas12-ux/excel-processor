"""
اختبارات معالجة الأخطاء
====================
اختبارات وحدة للتحقق من صحة معالجة الأخطاء
"""

import pytest
from excel_processor.errors import (
    ExcelProcessorError,
    FileNotFoundError_,
    InvalidFilePathError,
    UnsupportedFormatError,
    InvalidCellCoordinatesError,
    SheetNotFoundError,
    CellReadError,
    CellWriteError,
    FileSaveError,
    FilePermissionError,
    InvalidLanguageError,
    CorruptedFileError,
    EmptyFileError,
    get_error_response,
    handle_exception
)


class TestCustomExceptions:
    """اختبارات الاستثناءات المخصصة"""

    def test_excel_processor_error(self):
        """اختبار الخطأ الأساسي"""
        error = ExcelProcessorError(
            message_ar="خطأ عربي",
            message_en="English error",
            error_code="TEST_ERROR"
        )

        assert error.error_code == "TEST_ERROR"
        assert error.get_message('ar') == "خطأ عربي"
        assert error.get_message('en') == "English error"

    def test_file_not_found_error(self):
        """اختبار خطأ الملف غير موجود"""
        error = FileNotFoundError_("/path/to/file.xlsx")

        assert "غير موجود" in error.message_ar
        assert "not found" in error.message_en
        assert error.error_code == "FILE_NOT_FOUND"

    def test_invalid_file_path_error(self):
        """اختبار خطأ مسار الملف غير صالح"""
        error = InvalidFilePathError("/invalid|path")

        assert "غير صالح" in error.message_ar
        assert "Invalid" in error.message_en
        assert error.error_code == "INVALID_FILE_PATH"

    def test_unsupported_format_error(self):
        """اختبار خطأ الصيغة غير المدعومة"""
        error = UnsupportedFormatError(".csv")

        assert "غير مدعومة" in error.message_ar
        assert "Unsupported" in error.message_en
        assert ".csv" in error.message_ar
        assert error.error_code == "UNSUPPORTED_FORMAT"

    def test_invalid_cell_coordinates_error(self):
        """اختبار خطأ إحداثيات الخلية غير صالحة"""
        error = InvalidCellCoordinatesError("INVALID")

        assert "غير صالحة" in error.message_ar
        assert "Invalid" in error.message_en
        assert error.error_code == "INVALID_CELL_COORDINATES"

    def test_sheet_not_found_error(self):
        """اختبار خطأ ورقة العمل غير موجودة"""
        error = SheetNotFoundError("Sheet1")

        assert "غير موجودة" in error.message_ar
        assert "not found" in error.message_en
        assert error.error_code == "SHEET_NOT_FOUND"

    def test_cell_read_error(self):
        """اختبار خطأ قراءة الخلية"""
        error = CellReadError("A1")

        assert "قراءة" in error.message_ar
        assert "reading" in error.message_en
        assert error.error_code == "CELL_READ_ERROR"

    def test_cell_write_error(self):
        """اختبار خطأ كتابة الخلية"""
        error = CellWriteError("B2")

        assert "كتابة" in error.message_ar
        assert "writing" in error.message_en
        assert error.error_code == "CELL_WRITE_ERROR"

    def test_file_save_error(self):
        """اختبار خطأ حفظ الملف"""
        error = FileSaveError("/path/to/file.xlsx")

        assert "حفظ" in error.message_ar
        assert "saving" in error.message_en
        assert error.error_code == "FILE_SAVE_ERROR"

    def test_file_permission_error(self):
        """اختبار خطأ صلاحيات الملف"""
        error = FilePermissionError("/path/to/file.xlsx")

        assert "صلاحيات" in error.message_ar
        assert "permissions" in error.message_en
        assert error.error_code == "FILE_PERMISSION_ERROR"

    def test_corrupted_file_error(self):
        """اختبار خطأ الملف التالف"""
        error = CorruptedFileError("/path/to/file.xlsx")

        assert "تالف" in error.message_ar
        assert "corrupted" in error.message_en
        assert error.error_code == "CORRUPTED_FILE"

    def test_empty_file_error(self):
        """اختبار خطأ الملف الفارغ"""
        error = EmptyFileError("/path/to/file.xlsx")

        assert "فارغ" in error.message_ar
        assert "empty" in error.message_en
        assert error.error_code == "EMPTY_FILE"


class TestErrorResponse:
    """اختبارات استجابة الخطأ"""

    def test_get_error_response_arabic(self):
        """اختبار استجابة الخطأ بالعربية"""
        error = FileNotFoundError_("/path/to/file.xlsx")
        response = get_error_response(error, 'ar')

        assert response['نجاح'] == False
        assert response['خطأ']['الرمز'] == "FILE_NOT_FOUND"
        assert "غير موجود" in response['خطأ']['الرسالة']

    def test_get_error_response_english(self):
        """اختبار استجابة الخطأ بالإنجليزية"""
        error = FileNotFoundError_("/path/to/file.xlsx")
        response = get_error_response(error, 'en')

        assert response['نجاح'] == False
        assert response['خطأ']['الرمز'] == "FILE_NOT_FOUND"
        assert "not found" in response['خطأ']['الرسالة']

    def test_handle_known_exception(self):
        """اختبار معالجة استثناء معروف"""
        error = FileNotFoundError_("/path/to/file.xlsx")
        response = handle_exception(error, 'ar')

        assert response['نجاح'] == False
        assert response['خطأ']['الرمز'] == "FILE_NOT_FOUND"

    def test_handle_unknown_exception(self):
        """اختبار معالجة استثناء غير معروف"""
        response = handle_exception(Exception("Unknown error"), 'ar')

        assert response['نجاح'] == False
        assert response['خطأ']['الرمز'] == "INTERNAL_ERROR"
