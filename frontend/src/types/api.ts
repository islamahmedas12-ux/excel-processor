export interface ApiResponse<T = any> {
  نجاح?: boolean;
  success?: boolean;
  بيانات?: T;
  data?: T;
  رسالة?: string;
  message?: string;
  خطأ?: {
    الرمز: string;
    الرسالة: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ExcelCellFormat {
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  fill?: {
    pattern_type?: string;
    fg_color?: string;
  };
  alignment?: {
    horizontal?: string;
    vertical?: string;
  };
  number_format?: string;
}

export interface ReadCellRequest {
  file_path: string;
  sheet_name?: string;
  coordinates?: string;
}

export interface ReadCellResponse {
  file_path: string;
  coordinates: string;
  value: any;
  sheet: string;
}

export interface ReadAllDataResponse {
  file_path: string;
  sheets: string[];
  data: any[][];
  dimensions: {
    rows: number;
    columns: number;
  };
}

export interface WriteCellRequest {
  file_path: string;
  coordinates: string;
  value: any;
  sheet_name?: string;
  output_path?: string;
  preserve_format?: boolean;
}

export interface WriteCellResponse {
  file_path: string;
  coordinates: string;
  old_value: any;
  new_value: any;
  sheet: string;
  format_preserved: boolean;
}

export interface BatchWriteRequest {
  file_path: string;
  updates: Record<string, any>;
  sheet_name?: string;
  output_path?: string;
  preserve_format?: boolean;
}

export interface BatchWriteResponse {
  file_path: string;
  total_updated: number;
  total_failed: number;
  successful_cells: Array<{
    coordinates: string;
    old_value: any;
    new_value: any;
  }>;
  failed_cells: Array<{
    coordinates: string;
    error: string;
  }>;
}

export interface SheetsResponse {
  file_path: string;
  sheets: string[];
  count: number;
}

export interface CellInfoResponse {
  file_path: string;
  coordinates: string;
  value: any;
  format: ExcelCellFormat;
  sheet: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
}
