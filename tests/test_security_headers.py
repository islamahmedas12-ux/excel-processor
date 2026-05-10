"""
Security Headers Tests
======================
Unit tests to verify security HTTP headers are properly set on responses.
Tests cover both the main Flask app (main.py) and the API service (excel_processor/api_service.py).
"""

import pytest
from main import app as main_app
from excel_processor.api_service import app as api_app


@pytest.fixture
def main_client():
    """Create test client for main Flask app"""
    main_app.config['TESTING'] = True
    with main_app.test_client() as client:
        yield client


@pytest.fixture
def api_client():
    """Create test client for API service"""
    api_app.config['TESTING'] = True
    with api_app.test_client() as client:
        yield client


class TestContentSecurityPolicy:
    """Tests for Content-Security-Policy header"""

    def test_csp_on_main_app_home(self, main_client):
        """Test CSP header is set on main app home endpoint"""
        response = main_client.get('/')
        csp = response.headers.get('Content-Security-Policy')

        assert csp is not None, "Content-Security-Policy header should be present"
        assert "default-src 'self'" in csp, "CSP should include default-src 'self'"
        assert "script-src 'self'" in csp, "CSP should include script-src 'self'"
        assert "frame-ancestors 'none'" in csp, "CSP should block frame ancestors"

    def test_csp_on_main_app_health(self, main_client):
        """Test CSP header is set on main app health endpoint"""
        response = main_client.get('/api/v1/health')
        csp = response.headers.get('Content-Security-Policy')

        assert csp is not None, "Content-Security-Policy header should be present"

    def test_csp_on_api_service(self, api_client):
        """Test CSP header is set on API service responses"""
        response = api_client.get('/api/v1/health?lang=en')
        csp = response.headers.get('Content-Security-Policy')

        assert csp is not None, "Content-Security-Policy header should be present"
        assert "default-src 'self'" in csp, "CSP should include default-src 'self'"

    def test_csp_restricts_inline_scripts(self, main_client):
        """Test CSP prevents inline scripts"""
        response = main_client.get('/')
        csp = response.headers.get('Content-Security-Policy')

        assert "'self'" in csp, "CSP should only allow 'self' for scripts"


class TestHSTSHeader:
    """Tests for Strict-Transport-Security (HSTS) header"""

    def test_hsts_on_main_app(self, main_client):
        """Test HSTS header is set on main app responses"""
        response = main_client.get('/')
        hsts = response.headers.get('Strict-Transport-Security')

        assert hsts is not None, "Strict-Transport-Security header should be present"
        assert "max-age=" in hsts, "HSTS should include max-age directive"
        assert "includeSubDomains" in hsts, "HSTS should include subdomains"

    def test_hsts_on_api_service(self, api_client):
        """Test HSTS header is set on API service responses"""
        response = api_client.get('/api/v1/health?lang=en')
        hsts = response.headers.get('Strict-Transport-Security')

        assert hsts is not None, "Strict-Transport-Security header should be present"
        assert "max-age=" in hsts, "HSTS should include max-age directive"

    def test_hsts_enforces_https(self, main_client):
        """Test HSTS enforces HTTPS for at least 1 year (31536000 seconds)"""
        response = main_client.get('/')
        hsts = response.headers.get('Strict-Transport-Security')

        assert "31536000" in hsts, "HSTS max-age should be at least 1 year"


class TestXContentTypeOptions:
    """Tests for X-Content-Type-Options header"""

    def test_x_content_type_options_on_main_app(self, main_client):
        """Test X-Content-Type-Options is set on main app"""
        response = main_client.get('/')
        header = response.headers.get('X-Content-Type-Options')

        assert header is not None, "X-Content-Type-Options header should be present"
        assert header == 'nosniff', "X-Content-Type-Options should be 'nosniff'"

    def test_x_content_type_options_on_api_service(self, api_client):
        """Test X-Content-Type-Options is set on API service"""
        response = api_client.get('/api/v1/health?lang=en')
        header = response.headers.get('X-Content-Type-Options')

        assert header is not None, "X-Content-Type-Options header should be present"
        assert header == 'nosniff', "X-Content-Type-Options should be 'nosniff'"

    def test_x_content_type_options_prevents_sniffing(self, main_client):
        """Test X-Content-Type-Options prevents MIME sniffing"""
        response = main_client.get('/')
        header = response.headers.get('X-Content-Type-Options')

        assert header == 'nosniff', "Should prevent MIME type sniffing"


class TestXFrameOptions:
    """Tests for X-Frame-Options header"""

    def test_x_frame_options_on_main_app(self, main_client):
        """Test X-Frame-Options is set on main app"""
        response = main_client.get('/')
        header = response.headers.get('X-Frame-Options')

        assert header is not None, "X-Frame-Options header should be present"
        assert header == 'DENY', "X-Frame-Options should be 'DENY'"

    def test_x_frame_options_on_api_service(self, api_client):
        """Test X-Frame-Options is set on API service"""
        response = api_client.get('/api/v1/health?lang=en')
        header = response.headers.get('X-Frame-Options')

        assert header is not None, "X-Frame-Options header should be present"
        assert header == 'DENY', "X-Frame-Options should be 'DENY'"

    def test_x_frame_options_prevents_clickjacking(self, main_client):
        """Test X-Frame-Options prevents clickjacking attacks"""
        response = main_client.get('/')
        header = response.headers.get('X-Frame-Options')

        assert header == 'DENY', "Should deny framing to prevent clickjacking"


class TestReferrerPolicy:
    """Tests for Referrer-Policy header"""

    def test_referrer_policy_on_main_app(self, main_client):
        """Test Referrer-Policy is set on main app"""
        response = main_client.get('/')
        header = response.headers.get('Referrer-Policy')

        assert header is not None, "Referrer-Policy header should be present"
        assert header == 'strict-origin-when-cross-origin', \
            "Referrer-Policy should control referrer information"

    def test_referrer_policy_on_api_service(self, api_client):
        """Test Referrer-Policy is set on API service"""
        response = api_client.get('/api/v1/health?lang=en')
        header = response.headers.get('Referrer-Policy')

        assert header is not None, "Referrer-Policy header should be present"

    def test_referrer_policy_controls_referrer_info(self, main_client):
        """Test Referrer-Policy controls referrer information sent with requests"""
        response = main_client.get('/')
        header = response.headers.get('Referrer-Policy')

        assert header in [
            'no-referrer',
            'no-referrer-when-downgrade',
            'origin',
            'origin-when-cross-origin',
            'strict-origin-when-cross-origin',
            'same-origin',
            'strict-origin'
        ], "Referrer-Policy should have a valid value"


class TestXXSSProtection:
    """Tests for X-XSS-Protection header (legacy but still tested)"""

    def test_x_xss_protection_on_main_app(self, main_client):
        """Test X-XSS-Protection is set on main app"""
        response = main_client.get('/')
        header = response.headers.get('X-XSS-Protection')

        assert header is not None, "X-XSS-Protection header should be present"
        assert '1' in header, "X-XSS-Protection should enable filter"
        assert 'mode=block' in header, "X-XSS-Protection should block on detection"

    def test_x_xss_protection_on_api_service(self, api_client):
        """Test X-XSS-Protection is set on API service"""
        response = api_client.get('/api/v1/health?lang=en')
        header = response.headers.get('X-XSS-Protection')

        assert header is not None, "X-XSS-Protection header should be present"


class TestPermissionsPolicy:
    """Tests for Permissions-Policy header"""

    def test_permissions_policy_on_main_app(self, main_client):
        """Test Permissions-Policy is set on main app"""
        response = main_client.get('/')
        header = response.headers.get('Permissions-Policy')

        assert header is not None, "Permissions-Policy header should be present"
        assert 'geolocation=()' in header, "Should restrict geolocation"
        assert 'microphone=()' in header, "Should restrict microphone"
        assert 'camera=()' in header, "Should restrict camera"

    def test_permissions_policy_on_api_service(self, api_client):
        """Test Permissions-Policy is set on API service"""
        response = api_client.get('/api/v1/health?lang=en')
        header = response.headers.get('Permissions-Policy')

        assert header is not None, "Permissions-Policy header should be present"


class TestAllSecurityHeadersPresent:
    """Integration tests to verify all security headers are present together"""

    def test_all_headers_on_main_app_home(self, main_client):
        """Test all security headers are present on main app home endpoint"""
        response = main_client.get('/')

        expected_headers = {
            'Content-Security-Policy': True,
            'Strict-Transport-Security': True,
            'X-Content-Type-Options': True,
            'X-Frame-Options': True,
            'Referrer-Policy': True,
            'X-XSS-Protection': True,
            'Permissions-Policy': True
        }

        for header_name in expected_headers:
            header_value = response.headers.get(header_name)
            assert header_value is not None, \
                f"{header_name} should be present in response headers"

    def test_all_headers_on_main_app_health(self, main_client):
        """Test all security headers are present on main app health endpoint"""
        response = main_client.get('/api/v1/health')

        expected_headers = [
            'Content-Security-Policy',
            'Strict-Transport-Security',
            'X-Content-Type-Options',
            'X-Frame-Options',
            'Referrer-Policy',
            'X-XSS-Protection',
            'Permissions-Policy'
        ]

        for header_name in expected_headers:
            header_value = response.headers.get(header_name)
            assert header_value is not None, \
                f"{header_name} should be present in response headers"

    def test_all_headers_on_api_service(self, api_client):
        """Test all security headers are present on API service"""
        response = api_client.get('/api/v1/health?lang=en')

        expected_headers = [
            'Content-Security-Policy',
            'Strict-Transport-Security',
            'X-Content-Type-Options',
            'X-Frame-Options',
            'Referrer-Policy',
            'X-XSS-Protection',
            'Permissions-Policy'
        ]

        for header_name in expected_headers:
            header_value = response.headers.get(header_name)
            assert header_value is not None, \
                f"{header_name} should be present in response headers"

    def test_all_headers_on_api_service_home(self, api_client):
        """Test all security headers are present on API service home endpoint"""
        response = api_client.get('/?lang=ar')

        expected_headers = [
            'Content-Security-Policy',
            'Strict-Transport-Security',
            'X-Content-Type-Options',
            'X-Frame-Options',
            'Referrer-Policy',
            'X-XSS-Protection',
            'Permissions-Policy'
        ]

        for header_name in expected_headers:
            header_value = response.headers.get(header_name)
            assert header_value is not None, \
                f"{header_name} should be present in response headers"


class TestSecurityHeadersOnApiEndpoints:
    """Tests to verify security headers are present on API endpoints"""

    def test_headers_on_health_endpoint_both_apps(self, main_client, api_client):
        """Test security headers are present on health endpoints of both apps"""
        main_response = main_client.get('/api/v1/health')
        api_response = api_client.get('/api/v1/health?lang=en')

        for header_name in ['Content-Security-Policy', 'X-Frame-Options']:
            main_header = main_response.headers.get(header_name)
            api_header = api_response.headers.get(header_name)

            assert main_header is not None, \
                f"{header_name} should be present on main app"
            assert api_header is not None, \
                f"{header_name} should be present on API service"

    def test_headers_persist_across_endpoints(self, main_client):
        """Test security headers are consistently present across different endpoints"""
        endpoints = ['/', '/api/v1/health']

        for endpoint in endpoints:
            response = main_client.get(endpoint)
            csp = response.headers.get('Content-Security-Policy')

            assert csp is not None, \
                f"Content-Security-Policy should be present on {endpoint}"
