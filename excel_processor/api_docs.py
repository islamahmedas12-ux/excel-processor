"""
توثيق واجهة برمجة التطبيقات (API)
=================================
وثيقة شاملة لواجهة برمجة تطبيقات معالجة ملفات Excel
"""

API_VERSION = "1.0.0"
BASE_URL = "/api/v1"

LANGUAGES = {
    "ar": "العربية",
    "en": "English"
}

SUPPORTED_FORMATS = [".xlsx", ".xls"]


ENDPOINTS = {
    "home": {
        "method": "GET",
        "path": "/",
        "description_ar": "الصفحة الرئيسية",
        "description_en": "Home page",
        "parameters": [],
        "response": {
            "success": {
                "ar": {
                    "نجاح": True,
                    "رسالة": "مرحباً بك في واجهة برمجة تطبيقات معالجة ملفات Excel",
                    "إصدار": "1.0.0",
                    "اللغة": "العربية"
                },
                "en": {
                    "success": True,
                    "message": "Welcome to Excel File Processing API",
                    "version": "1.0.0",
                    "language": "English"
                }
            }
        }
    },

    "health": {
        "method": "GET",
        "path": "/api/v1/health",
        "description_ar": "فحص صحة النظام",
        "description_en": "System health check",
        "parameters": [
            {
                "name": "lang",
                "type": "string",
                "required": False,
                "values": ["ar", "en"],
                "default": "ar",
                "description_ar": "اللغة المطلوبة",
                "description_en": "Desired language"
            }
        ],
        "response": {
            "success_ar": {
                "نجاح": True,
                "الحالة": "نشط",
                "الرسالة": "النظام يعمل بشكل صحيح"
            },
            "success_en": {
                "success": True,
                "status": "active",
                "message": "System is running correctly"
            }
        }
    },

    "read": {
        "method": "POST",
        "path": "/api/v1/read",
        "description_ar": "قراءة بيانات من ملف Excel",
        "description_en": "Read data from Excel file",
        "parameters": [
            {
                "name": "file_path",
                "type": "string",
                "required": True,
                "description_ar": "المسار الكامل للملف",
                "description_en": "Full file path"
            },
            {
                "name": "sheet_name",
                "type": "string",
                "required": False,
                "description_ar": "اسم ورقة العمل",
                "description_en": "Sheet name"
            },
            {
                "name": "coordinates",
                "type": "string",
                "required": False,
                "pattern": "^[A-Za-z]+[1-9][0-9]*$",
                "example": "A1, B2, C10",
                "description_ar": "إحداثيات الخلية",
                "description_en": "Cell coordinates"
            }
        ],
        "response": {
            "success": {
                "نجاح": True,
                "بيانات": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "A1",
                    "value": "cell value",
                    "sheet": "Sheet1"
                }
            },
            "error": {
                "نجاح": False,
                "خطأ": {
                    "الرمز": "FILE_NOT_FOUND",
                    "الرسالة": "الملف غير موجود"
                }
            }
        },
        "examples": [
            {
                "lang": "ar",
                "description": "قراءة جميع البيانات",
                "request": {
                    "file_path": "/path/to/file.xlsx"
                }
            },
            {
                "lang": "en",
                "description": "Read all data",
                "request": {
                    "file_path": "/path/to/file.xlsx"
                }
            },
            {
                "lang": "ar",
                "description": "قراءة خلية محددة",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "A1"
                }
            },
            {
                "lang": "en",
                "description": "Read specific cell",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "A1"
                }
            }
        ]
    },

    "write": {
        "method": "POST",
        "path": "/api/v1/write",
        "description_ar": "تعديل خلية في ملف Excel",
        "description_en": "Modify cell in Excel file",
        "parameters": [
            {
                "name": "file_path",
                "type": "string",
                "required": True,
                "description_ar": "المسار الكامل للملف",
                "description_en": "Full file path"
            },
            {
                "name": "coordinates",
                "type": "string",
                "required": True,
                "pattern": "^[A-Za-z]+[1-9][0-9]*$",
                "example": "A1, B2, C10",
                "description_ar": "إحداثيات الخلية",
                "description_en": "Cell coordinates"
            },
            {
                "name": "value",
                "type": "any",
                "required": True,
                "description_ar": "القيمة الجديدة",
                "description_en": "New value"
            },
            {
                "name": "sheet_name",
                "type": "string",
                "required": False,
                "description_ar": "اسم ورقة العمل",
                "description_en": "Sheet name"
            },
            {
                "name": "output_path",
                "type": "string",
                "required": False,
                "description_ar": "مسار الحفظ الجديد",
                "description_en": "New save path"
            },
            {
                "name": "preserve_format",
                "type": "boolean",
                "required": False,
                "default": True,
                "description_ar": "الحفاظ على التنسيق الأصلي",
                "description_en": "Preserve original formatting"
            }
        ],
        "response": {
            "success": {
                "نجاح": True,
                "بيانات": {
                    "file_path": "/path/to/output.xlsx",
                    "coordinates": "A1",
                    "old_value": "Original",
                    "new_value": "Modified",
                    "sheet": "Sheet1",
                    "format_preserved": True
                }
            }
        },
        "examples": [
            {
                "lang": "ar",
                "description": "تعديل خلية نصية",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "A1",
                    "value": "نص جديد"
                }
            },
            {
                "lang": "en",
                "description": "Modify text cell",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "A1",
                    "value": "New text"
                }
            },
            {
                "lang": "ar",
                "description": "تعديل خلية رقمية",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "B2",
                    "value": 99
                }
            },
            {
                "lang": "en",
                "description": "Modify numeric cell",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "B2",
                    "value": 99
                }
            }
        ]
    },

    "batch_write": {
        "method": "POST",
        "path": "/api/v1/write/batch",
        "description_ar": "تعديل عدة خلايا دفعة واحدة",
        "description_en": "Modify multiple cells at once",
        "parameters": [
            {
                "name": "file_path",
                "type": "string",
                "required": True,
                "description_ar": "المسار الكامل للملف",
                "description_en": "Full file path"
            },
            {
                "name": "updates",
                "type": "object",
                "required": True,
                "description_ar": "قاموس من الإحداثيات إلى القيم",
                "description_en": "Dictionary of coordinates to values"
            },
            {
                "name": "sheet_name",
                "type": "string",
                "required": False,
                "description_ar": "اسم ورقة العمل",
                "description_en": "Sheet name"
            },
            {
                "name": "output_path",
                "type": "string",
                "required": False,
                "description_ar": "مسار الحفظ الجديد",
                "description_en": "New save path"
            },
            {
                "name": "preserve_format",
                "type": "boolean",
                "required": False,
                "default": True,
                "description_ar": "الحفاظ على التنسيق الأصلي",
                "description_en": "Preserve original formatting"
            }
        ],
        "response": {
            "success": {
                "نجاح": True,
                "بيانات": {
                    "file_path": "/path/to/output.xlsx",
                    "total_updated": 3,
                    "total_failed": 0,
                    "successful_cells": [...],
                    "failed_cells": [...]
                }
            }
        },
        "examples": [
            {
                "lang": "ar",
                "description": "تعديل عدة خلايا",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "updates": {
                        "A1": "القيمة1",
                        "B2": 100,
                        "C3": "القيمة3"
                    }
                }
            },
            {
                "lang": "en",
                "description": "Modify multiple cells",
                "request": {
                    "file_path": "/path/to/file.xlsx",
                    "updates": {
                        "A1": "Value1",
                        "B2": 100,
                        "C3": "Value3"
                    }
                }
            }
        ]
    },

    "sheets": {
        "method": "GET",
        "path": "/api/v1/sheets",
        "description_ar": "الحصول على قائمة أوراق العمل",
        "description_en": "Get list of worksheets",
        "parameters": [
            {
                "name": "file_path",
                "type": "string",
                "required": True,
                "description_ar": "المسار الكامل للملف",
                "description_en": "Full file path"
            },
            {
                "name": "lang",
                "type": "string",
                "required": False,
                "values": ["ar", "en"],
                "default": "ar",
                "description_ar": "اللغة المطلوبة",
                "description_en": "Desired language"
            }
        ],
        "response": {
            "success": {
                "نجاح": True,
                "بيانات": {
                    "file_path": "/path/to/file.xlsx",
                    "sheets": ["Sheet1", "Sheet2"],
                    "count": 2
                }
            }
        }
    },

    "cell_info": {
        "method": "GET",
        "path": "/api/v1/cell/info",
        "description_ar": "الحصول على معلومات الخلية والتنسيق",
        "description_en": "Get cell information and formatting",
        "parameters": [
            {
                "name": "file_path",
                "type": "string",
                "required": True,
                "description_ar": "المسار الكامل للملف",
                "description_en": "Full file path"
            },
            {
                "name": "coordinates",
                "type": "string",
                "required": True,
                "pattern": "^[A-Za-z]+[1-9][0-9]*$",
                "description_ar": "إحداثيات الخلية",
                "description_en": "Cell coordinates"
            },
            {
                "name": "sheet_name",
                "type": "string",
                "required": False,
                "description_ar": "اسم ورقة العمل",
                "description_en": "Sheet name"
            }
        ],
        "response": {
            "success": {
                "نجاح": True,
                "بيانات": {
                    "file_path": "/path/to/file.xlsx",
                    "coordinates": "A1",
                    "value": "cell value",
                    "format": {
                        "font": {...},
                        "fill": {...},
                        "alignment": {...},
                        "number_format": "..."
                    },
                    "sheet": "Sheet1"
                }
            }
        }
    }
}


ERROR_CODES = {
    "FILE_NOT_FOUND": {
        "ar": "الملف غير موجود",
        "en": "File not found",
        "status_code": 400
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
        "status_code": 400
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
    "INTERNAL_ERROR": {
        "ar": "حدث خطأ داخلي غير متوقع",
        "en": "An unexpected internal error occurred",
        "status_code": 500
    }
}


HTTP_STATUS_CODES = {
    200: {
        "ar": "نجاح",
        "en": "Success"
    },
    400: {
        "ar": "طلب غير صالح",
        "en": "Bad Request"
    },
    403: {
        "ar": "محظور",
        "en": "Forbidden"
    },
    404: {
        "ar": "غير موجود",
        "en": "Not Found"
    },
    405: {
        "ar": "الطريقة غير مسموحة",
        "en": "Method Not Allowed"
    },
    500: {
        "ar": "خطأ داخلي في الخادم",
        "en": "Internal Server Error"
    }
}


USAGE_EXAMPLES = {
    "ar": {
        "title": "أمثلة الاستخدام",
        "examples": [
            {
                "title": "قراءة ملف Excel",
                "curl": 'curl -X POST http://localhost:5000/api/v1/read \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx", "coordinates": "A1"}\''
            },
            {
                "title": "كتابة خلية",
                "curl": 'curl -X POST http://localhost:5000/api/v1/write \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx", "coordinates": "A1", "value": "نص جديد"}\''
            },
            {
                "title": "تعديل عدة خلايا",
                "curl": 'curl -X POST http://localhost:5000/api/v1/write/batch \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx", "updates": {"A1": "val1", "B2": 100}}\''
            },
            {
                "title": "استخدام اللغة الإنجليزية",
                "curl": 'curl -X POST "http://localhost:5000/api/v1/read?lang=en" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx"}\''
            }
        ]
    },
    "en": {
        "title": "Usage Examples",
        "examples": [
            {
                "title": "Read Excel file",
                "curl": 'curl -X POST http://localhost:5000/api/v1/read \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx", "coordinates": "A1"}\''
            },
            {
                "title": "Write to cell",
                "curl": 'curl -X POST http://localhost:5000/api/v1/write \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx", "coordinates": "A1", "value": "New text"}\''
            },
            {
                "title": "Modify multiple cells",
                "curl": 'curl -X POST http://localhost:5000/api/v1/write/batch \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx", "updates": {"A1": "val1", "B2": 100}}\''
            },
            {
                "title": "Using Arabic language",
                "curl": 'curl -X POST "http://localhost:5000/api/v1/read?lang=ar" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_path": "/path/to/file.xlsx"}\''
            }
        ]
    }
}
