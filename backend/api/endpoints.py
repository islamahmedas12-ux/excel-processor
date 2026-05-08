"""
API Routes
==========
Simple API endpoints for Excel as a Backend Service
No storage needed - files processed in memory
"""

from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
import os

from ..services.excel_service import ExcelService

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

excel_service = ExcelService()


@api_bp.route('/execute', methods=['POST'])
def execute():
    """
    Core endpoint: Upload Excel + Fill inputs → Excel calculates → Return outputs

    Flow:
      1. User sends Excel file + cell updates + cells to read
      2. System updates the cells, Excel auto-calculates formulas
      3. System reads the requested cells and returns values

    Example:
      Excel has: C11=input, C12=input, C13=SUM(C11,C12)
      Send: {"C11": 10, "C12": 20}
      Returns: {"C13": 30}

    ---
    tags:
      - Execute
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Excel file (.xlsx or .xls)
      - in: formData
        name: inputs
        type: string
        required: true
        description: JSON string of cell updates, e.g. {"C11": 10, "C12": 20}
      - in: formData
        name: outputs
        type: string
        required: true
        description: Comma-separated cell coordinates to read, e.g. "C13,D15"
      - in: formData
        name: sheet_name
        type: string
        required: false
        description: Sheet name (optional, defaults to first sheet)
    responses:
      200:
        description: Calculation results
      400:
        description: Invalid request
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
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

    file_content = file.read()

    try:
        result = excel_service.execute(
            file_content=file_content,
            filename=file.filename,
            inputs=inputs,
            outputs=outputs,
            sheet_name=sheet_name
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/read', methods=['POST'])
def read_cells():
    """
    Read specific cells from Excel file

    ---
    tags:
      - Read
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Excel file
      - in: formData
        name: cells
        type: string
        required: true
        description: Comma-separated cell coordinates
      - in: formData
        name: sheet_name
        type: string
        required: false
    responses:
      200:
        description: Cell values
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    cells_str = request.form.get('cells')
    sheet_name = request.form.get('sheet_name')

    if not cells_str:
        return jsonify({"error": "cells parameter is required"}), 400

    cells = [c.strip() for c in cells_str.split(',')]
    file_content = file.read()

    try:
        result = excel_service.read_cells(
            file_content=file_content,
            filename=file.filename,
            cells=cells,
            sheet_name=sheet_name
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/write', methods=['POST'])
def write_cells():
    """
    Write to specific cells and return updated file

    ---
    tags:
      - Write
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Excel file
      - in: formData
        name: updates
        type: string
        required: true
        description: JSON string of cell updates
      - in: formData
        name: sheet_name
        type: string
        required: false
    responses:
      200:
        description: Updated file
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    updates_str = request.form.get('updates')
    sheet_name = request.form.get('sheet_name')

    if not updates_str:
        return jsonify({"error": "updates parameter is required"}), 400

    try:
        import json
        updates = json.loads(updates_str)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON in updates"}), 400

    file_content = file.read()

    try:
        result = excel_service.write_cells(
            file_content=file_content,
            filename=file.filename,
            updates=updates,
            sheet_name=sheet_name
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/sheets', methods=['POST'])
def get_sheets():
    """
    Get list of sheets in Excel file

    ---
    tags:
      - Files
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
    responses:
      200:
        description: Sheet names
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    file_content = file.read()

    try:
        from excel_processor.file_reader import ExcelReader
        from io import BytesIO

        with ExcelReader(BytesIO(file_content)) as reader:
            sheets = reader.get_sheet_names()

        return jsonify({
            "sheets": sheets,
            "count": len(sheets)
        })
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/export/pdf', methods=['POST'])
def export_pdf():
    """
    Convert Excel file to PDF using LibreOffice
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    output_name = request.form.get('output_name')

    excel_content = file.read()

    try:
        from ..services.pdf_export_service import get_pdf_export_service
        service = get_pdf_export_service()
        pdf_bytes = service.convert_excel_to_pdf(
            excel_content=excel_content,
            filename=file.filename,
            output_name=output_name
        )

        from flask import send_file
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"{os.path.splitext(file.filename)[0]}.pdf"
        )
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@api_bp.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({"status": "healthy", "service": "excel-processor"})