"""
اختبارات قراءة ملفات Excel
=========================
اختبارات وحدة للتحقق من صحة قراءة ملفات Excel
"""

import pytest
from excel_processor.file_reader import ExcelReader, read_excel_file, read_cell_value
from excel_processor.errors import (
    FileNotFoundError_,
    UnsupportedFormatError,
    SheetNotFoundError,
    CellReadError,
    CorruptedFileError
)


class TestExcelReader:
    """اختبارات فئة قارئ Excel"""

    def test_open_xlsx_file(self, temp_excel_file):
        """اختبار فتح ملف .xlsx"""
        with ExcelReader(temp_excel_file) as reader:
            assert reader.workbook is not None
            assert reader.file_format == '.xlsx'

    def test_open_xls_file(self, temp_old_excel_file):
        """اختبار فتح ملف .xls"""
        with ExcelReader(temp_old_excel_file) as reader:
            assert reader.workbook is not None
            assert reader.file_format == '.xls'

    def test_get_sheet_names_xlsx(self, temp_excel_file):
        """اختبار الحصول على أسماء الأوراق لملف .xlsx"""
        with ExcelReader(temp_excel_file) as reader:
            sheets = reader.get_sheet_names()
            assert isinstance(sheets, list)
            assert len(sheets) > 0

    def test_get_sheet_names_xls(self, temp_old_excel_file):
        """اختبار الحصول على أسماء الأوراق لملف .xls"""
        with ExcelReader(temp_old_excel_file) as reader:
            sheets = reader.get_sheet_names()
            assert isinstance(sheets, list)
            assert len(sheets) > 0

    def test_read_string_cell(self, temp_excel_file):
        """اختبار قراءة خلية نصية"""
        with ExcelReader(temp_excel_file) as reader:
            value = reader.read_cell('A1')
            assert value == "Name"

    def test_read_numeric_cell(self, temp_excel_file):
        """اختبار قراءة خلية رقمية"""
        with ExcelReader(temp_excel_file) as reader:
            value = reader.read_cell('B2')
            assert value == 25

    def test_read_arabic_text(self, temp_excel_file):
        """اختبار قراءة نص عربي"""
        with ExcelReader(temp_excel_file) as reader:
            value = reader.read_cell('A2')
            assert value == "أحمد"

    def test_read_english_text(self, temp_excel_file):
        """اختبار قراءة نص إنجليزي"""
        with ExcelReader(temp_excel_file) as reader:
            value = reader.read_cell('A3')
            assert value == "John"

    def test_read_nonexistent_cell(self, temp_excel_file):
        """اختبار قراءة خلية غير موجودة"""
        with ExcelReader(temp_excel_file) as reader:
            value = reader.read_cell('Z100')
            assert value is None

    def test_read_specific_sheet(self, temp_multi_sheet_excel):
        """اختبار قراءة ورقة محددة"""
        with ExcelReader(temp_multi_sheet_excel) as reader:
            value = reader.read_cell('A1', sheet_name='البيانات')
            assert value == "بيانات1"

    def test_read_nonexistent_sheet(self, temp_excel_file):
        """اختبار قراءة ورقة غير موجودة"""
        with pytest.raises(SheetNotFoundError):
            with ExcelReader(temp_excel_file) as reader:
                reader.read_cell('A1', sheet_name='NonExistentSheet')

    def test_read_range(self, temp_excel_file):
        """اختبار قراءة نطاق من الخلايا"""
        with ExcelReader(temp_excel_file) as reader:
            data = reader.read_range('A1', 'C2')
            assert len(data) == 2
            assert len(data[0]) == 3

    def test_read_all_data(self, temp_excel_file):
        """اختبار قراءة جميع البيانات"""
        with ExcelReader(temp_excel_file) as reader:
            result = reader.read_all_data()
            assert 'data' in result
            assert 'dimensions' in result
            assert result['dimensions']['rows'] > 0

    def test_get_cell_format(self, temp_excel_file):
        """اختبار الحصول على تنسيق الخلية"""
        with ExcelReader(temp_excel_file) as reader:
            format_info = reader.get_cell_format('A1')
            assert 'font' in format_info or format_info == {}


class TestReadFunctions:
    """اختبارات دوال القراءة المساعدة"""

    def test_read_excel_file_function(self, temp_excel_file):
        """اختبار دالة قراءة ملف Excel"""
        result = read_excel_file(temp_excel_file)
        assert 'data' in result
        assert 'dimensions' in result

    def test_read_cell_value_function(self, temp_excel_file):
        """اختبار دالة قراءة قيمة الخلية"""
        value = read_cell_value(temp_excel_file, 'A1')
        assert value == "Name"

    def test_read_cell_with_sheet(self, temp_multi_sheet_excel):
        """اختبار قراءة خلية مع تحديد الورقة"""
        value = read_cell_value(temp_multi_sheet_excel, 'B1', sheet_name='الإجمالي')
        assert value == 100


class TestReadErrors:
    """اختبارات أخطاء القراءة"""

    def test_read_nonexistent_file(self):
        """اختبار قراءة ملف غير موجود"""
        with pytest.raises(FileNotFoundError_):
            read_excel_file("/non/existent/file.xlsx")

    def test_read_unsupported_format(self, temp_dir):
        """اختبار قراءة صيغة غير مدعومة"""
        import os
        csv_file = os.path.join(temp_dir, "test.csv")
        with open(csv_file, 'w') as f:
            f.write("col1,col2\n1,2")

        with pytest.raises(UnsupportedFormatError):
            read_excel_file(csv_file)

    def test_read_corrupted_file(self, temp_dir):
        """اختبار قراءة ملف تالف"""
        import os
        corrupted_file = os.path.join(temp_dir, "corrupted.xlsx")
        with open(corrupted_file, 'wb') as f:
            f.write(b"not a real xlsx file content")

        with pytest.raises(CorruptedFileError):
            read_excel_file(corrupted_file)
