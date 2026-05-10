"""
Excel Processor - Backend as a Service
=====================================
Main entry point for the Flask API
No storage needed - files processed in memory
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from backend.api.endpoints import api_bp
from backend.api.auth import auth_bp
from backend.api.admin import admin_bp


app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_FILE_SIZE', 50 * 1024 * 1024))

origins = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else []
if origins:
    CORS(app, resources={"/api/*": {"origins": origins}})
else:
    CORS(app)


@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        "name": "Excel Processor API",
        "version": "2.0.0",
        "description": "Excel as a Backend Service - Upload Excel, fill inputs, get calculated outputs",
        "endpoints": {
            "POST /api/v1/execute": "Fill inputs → Excel calculates → Return outputs (multipart/form-data)",
            "POST /api/v1/read": "Read specific cells from Excel",
            "POST /api/v1/read/range": "Read a range of cells from Excel (e.g., A1:D10)",
            "POST /api/v1/read/all": "Read all data from Excel sheet",
            "POST /api/v1/write": "Write to cells and get updated file",
            "POST /api/v1/sheets": "Get sheet names from Excel file",
            "GET /api/v1/health": "Health check"
        },
        "example": {
            "description": "Excel has C11=input, C12=input, C13=SUM(C11,C12)",
            "request": {
                "file": "salary.xlsx",
                "inputs": '{"C11": 5000, "C12": 750}',
                "outputs": "C13"
            },
            "response": {
                "success": True,
                "results": {"C13": 5750},
                "sheet": "Sheet1"
            }
        }
    })


@app.route('/api/v1/health')
def health():
    """Health check"""
    return jsonify({"status": "healthy", "version": "2.0.0"})


app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)
app.register_blueprint(admin_bp)


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


def run_server(host='0.0.0.0', port=5000, debug=None):
    """Run the Flask server"""
    if debug is None:
        debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    run_server(debug=debug)