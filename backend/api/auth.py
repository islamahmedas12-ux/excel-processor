import traceback
from flask import Blueprint, request, jsonify, send_file
from ..services.auth_service import (
    verify_credentials, create_token, verify_token, _extract_token
)
from ..services.user_store import (
    register_user, confirm_email, create_reset_token, reset_password, email_exists,
    get_profile, update_profile, save_avatar, change_password, find_email_by_username,
)
from ..services.email_service import (
    send_welcome_email, send_verification_email, send_reset_email
)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')


def _do_login(allowed_roles: set[str]):
    """Shared login flow that only issues a token when the user's role is allowed."""
    data     = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    result = verify_credentials(email, password)

    if result is None:
        return jsonify({"error": "Invalid username or password"}), 401

    if 'error' in result:
        if result['error'] == 'account_disabled':
            return jsonify({"error": "account_disabled", "message": "Your account has been disabled"}), 403
        return jsonify({
            "error":   "email_not_verified",
            "message": "Please verify your email before logging in",
            "email":   result.get('email', ''),
        }), 403

    if result['role'] not in allowed_roles:
        return jsonify({
            "error":   "wrong_portal",
            "message": "This account is not allowed in this portal",
        }), 403

    token = create_token(result['email'], result['username'], result['role'])
    return jsonify({
        "success": True,
        "token":   token,
        "user":    {"username": result['username'], "role": result['role']},
    })


@auth_bp.route('/login', methods=['POST'])
def login():
    """User-portal login. Admins are rejected here and must use /admin/login."""
    return _do_login({'user'})


@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin-portal login. Only admin accounts are accepted."""
    return _do_login({'admin'})


@auth_bp.route('/register', methods=['POST'])
def register():
    data     = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password are required"}), 400
    if '@' not in email:
        return jsonify({"error": "Invalid email address"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    from ..services.user_store import get_verification_token
    ok = register_user(username, email, password, role='user')
    if not ok:
        return jsonify({"error": "Email already registered"}), 409

    token = get_verification_token(email)
    try:
        send_welcome_email(email, username)
        send_verification_email(email, username, token)
    except Exception:
        traceback.print_exc()  # visible in server logs, never blocks registration

    return jsonify({
        "success": True,
        "message": "Account created. Please check your email to verify your account.",
    }), 201


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    data  = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()

    if not token:
        return jsonify({"error": "Token is required"}), 400

    ok = confirm_email(token)
    if not ok:
        return jsonify({"error": "Invalid or expired verification link"}), 400

    return jsonify({"success": True, "message": "Email verified successfully"})


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    result = create_reset_token(email)
    if result:
        username, token = result
        try:
            send_reset_email(email, username, token)
        except Exception:
            traceback.print_exc()

    # Always return success to avoid email enumeration
    return jsonify({
        "success": True,
        "message": "If that email exists, a reset link has been sent.",
    })


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password_route():
    data     = request.get_json(silent=True) or {}
    token    = data.get('token', '').strip()
    password = data.get('password', '')

    if not token or not password:
        return jsonify({"error": "Token and new password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    ok = reset_password(token, password)
    if not ok:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    return jsonify({"success": True, "message": "Password reset successfully"})


@auth_bp.route('/me', methods=['GET'])
def me():
    token   = _extract_token()
    payload = verify_token(token) if token else None
    if not payload:
        return jsonify({"error": "Invalid or expired token"}), 401
    return jsonify({
        "success": True,
        "user": {"username": payload.get('username', payload['sub']), "role": payload.get('role', 'user')},
    })


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({"success": True})


# ── Profile ───────────────────────────────────────────────────────────────────

def _resolve_email() -> str | None:
    """Extract JWT, return the email key from users store, or None on auth failure."""
    token   = _extract_token()
    payload = verify_token(token) if token else None
    if not payload:
        return None
    # sub now always stores the email (immutable identifier)
    sub = payload.get('sub', '')
    # Fallback for old tokens that stored username in sub
    email = sub if '@' in sub else (find_email_by_username(sub) or sub.lower())
    return email


@auth_bp.route('/profile', methods=['GET'])
def get_profile_route():
    email = _resolve_email()
    if not email:
        return jsonify({"error": "Unauthorized"}), 401
    profile = get_profile(email)
    if not profile:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"success": True, "profile": profile})


@auth_bp.route('/profile', methods=['PATCH'])
def update_profile_route():
    email = _resolve_email()
    if not email:
        return jsonify({"error": "Unauthorized"}), 401
    data     = request.get_json(silent=True) or {}
    username = data.get('username')
    bio      = data.get('bio')
    if username is not None and len(username.strip()) < 2:
        return jsonify({"error": "Username must be at least 2 characters"}), 400
    update_profile(email, username, bio)
    profile = get_profile(email)
    return jsonify({"success": True, "profile": profile})


@auth_bp.route('/profile/avatar', methods=['POST'])
def upload_avatar():
    email = _resolve_email()
    if not email:
        return jsonify({"error": "Unauthorized"}), 401
    if 'avatar' not in request.files:
        return jsonify({"error": "No avatar file provided"}), 400
    file = request.files['avatar']
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    image_bytes = file.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        return jsonify({"error": "Avatar must be under 5 MB"}), 400
    # Validate actual file content using magic bytes (prevents polyglot attacks)
    from ..utils.file_validation import validate_image_mime_type
    if not validate_image_mime_type(image_bytes):
        return jsonify({"error": "Invalid image file type"}), 400
    # Convert to PNG via Pillow (handles jpg/webp/etc)
    try:
        from io import BytesIO
        from PIL import Image
        img = Image.open(BytesIO(image_bytes)).convert('RGBA')
        # Crop to square from center
        w, h  = img.size
        side  = min(w, h)
        left  = (w - side) // 2
        top   = (h - side) // 2
        img   = img.crop((left, top, left + side, top + side))
        img   = img.resize((256, 256), Image.LANCZOS)
        buf   = BytesIO()
        img.save(buf, format='PNG')
        png_bytes = buf.getvalue()
    except Exception as e:
        return jsonify({"error": f"Invalid image: {e}"}), 400
    url = save_avatar(email, png_bytes)
    return jsonify({"success": True, "avatar_url": url})


@auth_bp.route('/profile/avatar/<filename>', methods=['GET'])
def serve_avatar(filename: str):
    from io import BytesIO
    from ..services.user_store import get_avatar_bytes
    if not filename.endswith('.png'):
        return jsonify({"error": "Not found"}), 404
    data = get_avatar_bytes(filename)
    if not data:
        return jsonify({"error": "Not found"}), 404
    return send_file(BytesIO(data), mimetype='image/png')


@auth_bp.route('/change-password', methods=['POST'])
def change_password_route():
    email = _resolve_email()
    if not email:
        return jsonify({"error": "Unauthorized"}), 401
    data         = request.get_json(silent=True) or {}
    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')
    if not old_password or not new_password:
        return jsonify({"error": "Both old and new password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    ok = change_password(email, old_password, new_password)
    if not ok:
        return jsonify({"error": "Current password is incorrect"}), 400
    return jsonify({"success": True, "message": "Password changed successfully"})
