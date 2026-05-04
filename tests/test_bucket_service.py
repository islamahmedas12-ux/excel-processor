"""
Tests for Bucket Service
========================
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from backend.services.bucket_service import BucketService


class TestBucketService:
    """Tests for BucketService"""

    @patch.dict('os.environ', {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key',
        'SUPABASE_BUCKET': 'test-bucket'
    })
    def test_bucket_service_initialization(self):
        """Test BucketService initializes correctly"""
        with patch('backend.services.bucket_service.create_client') as mock_create:
            mock_client = MagicMock()
            mock_create.return_value = mock_client

            service = BucketService()

            assert service.url == 'https://test.supabase.co'
            assert service.key == 'test-key'
            assert service.bucket_name == 'test-bucket'

    @patch.dict('os.environ', {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key',
        'SUPABASE_BUCKET': 'test-bucket'
    })
    def test_upload_file_returns_correct_structure(self):
        """Test upload_file returns expected structure"""
        with patch('backend.services.bucket_service.create_client') as mock_create:
            mock_client = MagicMock()
            mock_bucket = MagicMock()
            mock_client.storage.get_bucket.return_value = mock_bucket
            mock_client.storage.from_.return_value.get_public_url.return_value = 'https://test.url/file.xlsx'
            mock_create.return_value = mock_client

            service = BucketService()
            result = service.upload_file(b'test content', 'test.xlsx')

            assert 'file_id' in result
            assert 'filename' in result
            assert 'original_filename' in result
            assert 'url' in result
            assert result['original_filename'] == 'test.xlsx'
            assert result['bucket'] == 'test-bucket'

    @patch.dict('os.environ', {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key',
        'SUPABASE_BUCKET': 'test-bucket'
    })
    def test_upload_file_with_different_extensions(self):
        """Test upload handles different file extensions"""
        with patch('backend.services.bucket_service.create_client') as mock_create:
            mock_client = MagicMock()
            mock_bucket = MagicMock()
            mock_client.storage.get_bucket.return_value = mock_bucket
            mock_client.storage.from_.return_value.get_public_url.return_value = 'https://test.url/file.xls'
            mock_create.return_value = mock_client

            service = BucketService()
            result = service.upload_file(b'test content', 'test.xls')

            assert result['filename'].endswith('.xls')

    @patch.dict('os.environ', {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key',
        'SUPABASE_BUCKET': 'test-bucket'
    })
    def test_file_exists_returns_true_when_file_present(self):
        """Test file_exists returns True when file is present"""
        with patch('backend.services.bucket_service.create_client') as mock_create:
            mock_client = MagicMock()
            mock_bucket = MagicMock()
            mock_bucket.download.return_value = b'file content'
            mock_client.storage.get_bucket.return_value = mock_bucket
            mock_create.return_value = mock_client

            service = BucketService()
            result = service.file_exists('test-file-id')

            assert result is True

    @patch.dict('os.environ', {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key',
        'SUPABASE_BUCKET': 'test-bucket'
    })
    def test_file_exists_returns_false_when_file_missing(self):
        """Test file_exists returns False when file is missing"""
        with patch('backend.services.bucket_service.create_client') as mock_create:
            mock_client = MagicMock()
            mock_bucket = MagicMock()
            mock_bucket.download.side_effect = Exception('File not found')
            mock_client.storage.get_bucket.return_value = mock_bucket
            mock_create.return_value = mock_client

            service = BucketService()
            result = service.file_exists('nonexistent-file')

            assert result is False

    def test_missing_environment_variables_raises_error(self):
        """Test that missing env vars raise EnvironmentError"""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(EnvironmentError) as exc_info:
                BucketService()

            assert 'SUPABASE_URL and SUPABASE_KEY must be set' in str(exc_info.value)