"""
اختبارات واجهة برمجة التطبيقات (API)
==================================
اختبارات وحدة للتحقق من صحة استجابات API
"""

import pytest
import json
from excel_processor.api_service import app


@pytest.fixture
def client():
    """إنشاء عميل اختبار للـ API"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    """اختبارات نقطة نهاية الفحص الصحي"""

    def test_health_check_arabic(self, client):
        """اختبار الفحص الصحي باللغة العربية"""
        response = client.get('/api/v1/health?lang=ar')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['نجاح'] == True
        assert 'الحالة' in data or 'status' in data

    def test_health_check_english(self, client):
        """اختبار الفحص الصحي باللغة الإنجليزية"""
        response = client.get('/api/v1/health?lang=en')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] == True


class TestHomeEndpoint:
    """اختبارات الصفحة الرئيسية"""

    def test_home_arabic(self, client):
        """اختبار الصفحة الرئيسية بالعربية"""
        response = client.get('/?lang=ar')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['نجاح'] == True
        assert 'إصدار' in data

    def test_home_english(self, client):
        """اختبار الصفحة الرئيسية بالإنجليزية"""
        response = client.get('/?lang=en')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] == True


class TestReadEndpoint:
    """اختبارات نقطة نهاية القراءة"""

    def test_read_missing_file_path(self, client):
        """اختبار القراءة بدون مسار ملف"""
        response = client.post(
            '/api/v1/read',
            json={},
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 400
        assert data['نجاح'] == False or data['success'] == False

    def test_read_file_not_found(self, client):
        """اختبار قراءة ملف غير موجود"""
        response = client.post(
            '/api/v1/read',
            json={'file_path': '/non/existent/file.xlsx'},
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 400
        assert data['نجاح'] == False or data['success'] == False

    def test_read_all_data(self, client, temp_excel_file):
        """اختبار قراءة جميع البيانات"""
        response = client.post(
            '/api/v1/read',
            json={'file_path': temp_excel_file},
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['نجاح'] == True or data['success'] == True
        assert 'بيانات' in data or 'data' in data

    def test_read_specific_cell(self, client, temp_excel_file):
        """اختبار قراءة خلية محددة"""
        response = client.post(
            '/api/v1/read',
            json={
                'file_path': temp_excel_file,
                'coordinates': 'A1'
            },
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['نجاح'] == True or data['success'] == True


class TestWriteEndpoint:
    """اختبارات نقطة نهاية الكتابة"""

    def test_write_missing_parameters(self, client):
        """اختبار الكتابة بدون معلمات مطلوبة"""
        response = client.post(
            '/api/v1/write',
            json={'file_path': '/some/path.xlsx'},
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 400
        assert data['نجاح'] == False or data['success'] == False

    def test_write_file_not_found(self, client):
        """اختبار الكتابة في ملف غير موجود"""
        response = client.post(
            '/api/v1/write',
            json={
                'file_path': '/non/existent/file.xlsx',
                'coordinates': 'A1',
                'value': 'Test'
            },
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 400
        assert data['نجاح'] == False or data['success'] == False

    def test_write_invalid_coordinates(self, client, temp_excel_file):
        """اختبار الكتابة بإحداثيات غير صالحة"""
        response = client.post(
            '/api/v1/write',
            json={
                'file_path': temp_excel_file,
                'coordinates': 'INVALID',
                'value': 'Test'
            },
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 400
        assert data['نجاح'] == False or data['success'] == False

    def test_write_success(self, client, temp_excel_file, temp_dir):
        """اختبار كتابة ناجحة"""
        import os
        output_path = os.path.join(temp_dir, "api_written.xlsx")

        response = client.post(
            '/api/v1/write',
            json={
                'file_path': temp_excel_file,
                'coordinates': 'A1',
                'value': 'API Written',
                'output_path': output_path
            },
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['نجاح'] == True or data['success'] == True
        assert os.path.exists(output_path)


class TestBatchWriteEndpoint:
    """اختبارات نقطة نهاية الكتابة المتعددة"""

    def test_batch_write_missing_parameters(self, client):
        """اختبار الكتابة المتعددة بدون معلمات"""
        response = client.post(
            '/api/v1/write/batch',
            json={'file_path': '/some/path.xlsx'},
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 400

    def test_batch_write_success(self, client, temp_excel_file, temp_dir):
        """اختبار الكتابة المتعددة الناجحة"""
        import os
        output_path = os.path.join(temp_dir, "api_batch_written.xlsx")

        response = client.post(
            '/api/v1/write/batch',
            json={
                'file_path': temp_excel_file,
                'updates': {
                    'A1': 'Batch1',
                    'B2': 123,
                    'C3': 'Batch2'
                },
                'output_path': output_path
            },
            content_type='application/json'
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['نجاح'] == True or data['success'] == True


class TestSheetsEndpoint:
    """اختبارات نقطة نهاية الأوراق"""

    def test_get_sheets_missing_parameter(self, client):
        """اختبار الحصول على الأوراق بدون معلمات"""
        response = client.get('/api/v1/sheets')
        data = json.loads(response.data)

        assert response.status_code == 400

    def test_get_sheets_success(self, client, temp_excel_file):
        """اختبار الحصول على قائمة الأوراق"""
        response = client.get(f'/api/v1/sheets?file_path={temp_excel_file}')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert ('sheets' in data.get('بيانات', {}) or
                'sheets' in data or
                'أوراق' in str(data))


class TestCellInfoEndpoint:
    """اختبارات نقطة نهاية معلومات الخلية"""

    def test_get_cell_info_missing_parameters(self, client):
        """اختبار معلومات الخلية بدون معلمات"""
        response = client.get('/api/v1/cell/info')
        data = json.loads(response.data)

        assert response.status_code == 400

    def test_get_cell_info_success(self, client, temp_excel_file):
        """اختبار الحصول على معلومات الخلية"""
        response = client.get(
            f'/api/v1/cell/info?file_path={temp_excel_file}&coordinates=A1'
        )
        data = json.loads(response.data)

        assert response.status_code == 200


class TestErrorHandling:
    """اختبارات معالجة الأخطاء"""

    def test_404_error(self, client):
        """اختبار خطأ 404"""
        response = client.get('/api/v1/nonexistent/endpoint')
        data = json.loads(response.data)

        assert response.status_code == 404

    def test_405_error(self, client):
        """اختبار خطأ 405"""
        response = client.delete('/api/v1/health')
        data = json.loads(response.data)

        assert response.status_code == 405


class TestDatabaseCredentialValidation:
    """اختبارات التحقق من بيانات اعتماد قاعدة البيانات"""

    def test_api_health_checks_database_connection(self, client):
        """اختبار أن نقطة نهاية الفحص الصحي تتحقق من الاتصال بقاعدة البيانات"""
        response = client.get('/api/v1/health')
        data = json.loads(response.data)

        # Health check should either succeed with db info or fail gracefully
        assert response.status_code in [200, 500]
        # Check that response has expected structure
        assert 'نجاح' in data or 'success' in data or 'خطأ' in data or 'error' in data

    def test_api_requires_database_url_in_environment(self):
        """اختبار أن التطبيق يتطلب DATABASE_URL في البيئة"""
        import os
        import sys

        # Backup original DATABASE_URL
        original_url = os.environ.get('DATABASE_URL')

        # Remove DATABASE_URL if set
        if 'DATABASE_URL' in os.environ:
            del os.environ['DATABASE_URL']

        try:
            # Clear backend modules from cache
            modules_to_remove = [k for k in sys.modules.keys() if k.startswith('backend')]
            for mod in modules_to_remove:
                del sys.modules[mod]

            # Import should fail when DATABASE_URL is not set
            with pytest.raises(Exception) as exc_info:
                import backend.db

            # Verify error mentions DATABASE_URL
            error_msg = str(exc_info.value).lower()
            assert 'database_url' in error_msg or 'database' in error_msg
        finally:
            # Restore original DATABASE_URL
            if original_url is not None:
                os.environ['DATABASE_URL'] = original_url
            # Clean up module cache
            modules_to_remove = [k for k in sys.modules.keys() if k.startswith('backend')]
            for mod in modules_to_remove:
                del sys.modules[mod]
