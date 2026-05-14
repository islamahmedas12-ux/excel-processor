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

// ── File API Config ────────────────────────────────────────────────────────────

export interface FileConfig {
  inputs: string[];
  outputs: string[];
  sheet: string | null;
}

export interface FileConfigResponse {
  success: boolean;
  config: FileConfig;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface ApiKeyCreateResponse {
  success: boolean;
  warning: string;
  api_key: {
    id: string;
    name: string;
    key: string;
    key_prefix: string;
    created_at: string;
  };
}

export interface ApiKeyListResponse {
  success: boolean;
  api_keys: ApiKey[];
}

// ── File Run ─────────────────────────────────────────────────────────────────

export interface RunFileResponse {
  outputs: Record<string, any>;
}
