"""
قوالب التوثيق الشاملة لـ Swagger/OpenAPI
========================================
تتضمن قوالب موحدة مع أمثلة تفصيلية لكل أنواع الطلبات والاستجابات
قابلة لإعادة الاستخدام لأي endpoint جديد
"""

SWAGGER_TEMPLATE = {
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
            "name": "Excel Processor Team",
            "email": "support@excelprocessor.com"
        },
        "license": {
            "name": "MIT"
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
                "نجاح": {
                    "type": "boolean",
                    "example": False
                },
                "خطأ": {
                    "type": "object",
                    "properties": {
                        "الرمز": {
                            "type": "string",
                            "example": "FILE_NOT_FOUND"
                        },
                        "الرسالة": {
                            "type": "string",
                            "example": "الملف غير موجود: /path/to/file.xlsx"
                        }
                    }
                }
            },
            "xml": {"name": "ErrorResponse"}
        },
        "SuccessResponse": {
            "type": "object",
            "properties": {
                "نجاح": {
                    "type": "boolean",
                    "example": True
                },
                "بيانات": {
                    "type": "object"
                }
            },
            "xml": {"name": "SuccessResponse"}
        },
        "ReadRequest": {
            "type": "object",
            "required": ["file_path"],
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "المسار الكامل للملف",
                    "example": "/home/user/documents/report.xlsx"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "اسم ورقة العمل (اختياري)",
                    "example": "Sheet1"
                },
                "coordinates": {
                    "type": "string",
                    "description": "إحداثيات الخلية (اختياري - إذا لم يُحدد يتم قراءة كل البيانات)",
                    "example": "A1"
                }
            }
        },
        "WriteRequest": {
            "type": "object",
            "required": ["file_path", "coordinates", "value"],
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "المسار الكامل للملف",
                    "example": "/home/user/documents/report.xlsx"
                },
                "coordinates": {
                    "type": "string",
                    "description": "إحداثيات الخلية",
                    "example": "A1"
                },
                "value": {
                    "type": "string",
                    "description": "القيمة الجديدة للخلية",
                    "example": "نص جديد"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "اسم ورقة العمل (اختياري)",
                    "example": "البيانات"
                },
                "output_path": {
                    "type": "string",
                    "description": "مسار الحفظ الجديد (اختياري - يحفظ في المسار الأصلي)",
                    "example": "/home/user/documents/report_modified.xlsx"
                },
                "preserve_format": {
                    "type": "boolean",
                    "description": "الحفاظ على التنسيق الأصلي",
                    "default": True,
                    "example": True
                }
            }
        },
        "BatchWriteRequest": {
            "type": "object",
            "required": ["file_path", "updates"],
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "المسار الكامل للملف",
                    "example": "/home/user/documents/report.xlsx"
                },
                "updates": {
                    "type": "object",
                    "description": "قاموس من الإحداثيات إلى القيم",
                    "example": {
                        "A1": "العنوان",
                        "B2": 100,
                        "C3": "قيمة نصية",
                        "D4": 250.5
                    }
                },
                "sheet_name": {
                    "type": "string",
                    "description": "اسم ورقة العمل (اختياري)",
                    "example": "البيانات"
                },
                "output_path": {
                    "type": "string",
                    "description": "مسار الحفظ الجديد",
                    "example": "/home/user/documents/report_modified.xlsx"
                },
                "preserve_format": {
                    "type": "boolean",
                    "description": "الحفاظ على التنسيق الأصلي",
                    "default": True,
                    "example": True
                }
            }
        }
    },
    "responses": {
        "200": {
            "description": "نجاح - تم تنفيذ العملية بنجاح",
            "schema": {
                "type": "object",
                "properties": {
                    "نجاح": {"type": "boolean", "example": True},
                    "بيانات": {"type": "object"}
                }
            },
            "examples": {
                "application/json": {
                    "نجاح": True,
                    "بيانات": {
                        "file_path": "/path/to/file.xlsx",
                        "coordinates": "A1",
                        "value": "قيمة الخلية",
                        "sheet": "Sheet1"
                    }
                }
            }
        },
        "400": {
            "description": "طلب غير صالح - خطأ في المدخلات أو معاملات مفقودة",
            "schema": {"$ref": "#/definitions/ErrorResponse"},
            "examples": {
                "application/json": {
                    "نجاح": False,
                    "خطأ": {
                        "الرمز": "MISSING_PARAMETER",
                        "الرسالة": "معلمة file_path مطلوبة"
                    }
                }
            }
        },
        "404": {
            "description": "غير موجود - الملف أو المورد المطلوب غير موجود",
            "schema": {"$ref": "#/definitions/ErrorResponse"},
            "examples": {
                "application/json": {
                    "نجاح": False,
                    "خطأ": {
                        "الرمز": "FILE_NOT_FOUND",
                        "الرسالة": "الملف غير موجود: /path/to/file.xlsx"
                    }
                }
            }
        },
        "500": {
            "description": "خطأ داخلي - خطأ في الخادم",
            "schema": {"$ref": "#/definitions/ErrorResponse"},
            "examples": {
                "application/json": {
                    "نجاح": False,
                    "خطأ": {
                        "الرمز": "INTERNAL_ERROR",
                        "الرسالة": "حدث خطأ داخلي غير متوقع"
                    }
                }
            }
        }
    },
    "error_codes": {
        "FILE_NOT_FOUND": {
            "ar": "الملف غير موجود",
            "en": "File not found",
            "status_code": 404
        },
        "INVALID_FILE_PATH": {
            "ar": "مسار الملف غير صالح",
            "en": "Invalid file path",
            "status_code": 400
        },
        "UNSUPPORTED_FORMAT": {
            "ar": "صيغة الملف غير مدعومة",
            "en": "Unsupported file format",
            "status_code": 400
        },
        "INVALID_CELL_COORDINATES": {
            "ar": "إحداثيات الخلية غير صالحة",
            "en": "Invalid cell coordinates",
            "status_code": 400
        },
        "SHEET_NOT_FOUND": {
            "ar": "ورقة العمل غير موجودة",
            "en": "Sheet not found",
            "status_code": 404
        },
        "CELL_READ_ERROR": {
            "ar": "خطأ في قراءة الخلية",
            "en": "Error reading cell",
            "status_code": 400
        },
        "CELL_WRITE_ERROR": {
            "ar": "خطأ في كتابة الخلية",
            "en": "Error writing to cell",
            "status_code": 400
        },
        "FILE_SAVE_ERROR": {
            "ar": "خطأ في حفظ الملف",
            "en": "Error saving file",
            "status_code": 500
        },
        "FILE_PERMISSION_ERROR": {
            "ar": "ليس لديك صلاحيات كافية للوصول إلى الملف",
            "en": "Insufficient permissions to access file",
            "status_code": 403
        },
        "CORRUPTED_FILE": {
            "ar": "الملف تالف أو غير قابل للقراءة",
            "en": "File is corrupted or unreadable",
            "status_code": 400
        },
        "MISSING_PARAMETER": {
            "ar": "معلمة مطلوبة مفقودة",
            "en": "Required parameter is missing",
            "status_code": 400
        },
        "INVALID_LANGUAGE": {
            "ar": "اللغة غير مدعومة",
            "en": "Unsupported language",
            "status_code": 400
        },
        "INTERNAL_ERROR": {
            "ar": "حدث خطأ داخلي غير متوقع",
            "en": "An unexpected internal error occurred",
            "status_code": 500
        }
    }
}


EXAMPLE_RESPONSES = {
    "home": {
        "ar": {
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
        },
        "en": {
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
        }
    },

    "health": {
        "ar": {
            "نجاح": True,
            "الحالة": "نشط",
            "الرسالة": "النظام يعمل بشكل صحيح"
        },
        "en": {
            "success": True,
            "status": "active",
            "message": "System is running correctly"
        }
    },

    "read_cell": {
        "success": {
            "file_path": "/home/user/documents/report.xlsx",
            "coordinates": "A1",
            "value": "اسم المنتج",
            "sheet": "البيانات"
        },
        "error_404": {
            "نجاح": False,
            "خطأ": {
                "الرمز": "FILE_NOT_FOUND",
                "الرسالة": "الملف غير موجود: /home/user/documents/missing.xlsx"
            }
        },
        "error_400_missing": {
            "نجاح": False,
            "خطأ": {
                "الرمز": "MISSING_PARAMETER",
                "الرسالة": "معلمة file_path مطلوبة"
            }
        },
        "error_400_invalid_coords": {
            "نجاح": False,
            "خطأ": {
                "الرمز": "INVALID_CELL_COORDINATES",
                "الرسالة": "إحداثيات الخلية غير صالحة: INVALID. الصيغة الصحيحة: A1 أو B2 أو C10"
            }
        }
    },

    "read_all": {
        "success": {
            "file_path": "/home/user/documents/report.xlsx",
            "sheets": ["Sheet1", "البيانات", "الإجمالي"],
            "data": [
                ["اسم", "العمر", "المدينة"],
                ["أحمد", 25, "الرياض"],
                ["محمد", 30, "جدة"]
            ],
            "dimensions": {
                "rows": 3,
                "columns": 3
            }
        }
    },

    "write": {
        "success": {
            "file_path": "/home/user/documents/report.xlsx",
            "coordinates": "A1",
            "old_value": "اسم قديم",
            "new_value": "اسم جديد",
            "sheet": "البيانات",
            "format_preserved": True
        },
        "error_400_missing": {
            "نجاح": False,
            "خطأ": {
                "الرمز": "MISSING_PARAMETER",
                "الرسالة": "معلمة coordinates مطلوبة"
            }
        },
        "error_400_invalid": {
            "نجاح": False,
            "خطأ": {
                "الرمز": "INVALID_CELL_COORDINATES",
                "الرسالة": "إحداثيات الخلية غير صالحة: 1A"
            }
        },
        "error_403": {
            "نجاح": False,
            "خطأ": {
                "الرمز": "FILE_PERMISSION_ERROR",
                "الرسالة": "ليس لديك صلاحيات كافية للوصول إلى الملف: /root/protected.xlsx"
            }
        },
        "error_500": {
            "نجاح": False,
            "خطأ": {
                "الرمز": "FILE_SAVE_ERROR",
                "الرسالة": "خطأ في حفظ الملف: /home/user/documents/readonly.xlsx"
            }
        }
    },

    "batch_write": {
        "success": {
            "file_path": "/home/user/documents/report.xlsx",
            "total_updated": 3,
            "total_failed": 0,
            "successful_cells": [
                {"coordinates": "A1", "old_value": "قديم", "new_value": "جديد"},
                {"coordinates": "B2", "old_value": 100, "new_value": 200},
                {"coordinates": "C3", "old_value": "نص", "new_value": "نص محدث"}
            ],
            "failed_cells": []
        },
        "partial_success": {
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
    },

    "sheets": {
        "success": {
            "file_path": "/home/user/documents/report.xlsx",
            "sheets": ["Sheet1", "البيانات", "الإجمالي", "Summary"],
            "count": 4
        },
        "single_sheet": {
            "file_path": "/home/user/documents/simple.xlsx",
            "sheets": ["Sheet1"],
            "count": 1
        }
    },

    "cell_info": {
        "success": {
            "file_path": "/home/user/documents/report.xlsx",
            "coordinates": "A1",
            "value": "عنوان التقرير",
            "format": {
                "font": {
                    "name": "Arial",
                    "size": 14,
                    "bold": True,
                    "italic": False,
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
}


def generate_docstring(tags, summary_ar, summary_en, params_schema, responses_schema):
    """
    إنشاء docstring موحد للتوثيق

    المعلمات:
        tags: قائمة بالعلامات
        summary_ar: ملخص بالعربية
        summary_en: ملخص بالإنجليزية
        params_schema: مخطط المعاملات
        responses_schema: مخطط الاستجابات

    المخرجات:
        str: docstring للتوثيق
    """
    doc = f"""
    {summary_ar} / {summary_en}
    ---
    tags:
"""
    for tag in tags:
        doc += f"      - {tag}\n"

    doc += "    parameters:\n"
    if params_schema:
        doc += "      - name: body\n"
        doc += "        in: body\n"
        doc += "        required: true\n"
        doc += "        schema:\n"
        doc += f"          $ref: '#/definitions/{params_schema}'\n"

    doc += "    responses:\n"
    for code, desc in responses_schema.items():
        doc += f"      {code}:\n"
        doc += f"        description: {desc}\n"

    return doc


def create_endpoint_doc(
    endpoint: str,
    method: str,
    tags: list,
    summary_ar: str,
    summary_en: str,
    params: list = None,
    success_example: dict = None,
    error_examples: dict = None,
    notes: str = None
) -> dict:
    """
    إنشاء توثيق موحد لـ endpoint

    المعلمات:
        endpoint: مسار الـ endpoint
        method: طريقة HTTP (GET, POST, PUT, DELETE)
        tags: قائمة العلامات
        summary_ar: ملخص بالعربية
        summary_en: ملخص بالإنجليزية
        params: قائمة المعاملات
        success_example: مثال النجاح
        error_examples: أمثلة الأخطاء {code: example}
        notes: ملاحظات إضافية

    المخرجات:
        dict: قاموس التوثيق
    """
    doc = {
        "path": endpoint,
        "operations": {
            method.lower(): {
                "tags": tags,
                "summary": f"{summary_ar} / {summary_en}",
                "description": f"{summary_ar}\n\n{summary_en}",
                "parameters": [],
                "responses": {}
            }
        }
    }

    if params:
        for param in params:
            param_doc = {
                "name": param["name"],
                "in": param.get("in", "query"),
                "required": param.get("required", False),
                "type": param.get("type", "string"),
                "description": f"{param.get('description_ar', '')} / {param.get('description_en', '')}",
                "default": param.get("default"),
                "enum": param.get("enum")
            }
            if "example" in param:
                param_doc["x-example"] = param["example"]
            doc["operations"][method.lower()]["parameters"].append(param_doc)

    if success_example:
        doc["operations"][method.lower()]["responses"]["200"] = {
            "description": "نجاح - تم تنفيذ العملية بنجاح" if method in ["POST", "PUT"] else "نجاح",
            "schema": {"type": "object"},
            "examples": {
                "application/json": success_example
            }
        }

    if error_examples:
        for code, example in error_examples.items():
            doc["operations"][method.lower()]["responses"][code] = {
                "description": get_error_description(code),
                "schema": {"$ref": "#/definitions/ErrorResponse"},
                "examples": {
                    "application/json": example
                }
            }

    if notes:
        doc["operations"][method.lower()]["notes"] = notes

    return doc


def get_error_description(code: str) -> str:
    """الحصول على وصف الخطأ"""
    descriptions = {
        "400": "طلب غير صالح - خطأ في المدخلات أو معاملات مفقودة",
        "401": "غير مصرح - يتطلب تسجيل الدخول",
        "403": "محظور - ليس لديك صلاحيات كافية",
        "404": "غير موجود - الملف أو المورد المطلوب غير موجود",
        "500": "خطأ داخلي - خطأ في الخادم"
    }
    return descriptions.get(code, "خطأ")


def apply_documentation_to_endpoints(app):
    """
    تطبيق التوثيق على جميع endpoints في التطبيق

    المعلمات:
        app: تطبيق Flask
    """
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            print(f"Endpoint: {rule.rule} -> {rule.endpoint}")
