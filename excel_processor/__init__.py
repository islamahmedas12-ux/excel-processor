"""
نظام معالجة ملفات Excel
=====================
وحدة Python شاملة للتعامل مع ملفات Excel بصيغتي .xlsx و .xls
مع دعم القراءة والتعديل والحفاظ على التنسيق
"""

from .errors import (
    ExcelProcessorError,
    FileNotFoundError_,
    InvalidFilePathError,
    UnsupportedFormatError,
    InvalidCellCoordinatesError,
    SheetNotFoundError,
    CellReadError,
    CellWriteError,
    FileSaveError,
    FilePermissionError,
    InvalidLanguageError,
    CorruptedFileError,
    EmptyFileError,
    get_error_response,
    handle_exception
)

from .validators import (
    validate_file_path,
    validate_file_format,
    validate_cell_coordinates,
    validate_language,
    validate_sheet_name,
    column_to_number,
    number_to_column,
    parse_cell_reference,
    SUPPORTED_FORMATS
)

from .file_reader import (
    ExcelReader,
    read_excel_file,
    read_cell_value
)

from .file_editor import (
    ExcelEditor,
    modify_excel_cell,
    modify_multiple_excel_cells
)

from .api_service import (
    app,
    run_server
)

__version__ = "1.0.0"
__author__ = "Excel Processor Team"

__all__ = [
    "ExcelProcessorError",
    "FileNotFoundError_",
    "InvalidFilePathError",
    "UnsupportedFormatError",
    "InvalidCellCoordinatesError",
    "SheetNotFoundError",
    "CellReadError",
    "CellWriteError",
    "FileSaveError",
    "FilePermissionError",
    "InvalidLanguageError",
    "CorruptedFileError",
    "EmptyFileError",
    "get_error_response",
    "handle_exception",
    "validate_file_path",
    "validate_file_format",
    "validate_cell_coordinates",
    "validate_language",
    "validate_sheet_name",
    "column_to_number",
    "number_to_column",
    "parse_cell_reference",
    "SUPPORTED_FORMATS",
    "ExcelReader",
    "read_excel_file",
    "read_cell_value",
    "ExcelEditor",
    "modify_excel_cell",
    "modify_multiple_excel_cells",
    "app",
    "run_server"
]
