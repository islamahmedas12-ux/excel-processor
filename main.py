"""
الملف الرئيسي للتطبيق
====================
نقطة الدخول لتشغيل خادم API معالجة ملفات Excel
"""

from excel_processor.api_service import run_server


if __name__ == '__main__':
    print("=" * 70)
    print("  نظام معالجة ملفات Excel - API Service")
    print("  Excel File Processing System - API Service")
    print("=" * 70)
    print()
    print("  جاري تشغيل الخادم على العنوان: http://0.0.0.0:5000")
    print("  Starting server at: http://0.0.0.0:5000")
    print()
    print("  ╔══════════════════════════════════════════════════════════════╗")
    print("  ║                    Swagger Documentation                     ║")
    print("  ║              تووثيق Swagger متاح على الرابط التالي:          ║")
    print("  ║                                                              ║")
    print("  ║         http://localhost:5000/swagger/                        ║")
    print("  ║                                                              ║")
    print("  ║         http://localhost:5000/apispec.json (JSON spec)       ║")
    print("  ╚══════════════════════════════════════════════════════════════╝")
    print()
    print("  نقاط النهاية المتاحة / Available Endpoints:")
    print("  - GET  /                    : الصفحة الرئيسية / Home")
    print("  - GET  /api/v1/health       : فحص النظام / Health Check")
    print("  - POST /api/v1/read         : قراءة البيانات / Read Data")
    print("  - POST /api/v1/write        : كتابة البيانات / Write Data")
    print("  - POST /api/v1/write/batch  : كتابة متعددة / Batch Write")
    print("  - GET  /api/v1/sheets       : قائمة الأوراق / Sheet List")
    print("  - GET  /api/v1/cell/info    : معلومات الخلية / Cell Info")
    print()
    print("  لاستخدام اللغة العربية: أضف ?lang=ar")
    print("  To use Arabic: add ?lang=ar")
    print("  To use English: add ?lang=en")
    print()
    print("=" * 70)
    print()

    run_server(host='0.0.0.0', port=5000, debug=True)
