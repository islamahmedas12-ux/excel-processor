"""
Excel Processor - Backend as a Service
======================================
Main entry point for the Flask API
"""

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from backend.api.endpoints import api_bp, init_services
from excel_processor.errors import handle_exception


app = Flask(__name__)
CORS(app)


@app.before_request
def before_request():
    """Initialize services before first request"""
    if not hasattr(app, '_services_initialized'):
        try:
            init_services()
            app._services_initialized = True
        except Exception as e:
            print(f"Warning: Could not initialize services: {e}")
            app._services_initialized = True


@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        "name": "Excel Processor API",
        "version": "2.0.0",
        "description": "Excel as a Backend Service - Upload Excel files, fill inputs, get calculated outputs",
        "endpoints": {
            "POST /api/v1/files": "Upload Excel file",
            "GET /api/v1/files/<file_id>": "Get file info",
            "DELETE /api/v1/files/<file_id>": "Delete file",
            "POST /api/v1/execute/<file_id>": "Fill inputs → Get calculated outputs",
            "GET /api/v1/read/<file_id>": "Read specific cells",
            "PUT /api/v1/write/<file_id>": "Write to cells",
            "GET /api/v1/sheets/<file_id>": "Get sheet names"
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
    print("=" * 70)
    print()
    print("  Make sure to set these environment variables:")
    print("  - SUPABASE_URL")
    print("  - SUPABASE_KEY")
    print("  - SUPABASE_BUCKET (default: excel-files)")
    print()
    run_server(debug=True)