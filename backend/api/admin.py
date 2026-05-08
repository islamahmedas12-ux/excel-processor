import traceback
import mimetypes
from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timezone, timedelta
from ..services.auth_service import require_role
from ..services.user_store import (
    list_users, set_user_plan, set_user_active, delete_user, get_stats
)
from ..services.plans import PLANS
from ..services.plan_store import (
    list_plans, create_plan,
    update_plan as store_update_plan,
    delete_plan as store_delete_plan,
)
from ..services.email_service import send_plan_activated_email

admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')


@admin_bp.route('/stats', methods=['GET'])
@require_role('admin')
def stats():
    return jsonify({"success": True, "data": get_stats()})


@admin_bp.route('/users', methods=['GET'])
@require_role('admin')
def users():
    return jsonify({"success": True, "users": list_users()})


@admin_bp.route('/users/<path:email>/plan', methods=['PATCH'])
@require_role('admin')
def update_plan(email: str):
    data    = request.get_json(silent=True) or {}
    plan    = data.get('plan', '').lower()
    months  = int(data.get('months', 1))

    if plan not in PLANS:
        return jsonify({"error": f"Invalid plan. Choose from: {', '.join(PLANS)}"}), 400

    expires_at = None
    if plan != 'free':
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30 * months)).isoformat()

    ok = set_user_plan(email, plan, expires_at)
    if not ok:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"success": True, "plan": plan, "expires_at": expires_at})


@admin_bp.route('/users/<path:email>/status', methods=['PATCH'])
@require_role('admin')
def update_status(email: str):
    data   = request.get_json(silent=True) or {}
    active = data.get('active')
    if active is None:
        return jsonify({"error": "'active' field required"}), 400

    ok = set_user_active(email, bool(active))
    if not ok:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"success": True, "active": bool(active)})


@admin_bp.route('/users/<path:email>', methods=['DELETE'])
@require_role('admin')
def remove_user(email: str):
    ok = delete_user(email)
    if not ok:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"success": True})


@admin_bp.route('/plans', methods=['GET'])
@require_role('admin')
def plans_list():
    return jsonify({"success": True, "plans": list_plans()})


@admin_bp.route('/plans', methods=['POST'])
@require_role('admin')
def plans_create():
    data    = request.get_json(silent=True) or {}
    plan_id = data.pop('id', '').strip().lower().replace(' ', '_')
    if not plan_id:
        return jsonify({"error": "Plan id is required"}), 400
    ok = create_plan(plan_id, data)
    if not ok:
        return jsonify({"error": f"Plan '{plan_id}' already exists"}), 409
    return jsonify({"success": True, "id": plan_id}), 201


@admin_bp.route('/plans/<plan_id>', methods=['PATCH'])
@require_role('admin')
def plans_update(plan_id: str):
    data = request.get_json(silent=True) or {}
    ok   = store_update_plan(plan_id, data)
    if not ok:
        return jsonify({"error": "Plan not found"}), 404
    return jsonify({"success": True, "plan": list_plans().get(plan_id)})


@admin_bp.route('/plans/<plan_id>', methods=['DELETE'])
@require_role('admin')
def plans_delete(plan_id: str):
    ok = store_delete_plan(plan_id)
    if not ok:
        return jsonify({"error": "Plan not found or protected"}), 404
    return jsonify({"success": True})


# ── Subscription management ───────────────────────────────────────────────────

@admin_bp.route('/subscriptions', methods=['GET'])
@require_role('admin')
def subscriptions():
    from ..services.subscription_store import list_requests
    status = request.args.get('status')
    return jsonify({"success": True, "requests": list_requests(status)})


@admin_bp.route('/subscriptions/<sub_id>/proof', methods=['GET'])
def proof_image(sub_id: str):
    """Serve proof image — accepts token via Authorization header or ?token= query param."""
    from io import BytesIO
    from ..services.auth_service import verify_token
    from ..services.subscription_store import get_proof_bytes

    token = request.args.get('token') or (request.headers.get('Authorization', '')[7:] or None)
    if not token:
        return jsonify({"error": "Authentication required"}), 401
    payload = verify_token(token)
    if not payload or payload.get('role') != 'admin':
        return jsonify({"error": "Forbidden"}), 403

    result = get_proof_bytes(sub_id)
    if not result:
        return jsonify({"error": "Not found"}), 404
    data, mime = result
    return send_file(BytesIO(data), mimetype=mime)


@admin_bp.route('/subscriptions/<sub_id>/approve', methods=['POST'])
@require_role('admin')
def approve_subscription(sub_id: str):
    from ..services.subscription_store import get_request, update_status
    sub = get_request(sub_id)
    if not sub:
        return jsonify({"error": "Request not found"}), 404

    months     = int(sub.get('months', 1))
    plan       = sub['plan']
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30 * months)).isoformat()

    set_user_plan(sub['email'], plan, expires_at)
    update_status(sub_id, 'approved')

    # Email user
    try:
        send_plan_activated_email(sub['email'], sub['username'], plan, expires_at)
    except Exception:
        traceback.print_exc()

    return jsonify({"success": True, "plan": plan, "expires_at": expires_at})


@admin_bp.route('/subscriptions/<sub_id>/reject', methods=['POST'])
@require_role('admin')
def reject_subscription(sub_id: str):
    from ..services.subscription_store import get_request, update_status
    data  = request.get_json(silent=True) or {}
    notes = data.get('notes', '')
    sub   = get_request(sub_id)
    if not sub:
        return jsonify({"error": "Request not found"}), 404
    update_status(sub_id, 'rejected', notes)
    return jsonify({"success": True})
