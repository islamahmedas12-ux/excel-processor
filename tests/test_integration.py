"""
اختبارات التكامل للـ API
=========================
اختبارات شاملة لمسارات API الكاملة
"""

import pytest
import os
import tempfile
from io import BytesIO
from openpyxl import Workbook

from flask import Flask
from flask import Flask, jsonify
from flask_cors import CORS


class TestAPIIntegration:
    """اختبارات التكامل للـ API"""

    @pytest.fixture
    def app(self):
        """إنشاء تطبيق Flask للاختبار"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
        CORS(app)
        return app

    @pytest.fixture
    def client(self, app):
        """إنشاء عميل اختبار"""
        return app.test_client()

    @pytest.fixture
    def sample_excel_bytes(self):
        """إنشاء بيانات Excel كـ bytes"""
        wb = Workbook()
        ws = wb.active
        ws['A1'] = "Name"
        ws['B1'] = "Age"
        ws['C1'] = "City"
        ws['A2'] = "أحمد"
        ws['B2'] = 25
        ws['C2'] = "الرياض"
        ws['A3'] = "John"
        ws['B3'] = 30
        ws['C3'] = "London"

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()


class TestExcelServiceIntegration:
    """اختبارات تكامل ExcelService"""

    @pytest.fixture
    def excel_service(self):
        from backend.services.excel_service import ExcelService
        return ExcelService()

    @pytest.fixture
    def sample_excel_bytes(self):
        wb = Workbook()
        ws = wb.active
        ws['A1'] = 100
        ws['A2'] = 200
        ws['A3'] = 300
        ws['A4'] = '=SUM(A1:A3)'

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    def test_execute_full_workflow(self, excel_service, sample_excel_bytes):
        """اختبار مسار execute الكامل"""
        result = excel_service.execute(
            file_content=sample_excel_bytes,
            filename="test.xlsx",
            inputs={'A1': 500, 'A2': 300},
            outputs=['A4'],
            sheet_name=None
        )

        assert result['success'] is True
        assert 'results' in result
        assert 'A4' in result['results']

    def test_execute_with_sheet_name(self, excel_service, sample_excel_bytes):
        """اختبار execute مع تحديد اسم ورقة"""
        result = excel_service.execute(
            file_content=sample_excel_bytes,
            filename="test.xlsx",
            inputs={'A1': 100},
            outputs=['A2'],
            sheet_name='Sheet'
        )

        assert result['success'] is True

    def test_execute_invalid_cell(self, excel_service, sample_excel_bytes):
        """اختبار execute مع خلية غير صالحة"""
        from excel_processor.errors import InvalidCellCoordinatesError

        with pytest.raises(InvalidCellCoordinatesError):
            excel_service.execute(
                file_content=sample_excel_bytes,
                filename="test.xlsx",
                inputs={'INVALID': 100},
                outputs=['A1'],
                sheet_name=None
            )


class TestFileEditorIntegration:
    """اختبارات تكامل محرر الملفات"""

    def test_save_and_load_bytes(self, temp_dir):
        """اختبار حفظ وتحميل الـ bytes"""
        from excel_processor.file_editor import ExcelEditor
        from excel_processor.file_reader import ExcelReader

        wb = Workbook()
        ws = wb.active
        ws['A1'] = "Test Value"
        ws['B1'] = 42

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        with ExcelEditor(buffer) as editor:
            editor.update_cell('C1', "Modified")
            output = editor.save()

        assert output is not None

        output_buffer = BytesIO(output)
        with ExcelReader(output_buffer) as reader:
            value = reader.read_cell('A1')
            assert value == "Test Value"

    def test_multiple_edits_session(self, temp_dir):
        """اختبار عدة تعديلات في جلسة واحدة"""
        from excel_processor.file_editor import ExcelEditor

        wb = Workbook()
        ws = wb.active
        ws['A1'] = "Start"

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        with ExcelEditor(buffer) as editor:
            editor.update_cell('A1', "First")
            editor.update_cell('A2', "Second")
            editor.update_cell('A3', "Third")

            result = editor.save()

        assert result is not None

    def test_preserve_format_on_edit(self, temp_dir):
        """اختبار الحفاظ على التنسيق أثناء التعديل"""
        from excel_processor.file_editor import ExcelEditor

        wb = Workbook()
        ws = wb.active
        ws['A1'] = "Formatted"

        from openpyxl.styles import Font
        ws['A1'].font = Font(bold=True, size=14)

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        with ExcelEditor(buffer) as editor:
            editor.update_cell('A1', "Updated", preserve_format=True)
            output = editor.save()

        assert output is not None


class TestFileReaderIntegration:
    """اختبارات تكامل قارئ الملفات"""

    def test_read_with_bytes_input(self):
        """اختبار القراءة مع إدخال bytes"""
        from excel_processor.file_reader import ExcelReader

        wb = Workbook()
        ws = wb.active
        ws['A1'] = "Hello"
        ws['B1'] = 123

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        with ExcelReader(buffer) as reader:
            value_a1 = reader.read_cell('A1')
            value_b1 = reader.read_cell('B1')

            assert value_a1 == "Hello"
            assert value_b1 == 123

    def test_read_all_data(self):
        """اختبار قراءة جميع البيانات"""
        from excel_processor.file_reader import ExcelReader

        wb = Workbook()
        ws = wb.active
        for i in range(1, 6):
            ws[f'A{i}'] = f"Row {i}"

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        with ExcelReader(buffer) as reader:
            data = reader.read_all_data()

            assert 'data' in data
            assert 'dimensions' in data

    def test_read_range(self):
        """اختبار قراءة نطاق"""
        from excel_processor.file_reader import ExcelReader

        wb = Workbook()
        ws = wb.active

        for row in range(1, 4):
            for col in range(1, 4):
                ws[f'A{row}'] = row

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        with ExcelReader(buffer) as reader:
            result = reader.read_range('A1', 'A3')

            assert len(result) == 3

    def test_get_sheet_names(self):
        """اختبار الحصول على أسماء الأوراق"""
        from excel_processor.file_reader import ExcelReader

        wb = Workbook()
        ws1 = wb.active
        ws1.title = "Data"
        ws2 = wb.create_sheet("Summary")

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        with ExcelReader(buffer) as reader:
            names = reader.get_sheet_names()

            assert "Data" in names
            assert "Summary" in names


class TestValidatorsIntegration:
    """اختبارات تكامل الـ validators"""

    def test_validate_cell_value_formula_protection(self):
        """اختبار حماية الصيغ"""
        from excel_processor.validators import validate_cell_value

        assert validate_cell_value("=SUM(A1:A10)") == "'=SUM(A1:A10)"
        assert validate_cell_value("+1+2+3") == "'+1+2+3"
        assert validate_cell_value("-100") == "'-100"
        assert validate_cell_value("@HYPERLINK") == "'@HYPERLINK"

        assert validate_cell_value("Normal text") == "Normal text"
        assert validate_cell_value(42) == 42

    def test_validate_sheet_name(self):
        """اختبار التحقق من اسم الورقة"""
        from excel_processor.validators import validate_sheet_name

        assert validate_sheet_name(None) is None
        assert validate_sheet_name("Sheet1") == "Sheet1"
        assert validate_sheet_name("  Sheet1  ") == "Sheet1"
        assert validate_sheet_name("   ") is None

        with pytest.raises(TypeError):
            validate_sheet_name(123)

    def test_validate_cell_coordinates(self):
        """اختبار التحقق من إحداثيات الخلايا"""
        from excel_processor.validators import validate_cell_coordinates

        col, row = validate_cell_coordinates("A1")
        assert col == "A" and row == 1

        col, row = validate_cell_coordinates("AA100")
        assert col == "AA" and row == 100

        col, row = validate_cell_coordinates("b5")
        assert col == "B" and row == 5


class TestErrorsIntegration:
    """اختبارات تكامل الأخطاء"""

    def test_error_response_format(self):
        """اختبار تنسيق استجابة الخطأ"""
        from excel_processor.errors import get_error_response, ExcelProcessorError

        class DummyError(ExcelProcessorError):
            def __init__(self):
                super().__init__("Test error", "خطأ اختبار", "TEST_ERROR")

        error = DummyError()
        error_response = get_error_response(error, lang="en")

        assert 'نجاح' in error_response or 'error' in error_response
        assert error_response.get('خطأ', error_response.get('error', {})).get('الرمز', error_response.get('code', '')) in ["TEST_ERROR"]

    def test_error_response_arabic(self):
        """اختبار استجابة الخطأ بالعربية"""
        from excel_processor.errors import get_error_response, ExcelProcessorError

        class DummyError(ExcelProcessorError):
            def __init__(self):
                super().__init__("Test error", "خطأ اختبار", "TEST_ERROR")

        error = DummyError()
        error_response = get_error_response(error, lang="ar")

        assert 'خطأ' in error_response or 'error' in error_response

    def test_handle_exception(self):
        """اختبار معالجة الاستثناءات"""
        from excel_processor.errors import handle_exception, CellReadError

        response = handle_exception(CellReadError("A1"), lang="en")

        assert 'نجاح' in response or 'error' in response

    def test_handle_exception_unknown(self):
        """اختبار معالجة الاستثناءات غير المعروفة"""
        from excel_processor.errors import handle_exception

        response = handle_exception(Exception("Unknown"), lang="en")

        assert 'نجاح' in response or 'error' in response
