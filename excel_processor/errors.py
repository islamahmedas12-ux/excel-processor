"""
وحدة معالجة الأخطاء الشاملة
===========================
تتضمن هذه الوحدة جميع الاستثناءات المخصصة وأنظمة معالجة الأخطاء
для системы обработки файлов Excel
"""


class ExcelProcessorError(Exception):
    """الخطأ الأساسي لجميع استثناءات نظام معالجة Excel"""

    def __init__(self, message_ar: str, message_en: str, error_code: str):
        self.message_ar = message_ar
        self.message_en = message_en
        self.error_code = error_code
        super().__init__(self.message_ar)

    def get_message(self, lang: str = 'ar') -> str:
        """الحصول على رسالة الخطأ باللغة المطلوبة"""
        return self.message_ar if lang == 'ar' else self.message_en


class FileNotFoundError_(ExcelProcessorError):
    """خطأ الملف غير موجود"""

    def __init__(self, file_path: str):
        super().__init__(
            message_ar=f"الملف غير موجود: {file_path}",
            message_en=f"File not found: {file_path}",
            error_code="FILE_NOT_FOUND"
        )


class InvalidFilePathError(ExcelProcessorError):
    """خطأ مسار الملف غير صالح"""

    def __init__(self, file_path: str):
        super().__init__(
            message_ar=f"مسار الملف غير صالح: {file_path}",
            message_en=f"Invalid file path: {file_path}",
            error_code="INVALID_FILE_PATH"
        )


class UnsupportedFormatError(ExcelProcessorError):
    """خطأ صيغة الملف غير المدعومة"""

    def __init__(self, file_format: str):
        supported_formats = ['.xlsx', '.xls']
        super().__init__(
            message_ar=f"صيغة الملف غير مدعومة: {file_format}. الصيغ المدعومة: {', '.join(supported_formats)}",
            message_en=f"Unsupported file format: {file_format}. Supported formats: {', '.join(supported_formats)}",
            error_code="UNSUPPORTED_FORMAT"
        )


class InvalidCellCoordinatesError(ExcelProcessorError):
    """خطأ إحداثيات الخلية غير صالحة"""

    def __init__(self, coordinates: str):
        super().__init__(
            message_ar=f"إحداثيات الخلية غير صالحة: {coordinates}. الصيغة الصحيحة: A1 أو B2 أو C10",
            message_en=f"Invalid cell coordinates: {coordinates}. Correct format: A1 or B2 or C10",
            error_code="INVALID_CELL_COORDINATES"
        )


class SheetNotFoundError(ExcelProcessorError):
    """خطأ ورقة العمل غير موجودة"""

    def __init__(self, sheet_name: str):
        super().__init__(
            message_ar=f"ورقة العمل غير موجودة: {sheet_name}",
            message_en=f"Sheet not found: {sheet_name}",
            error_code="SHEET_NOT_FOUND"
        )


class CellReadError(ExcelProcessorError):
    """خطأ قراءة الخلية"""

    def __init__(self, coordinates: str):
        super().__init__(
            message_ar=f"خطأ في قراءة الخلية: {coordinates}",
            message_en=f"Error reading cell: {coordinates}",
            error_code="CELL_READ_ERROR"
        )


class CellWriteError(ExcelProcessorError):
    """خطأ كتابة الخلية"""

    def __init__(self, coordinates: str):
        super().__init__(
            message_ar=f"خطأ في كتابة الخلية: {coordinates}",
            message_en=f"Error writing to cell: {coordinates}",
            error_code="CELL_WRITE_ERROR"
        )


class FileSaveError(ExcelProcessorError):
    """خطأ حفظ الملف"""

    def __init__(self, file_path: str):
        super().__init__(
            message_ar=f"خطأ في حفظ الملف: {file_path}",
            message_en=f"Error saving file: {file_path}",
            error_code="FILE_SAVE_ERROR"
        )


class FilePermissionError(ExcelProcessorError):
    """خطأ صلاحيات الملف"""

    def __init__(self, file_path: str):
        super().__init__(
            message_ar=f"ليس لديك صلاحيات كافية للوصول إلى الملف: {file_path}",
            message_en=f"Insufficient permissions to access file: {file_path}",
            error_code="FILE_PERMISSION_ERROR"
        )


class InvalidLanguageError(ExcelProcessorError):
    """خطأ اللغة غير المدعومة"""

    def __init__(self, lang: str):
        super().__init__(
            message_ar=f"اللغة غير مدعومة: {lang}. اللغات المدعومة: العربية (ar) والإنجليزية (en)",
            message_en=f"Unsupported language: {lang}. Supported languages: Arabic (ar) and English (en)",
            error_code="INVALID_LANGUAGE"
        )


class CorruptedFileError(ExcelProcessorError):
    """خطأ الملف التالف"""

    def __init__(self, file_path: str):
        super().__init__(
            message_ar=f"الملف تالف أو غير قابل للقراءة: {file_path}",
            message_en=f"File is corrupted or unreadable: {file_path}",
            error_code="CORRUPTED_FILE"
        )


class EmptyFileError(ExcelProcessorError):
    """خطأ الملف الفارغ"""

    def __init__(self, file_path: str):
        super().__init__(
            message_ar=f"الملف فارغ أو لا يحتوي على بيانات: {file_path}",
            message_en=f"File is empty or contains no data: {file_path}",
            error_code="EMPTY_FILE"
        )


class DatabaseConnectionError(ExcelProcessorError):
    """خطأ الاتصال بقاعدة البيانات"""

    def __init__(self, detail: str = ""):
        detail_msg = f" - {detail}" if detail else ""
        super().__init__(
            message_ar=f"خطأ في الاتصال بقاعدة البيانات{detail_msg}. تأكد من تعيين متغير البيئة DATABASE_URL بشكل صحيح.",
            message_en=f"Database connection error{detail_msg}. Ensure DATABASE_URL environment variable is set correctly.",
            error_code="DATABASE_CONNECTION_ERROR"
        )


def get_error_response(error: ExcelProcessorError, lang: str = 'ar') -> dict:
    """
    الحصول على استجابة خطأ موحدة

    المعلمات:
        error: كائن الخطأ
        lang: لغة الاستجابة ('ar' أو 'en')

    المخرجات:
        dict: قاموس يحتوي على معلومات الخطأ
    """
    return {
        "نجاح": False,
        "خطأ": {
            "الرمز": error.error_code,
            "الرسالة": error.get_message(lang)
        }
    }


def handle_exception(e: Exception, lang: str = 'ar') -> dict:
    """
    معالجة الاستثناءات غير المتوقعة

    المعلمات:
        e: الاستثناء
        lang: لغة الاستجابة

    المخرجات:
        dict: استجابة خطأ
    """
    if isinstance(e, ExcelProcessorError):
        return get_error_response(e, lang)

    return {
        "نجاح": False,
        "خطأ": {
            "الرمز": "INTERNAL_ERROR",
            "الرسالة": "حدث خطأ داخلي غير متوقع" if lang == 'ar' else "An unexpected internal error occurred"
        }
    }
