"""
اختبارات التحقق من بيانات الاعتماد
===================================
اختبارات للتحقق من صحة بيانات الاعتماد ومتغيرات البيئة المطلوبة
"""

import pytest
import os
import sys
from unittest.mock import patch


class TestDatabaseConnection:
    """اختبارات الاتصال بقاعدة البيانات"""

    def test_database_url_not_set(self):
        """اختبار رفع خطأ عند عدم تعيين DATABASE_URL"""
        # Clear DATABASE_URL from environment
        env_backup = os.environ.get('DATABASE_URL')
        if 'DATABASE_URL' in os.environ:
            del os.environ['DATABASE_URL']

        try:
            # Attempt to import db module - should raise error
            with pytest.raises(Exception) as exc_info:
                # Need to reload module to trigger the check
                if 'backend.db' in sys.modules:
                    del sys.modules['backend.db']
                if 'backend' in sys.modules:
                    del sys.modules['backend']
                import backend.db

            # Verify it's a DatabaseConnectionError
            assert 'DATABASE_URL' in str(exc_info.value) or 'database' in str(exc_info.value).lower()
        finally:
            # Restore original environment
            if env_backup is not None:
                os.environ['DATABASE_URL'] = env_backup
            elif 'backend.db' in sys.modules:
                del sys.modules['backend.db']

    def test_database_url_set_invalid_format(self):
        """اختبار السلوك مع قيمة DATABASE_URL غير صالحة"""
        os.environ['DATABASE_URL'] = 'invalid-connection-string'
        try:
            # Clear module cache
            if 'backend.db' in sys.modules:
                del sys.modules['backend.db']
            if 'backend' in sys.modules:
                del sys.modules['backend']

            # Import should raise an error for invalid URL format
            with pytest.raises(Exception) as exc_info:
                import backend.db

            # Verify it's a SQLAlchemy argument error
            assert 'Could not parse' in str(exc_info.value) or 'invalid' in str(exc_info.value).lower()
        finally:
            if 'DATABASE_URL' in os.environ:
                del os.environ['DATABASE_URL']
            if 'backend.db' in sys.modules:
                del sys.modules['backend.db']

    def test_database_url_with_valid_postgres_format(self):
        """اختبار استقبال صيغة Postgres صحيحة"""
        test_url = 'postgresql://user:password@localhost:5432/dbname'
        os.environ['DATABASE_URL'] = test_url

        try:
            if 'backend.db' in sys.modules:
                del sys.modules['backend.db']
            if 'backend' in sys.modules:
                del sys.modules['backend']

            import backend.db
            assert backend.db.DATABASE_URL == test_url
        finally:
            if 'DATABASE_URL' in os.environ:
                del os.environ['DATABASE_URL']
            if 'backend.db' in sys.modules:
                del sys.modules['backend.db']