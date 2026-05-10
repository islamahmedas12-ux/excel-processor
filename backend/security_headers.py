"""
Security Headers Module
=======================
Provides security HTTP headers for Flask applications.
Implements defense-in-depth security measures including:
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- X-XSS-Protection
"""

from flask import Flask, Response


def add_security_headers(response: Response) -> Response:
    """
    Add security headers to a Flask response.

    This function applies multiple security headers to protect against
    common web vulnerabilities like XSS, MIME sniffing, and clickjacking.

    Args:
        response: The Flask response object to add headers to.

    Returns:
        The response object with security headers added.

    Security headers applied:
        - Content-Security-Policy: Restricts resource loading and prevents inline scripts
        - Strict-Transport-Security: Enforces HTTPS connections for browsers
        - X-Content-Type-Options: Prevents MIME type sniffing
        - X-Frame-Options: Prevents clickjacking attacks
        - Referrer-Policy: Controls referrer information sent with requests
        - X-XSS-Protection: Legacy XSS filter (for older browsers)
    """
    # Content-Security-Policy
    # Restricts content sources and prevents inline scripts/styles
    csp_directives = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ]
    response.headers['Content-Security-Policy'] = '; '.join(csp_directives)

    # Strict-Transport-Security (HSTS)
    # Enforces HTTPS for 1 year (31536000 seconds) including subdomains
    response.headers['Strict-Transport-Security'] = (
        'max-age=31536000; includeSubDomains; preload'
    )

    # X-Content-Type-Options
    # Prevents browsers from MIME-sniffing a response away from the declared content-type
    response.headers['X-Content-Type-Options'] = 'nosniff'

    # X-Frame-Options
    # Protects against clickjacking by preventing the page from being rendered in frames
    response.headers['X-Frame-Options'] = 'DENY'

    # Referrer-Policy
    # Controls how much referrer information is included with requests
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    # X-XSS-Protection
    # Legacy XSS filter for older browsers (modern browsers use CSP primarily)
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # Permissions-Policy
    # Controls which browser features can be used
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'

    return response


def init_app(app: Flask) -> None:
    """
    Initialize security headers for a Flask application.

    Registers an after_request handler to automatically add security
    headers to all responses.

    Args:
        app: The Flask application to configure.
    """
    @app.after_request
    def apply_security_headers(response: Response) -> Response:
        return add_security_headers(response)