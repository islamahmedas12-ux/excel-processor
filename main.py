"""
Excel Processor - Backend as a Service
======================================
Main entry point for the Flask API
No storage needed - files processed in memory
"""

from flask import Flask, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import io

load_dotenv()

from backend.api.endpoints import api_bp


app = Flask(__name__)
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


app.register_blueprint(api_bp)


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


def run_server(host='0.0.0.0', port=5000, debug=False):
    """Run the Flask server"""
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    print("=" * 70)
    print("  Excel Processor API - Backend as a Service")
    print("  Version 2.0.0")
    print("  No storage needed - files processed in memory")
    print("=" * 70)
    print()
    print("  Endpoints:")
    print("  - POST /api/v1/execute  : Fill inputs → Get calculated outputs")
    print("  - POST /api/v1/read    : Read specific cells")
    print("  - POST /api/v1/write   : Write to cells")
    print("  - POST /api/v1/sheets  : Get sheet names")
    print("  - GET  /api/v1/health : Health check")
    print()
    run_server(debug=True)