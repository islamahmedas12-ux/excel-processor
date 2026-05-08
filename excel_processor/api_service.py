"""
وحدة خدمة API
=============
تتضمن هذه الوحدة خدمة API RESTful لقراءة وتعديل ملفات Excel
مع دعم اللغتين العربية والإنجليزية و Swagger Documentation شامل
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger, swag_from
from typing import Any, Dict, Tuple
import os

from .file_reader import ExcelReader
from .file_editor import ExcelEditor
from .errors import (
    ExcelProcessorError,
    FileNotFoundError_,
    InvalidCellCoordinatesError,
    get_error_response,
    handle_exception
)
from .validators import validate_language
from .swagger_templates import SWAGGER_TEMPLATE, EXAMPLE_RESPONSES, create_endpoint_doc


app = Flask(__name__)
CORS(app)

swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/swagger/"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Excel Processor API - واجهة برمجة تطبيقات معالجة Excel",
        "description": """
## نظرة عامة
API متعدد اللغات لقراءة وتعديل ملفات Excel بصيغتي .xlsx و .xls

## الميزات الرئيسية
- **قراءة ملفات Excel** - دعم صيغتي .xlsx و .xls
- **تعديل الخلايا** - تعديل خلية واحدة أو عدة خلايا
- **الحفاظ على التنسيق** - الحفاظ على الأنماط والخطوط والألوان
- **دعم متعدد اللغات** - العربية والإنجليزية
- **معالجة أخطاء شاملة** - رموز خطأ واضحة ومفصلة

## المصطلحات
- `file_path`: المسار الكامل للملف على النظام
- `coordinates`: إحداثيات الخلية (مثال: A1, B2, C10)
- `sheet_name`: اسم ورقة العمل (اختياري، الافتراضي = الورقة الأولى)
        """,
        "version": "1.0.0",
        "contact": {
            "name": "Excel Processor Team"
        }
    },
    "host": "localhost:5000",
    "basePath": "/",
    "schemes": ["http", "https"],
    "produces": ["application/json"],
    "consumes": ["application/json"],
    "tags": [
        {"name": "عام", "description": "عمليات عامة ونقاط النهاية الأساسية"},
        {"name": "قراءة", "description": "عمليات قراءة البيانات من ملفات Excel"},
        {"name": "كتابة", "description": "عمليات كتابة وتعديل البيانات في ملفات Excel"},
        {"name": "أوراق العمل", "description": "إدارة والتحكم في أوراق العمل"}
    ],
    "definitions": {
        "ErrorResponse": {
            "type": "object",
            "properties": {
                "نجاح": {"type": "boolean", "example": False},
                "خطأ": {
                    "type": "object",
                    "properties": {
                        "الرمز": {"type": "string", "example": "FILE_NOT_FOUND"},
                        "الرسالة": {"type": "string", "example": "الملف غير موجود"}
                    }
                }
            }
        }
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)


@app.before_request
def set_language():
    """تحديد اللغة من رأس الطلب أو معلمة اللغة"""
    lang = request.args.get('lang') or request.headers.get('Accept-Language', 'ar')
    if lang in ['ar', 'en']:
        request.lang = lang
    else:
        request.lang = 'ar'


def get_language() -> str:
    """الحصول على اللغة الحالية"""
    return getattr(request, 'lang', 'ar')


def success_response(data: Any, message: str = None) -> Tuple[Dict, int]:
    """إنشاء استجابة نجاح"""
    lang = get_language()

    response = {
        "نجاح": True,
        "بيانات": data
    }

    if message:
        if lang == 'ar':
            response["رسالة"] = message
        else:
            response["message"] = message

    return response, 200


def error_response(error: ExcelProcessorError, status_code: int = 400) -> Tuple[Dict, int]:
    """إنشاء استجابة خطأ"""
    lang = get_language()
    return get_error_response(error, lang), status_code


@app.route('/', methods=['GET'])
def home():
    """
    الصفحة الرئيسية لواجهة برمجة التطبيقات
    ---
    tags:
      - عام
    responses:
      200:
        description: معلومات النظام الرئيسية
        examples:
          application/json:
            ar: |
              {
                "نجاح": true,
                "رسالة": "مرحباً بك في واجهة برمجة تطبيقات معالجة ملفات Excel",
                "إصدار": "1.0.0",
                "اللغة": "العربية",
                "توثيق Swagger": "/swagger/",
                "رموز الاستجابة": {
                  "FILE_NOT_FOUND": "الملف غير موجود",
                  "INVALID_FILE_PATH": "مسار الملف غير صالح"
                }
              }
            en: |
              {
                "success": true,
                "message": "Welcome to Excel File Processing API",
                "version": "1.0.0",
                "language": "English",
                "swagger_docs": "/swagger/"
              }
    """
    lang = get_language()

    if lang == 'ar':
        return jsonify({
            "نجاح": True,
            "رسالة": "مرحباً بك في واجهة برمجة تطبيقات معالجة ملفات Excel",
            "إصدار": "1.0.0",
            "اللغة": "العربية",
            "توثيق Swagger": "/swagger/",
            "رموز الاستجابة": {
                "FILE_NOT_FOUND": "الملف غير موجود",
                "INVALID_FILE_PATH": "مسار الملف غير صالح",
                "UNSUPPORTED_FORMAT": "صيغة الملف غير مدعومة",
                "INVALID_CELL_COORDINATES": "إحداثيات الخلية غير صالحة"
            }
        })
    else:
        return jsonify({
            "success": True,
            "message": "Welcome to Excel File Processing API",
            "version": "1.0.0",
            "language": "English",
            "swagger_docs": "/swagger/",
            "error_codes": {
                "FILE_NOT_FOUND": "File not found",
                "INVALID_FILE_PATH": "Invalid file path",
                "UNSUPPORTED_FORMAT": "Unsupported file format",
                "INVALID_CELL_COORDINATES": "Invalid cell coordinates"
            }
        })


@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """
    فحص صحة النظام - يتحقق من أن النظام يعمل بشكل صحيح
    ---
    tags:
      - عام
    parameters:
      - name: lang
        in: query
        type: string
        required: false
        enum: [ar, en]
        default: ar
        description: لغة الاستجابة / Response language
        x-example: ar
    responses:
      200:
        description: النظام يعمل بشكل صحيح
        examples:
          application/json:
            ar: |
              {
                "نجاح": true,
                "الحالة": "نشط",
                "الرسالة": "النظام يعمل بشكل صحيح"
              }
            en: |
              {
                "success": true,
                "status": "active",
                "message": "System is running correctly"
              }
      500:
        description: خطأ داخلي في الخادم
        examples:
          application/json:
            ar: |
              {
                "نجاح": false,
                "خطأ": {
                  "الرمز": "INTERNAL_ERROR",
                  "الرسالة": "حدث خطأ داخلي غير متوقع"
                }
              }
    """
    lang = get_language()

    if lang == 'ar':
        return jsonify({
            "نجاح": True,
            "الحالة": "نشط",
            "الرسالة": "النظام يعمل بشكل صحيح"
        })
    else:
        return jsonify({
            "success": True,
            "status": "active",
            "message": "System is running correctly"
        })


@app.route('/api/v1/read', methods=['POST'])
def read_excel():
    """
    قراءة بيانات من ملف Excel - يقرأ خلية واحدة أو جميع البيانات
    ---
    tags:
      - قراءة
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - file_path
          properties:
            file_path:
              type: string
              description: المسار الكامل للملف / Full file path
              example: /home/user/documents/report.xlsx
            sheet_name:
              type: string
              description: اسم ورقة العمل (اختياري) / Sheet name
              example: Sheet1
            coordinates:
              type: string
              description: إحداثيات الخلية (اختياري - إذا لم يُحدد يتم قراءة كل البيانات) / Cell coordinates
              example: A1
        examples:
          read_cell:
            summary: قراءة خلية واحدة
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "coordinates": "A1"
              }
          read_all:
            summary: قراءة جميع البيانات
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx"
              }
          read_sheet:
            summary: قراءة ورقة محددة
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "sheet_name": "البيانات"
              }
    responses:
      200:
        description: تم قراءة البيانات بنجاح
        examples:
          application/json:
            read_cell_success:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "coordinates": "A1",
                    "value": "اسم المنتج",
                    "sheet": "Sheet1"
                  }
                }
              en: |
                {
                  "success": true,
                  "data": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "coordinates": "A1",
                    "value": "Product Name",
                    "sheet": "Sheet1"
                  }
                }
            read_all_success:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "sheets": ["Sheet1", "البيانات"],
                    "data": [["اسم", "العمر"], ["أحمد", 25]],
                    "dimensions": {"rows": 2, "columns": 2}
                  }
                }
      400:
        description: طلب غير صالح - معاملات مفقودة أو غير صالحة
        examples:
          application/json:
            missing_file_path:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمة file_path مطلوبة"
                  }
                }
              en: |
                {
                  "success": false,
                  "error": {
                    "code": "MISSING_PARAMETER",
                    "message": "file_path parameter is required"
                  }
                }
            invalid_coordinates:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "INVALID_CELL_COORDINATES",
                    "الرسالة": "إحداثيات الخلية غير صالحة: INVALID. الصيغة الصحيحة: A1 أو B2 أو C10"
                  }
                }
      404:
        description: الملف غير موجود
        examples:
          application/json:
            file_not_found:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "FILE_NOT_FOUND",
                    "الرسالة": "الملف غير موجود: /home/user/documents/missing.xlsx"
                  }
                }
              en: |
                {
                  "success": false,
                  "error": {
                    "code": "FILE_NOT_FOUND",
                    "message": "File not found: /home/user/documents/missing.xlsx"
                  }
                }
      500:
        description: خطأ داخلي في الخادم
        examples:
          application/json:
            internal_error:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "INTERNAL_ERROR",
                    "الرسالة": "حدث خطأ داخلي غير متوقع"
                  }
                }
    """
    try:
        data = request.get_json()

        if not data or 'file_path' not in data:
            lang = get_language()
            if lang == 'ar':
                return jsonify({
                    "نجاح": False,
                    "خطأ": {
                        "الرمز": "MISSING_PARAMETER",
                        "الرسالة": "معلمة file_path مطلوبة"
                    }
                }), 400
            else:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "MISSING_PARAMETER",
                        "message": "file_path parameter is required"
                    }
                }), 400

        file_path = data['file_path']
        sheet_name = data.get('sheet_name')
        coordinates = data.get('coordinates')

        with ExcelReader(file_path) as reader:
            if coordinates:
                value = reader.read_cell(coordinates, sheet_name)
                return success_response({
                    "file_path": file_path,
                    "coordinates": coordinates,
                    "value": value,
                    "sheet": sheet_name or reader.get_sheet_names()[0]
                })
            else:
                data_result = reader.read_all_data(sheet_name)
                data_result['file_path'] = file_path
                data_result['sheets'] = reader.get_sheet_names()
                return success_response(data_result)

    except ExcelProcessorError as e:
        return error_response(e, 400)
    except Exception as e:
        return error_response(handle_exception(e), 500)


@app.route('/api/v1/write', methods=['POST'])
def write_excel():
    """
    تعديل خلية في ملف Excel - يكتب قيمة جديدة مع الحفاظ على التنسيق
    ---
    tags:
      - كتابة
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - file_path
            - coordinates
            - value
          properties:
            file_path:
              type: string
              description: المسار الكامل للملف
              example: /home/user/documents/report.xlsx
            coordinates:
              type: string
              description: إحداثيات الخلية
              example: A1
            value:
              type: string
              description: القيمة الجديدة
              example: نص جديد
            sheet_name:
              type: string
              description: اسم ورقة العمل (اختياري)
              example: Sheet1
            output_path:
              type: string
              description: مسار الحفظ الجديد (اختياري)
              example: /home/user/documents/report_modified.xlsx
            preserve_format:
              type: boolean
              description: الحفاظ على التنسيق الأصلي
              default: true
              example: true
        examples:
          write_text:
            summary: تعديل خلية نصية
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "coordinates": "A1",
                "value": "اسم الشركة"
              }
          write_number:
            summary: تعديل خلية رقمية
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "coordinates": "B2",
                "value": 99
              }
          write_arabic:
            summary: تعديل بنص عربي
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "coordinates": "C3",
                "value": "اسم عربي جديد"
              }
          write_with_format:
            summary: تعديل مع الحفاظ على التنسيق
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "coordinates": "A1",
                "value": "تم التحديث",
                "preserve_format": true
              }
    responses:
      200:
        description: تم تعديل الخلية بنجاح
        examples:
          application/json:
            success:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "coordinates": "A1",
                    "old_value": "اسم قديم",
                    "new_value": "اسم جديد",
                    "sheet": "Sheet1",
                    "format_preserved": true
                  }
                }
              en: |
                {
                  "success": true,
                  "data": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "coordinates": "A1",
                    "old_value": "Old Name",
                    "new_value": "New Name",
                    "sheet": "Sheet1",
                    "format_preserved": true
                  }
                }
      400:
        description: طلب غير صالح
        examples:
          application/json:
            missing_coordinate:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمة coordinates مطلوبة"
                  }
                }
            invalid_coordinate:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "INVALID_CELL_COORDINATES",
                    "الرسالة": "إحداثيات الخلية غير صالحة: 1A. الصيغة الصحيحة: A1 أو B2 أو C10"
                  }
                }
      403:
        description: ليس لديك صلاحيات كافية
        examples:
          application/json:
            permission_denied:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "FILE_PERMISSION_ERROR",
                    "الرسالة": "ليس لديك صلاحيات كافية للوصول إلى الملف: /root/protected.xlsx"
                  }
                }
      404:
        description: الملف غير موجود
        examples:
          application/json:
            file_not_found:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "FILE_NOT_FOUND",
                    "الرسالة": "الملف غير موجود: /home/user/documents/missing.xlsx"
                  }
                }
      500:
        description: خطأ في حفظ الملف
        examples:
          application/json:
            save_error:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "FILE_SAVE_ERROR",
                    "الرسالة": "خطأ في حفظ الملف: /home/user/documents/readonly.xlsx"
                  }
                }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "نجاح": False,
                "خطأ": {
                    "الرمز": "MISSING_DATA",
                    "الرسالة": "بيانات غير صالحة"
                }
            }), 400

        required_fields = ['file_path', 'coordinates', 'value']
        for field in required_fields:
            if field not in data:
                lang = get_language()
                if lang == 'ar':
                    return jsonify({
                        "نجاح": False,
                        "خطأ": {
                            "الرمز": "MISSING_PARAMETER",
                            "الرسالة": f"معلمة {field} مطلوبة"
                        }
                    }), 400
                else:
                    return jsonify({
                        "success": False,
                        "error": {
                            "code": "MISSING_PARAMETER",
                            "message": f"{field} parameter is required"
                        }
                    }), 400

        file_path = data['file_path']
        coordinates = data['coordinates']
        value = data['value']
        sheet_name = data.get('sheet_name')
        output_path = data.get('output_path')
        preserve_format = data.get('preserve_format', True)

        with ExcelEditor(file_path) as editor:
            result = editor.update_cell(coordinates, value, sheet_name, preserve_format)
            editor.save(output_path)

            return success_response({
                "file_path": output_path or file_path,
                "coordinates": coordinates,
                "old_value": result['old_value'],
                "new_value": value,
                "sheet": result['sheet'],
                "format_preserved": preserve_format
            })

    except ExcelProcessorError as e:
        return error_response(e, 400)
    except Exception as e:
        return error_response(handle_exception(e), 500)


@app.route('/api/v1/write/batch', methods=['POST'])
def batch_write_excel():
    """
    تعديل عدة خلايا دفعة واحدة - يحفظ الملف بعد كل التعديلات
    ---
    tags:
      - كتابة
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - file_path
            - updates
          properties:
            file_path:
              type: string
              description: المسار الكامل للملف
              example: /home/user/documents/report.xlsx
            updates:
              type: object
              description: قاموس من الإحداثيات إلى القيم
              example: {"A1": "قيمة1", "B2": 100, "C3": "قيمة3"}
            sheet_name:
              type: string
              description: اسم ورقة العمل (اختياري)
              example: Sheet1
            output_path:
              type: string
              description: مسار الحفظ الجديد (اختياري)
              example: /home/user/documents/report_modified.xlsx
            preserve_format:
              type: boolean
              description: الحفاظ على التنسيق الأصلي
              default: true
        examples:
          batch_success:
            summary: تعديل عدة خلايا بنجاح
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "updates": {
                  "A1": "العنوان",
                  "B2": 100,
                  "C3": "قيمة نصية"
                }
              }
          batch_mixed:
            summary: تعديل مع فشل جزئي
            value: |
              {
                "file_path": "/home/user/documents/report.xlsx",
                "updates": {
                  "A1": "جديد",
                  "INVALID": "فاشل"
                }
              }
    responses:
      200:
        description: تم تنفيذ التعديلات
        examples:
          application/json:
            all_success:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "total_updated": 3,
                    "total_failed": 0,
                    "successful_cells": [
                      {"coordinates": "A1", "old_value": "قديم", "new_value": "جديد"},
                      {"coordinates": "B2", "old_value": 100, "new_value": 200},
                      {"coordinates": "C3", "old_value": "نص", "new_value": "نص محدث"}
                    ],
                    "failed_cells": []
                  }
                }
            partial_success:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "total_updated": 2,
                    "total_failed": 1,
                    "successful_cells": [
                      {"coordinates": "A1", "old_value": "قديم", "new_value": "جديد"},
                      {"coordinates": "B2", "old_value": 100, "new_value": 200}
                    ],
                    "failed_cells": [
                      {"coordinates": "INVALID", "error": "INVALID_CELL_COORDINATES"}
                    ]
                  }
                }
      400:
        description: طلب غير صالح
        examples:
          application/json:
            missing_params:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمات file_path و updates مطلوبة"
                  }
                }
    """
    try:
        data = request.get_json()

        if not data or 'file_path' not in data or 'updates' not in data:
            return jsonify({
                "نجاح": False,
                "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمات file_path و updates مطلوبة"
                }
            }), 400

        file_path = data['file_path']
        updates = data['updates']
        sheet_name = data.get('sheet_name')
        output_path = data.get('output_path')
        preserve_format = data.get('preserve_format', True)

        with ExcelEditor(file_path) as editor:
            result = editor.update_multiple_cells(updates, sheet_name, preserve_format)
            editor.save(output_path)

            return success_response({
                "file_path": output_path or file_path,
                "total_updated": result['total_updated'],
                "total_failed": result['total_failed'],
                "successful_cells": result['successful'],
                "failed_cells": result['failed']
            })

    except ExcelProcessorError as e:
        return error_response(e, 400)
    except Exception as e:
        return error_response(handle_exception(e), 500)


@app.route('/api/v1/sheets', methods=['GET'])
def get_sheets():
    """
    الحصول على قائمة أوراق العمل في ملف Excel
    ---
    tags:
      - أوراق العمل
    parameters:
      - name: file_path
        in: query
        type: string
        required: true
        description: المسار الكامل للملف
        example: /home/user/documents/report.xlsx
      - name: lang
        in: query
        type: string
        required: false
        enum: [ar, en]
        default: ar
        description: لغة الاستجابة
    responses:
      200:
        description: قائمة أوراق العمل
        examples:
          application/json:
            success:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "sheets": ["Sheet1", "البيانات", "الإجمالي", "Summary"],
                    "count": 4
                  }
                }
              en: |
                {
                  "success": true,
                  "data": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "sheets": ["Sheet1", "Data", "Summary"],
                    "count": 3
                  }
                }
      400:
        description: معامل مفقود
        examples:
          application/json:
            missing_file_path:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمة file_path مطلوبة"
                  }
                }
      404:
        description: الملف غير موجود
        examples:
          application/json:
            file_not_found:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "FILE_NOT_FOUND",
                    "الرسالة": "الملف غير موجود: /home/user/documents/missing.xlsx"
                  }
                }
    """
    try:
        file_path = request.args.get('file_path')

        if not file_path:
            return jsonify({
                "نجاح": False,
                "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمة file_path مطلوبة"
                }
            }), 400

        with ExcelReader(file_path) as reader:
            sheets = reader.get_sheet_names()
            return success_response({
                "file_path": file_path,
                "sheets": sheets,
                "count": len(sheets)
            })

    except ExcelProcessorError as e:
        return error_response(e, 400)
    except Exception as e:
        return error_response(handle_exception(e), 500)


@app.route('/api/v1/cell/info', methods=['GET'])
def get_cell_info():
    """
    الحصول على معلومات الخلية والتنسيق - نوع الخط، اللون، المحاذاة
    ---
    tags:
      - قراءة
    parameters:
      - name: file_path
        in: query
        type: string
        required: true
        description: المسار الكامل للملف
        example: /home/user/documents/report.xlsx
      - name: coordinates
        in: query
        type: string
        required: true
        description: إحداثيات الخلية
        example: A1
      - name: sheet_name
        in: query
        type: string
        required: false
        description: اسم ورقة العمل
        example: Sheet1
    responses:
      200:
        description: معلومات الخلية
        examples:
          application/json:
            success:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "coordinates": "A1",
                    "value": "عنوان التقرير",
                    "format": {
                      "font": {
                        "name": "Arial",
                        "size": 14,
                        "bold": true,
                        "italic": false,
                        "color": "FF000000"
                      },
                      "fill": {
                        "pattern_type": "solid",
                        "fg_color": "FFFFFF00"
                      },
                      "alignment": {
                        "horizontal": "center",
                        "vertical": "center"
                      },
                      "number_format": "General"
                    },
                    "sheet": "البيانات"
                  }
                }
            no_format:
              ar: |
                {
                  "نجاح": true,
                  "بيانات": {
                    "file_path": "/home/user/documents/report.xlsx",
                    "coordinates": "D5",
                    "value": "قيمة بدون تنسيق",
                    "format": {},
                    "sheet": "Sheet1"
                  }
                }
      400:
        description: معاملات مفقودة
        examples:
          application/json:
            missing_params:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمات file_path و coordinates مطلوبة"
                  }
                }
      404:
        description: الملف غير موجود
        examples:
          application/json:
            file_not_found:
              ar: |
                {
                  "نجاح": false,
                  "خطأ": {
                    "الرمز": "FILE_NOT_FOUND",
                    "الرسالة": "الملف غير موجود: /home/user/documents/missing.xlsx"
                  }
                }
    """
    try:
        file_path = request.args.get('file_path')
        coordinates = request.args.get('coordinates')
        sheet_name = request.args.get('sheet_name')

        if not file_path or not coordinates:
            return jsonify({
                "نجاح": False,
                "خطأ": {
                    "الرمز": "MISSING_PARAMETER",
                    "الرسالة": "معلمات file_path و coordinates مطلوبة"
                }
            }), 400

        with ExcelReader(file_path) as reader:
            value = reader.read_cell(coordinates, sheet_name)
            format_info = reader.get_cell_format(coordinates, sheet_name)

            return success_response({
                "file_path": file_path,
                "coordinates": coordinates,
                "value": value,
                "format": format_info,
                "sheet": sheet_name or reader.get_sheet_names()[0]
            })

    except ExcelProcessorError as e:
        return error_response(e, 400)
    except Exception as e:
        return error_response(handle_exception(e), 500)


@app.errorhandler(404)
def not_found(error):
    """
    معالجة خطأ 404 - الصفحة غير موجودة
    ---
    tags:
      - عام
    responses:
      404:
        description: المسار المطلوب غير موجود
        examples:
          application/json:
            ar: |
              {
                "نجاح": false,
                "خطأ": {
                  "الرمز": "NOT_FOUND",
                  "الرسالة": "المسار المطلوب غير موجود"
                }
              }
            en: |
              {
                "success": false,
                "error": {
                  "code": "NOT_FOUND",
                  "message": "The requested endpoint does not exist"
                }
              }
    """
    lang = get_language()
    if lang == 'ar':
        return jsonify({
            "نجاح": False,
            "خطأ": {
                "الرمز": "NOT_FOUND",
                "الرسالة": "المسار المطلوب غير موجود"
            }
        }), 404
    else:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested endpoint does not exist"
            }
        }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    """
    معالجة خطأ 405 - الطريقة غير مسموحة
    ---
    tags:
      - عام
    responses:
      405:
        description: الطريقة المستخدمة غير مسموحة لهذا المسار
        examples:
          application/json:
            ar: |
              {
                "نجاح": false,
                "خطأ": {
                  "الرمز": "METHOD_NOT_ALLOWED",
                  "الرسالة": "الطريقة المستخدمة غير مسموحة لهذا المسار"
                }
              }
    """
    lang = get_language()
    if lang == 'ar':
        return jsonify({
            "نجاح": False,
            "خطأ": {
                "الرمز": "METHOD_NOT_ALLOWED",
                "الرسالة": "الطريقة المستخدمة غير مسموحة لهذا المسار"
            }
        }), 405
    else:
        return jsonify({
            "success": False,
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": "The method is not allowed for this endpoint"
            }
        }), 405


@app.errorhandler(500)
def internal_error(error):
    """
    معالجة خطأ 500 - خطأ داخلي في الخادم
    ---
    tags:
      - عام
    responses:
      500:
        description: حدث خطأ داخلي في الخادم
        examples:
          application/json:
            ar: |
              {
                "نجاح": false,
                "خطأ": {
                  "الرمز": "INTERNAL_ERROR",
                  "الرسالة": "حدث خطأ داخلي في الخادم"
                }
              }
    """
    lang = get_language()
    if lang == 'ar':
        return jsonify({
            "نجاح": False,
            "خطأ": {
                "الرمز": "INTERNAL_ERROR",
                "الرسالة": "حدث خطأ داخلي في الخادم"
            }
        }), 500
    else:
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal server error occurred"
            }
        }), 500


def run_server(host: str = '0.0.0.0', port: int = 5000, debug: bool = False):
    """تشغيل الخادم"""
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    import os
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    run_server(debug=debug)
