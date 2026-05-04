import axios, { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  ReadCellRequest,
  ReadCellResponse,
  ReadAllDataResponse,
  WriteCellRequest,
  WriteCellResponse,
  BatchWriteRequest,
  BatchWriteResponse,
  SheetsResponse,
  CellInfoResponse,
} from '../types/api';

class ExcelApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async healthCheck(lang: 'ar' | 'en' = 'ar'): Promise<ApiResponse> {
    const response = await this.client.get(`/api/v1/health?lang=${lang}`);
    return response.data;
  }

  async readCell(request: ReadCellRequest, lang: 'ar' | 'en' = 'ar'): Promise<ApiResponse<ReadCellResponse>> {
    const response = await this.client.post(`/api/v1/read?lang=${lang}`, request);
    return response.data;
  }

  async readAllData(request: Omit<ReadCellRequest, 'coordinates'>, lang: 'ar' | 'en' = 'ar'): Promise<ApiResponse<ReadAllDataResponse>> {
    const response = await this.client.post(`/api/v1/read?lang=${lang}`, request);
    return response.data;
  }

  async writeCell(request: WriteCellRequest, lang: 'ar' | 'en' = 'ar'): Promise<ApiResponse<WriteCellResponse>> {
    const response = await this.client.post(`/api/v1/write?lang=${lang}`, request);
    return response.data;
  }

  async batchWrite(request: BatchWriteRequest, lang: 'ar' | 'en' = 'ar'): Promise<ApiResponse<BatchWriteResponse>> {
    const response = await this.client.post(`/api/v1/write/batch?lang=${lang}`, request);
    return response.data;
  }

  async getSheets(filePath: string, lang: 'ar' | 'en' = 'ar'): Promise<ApiResponse<SheetsResponse>> {
    const response = await this.client.get(`/api/v1/sheets?file_path=${encodeURIComponent(filePath)}&lang=${lang}`);
    return response.data;
  }

  async getCellInfo(filePath: string, coordinates: string, sheetName?: string, lang: 'ar' | 'en' = 'ar'): Promise<ApiResponse<CellInfoResponse>> {
    let url = `/api/v1/cell/info?file_path=${encodeURIComponent(filePath)}&coordinates=${coordinates}&lang=${lang}`;
    if (sheetName) {
      url += `&sheet_name=${encodeURIComponent(sheetName)}`;
    }
    const response = await this.client.get(url);
    return response.data;
  }

  isSuccess<T>(response: ApiResponse<T>): boolean {
    return response.success === true || response.نجاح === true;
  }

  getErrorMessage(response: ApiResponse): string {
    return response.error?.message || response.خطأ?.الرسالة || 'Unknown error';
  }

  getErrorCode(response: ApiResponse): string {
    return response.error?.code || response.خطأ?.الرمز || 'UNKNOWN_ERROR';
  }
}

export const apiService = new ExcelApiService();
export default apiService;
