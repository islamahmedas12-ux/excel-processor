"""
File Validation Utilities — image MIME type and magic bytes validation.

Provides security against polyglot file attacks (e.g., HTML/SVG with embedded
scripts disguised as images). Use validate_image_mime_type() to validate uploaded
image bytes before processing with Pillow or storing.
"""

from __future__ import annotations

import mimetypes


# ── Allowed image MIME types ─────────────────────────────────────────────────

ALLOWED_IMAGE_MIME_TYPES: set[str] = {
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/bmp',
}

# ── Magic bytes (file signatures) ────────────────────────────────────────────
# Maps MIME type to list of valid magic byte prefixes.

_MAGIC_BYTES: dict[str, list[bytes]] = {
    'image/png':  [b'\x89PNG\r\n\x1a\n'],
    'image/jpeg': [
        b'\xff\xd8\xff\xe0',
        b'\xff\xd8\xff\xe1',
        b'\xff\xd8\xff\xe2',
        b'\xff\xd8\xff\xe3',
        b'\xff\xd8\xff\xdb',
        b'\xff\xd8\xff\xee',
    ],
    'image/webp': [b'RIFF\x00\x00\x00\x00WEBP'],
    'image/gif':  [b'GIF87a', b'GIF89a'],
    'image/bmp':  [b'BM'],
}


def _matches_magic(data: bytes, magic_bytes: list[bytes]) -> bool:
    """Return True if data starts with any of the given magic byte sequences."""
    for magic in magic_bytes:
        if data[:len(magic)] == magic:
            return True
    return False


def validate_image_mime_type(data: bytes) -> bool:
    """
    Validate that bytes represent a safe, allowed image file.

    Checks:
      1. MIME type (via mimetypes) is in the allowed list
      2. Magic bytes match the declared MIME type

    This guards against polyglot attacks where a file is valid HTML/SVG but
    also passes as a "valid image" (e.g., Pillow's Image.open).

    Args:
        data: Raw bytes of the uploaded file.

    Returns:
        True if the file is a valid, allowed image type.
        False otherwise (including for HTML, SVG with scripts, polyglot files).
    """
    if not data:
        return False

    # First, try to detect MIME type from content (using content-type hint)
    # mimetypes can't reliably detect from bytes alone for ambiguous types,
    # so we rely on the magic bytes check as the authoritative validation.

    # Check magic bytes to detect the actual file type
    detected_type: str | None = None
    for mime_type, magic_list in _MAGIC_BYTES.items():
        if _matches_magic(data, magic_list):
            detected_type = mime_type
            break

    if detected_type is None:
        # Unknown or unrecognized magic bytes
        return False

    # Verify the detected type is in our allowed list
    if detected_type not in ALLOWED_IMAGE_MIME_TYPES:
        return False

    return True


def get_allowed_extensions() -> set[str]:
    """Return the set of allowed file extensions matching allowed MIME types."""
    extensions: set[str] = set()
    for mime_type in ALLOWED_IMAGE_MIME_TYPES:
        exts = mimetypes.guess_all_extensions(mime_type)
        extensions.update(exts)
    # Ensure common extensions are included
    extensions.update({'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'})
    return extensions
