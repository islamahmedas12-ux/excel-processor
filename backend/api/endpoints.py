"""
API Routes
==========
New API endpoints for Excel as a Backend Service
"""

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from io import BytesIO

from ..services.bucket_service import get_bucket_service, BucketService
from ..services.excel_service import get_excel_service, ExcelService
from ..models.schemas import (
    ExecuteRequest,
    WriteRequest,
    ReadRequest,
    CellInput
)

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

bucket_service: BucketService = None
excel_service: ExcelService = None


def init_services():
    """Initialize services"""
    global bucket_service, excel_service
    bucket_service = get_bucket_service()
    excel_service = get_excel_service(bucket_service)


@api_bp.route('/files', methods=['POST'])
def upload_file():
    """
    Upload Excel file to Supabase bucket
    ---
    tags:
      - Files
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Excel file (.xlsx or .xls)
    responses:
      200:
        description: File uploaded successfully
      400:
        description: Invalid file
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    allowed_extensions = ['.xlsx', '.xls']
    ext = '.' + file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''

    if ext not in allowed_extensions:
        return jsonify({"error": f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"}), 400

    file_content = file.read()

    try:
        result = bucket_service.upload_file(file_content, secure_filename(file.filename))
        return jsonify({
            "success": True,
            "data": {
                "file_id": result["file_id"],
                "filename": result["filename"],
                "original_filename": result["original_filename"],
                "url": result["url"]
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/files/<file_id>', methods=['GET'])
def get_file_info(file_id: str):
    """
    Get file information
    ---
    tags:
      - Files
    parameters:
      - name: file_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: File info
      404:
        description: File not found
    """
    try:
        exists = bucket_service.file_exists(file_id)
        if not exists:
            return jsonify({"error": "File not found"}), 404

        return jsonify({
            "success": True,
            "data": {
                "file_id": file_id,
                "exists": True
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/files/<file_id>', methods=['DELETE'])
def delete_file(file_id: str):
    """
    Delete file from bucket
    ---
    tags:
      - Files
    parameters:
      - name: file_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: File deleted
      404:
        description: File not found
    """
    try:
        bucket_service.delete_file(file_id)
        return jsonify({"success": True, "message": "File deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/execute/<file_id>', methods=['POST'])
def execute(file_id: str):
    """
    Fill inputs → Excel calculates → Return outputs

    This is the core endpoint for Excel as a Backend Service.
    You provide input values, the Excel file calculates the results.

    Example:
      inputs: [{"cell": "C11", "value": 1}, {"cell": "C12", "value": 2}]
      outputs: ["C13"]
      → C13 automatically calculates to 3 (formula: SUM(C11,C12))

    ---
    tags:
      - Execute
    parameters:
      - name: file_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - inputs
            - outputs
          properties:
            inputs:
              type: array
              items:
                type: object
                properties:
                  cell: {type: string, example: "C11"}
                  value: {type: any, example: 1}
            outputs:
              type: array
              items:
                type: string
                example: "C13"
            sheet_name:
              type: string
              required: false
    responses:
      200:
        description: Execution successful
      400:
        description: Invalid request
      404:
        description: File not found
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        inputs = data.get('inputs', [])
        outputs = data.get('outputs', [])
        sheet_name = data.get('sheet_name')

        if not inputs or not outputs:
            return jsonify({"error": "inputs and outputs are required"}), 400

        if not bucket_service.file_exists(file_id):
            return jsonify({"error": "File not found"}), 404

        result = excel_service.execute(file_id, inputs, outputs, sheet_name)

        return jsonify({
            "success": True,
            "data": result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/read/<file_id>', methods=['GET'])
def read_cells(file_id: str):
    """
    Read specific cells from file
    ---
    tags:
      - Read
    parameters:
      - name: file_id
        in: path
        type: string
        required: true
      - name: cells
        in: query
        type: string
        required: true
        description: Comma-separated cell coordinates (e.g., "A1,C13,D15")
      - name: sheet_name
        in: query
        type: string
        required: false
    responses:
      200:
        description: Cell values
      404:
        description: File not found
    """
    try:
        cells_param = request.args.get('cells')
        sheet_name = request.args.get('sheet_name')

        if not cells_param:
            return jsonify({"error": "cells parameter is required"}), 400

        cells = [c.strip() for c in cells_param.split(',')]

        if not bucket_service.file_exists(file_id):
            return jsonify({"error": "File not found"}), 404

        result = excel_service.read_cells(file_id, cells, sheet_name)

        return jsonify({
            "success": True,
            "data": result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/write/<file_id>', methods=['PUT'])
def write_cells(file_id: str):
    """
    Write to specific cells in file
    ---
    tags:
      - Write
    parameters:
      - name: file_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - updates
          properties:
            updates:
              type: array
              items:
                type: object
                properties:
                  cell: {type: string}
                  value: {type: any}
            sheet_name:
              type: string
            preserve_format:
              type: boolean
              default: true
    responses:
      200:
        description: Cells updated
      404:
        description: File not found
    """
    try:
        data = request.get_json()

        if not data or 'updates' not in data:
            return jsonify({"error": "updates array is required"}), 400

        updates = data.get('updates', [])
        sheet_name = data.get('sheet_name')
        preserve_format = data.get('preserve_format', True)

        if not bucket_service.file_exists(file_id):
            return jsonify({"error": "File not found"}), 404

        result = excel_service.write_cells(file_id, updates, sheet_name, preserve_format)

        return jsonify({
            "success": True,
            "data": result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/sheets/<file_id>', methods=['GET'])
def get_sheets(file_id: str):
    """
    Get list of sheets in file
    ---
    tags:
      - Files
    parameters:
      - name: file_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Sheet names
      404:
        description: File not found
    """
    try:
        if not bucket_service.file_exists(file_id):
            return jsonify({"error": "File not found"}), 404

        from excel_processor.file_reader import ExcelReader
        import tempfile

        file_bytes = bucket_service.download_file(file_id)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            with ExcelReader(tmp_path) as reader:
                sheets = reader.get_sheet_names()

            return jsonify({
                "success": True,
                "data": {
                    "file_id": file_id,
                    "sheets": sheets,
                    "count": len(sheets)
                }
            })
        finally:
            import os
            os.unlink(tmp_path)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "excel-processor-api"})