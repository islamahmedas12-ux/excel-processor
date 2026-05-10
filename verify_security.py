#!/usr/bin/env python
"""
Verify that security headers are properly initialized in main.py
"""
import sys
import types

# Create mock modules for dependencies that aren't installed
mock_modules = [
    'rpds', 'Pillow', 'PIL', 'qrcode', 'qrcode.image', 'qrcode.image.pure',
    'resend', 'resend.emails', 'botocore', 'botocore.config', 'botocore.exceptions',
    's3transfer', 's3transfer.exceptions', 'jmespath', 'dateutil', 'dateutil.parser'
]

for mod_name in mock_modules:
    mock_mod = types.ModuleType(mod_name)
    sys.modules[mod_name] = mock_mod

try:
    from main import app

    # Verify that security headers are applied by checking an after_request handler exists
    has_security_handler = False
    for handler in app.after_request_funcs.get(None, []):
        if handler.__name__ == 'apply_security_headers':
            has_security_handler = True
            break

    if has_security_handler:
        print('OK')
    else:
        print('ERROR: Security headers not properly initialized')
        sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)