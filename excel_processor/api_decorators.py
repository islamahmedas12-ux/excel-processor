"""
decorators للتوثيق التلقائي
==========================
decorators و decorators factories لإنشاء توثيق Swagger تلقائياً
"""

from functools import wraps
from flask import request
from typing import Callable, Dict, List, Any, Optional


def api_doc(
    tags: List[str],
    summary_ar: str,
    summary_en: str,
    params_schema: Optional[str] = None,
    success_example: Optional[Dict] = None,
    error_examples: Optional[Dict[str, Dict]] = None,
    notes: Optional[str] = None
):
    """
    Decorator للتوثيق التلقائي لـ endpoints

    المعلمات:
        tags: قائمة العلامات [عام, قراءة, كتابة, أوراق العمل]
        summary_ar: ملخص بالعربية
        summary_en: ملخص بالإنجليزية
        params_schema: اسم الـ schema في definitions
        success_example: مثال الاستجابة الناجحة
        error_examples: {status_code: error_example}
        notes: ملاحظات إضافية

    الاستخدام:
        @api_doc(
            tags=["قراءة"],
            summary_ar="قراءة خلية من ملف Excel",
            summary_en="Read cell from Excel file",
            params_schema="ReadRequest",
            success_example={"نجاح": True, "بيانات": {...}},
            error_examples={
                "404": {"نجاح": False, "خطأ": {...}},
                "400": {"نجاح": False, "خطأ": {...}}
            }
        )
        def my_endpoint():
            ...
    """
    def decorator(func: Callable) -> Callable:
        func._api_doc = {
            "tags": tags,
            "summary_ar": summary_ar,
            "summary_en": summary_en,
            "params_schema": params_schema,
            "success_example": success_example,
            "error_examples": error_examples or {},
            "notes": notes
        }

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper
    return decorator


def validate_params(required: List[str] = None, optional: List[str] = None):
    """
    Decorator للتحقق من المعاملات

    المعلمات:
        required: قائمة المعاملات المطلوبة
        optional: قائمة المعاملات الاختيارية

    الاستخدام:
        @validate_params(required=["file_path"], optional=["sheet_name"])
        def my_endpoint():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            data = request.get_json() or {}
            query_params = dict(request.args)

            all_params = {**query_params, **data}

            if required:
                missing = [p for p in required if p not in all_params]
                if missing:
                    lang = getattr(request, 'lang', 'ar')
                    if lang == 'ar':
                        return {
                            "نجاح": False,
                            "خطأ": {
                                "الرمز": "MISSING_PARAMETER",
                                "الرسالة": f"المعاملات المطلوبة مفقودة: {', '.join(missing)}"
                            }
                        }, 400
                    else:
                        return {
                            "success": False,
                            "error": {
                                "code": "MISSING_PARAMETER",
                                "message": f"Required parameters missing: {', '.join(missing)}"
                            }
                        }, 400

            return func(*args, **kwargs)
        return wrapper
    return decorator


def multi_language(func: Callable) -> Callable:
    """
    Decorator لإضافة دعم اللغة تلقائياً

    الاستخدام:
        @multi_language
        def my_endpoint():
            lang = getattr(request, 'lang', 'ar')
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        lang = request.args.get('lang') or request.headers.get('Accept-Language', 'ar')
        if lang not in ['ar', 'en']:
            lang = 'ar'
        request.lang = lang
        return func(*args, **kwargs)
    return wrapper


class EndpointTemplate:
    """
    قالب أساسي لإنشاء endpoints موحدة

    الاستخدام:
        class MyAPI(EndpointTemplate):
            base_path = "/api/v1"
            tags = ["عام"]

            @EndpointTemplate.get("/resource")
            @EndpointTemplate.validate(required=["id"])
            def get_resource(self):
                return {"data": "resource"}

            @EndpointTemplate.post("/resource")
            def create_resource(self):
                return {"data": "created"}
    """

    _registry = {}

    @classmethod
    def register(cls, name: str, handler: Callable):
        """تسجيل endpoint"""
        cls._registry[name] = handler

    @classmethod
    def get(cls, path: str):
        """decorator لـ GET requests"""
        def decorator(func: Callable) -> Callable:
            cls.register(f"GET:{path}", func)
            return func
        return decorator

    @classmethod
    def post(cls, path: str):
        """decorator لـ POST requests"""
        def decorator(func: Callable) -> Callable:
            cls.register(f"POST:{path}", func)
            return func
        return decorator

    @classmethod
    def put(cls, path: str):
        """decorator لـ PUT requests"""
        def decorator(func: Callable) -> Callable:
            cls.register(f"PUT:{path}", func)
            return func
        return decorator

    @classmethod
    def delete(cls, path: str):
        """decorator لـ DELETE requests"""
        def decorator(func: Callable) -> Callable:
            cls.register(f"DELETE:{path}", func)
            return func
        return decorator


class ResponseBuilder:
    """بناء استجابات موحدة"""

    @staticmethod
    def success(data: Any, message: str = None, lang: str = 'ar') -> tuple:
        """بناء استجابة نجاح"""
        response = {
            "نجاح" if lang == 'ar' else "success": True,
            "بيانات" if lang == 'ar' else "data": data
        }
        if message:
            if lang == 'ar':
                response["رسالة"] = message
            else:
                response["message"] = message
        return response, 200

    @staticmethod
    def error(
        code: str,
        message: str,
        status_code: int = 400,
        lang: str = 'ar'
    ) -> tuple:
        """بناء استجابة خطأ"""
        response = {
            "نجاح" if lang == 'ar' else "success": False,
            "خطأ" if lang == 'ar' else "error": {
                "الرمز" if lang == 'ar' else "code": code,
                "الرسالة" if lang == 'ar' else "message": message
            }
        }
        return response, status_code

    @staticmethod
    def file_not_found(file_path: str, lang: str = 'ar') -> tuple:
        """استجابة ملف غير موجود"""
        return ResponseBuilder.error(
            "FILE_NOT_FOUND",
            f"الملف غير موجود: {file_path}" if lang == 'ar' else f"File not found: {file_path}",
            404,
            lang
        )

    @staticmethod
    def invalid_coordinates(coordinates: str, lang: str = 'ar') -> tuple:
        """استجابة إحداثيات غير صالحة"""
        return ResponseBuilder.error(
            "INVALID_CELL_COORDINATES",
            f"إحداثيات الخلية غير صالحة: {coordinates}. الصيغة الصحيحة: A1 أو B2 أو C10" if lang == 'ar' else f"Invalid cell coordinates: {coordinates}. Correct format: A1 or B2 or C10",
            400,
            lang
        )

    @staticmethod
    def missing_parameter(param: str, lang: str = 'ar') -> tuple:
        """استجابة معامل مفقود"""
        return ResponseBuilder.error(
            "MISSING_PARAMETER",
            f"معلمة {param} مطلوبة" if lang == 'ar' else f"{param} parameter is required",
            400,
            lang
        )

    @staticmethod
    def permission_denied(file_path: str, lang: str = 'ar') -> tuple:
        """استجابة رفض الصلاحيات"""
        return ResponseBuilder.error(
            "FILE_PERMISSION_ERROR",
            f"ليس لديك صلاحيات كافية للوصول إلى الملف: {file_path}" if lang == 'ar' else f"Insufficient permissions to access file: {file_path}",
            403,
            lang
        )


def generate_swagger_spec(
    title: str,
    version: str,
    description: str,
    base_path: str,
    endpoints: List[Dict]
) -> Dict:
    """
    توليد مواصفات Swagger

    المعلمات:
        title: عنوان API
        version: الإصدار
        description: الوصف
        base_path: المسار الأساسي
        endpoints: قائمة بالـ endpoints

    المخرجات:
        dict: مواصفات Swagger
    """
    spec = {
        "swagger": "2.0",
        "info": {
            "title": title,
            "description": description,
            "version": version
        },
        "host": "localhost:5000",
        "basePath": base_path,
        "schemes": ["http", "https"],
        "produces": ["application/json"],
        "consumes": ["application/json"],
        "paths": {}
    }

    for endpoint in endpoints:
        path = endpoint.get("path")
        operations = endpoint.get("operations", {})

        if path not in spec["paths"]:
            spec["paths"][path] = {}

        for method, operation in operations.items():
            spec["paths"][path][method] = operation

    return spec
