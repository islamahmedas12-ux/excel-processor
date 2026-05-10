"""
اختبارات التحقق من بيانات الاعتماد
===================================
اختبارات للتحقق من صحة بيانات الاعتماد ومتغيرات البيئة المطلوبة
"""

import pytest
import os
import sys
from unittest.mock import patch


class TestJWTSecretKey:
    """اختبارات التحقق من JWT_SECRET_KEY"""

    def test_jwt_secret_key_not_set(self):
        """اختبار رفع خطأ عند عدم تعيين JWT_SECRET_KEY"""
        # Backup original JWT_SECRET_KEY
        env_backup = os.environ.get('JWT_SECRET_KEY')

        # Remove JWT_SECRET_KEY from environment
        if 'JWT_SECRET_KEY' in os.environ:
            del os.environ['JWT_SECRET_KEY']

        try:
            # Clear module cache to trigger re-import validation
            modules_to_clear = [k for k in sys.modules.keys() if k.startswith('backend.services.auth_service') or k == 'backend.services.auth_service']
            for mod in modules_to_clear:
                del sys.modules[mod]

            # Attempt to import auth_service - should raise error
            with pytest.raises(ValueError) as exc_info:
                import backend.services.auth_service

            # Verify error mentions JWT_SECRET_KEY
            error_msg = str(exc_info.value).lower()
            assert 'jwt_secret_key' in error_msg or 'environment variable' in error_msg
        finally:
            # Restore original environment
            if env_backup is not None:
                os.environ['JWT_SECRET_KEY'] = env_backup
            # Clean up module cache
            modules_to_clear = [k for k in sys.modules.keys() if k.startswith('backend.services.auth_service') or k == 'backend.services.auth_service']
            for mod in modules_to_clear:
                if mod in sys.modules:
                    del sys.modules[mod]

    def test_jwt_secret_key_default_insecure_value(self):
        """اختبار رفع خطأ عند استخدام القيمة الافتراضية غير الآمنة"""
        # Set JWT_SECRET_KEY to the known insecure default value
        insecure_value = 'excel-processor-secret-key-change-in-production'
        os.environ['JWT_SECRET_KEY'] = insecure_value

        try:
            # Clear module cache to trigger re-import validation
            modules_to_clear = [k for k in sys.modules.keys() if k.startswith('backend.services.auth_service') or k == 'backend.services.auth_service']
            for mod in modules_to_clear:
                del sys.modules[mod]

            # Attempt to import auth_service - should raise error
            with pytest.raises(ValueError) as exc_info:
                import backend.services.auth_service

            # Verify error mentions the issue with default value
            error_msg = str(exc_info.value).lower()
            assert 'jwt_secret_key' in error_msg or 'default' in error_msg or 'secure' in error_msg
        finally:
            # Clean up environment and cache
            if 'JWT_SECRET_KEY' in os.environ:
                del os.environ['JWT_SECRET_KEY']
            modules_to_clear = [k for k in sys.modules.keys() if k.startswith('backend.services.auth_service') or k == 'backend.services.auth_service']
            for mod in modules_to_clear:
                if mod in sys.modules:
                    del sys.modules[mod]

    def test_jwt_secret_key_set_with_valid_value(self):
        """اختبار نجاح التحميل عندما JWT_SECRET_KEY القيمة صحيحة"""
        # Set a secure test value
        test_secret = 'test-secret-key-for-testing-purposes-only'
        os.environ['JWT_SECRET_KEY'] = test_secret

        try:
            # Clear module cache to trigger re-import validation
            modules_to_clear = [k for k in sys.modules.keys() if k.startswith('backend.services.auth_service') or k == 'backend.services.auth_service']
            for mod in modules_to_clear:
                del sys.modules[mod]

            # Import should succeed with valid secret
            import backend.services.auth_service as auth_service
            assert auth_service.SECRET_KEY == test_secret
        finally:
            # Clean up environment and cache
            if 'JWT_SECRET_KEY' in os.environ:
                del os.environ['JWT_SECRET_KEY']
            modules_to_clear = [k for k in sys.modules.keys() if k.startswith('backend.services.auth_service') or k == 'backend.services.auth_service']
            for mod in modules_to_clear:
                if mod in sys.modules:
                    del sys.modules[mod]


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