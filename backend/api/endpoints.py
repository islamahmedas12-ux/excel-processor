"""
API Routes
==========
Excel as a Backend Service — files stored in memory repository
"""

import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
import os

from ..services.excel_service import ExcelService
from ..services.file_store import file_store
from ..services.category_store import category_store
from ..services.result_store import result_store
from ..services.auth_service import require_auth, verify_token, _extract_token
from ..services.plans import PLANS
from ..services import job_store
from ..services import token_store as _token_store

_executor = ThreadPoolExecutor(max_workers=8)

# Simple in-memory rate limiter for the public /verify endpoint
_rl_store: dict[str, list[float]] = defaultdict(list)
_rl_lock  = threading.Lock()

def _rate_limit(ip: str, max_req: int = 20, window_sec: int = 60) -> bool:
    now = time.time()
    with _rl_lock:
        ts = _rl_store[ip]
        ts[:] = [t for t in ts if now - t < window_sec]
        if len(ts) >= max_req:
            return False
        ts.append(now)
    return True

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

excel_service = ExcelService()


def _current_email() -> str:
    """Extract owner email from the JWT (falls back to empty string for admin)."""
    payload = verify_token(_extract_token() or '')
    return (payload.get('sub', '') if payload else '').lower()


def _get_user_plan(email: str) -> dict:
    """Return the plan dict for the given user — single targeted query."""
    from sqlalchemy import select
    from ..db import session_scope
    from ..models import User
    from ..services.plan_store import list_plans
    plans = list_plans()  # one DB hit, returns all plan dicts
    if not email:
        return plans.get('free', {})
    with session_scope() as s:
        plan_name = s.execute(
            select(User.plan).where(User.email == email.lower())
        ).scalar() or 'free'
    return plans.get(plan_name, plans.get('free', {}))


def _check_upload_limits(email: str, file_size: int):
    """
    Returns (ok, error_message).
    Admin (empty email) is always allowed.
    """
    if not email:
        return True, None

    plan  = _get_user_plan(email)
    usage = file_store.usage(email)

    max_files   = plan['max_files']
    max_file_mb = plan['max_file_mb']
    max_bytes   = plan['storage_gb'] * 1024 ** 3 if plan['storage_gb'] else plan['max_files'] * plan['max_file_mb'] * 1024 ** 2

    if usage['file_count'] >= max_files:
        return False, f"plan_limit:files:{max_files}"

    if file_size > max_file_mb * 1024 * 1024:
        return False, f"plan_limit:file_size:{max_file_mb}"

    if usage['total_bytes'] + file_size > max_bytes:
        return False, f"plan_limit:storage:{plan['storage_gb']}GB"

    return True, None


def _resolve_file():
    """Resolve file bytes + filename from file_id, result_id, or direct upload."""
    file_id = request.form.get('file_id')
    if file_id:
        content = file_store.get_content(file_id)
        meta = file_store.get_meta(file_id)
        if content is None:
            return None, None, ('File not found in repository', 404)
        return content, meta['name'], None

    result_id = request.form.get('result_id')
    if result_id:
        content = result_store.get_content(result_id)
        meta = result_store.get_meta(result_id)
        if content is None:
            return None, None, ('Result not found', 404)
        return content, meta['filename'], None

    if 'file' in request.files:
        f = request.files['file']
        return f.read(), f.filename, None

    return None, None, ('No file provided. Use file_id, result_id, or upload a file.', 400)


# ---------------------------------------------------------------------------
# File Repository
# ---------------------------------------------------------------------------

@api_bp.route('/files', methods=['POST'])
@require_auth
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400

    content     = f.read()
    email       = _current_email()
    ok, err_key = _check_upload_limits(email, len(content))

    if not ok:
        # err_key format: "plan_limit:reason:value"
        parts = err_key.split(':')
        reason = parts[1] if len(parts) > 1 else 'unknown'
        value  = parts[2] if len(parts) > 2 else ''
        return jsonify({
            "error":  "plan_limit",
            "reason": reason,
            "limit":  value,
            "message": {
                "files":     f"لقد وصلت للحد الأقصى من الملفات ({value} ملف). يرجى ترقية خطتك.",
                "file_size": f"حجم الملف يتجاوز الحد المسموح ({value} MB). يرجى ترقية خطتك.",
                "storage":   f"مساحة التخزين ممتلئة ({value}). يرجى ترقية خطتك.",
            }.get(reason, "تجاوزت حدود خطتك الحالية."),
        }), 403

    category_id = request.form.get('category_id') or None
    meta = file_store.upload(f.filename, content, owner_email=email, category_id=category_id)
    return jsonify({"success": True, "file": meta}), 201


@api_bp.route('/files', methods=['GET'])
@require_auth
def list_files():
    email = _current_email()
    return jsonify({"success": True, "files": file_store.list_all(owner_email=email)})


@api_bp.route('/files/<file_id>', methods=['PATCH'])
@require_auth
def update_file(file_id):
    data        = request.get_json(silent=True) or {}
    category_id = data.get('category_id')
    email       = _current_email()
    if not file_store.set_category(file_id, category_id, owner_email=email):
        return jsonify({"error": "File not found"}), 404
    return jsonify({"success": True})


@api_bp.route('/files/<file_id>', methods=['DELETE'])
@require_auth
def delete_file(file_id):
    email = _current_email()
    if file_store.delete(file_id, owner_email=email):
        return jsonify({"success": True})
    return jsonify({"error": "File not found"}), 404


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@api_bp.route('/categories', methods=['GET'])
@require_auth
def list_categories():
    return jsonify({"success": True, "categories": category_store.list_all()})


@api_bp.route('/categories', methods=['POST'])
@require_auth
def create_category():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    color = data.get('color', '#6366f1')
    cat = category_store.create(name, color)
    return jsonify({"success": True, "category": cat}), 201


@api_bp.route('/categories/<cat_id>', methods=['PUT'])
@require_auth
def update_category(cat_id):
    data = request.get_json(silent=True) or {}
    cat = category_store.update(cat_id, data.get('name'), data.get('color'))
    if not cat:
        return jsonify({"error": "Category not found"}), 404
    return jsonify({"success": True, "category": cat})


@api_bp.route('/categories/<cat_id>', methods=['DELETE'])
@require_auth
def delete_category(cat_id):
    if not category_store.delete(cat_id):
        return jsonify({"error": "Category not found"}), 404
    # clear dangling references in files
    for f in file_store.list_all():
        if f.get('category_id') == cat_id:
            file_store.set_category(f['id'], None)
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

@api_bp.route('/results', methods=['GET'])
@require_auth
def list_results():
    kind = request.args.get('kind')
    return jsonify({"success": True, "results": result_store.list_all(kind or None)})


@api_bp.route('/results/<result_id>', methods=['DELETE'])
@require_auth
def delete_result(result_id):
    if result_store.delete(result_id):
        return jsonify({"success": True})
    return jsonify({"error": "Result not found"}), 404


@api_bp.route('/results/<result_id>/download', methods=['GET'])
@require_auth
def download_result(result_id):
    content = result_store.get_content(result_id)
    meta = result_store.get_meta(result_id)
    if not content or not meta:
        return jsonify({"error": "Result not found"}), 404
    mime = 'application/pdf' if meta['kind'] == 'pdf' else \
           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    return send_file(BytesIO(content), mimetype=mime, as_attachment=True,
                     download_name=meta['filename'])


@api_bp.route('/results/<result_id>/export-pdf', methods=['POST'])
@require_auth
def export_result_to_pdf(result_id):
    """Convert a saved xlsx result to PDF and save it."""
    content = result_store.get_content(result_id)
    meta = result_store.get_meta(result_id)
    if not content or not meta:
        return jsonify({"error": "Result not found"}), 404
    if meta['kind'] != 'xlsx':
        return jsonify({"error": "Only xlsx results can be converted to PDF"}), 400

    sheets_raw = request.form.get('sheets')
    sheets = None
    if sheets_raw and sheets_raw != 'all':
        sheets = [s.strip() for s in sheets_raw.split(',') if s.strip()]

    try:
        from ..services.pdf_export_service import get_pdf_export_service
        service = get_pdf_export_service()
        pdf_bytes = service.convert_excel_to_pdf(content, meta['filename'], sheets=sheets)
        pdf_filename = os.path.splitext(meta['filename'])[0] + '.pdf'
        saved = result_store.save(kind='pdf', source_file_id=meta['source_file_id'],
                                  source_file_name=meta['source_file_name'],
                                  filename=pdf_filename, content=pdf_bytes)
        return jsonify({"success": True, "result": saved})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Excel Operations
# ---------------------------------------------------------------------------

@api_bp.route('/execute', methods=['POST'])
@require_auth
def execute():
    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    inputs_str = request.form.get('inputs')
    outputs_str = request.form.get('outputs')
    sheet_name = request.form.get('sheet_name')

    if not inputs_str or not outputs_str:
        return jsonify({"error": "inputs and outputs are required"}), 400

    try:
        import json
        inputs = json.loads(inputs_str)
        outputs = [o.strip() for o in outputs_str.split(',')]
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON in inputs"}), 400

    try:
        result = excel_service.execute(file_content=file_content, filename=filename,
                                       inputs=inputs, outputs=outputs, sheet_name=sheet_name)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/read', methods=['POST'])
@require_auth
def read_cells():
    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    cells_str = request.form.get('cells')
    sheet_name = request.form.get('sheet_name')
    if not cells_str:
        return jsonify({"error": "cells parameter is required"}), 400

    cells = [c.strip() for c in cells_str.split(',')]
    try:
        result = excel_service.read_cells(file_content=file_content, filename=filename,
                                          cells=cells, sheet_name=sheet_name)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/write', methods=['POST'])
@require_auth
def write_cells():
    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    updates_str = request.form.get('updates')
    sheet_name = request.form.get('sheet_name')
    if not updates_str:
        return jsonify({"error": "updates parameter is required"}), 400

    try:
        import json
        updates = json.loads(updates_str)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON in updates"}), 400

    # ── Async mode ──────────────────────────────────────────────────────────
    if request.args.get('async') == 'true' or request.form.get('async') == 'true':
        email = _current_email()
        plan  = _get_user_plan(email)
        max_jobs = plan.get('max_concurrent_jobs', 1)
        active   = job_store.count_active(email)
        if active >= max_jobs:
            return jsonify({
                "error": "job_limit",
                "message": f"لديك {active} مهمة قيد التشغيل (الحد الأقصى للخطة {max_jobs}). انتظر اكتمالها أو قم بالترقية.",
                "message_en": f"You have {active} active job(s). Your plan allows {max_jobs}. Wait or upgrade.",
            }), 429

        job = job_store.create(
            owner_email=email,
            job_type='write',
            params={'filename': filename, 'updates': updates, 'sheet_name': sheet_name},
        )
        _executor.submit(_do_write_job, job['id'], file_content, filename, updates, sheet_name)
        return jsonify({"success": True, "job": job}), 202

    # ── Sync mode (original) ────────────────────────────────────────────────
    try:
        result = excel_service.write_cells(file_content=file_content, filename=filename,
                                           updates=updates, sheet_name=sheet_name)
        modified_bytes = result.pop('_modified_bytes', None)

        # Save result to store (always — templates must not be mutated)
        result_meta = None
        source_id = request.form.get('file_id') or request.form.get('result_id') or ''
        if modified_bytes:
            result_filename = os.path.splitext(filename)[0] + '_modified.xlsx'
            result_meta = result_store.save(kind='xlsx', source_file_id=source_id,
                                            source_file_name=filename,
                                            filename=result_filename, content=modified_bytes)

        result['result'] = result_meta
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/write/batch', methods=['POST'])
@require_auth
def batch_write_cells():
    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    operations_str = request.form.get('operations')
    sheet_name = request.form.get('sheet_name')
    if not operations_str:
        return jsonify({"error": "operations parameter is required"}), 400

    try:
        import json
        operations = json.loads(operations_str)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON in operations"}), 400

    # ── Async mode ──────────────────────────────────────────────────────────
    if request.args.get('async') == 'true' or request.form.get('async') == 'true':
        email = _current_email()
        plan  = _get_user_plan(email)
        max_jobs = plan.get('max_concurrent_jobs', 1)
        active   = job_store.count_active(email)
        if active >= max_jobs:
            return jsonify({
                "error": "job_limit",
                "message": f"لديك {active} مهمة قيد التشغيل (الحد الأقصى للخطة {max_jobs}). انتظر اكتمالها أو قم بالترقية.",
                "message_en": f"You have {active} active job(s). Your plan allows {max_jobs}. Wait or upgrade.",
            }), 429

        job = job_store.create(
            owner_email=email,
            job_type='batch_write',
            params={'filename': filename, 'operations': operations, 'sheet_name': sheet_name},
        )
        _executor.submit(_do_batch_write_job, job['id'], file_content, filename, operations, sheet_name)
        return jsonify({"success": True, "job": job}), 202

    # ── Sync mode (original) ────────────────────────────────────────────────
    try:
        result = excel_service.batch_write(file_content=file_content, filename=filename,
                                           operations=operations, sheet_name=sheet_name)
        modified_bytes = result.pop('_modified_bytes', None)

        # Save result to store (always — templates must not be mutated)
        result_meta = None
        source_id = request.form.get('file_id') or request.form.get('result_id') or ''
        if modified_bytes:
            result_filename = os.path.splitext(filename)[0] + '_modified.xlsx'
            result_meta = result_store.save(kind='xlsx', source_file_id=source_id,
                                            source_file_name=filename,
                                            filename=result_filename, content=modified_bytes)

        result['result'] = result_meta
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/sheets', methods=['POST'])
@require_auth
def get_sheets():
    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    try:
        from excel_processor.file_reader import ExcelReader
        with ExcelReader(BytesIO(file_content)) as reader:
            sheets = reader.get_sheet_names()
        return jsonify({"success": True, "data": {"sheets": sheets, "count": len(sheets)}})
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


def _do_pdf_job(job_id: str, file_content: bytes, filename: str, sheets):
    """Background worker: convert Excel → PDF, save result, update job status."""
    from ..services.pdf_export_service import get_pdf_export_service
    job_store.update_status(job_id, 'running')
    try:
        service = get_pdf_export_service()
        pdf_bytes = service.convert_excel_to_pdf(file_content, filename, sheets=sheets)
        job_store.save_result(job_id, pdf_bytes, '.pdf', content_type='application/pdf')
        job_store.update_status(job_id, 'done', result_ext='.pdf')
    except Exception as exc:
        job_store.update_status(job_id, 'failed', error=str(exc))


def _do_write_job(job_id: str, file_content: bytes, filename: str, updates, sheet_name):
    """Background worker: write cell updates to Excel, save result, update job status."""
    job_store.update_status(job_id, 'running')
    try:
        result = excel_service.write_cells(
            file_content=file_content,
            filename=filename,
            updates=updates,
            sheet_name=sheet_name,
        )
        modified_bytes = result.pop('_modified_bytes', None)
        if modified_bytes:
            result_filename = os.path.splitext(filename)[0] + '_modified.xlsx'
            job_store.save_result(
                job_id,
                modified_bytes,
                '.xlsx',
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            job_store.update_status(job_id, 'done', result_ext='.xlsx')
        else:
            # No modified bytes means write operation had no effect
            job_store.update_status(job_id, 'done')
    except Exception as exc:
        job_store.update_status(job_id, 'failed', error=str(exc))


def _do_batch_write_job(job_id: str, file_content: bytes, filename: str,
                        operations, sheet_name):
    """Background worker: apply batch write operations to Excel, save result, update job status."""
    job_store.update_status(job_id, 'running')
    try:
        result = excel_service.batch_write(
            file_content=file_content,
            filename=filename,
            operations=operations,
            sheet_name=sheet_name,
        )
        modified_bytes = result.pop('_modified_bytes', None)
        if modified_bytes:
            result_filename = os.path.splitext(filename)[0] + '_modified.xlsx'
            job_store.save_result(
                job_id,
                modified_bytes,
                '.xlsx',
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            job_store.update_status(job_id, 'done', result_ext='.xlsx')
        else:
            job_store.update_status(job_id, 'done')
    except Exception as exc:
        job_store.update_status(job_id, 'failed', error=str(exc))


@api_bp.route('/export/pdf', methods=['POST'])
@require_auth
def export_pdf():
    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    sheets_raw = request.form.get('sheets')
    sheets = None
    if sheets_raw and sheets_raw != 'all':
        sheets = [s.strip() for s in sheets_raw.split(',') if s.strip()]

    # ── Async mode ──────────────────────────────────────────────────────────
    if request.args.get('async') == 'true' or request.form.get('async') == 'true':
        email = _current_email()
        plan  = _get_user_plan(email)
        max_jobs = plan.get('max_concurrent_jobs', 1)
        active   = job_store.count_active(email)
        if active >= max_jobs:
            return jsonify({
                "error": "job_limit",
                "message": f"لديك {active} مهمة قيد التشغيل (الحد الأقصى للخطة {max_jobs}). انتظر اكتمالها أو قم بالترقية.",
                "message_en": f"You have {active} active job(s). Your plan allows {max_jobs}. Wait or upgrade.",
            }), 429

        job = job_store.create(
            owner_email=email,
            job_type='pdf_export',
            params={'filename': filename, 'sheets': sheets},
        )
        _executor.submit(_do_pdf_job, job['id'], file_content, filename, sheets)
        return jsonify({"success": True, "job": job}), 202

    # ── Sync mode (original) ────────────────────────────────────────────────
    save_result = request.form.get('save_result') == 'true'
    try:
        from ..services.pdf_export_service import get_pdf_export_service
        service = get_pdf_export_service()
        pdf_bytes = service.convert_excel_to_pdf(file_content, filename, sheets=sheets)
        pdf_filename = os.path.splitext(filename)[0] + '.pdf'

        if save_result:
            source_id = request.form.get('file_id') or request.form.get('result_id') or ''
            saved = result_store.save(kind='pdf', source_file_id=source_id,
                                      source_file_name=filename,
                                      filename=pdf_filename, content=pdf_bytes)
            return jsonify({"success": True, "result": saved})

        return send_file(BytesIO(pdf_bytes), mimetype='application/pdf',
                         as_attachment=True, download_name=pdf_filename)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


# ---------------------------------------------------------------------------
# Async Jobs
# ---------------------------------------------------------------------------

@api_bp.route('/jobs', methods=['GET'])
@require_auth
def list_jobs():
    email = _current_email()
    jobs  = job_store.list_by_owner(email)
    job_store.cleanup_expired()
    return jsonify({"success": True, "jobs": jobs})


@api_bp.route('/jobs/<job_id>', methods=['GET'])
@require_auth
def get_job(job_id):
    email = _current_email()
    job   = job_store.get(job_id)
    if not job or job['owner_email'] != email:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({"success": True, "job": job})


@api_bp.route('/jobs/<job_id>/download', methods=['GET'])
@require_auth
def download_job(job_id):
    email = _current_email()
    job   = job_store.get(job_id)
    if not job or job['owner_email'] != email:
        return jsonify({"error": "Job not found"}), 404
    if job['status'] != 'done':
        return jsonify({"error": "Job not ready", "status": job['status']}), 409

    data = job_store.get_result_bytes(job_id)
    if data is None:
        return jsonify({"error": "Result file missing"}), 404

    ext  = job.get('result_ext', '.pdf')
    if ext == '.pdf':
        mime = 'application/pdf'
    elif ext == '.xlsx':
        mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    else:
        mime = 'application/octet-stream'
    base = job.get('params', {}).get('filename', 'result')
    download_name = os.path.splitext(base)[0] + ext

    return send_file(BytesIO(data), mimetype=mime, as_attachment=True, download_name=download_name)


@api_bp.route('/jobs/<job_id>', methods=['DELETE'])
@require_auth
def delete_job(job_id):
    email = _current_email()
    if job_store.delete_job(job_id, email):
        return jsonify({"success": True})
    return jsonify({"error": "Job not found"}), 404


# ---------------------------------------------------------------------------
# Template Library
# ---------------------------------------------------------------------------

@api_bp.route('/templates', methods=['POST'])
@require_auth
def upload_template():
    if 'file' not in request.files:
        return jsonify({"error": "file is required"}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({"error": "empty filename"}), 400

    email = _current_email()
    plan  = _get_user_plan(email)
    max_t = plan.get('max_templates', 5)

    from ..services import template_store as _tmpl
    if _tmpl.count(email) >= max_t:
        return jsonify({
            "error": "plan_limit",
            "reason": "templates",
            "limit":  max_t,
            "message": f"لقد وصلت للحد الأقصى ({max_t} قوالب). قم بترقية خطتك.",
            "message_en": f"Template limit reached ({max_t}). Upgrade your plan.",
        }), 403

    content     = f.read()
    name        = request.form.get('name', '').strip() or f.filename
    description = request.form.get('description', '').strip()

    tpl = _tmpl.save(email, f.filename, content, name, description)
    return jsonify({"success": True, "template": tpl}), 201


@api_bp.route('/templates', methods=['GET'])
@require_auth
def list_templates():
    from ..services import template_store as _tmpl
    email = _current_email()
    return jsonify({"success": True, "templates": _tmpl.list_by_owner(email)})


@api_bp.route('/templates/<tpl_id>', methods=['PATCH'])
@require_auth
def update_template(tpl_id):
    from ..services import template_store as _tmpl
    email = _current_email()
    data  = request.get_json(silent=True) or {}
    tpl   = _tmpl.update_meta(tpl_id, email, data.get('name'), data.get('description'))
    if not tpl:
        return jsonify({"error": "Template not found"}), 404
    return jsonify({"success": True, "template": tpl})


@api_bp.route('/templates/<tpl_id>', methods=['DELETE'])
@require_auth
def delete_template(tpl_id):
    from ..services import template_store as _tmpl
    email = _current_email()
    if _tmpl.delete(tpl_id, email):
        return jsonify({"success": True})
    return jsonify({"error": "Template not found"}), 404


@api_bp.route('/templates/<tpl_id>/use', methods=['POST'])
@require_auth
def use_template(tpl_id):
    """
    Copy a template into result_store so it can be used by write/execute/pdf ops
    without mutating the original.  Returns a result entry with kind='xlsx'.
    """
    from ..services import template_store as _tmpl
    email   = _current_email()
    tpl     = _tmpl.get(tpl_id)
    if not tpl or tpl['owner_email'] != email:
        return jsonify({"error": "Template not found"}), 404

    content = _tmpl.get_content(tpl_id)
    if not content:
        return jsonify({"error": "Template file missing"}), 404

    saved = result_store.save(
        kind='xlsx',
        source_file_id=tpl_id,
        source_file_name=tpl['filename'],
        filename=tpl['filename'],
        content=content,
    )
    return jsonify({"success": True, "result": saved})


@api_bp.route('/templates/<tpl_id>/download', methods=['GET'])
@require_auth
def download_template(tpl_id):
    from ..services import template_store as _tmpl
    email   = _current_email()
    tpl     = _tmpl.get(tpl_id)
    if not tpl or tpl['owner_email'] != email:
        return jsonify({"error": "Template not found"}), 404
    content = _tmpl.get_content(tpl_id)
    if not content:
        return jsonify({"error": "Template file missing"}), 404
    mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    return send_file(BytesIO(content), mimetype=mime, as_attachment=True,
                     download_name=tpl['filename'])


@api_bp.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "excel-processor"})


# ── Storage usage ─────────────────────────────────────────────────────────────

@api_bp.route('/storage/usage', methods=['GET'])
@require_auth
def storage_usage():
    from ..services import template_store as _tmpl_store
    email = _current_email()
    plan  = _get_user_plan(email)
    files = file_store.usage(email)
    tpls  = _tmpl_store.usage(email)

    used_bytes = files['total_bytes'] + tpls['bytes']

    max_bytes = plan['storage_gb'] * 1024 ** 3 if plan['storage_gb'] else plan['max_files'] * plan['max_file_mb'] * 1024 ** 2

    return jsonify({
        "success":     True,
        "plan":        plan,
        "file_count":  files['file_count'],
        "max_files":   plan['max_files'],
        "used_bytes":  used_bytes,
        "max_bytes":   int(max_bytes),
    })


# ── Plans (public) ────────────────────────────────────────────────────────────

@api_bp.route('/plans', methods=['GET'])
def get_plans():
    bank = {
        'bank_name':       os.getenv('BANK_NAME', ''),
        'account_name':    os.getenv('BANK_ACCOUNT_NAME', ''),
        'account_number':  os.getenv('BANK_ACCOUNT_NUMBER', ''),
        'iban':            os.getenv('BANK_IBAN', ''),
    }
    from ..services.plan_store import list_plans
    return jsonify({"success": True, "plans": list_plans(), "bank": bank})


# ── Subscription request ──────────────────────────────────────────────────────

@api_bp.route('/subscribe', methods=['POST'])
@require_auth
def subscribe():
    from ..services.subscription_store import create_request
    from ..services.email_service import send_subscription_request_email
    import traceback

    plan   = request.form.get('plan', '').lower()
    months = int(request.form.get('months', 1))
    proof  = request.files.get('proof')

    if plan not in PLANS:
        return jsonify({"error": f"Invalid plan"}), 400
    if plan == 'free':
        return jsonify({"error": "Free plan needs no subscription"}), 400
    if not proof:
        return jsonify({"error": "Transfer proof image is required"}), 400

    # Get user info from JWT
    from sqlalchemy import select
    from ..db import session_scope
    from ..models import User
    email = _current_email() or 'unknown'
    with session_scope() as s:
        username = s.execute(
            select(User.username).where(User.email == email)
        ).scalar() or email

    ext   = '.' + (proof.filename.rsplit('.', 1)[-1] if '.' in proof.filename else 'jpg')
    entry = create_request(email, username, plan, months, proof.read(), ext)

    try:
        send_subscription_request_email(username, email, plan, months, entry['id'])
    except Exception:
        traceback.print_exc()

    return jsonify({"success": True, "id": entry['id'], "status": "pending"}), 201


@api_bp.route('/subscribe/status', methods=['GET'])
@require_auth
def subscribe_status():
    from sqlalchemy import select
    from ..db import session_scope
    from ..models import User
    from ..services.subscription_store import list_requests
    from ..services.plan_store import list_plans

    email = _current_email()
    plans = list_plans()

    plan_name = 'free'
    plan_expires_at = None
    if email:
        with session_scope() as s:
            row = s.execute(
                select(User.plan, User.plan_expires_at).where(User.email == email)
            ).first()
            if row:
                plan_name = row[0] or 'free'
                plan_expires_at = row[1].isoformat() if row[1] else None

    my_requests = [r for r in list_requests() if r['email'].lower() == email]

    return jsonify({
        "success":         True,
        "plan":            plan_name,
        "plan_expires_at": plan_expires_at,
        "plan_info":       plans.get(plan_name, plans.get('free', {})),
        "requests":        my_requests[:5],
    })


# ---------------------------------------------------------------------------
# Image & QR Injection
# ---------------------------------------------------------------------------

@api_bp.route('/insert/image', methods=['POST'])
@require_auth
def insert_image():
    """
    Embed an image into an Excel file.
    Form fields:
      file_id / result_id / file  — source Excel
      image                       — uploaded image file (PNG/JPG)
      cell                        — anchor cell, default A1
      sheet_name                  — optional sheet name
      width_px / height_px        — optional dimensions (default 120)
    Returns a saved xlsx result.
    """
    from ..services.image_service import insert_image as _insert_image

    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    if 'image' not in request.files:
        return jsonify({"error": "image file is required"}), 400

    img_file   = request.files['image']
    img_bytes  = img_file.read()
    cell       = request.form.get('cell', 'A1').strip() or 'A1'
    sheet_name = request.form.get('sheet_name') or None
    width_px   = int(request.form.get('width_px', 120))
    height_px  = int(request.form.get('height_px', 120))

    try:
        modified = _insert_image(file_content, img_bytes, cell, sheet_name, width_px, height_px)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    source_id      = request.form.get('file_id') or request.form.get('result_id') or ''
    result_filename = os.path.splitext(filename)[0] + '_with_image.xlsx'
    email          = _current_email()
    saved = result_store.save(kind='xlsx', source_file_id=source_id,
                              source_file_name=filename,
                              filename=result_filename, content=modified)
    return jsonify({"success": True, "result": saved})


@api_bp.route('/insert/qr', methods=['POST'])
@require_auth
def insert_qr():
    """
    Generate a QR code and embed it into an Excel file.
    Form fields:
      file_id / result_id / file  — source Excel
      qr_data                     — URL or text to encode (default: verify URL if access_code given)
      access_code                 — 6-char verification token (auto-builds verify URL)
      cell                        — anchor cell, default A1
      sheet_name                  — optional
      size_px                     — QR size in pixels (default 120)
    Returns a saved xlsx result.
    """
    from ..services.image_service import insert_qr as _insert_qr

    file_content, filename, err = _resolve_file()
    if err:
        return jsonify({"error": err[0]}), err[1]

    access_code = request.form.get('access_code', '').strip().upper()
    qr_data     = request.form.get('qr_data', '').strip()

    if not qr_data and access_code:
        verify_base = os.getenv('VERIFY_BASE_URL', 'http://localhost:3001/verify')
        qr_data = f"{verify_base}?code={access_code}"

    if not qr_data:
        return jsonify({"error": "qr_data or access_code is required"}), 400

    cell       = request.form.get('cell', 'A1').strip() or 'A1'
    sheet_name = request.form.get('sheet_name') or None
    size_px    = int(request.form.get('size_px', 120))

    try:
        modified = _insert_qr(file_content, qr_data, cell, sheet_name, size_px)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    source_id       = request.form.get('file_id') or request.form.get('result_id') or ''
    result_filename = os.path.splitext(filename)[0] + '_with_qr.xlsx'
    saved = result_store.save(kind='xlsx', source_file_id=source_id,
                              source_file_name=filename,
                              filename=result_filename, content=modified)
    return jsonify({"success": True, "result": saved, "qr_data": qr_data})


# ---------------------------------------------------------------------------
# Document Verification Tokens
# ---------------------------------------------------------------------------

@api_bp.route('/tokens', methods=['POST'])
@require_auth
def create_token():
    email = _current_email()
    data  = request.get_json(silent=True) or {}
    resource_type = data.get('resource_type', 'file')
    resource_id   = data.get('resource_id', '').strip()

    if not resource_id:
        return jsonify({"error": "resource_id is required"}), 400
    if resource_type not in ('file', 'result'):
        return jsonify({"error": "resource_type must be 'file' or 'result'"}), 400

    if resource_type == 'file':
        meta = file_store.get_meta(resource_id)
        if not meta:
            return jsonify({"error": "File not found"}), 404
        filename   = meta['name']
        size_bytes = meta.get('size', 0)
    else:
        meta = result_store.get_meta(resource_id)
        if not meta:
            return jsonify({"error": "Result not found"}), 404
        filename   = meta['filename']
        size_bytes = meta.get('size', 0)

    # Return existing active token for this resource (idempotent)
    existing = _token_store.get_by_resource(resource_id, email)
    if existing:
        return jsonify({"success": True, "token": existing, "existing": True})

    tok = _token_store.create(email, resource_type, resource_id, filename, size_bytes)
    return jsonify({"success": True, "token": tok}), 201


@api_bp.route('/tokens', methods=['GET'])
@require_auth
def list_tokens():
    email = _current_email()
    return jsonify({"success": True, "tokens": _token_store.list_by_owner(email)})


@api_bp.route('/tokens/<token_id>', methods=['DELETE'])
@require_auth
def delete_token_route(token_id):
    email = _current_email()
    if _token_store.delete_token(token_id, email):
        return jsonify({"success": True})
    return jsonify({"error": "Token not found"}), 404


# ---------------------------------------------------------------------------
# PDF Merge
# ---------------------------------------------------------------------------

@api_bp.route('/pdf/merge', methods=['POST'])
@require_auth
def merge_pdfs():
    """
    Merge multiple saved PDF results into one file.
    Form fields:
      result_ids   — comma-separated list of result IDs (PDF kind)
      cover_title  — optional cover page title
      cover_subtitle — optional cover page subtitle
      cover_date   — optional date string (defaults to today)
      output_name  — optional output filename (without .pdf)
      save_result  — 'true' to save merged PDF as a result entry
    """
    from ..services.pdf_merge_service import merge_pdfs as _merge

    result_ids_raw = request.form.get('result_ids', '')
    result_ids     = [r.strip() for r in result_ids_raw.split(',') if r.strip()]

    if len(result_ids) < 2:
        return jsonify({"error": "At least 2 result_ids are required"}), 400

    cover_title    = request.form.get('cover_title', '').strip() or None
    cover_subtitle = request.form.get('cover_subtitle', '').strip()
    cover_date     = request.form.get('cover_date', '').strip()
    output_name    = request.form.get('output_name', 'merged').strip() or 'merged'
    save_result    = request.form.get('save_result') == 'true'

    pdf_bytes_list = []
    for rid in result_ids:
        meta    = result_store.get_meta(rid)
        content = result_store.get_content(rid)
        if not meta or not content:
            return jsonify({"error": f"Result '{rid}' not found"}), 404
        if meta.get('kind') != 'pdf':
            return jsonify({"error": f"Result '{rid}' is not a PDF"}), 400
        pdf_bytes_list.append(content)

    try:
        merged = _merge(pdf_bytes_list, cover_title, cover_subtitle, cover_date)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    pdf_filename = f"{output_name}.pdf"

    if save_result:
        email = _current_email()
        saved = result_store.save(
            kind='pdf',
            source_file_id='',
            source_file_name=pdf_filename,
            filename=pdf_filename,
            content=merged,
        )
        return jsonify({"success": True, "result": saved})

    return send_file(BytesIO(merged), mimetype='application/pdf',
                     as_attachment=True, download_name=pdf_filename)


# Public endpoint — no auth required
@api_bp.route('/verify/<access_code>', methods=['GET'])
def verify_document(access_code):
    from datetime import datetime, timezone as _tz
    ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip()
    if not _rate_limit(ip):
        return jsonify({"error": "rate_limited", "message": "Too many requests. Try again in a minute."}), 429

    code = (access_code or '').strip().upper()
    if len(code) != 6:
        return jsonify({"error": "invalid_code", "message": "Access code must be exactly 6 characters."}), 400

    tok = _token_store.get_by_code(code)
    if not tok:
        return jsonify({"error": "not_found", "message": "No document found with this code."}), 404

    return jsonify({
        "success": True,
        "document": {
            "filename":      tok['filename'],
            "size_bytes":    tok['size_bytes'],
            "resource_type": tok['resource_type'],
            "issued_at":     tok['created_at'],
            "verified_at":   datetime.now(_tz.utc).isoformat(),
        },
    })
