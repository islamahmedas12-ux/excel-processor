"""
Tests for API Endpoints
======================
"""

import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO


class TestExecuteEndpoint:
    """Tests for /execute endpoint"""

    def test_execute_requires_inputs_and_outputs(self):
        """Test execute endpoint requires inputs and outputs"""
        from main import app

        with patch('main.init_services'):
            client = app.test_client()

            response = client.post('/api/v1/execute/test-file-id')

            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data

    def test_execute_returns_results(self):
        """Test execute endpoint returns calculated results"""
        from main import app

        mock_bucket_service = MagicMock()
        mock_bucket_service.file_exists.return_value = True
        mock_bucket_service.download_file.return_value = b'fake excel content'

        mock_excel_service = MagicMock()
        mock_excel_service.execute.return_value = {
            'success': True,
            'results': {'C13': 3},
            'file_id': 'test-id',
            'sheet': 'Sheet1'
        }

        with patch('main.init_services'):
            with patch('backend.api.endpoints.bucket_service', mock_bucket_service):
                with patch('backend.api.endpoints.excel_service', mock_excel_service):
                    client = app.test_client()

                    response = client.post(
                        '/api/v1/execute/test-file-id',
                        json={
                            'inputs': [{'cell': 'C11', 'value': 1}],
                            'outputs': ['C13']
                        }
                    )

                    assert response.status_code == 200
                    data = response.get_json()
                    assert data['success'] is True
                    assert data['data']['results']['C13'] == 3

    def test_execute_file_not_found(self):
        """Test execute returns 404 when file not found"""
        from main import app

        mock_bucket_service = MagicMock()
        mock_bucket_service.file_exists.return_value = False

        with patch('main.init_services'):
            with patch('backend.api.endpoints.bucket_service', mock_bucket_service):
                client = app.test_client()

                response = client.post(
                    '/api/v1/execute/nonexistent-file',
                    json={
                        'inputs': [{'cell': 'C11', 'value': 1}],
                        'outputs': ['C13']
                    }
                )

                assert response.status_code == 404


class TestUploadEndpoint:
    """Tests for /files upload endpoint"""

    def test_upload_requires_file(self):
        """Test upload endpoint requires a file"""
        from main import app

        with patch('main.init_services'):
            client = app.test_client()

            response = client.post('/api/v1/files')

            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data

    def test_upload_rejects_invalid_file_type(self):
        """Test upload rejects non-excel files"""
        from main import app

        with patch('main.init_services'):
            client = app.test_client()

            data = {
                'file': (BytesIO(b'not an excel file'), 'test.txt')
            }

            response = client.post(
                '/api/v1/files',
                data=data,
                content_type='multipart/form-data'
            )

            assert response.status_code == 400

    def test_upload_success(self):
        """Test successful file upload"""
        from main import app

        mock_bucket_service = MagicMock()
        mock_bucket_service.upload_file.return_value = {
            'file_id': 'test-uuid.xlsx',
            'filename': 'test-uuid.xlsx',
            'original_filename': 'test.xlsx',
            'url': 'https://test.supabase.co/storage/v1/object/public/test-bucket/test-uuid.xlsx',
            'bucket': 'test-bucket'
        }

        with patch('main.init_services'):
            with patch('backend.api.endpoints.bucket_service', mock_bucket_service):
                client = app.test_client()

                data = {
                    'file': (BytesIO(b'excel content'), 'test.xlsx')
                }

                response = client.post(
                    '/api/v1/files',
                    data=data,
                    content_type='multipart/form-data'
                )

                assert response.status_code == 200
                result = response.get_json()
                assert result['success'] is True
                assert 'file_id' in result['data']


class TestHealthEndpoint:
    """Tests for health check endpoint"""

    def test_health_returns_healthy(self):
        """Test health endpoint returns healthy status"""
        from main import app

        with patch('main.init_services'):
            client = app.test_client()

            response = client.get('/api/v1/health')

            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'healthy'


class TestReadEndpoint:
    """Tests for /read endpoint"""

    def test_read_requires_cells_parameter(self):
        """Test read endpoint requires cells parameter"""
        from main import app

        with patch('main.init_services'):
            client = app.test_client()

            response = client.get('/api/v1/read/test-file-id')

            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data

    def test_read_cells_returns_values(self):
        """Test read endpoint returns cell values"""
        from main import app

        mock_bucket_service = MagicMock()
        mock_bucket_service.file_exists.return_value = True

        mock_excel_service = MagicMock()
        mock_excel_service.read_cells.return_value = {
            'success': True,
            'file_id': 'test-id',
            'sheet': 'Sheet1',
            'cells': {'A1': 'Value1', 'B2': 100}
        }

        with patch('main.init_services'):
            with patch('backend.api.endpoints.bucket_service', mock_bucket_service):
                with patch('backend.api.endpoints.excel_service', mock_excel_service):
                    client = app.test_client()

                    response = client.get('/api/v1/read/test-file-id?cells=A1,B2')

                    assert response.status_code == 200
                    data = response.get_json()
                    assert data['success'] is True
                    assert 'A1' in data['data']['cells']


class TestWriteEndpoint:
    """Tests for /write endpoint"""

    def test_write_requires_updates(self):
        """Test write endpoint requires updates array"""
        from main import app

        with patch('main.init_services'):
            client = app.test_client()

            response = client.put(
                '/api/v1/write/test-file-id',
                json={}
            )

            assert response.status_code == 400

    def test_write_cells_updates_file(self):
        """Test write endpoint updates cells successfully"""
        from main import app

        mock_bucket_service = MagicMock()
        mock_bucket_service.file_exists.return_value = True

        mock_excel_service = MagicMock()
        mock_excel_service.write_cells.return_value = {
            'success': True,
            'file_id': 'test-id',
            'updated': [
                {'coordinates': 'A1', 'old_value': 'old', 'new_value': 'new'}
            ]
        }

        with patch('main.init_services'):
            with patch('backend.api.endpoints.bucket_service', mock_bucket_service):
                with patch('backend.api.endpoints.excel_service', mock_excel_service):
                    client = app.test_client()

                    response = client.put(
                        '/api/v1/write/test-file-id',
                        json={
                            'updates': [{'cell': 'A1', 'value': 'new'}]
                        }
                    )

                    assert response.status_code == 200
                    data = response.get_json()
                    assert data['success'] is True