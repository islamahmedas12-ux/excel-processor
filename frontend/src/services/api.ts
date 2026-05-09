import axios, { AxiosInstance } from 'axios';
import type { FileEntry } from '../context/FilesContext';

export interface VerifyToken {
  id: string;
  access_code: string;
  owner_email: string;
  resource_type: 'file' | 'result';
  resource_id: string;
  filename: string;
  size_bytes: number;
  is_active: boolean;
  created_at: string;
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

export interface Job {
  id: string;
  owner_email: string;
  job_type: string;
  status: JobStatus;
  params: Record<string, any>;
  error: string | null;
  result_ext: string | null;
  created_at: string;
  updated_at: string;
}

const TOKEN_KEY = 'excel_processor_token';

class ExcelApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
      timeout: 30000,
    });

    // Attach JWT on every request
    this.client.interceptors.request.use(config => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    // On 401, clear token so the app shows login again
    this.client.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('excel_processor_user');
          window.location.reload();
        }
        return Promise.reject(err);
      }
    );
  }

  // -------------------------------------------------------------------------
  // File Repository
  // -------------------------------------------------------------------------

  async listFiles(): Promise<FileEntry[]> {
    const res = await this.client.get('/api/v1/files');
    return res.data.files;
  }

  async uploadFile(file: File, categoryId?: string | null): Promise<FileEntry> {
    const formData = new FormData();
    formData.append('file', file);
    if (categoryId) formData.append('category_id', categoryId);
    const res = await this.client.post('/api/v1/files', formData);
    return res.data.file;
  }

  async assignFileCategory(fileId: string, categoryId: string | null): Promise<void> {
    await this.client.patch(`/api/v1/files/${fileId}`, { category_id: categoryId });
  }

  async deleteFile(id: string): Promise<void> {
    await this.client.delete(`/api/v1/files/${id}`);
  }

  // -------------------------------------------------------------------------
  // Excel Operations (use file_id from repository)
  // -------------------------------------------------------------------------

  async readCells(fileId: string, cells: string, sheetName?: string, lang: 'ar' | 'en' = 'ar'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('cells', cells);
    if (sheetName) formData.append('sheet_name', sheetName);
    const res = await this.client.post(`/api/v1/read?lang=${lang}`, formData);
    return res.data;
  }

  async writeCells(fileId: string, updates: Record<string, any>, sheetName?: string, lang: 'ar' | 'en' = 'ar'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('updates', JSON.stringify(updates));
    if (sheetName) formData.append('sheet_name', sheetName);
    const res = await this.client.post(`/api/v1/write?lang=${lang}`, formData);
    return res.data;
  }

  async getSheets(fileId: string): Promise<string[]> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    const res = await this.client.post('/api/v1/sheets', formData);
    return res.data.data?.sheets || [];
  }

  async execute(fileId: string, inputs: Record<string, any>, outputs: string[], sheetName?: string, lang: 'ar' | 'en' = 'ar'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('inputs', JSON.stringify(inputs));
    formData.append('outputs', outputs.join(','));
    if (sheetName) formData.append('sheet_name', sheetName);
    const res = await this.client.post(`/api/v1/execute?lang=${lang}`, formData);
    return res.data;
  }

  async exportPdf(fileId: string, sheets: string[] | 'all' = 'all'): Promise<Blob> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('sheets', sheets === 'all' ? 'all' : sheets.join(','));
    const res = await this.client.post('/api/v1/export/pdf', formData, { responseType: 'blob' });
    return res.data;
  }

  async exportPdfSave(fileId: string, sheets: string[] | 'all' = 'all'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('sheets', sheets === 'all' ? 'all' : sheets.join(','));
    formData.append('save_result', 'true');
    const res = await this.client.post('/api/v1/export/pdf', formData);
    return res.data;
  }

  async exportPdfAsync(fileId: string, sheets: string[] | 'all' = 'all'): Promise<Job> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('sheets', sheets === 'all' ? 'all' : sheets.join(','));
    const res = await this.client.post('/api/v1/export/pdf?async=true', formData);
    return res.data.job;
  }

  // -------------------------------------------------------------------------
  // Async Jobs
  // -------------------------------------------------------------------------

  async listJobs(): Promise<Job[]> {
    const res = await this.client.get('/api/v1/jobs');
    return res.data.jobs;
  }

  async getJob(jobId: string): Promise<Job> {
    const res = await this.client.get(`/api/v1/jobs/${jobId}`);
    return res.data.job;
  }

  async downloadJob(jobId: string): Promise<Blob> {
    const res = await this.client.get(`/api/v1/jobs/${jobId}/download`, { responseType: 'blob' });
    return res.data;
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.client.delete(`/api/v1/jobs/${jobId}`);
  }

  // -------------------------------------------------------------------------
  // Image & QR Injection
  // -------------------------------------------------------------------------

  async insertImage(options: {
    fileId: string;
    image: File;
    cell?: string;
    sheetName?: string;
    widthPx?: number;
    heightPx?: number;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('file_id',  options.fileId);
    formData.append('image',    options.image);
    if (options.cell)      formData.append('cell',       options.cell);
    if (options.sheetName) formData.append('sheet_name', options.sheetName);
    if (options.widthPx)   formData.append('width_px',  String(options.widthPx));
    if (options.heightPx)  formData.append('height_px', String(options.heightPx));
    const res = await this.client.post('/api/v1/insert/image', formData);
    return res.data;
  }

  async insertQr(options: {
    fileId: string;
    qrData?: string;
    accessCode?: string;
    cell?: string;
    sheetName?: string;
    sizePx?: number;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', options.fileId);
    if (options.qrData)     formData.append('qr_data',     options.qrData);
    if (options.accessCode) formData.append('access_code', options.accessCode);
    if (options.cell)       formData.append('cell',        options.cell);
    if (options.sheetName)  formData.append('sheet_name',  options.sheetName);
    if (options.sizePx)     formData.append('size_px',     String(options.sizePx));
    const res = await this.client.post('/api/v1/insert/qr', formData);
    return res.data;
  }

  // -------------------------------------------------------------------------
  // PDF Merge
  // -------------------------------------------------------------------------

  async mergePdfs(options: {
    resultIds: string[];
    coverTitle?: string;
    coverSubtitle?: string;
    coverDate?: string;
    outputName?: string;
    saveResult?: boolean;
  }): Promise<Blob | { result: any }> {
    const formData = new FormData();
    formData.append('result_ids', options.resultIds.join(','));
    if (options.coverTitle)    formData.append('cover_title',    options.coverTitle);
    if (options.coverSubtitle) formData.append('cover_subtitle', options.coverSubtitle);
    if (options.coverDate)     formData.append('cover_date',     options.coverDate);
    if (options.outputName)    formData.append('output_name',    options.outputName);
    if (options.saveResult)    formData.append('save_result',    'true');

    if (options.saveResult) {
      const res = await this.client.post('/api/v1/pdf/merge', formData);
      return res.data;
    }
    const res = await this.client.post('/api/v1/pdf/merge', formData, { responseType: 'blob' });
    return res.data as Blob;
  }

  // -------------------------------------------------------------------------
  // Verification Tokens
  // -------------------------------------------------------------------------

  async createToken(resourceType: 'file' | 'result', resourceId: string): Promise<{ token: VerifyToken; existing: boolean }> {
    const res = await this.client.post('/api/v1/tokens', { resource_type: resourceType, resource_id: resourceId });
    return { token: res.data.token, existing: !!res.data.existing };
  }

  async listTokens(): Promise<VerifyToken[]> {
    const res = await this.client.get('/api/v1/tokens');
    return res.data.tokens;
  }

  async deleteToken(tokenId: string): Promise<void> {
    await this.client.delete(`/api/v1/tokens/${tokenId}`);
  }

  // -------------------------------------------------------------------------
  // Template Library
  // -------------------------------------------------------------------------

  async uploadTemplate(file: File, name?: string, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (name)        formData.append('name',        name);
    if (description) formData.append('description', description);
    const res = await this.client.post('/api/v1/templates', formData);
    return res.data.template;
  }

  async listTemplates(): Promise<any[]> {
    const res = await this.client.get('/api/v1/templates');
    return res.data.templates;
  }

  async updateTemplate(id: string, name?: string, description?: string): Promise<any> {
    const res = await this.client.patch(`/api/v1/templates/${id}`, { name, description });
    return res.data.template;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.client.delete(`/api/v1/templates/${id}`);
  }

  async useTemplate(id: string): Promise<any> {
    const res = await this.client.post(`/api/v1/templates/${id}/use`);
    return res.data.result;
  }

  async downloadTemplate(id: string): Promise<Blob> {
    const res = await this.client.get(`/api/v1/templates/${id}/download`, { responseType: 'blob' });
    return res.data;
  }

  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------

  async getProfile(): Promise<any> {
    const res = await this.client.get('/api/v1/auth/profile');
    return res.data.profile;
  }

  async updateProfile(username?: string, bio?: string): Promise<any> {
    const res = await this.client.patch('/api/v1/auth/profile', { username, bio });
    return res.data.profile;
  }

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await this.client.post('/api/v1/auth/profile/avatar', formData);
    return res.data.avatar_url;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/api/v1/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  async listCategories(): Promise<any[]> {
    const res = await this.client.get('/api/v1/categories');
    return res.data.categories || [];
  }

  async createCategory(name: string, color: string): Promise<any> {
    const res = await this.client.post('/api/v1/categories', { name, color });
    return res.data.category;
  }

  async updateCategory(id: string, name: string, color: string): Promise<any> {
    const res = await this.client.put(`/api/v1/categories/${id}`, { name, color });
    return res.data.category;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.client.delete(`/api/v1/categories/${id}`);
  }

  // -------------------------------------------------------------------------
  // Results
  // -------------------------------------------------------------------------

  async listResults(kind?: 'xlsx' | 'pdf'): Promise<any[]> {
    const url = kind ? `/api/v1/results?kind=${kind}` : '/api/v1/results';
    const res = await this.client.get(url);
    return res.data.results || [];
  }

  async deleteResult(id: string): Promise<void> {
    await this.client.delete(`/api/v1/results/${id}`);
  }

  async downloadResult(id: string): Promise<Blob> {
    const res = await this.client.get(`/api/v1/results/${id}/download`, { responseType: 'blob' });
    return res.data;
  }

  async exportResultToPdf(resultId: string, sheets?: string[]): Promise<any> {
    const formData = new FormData();
    if (sheets && sheets.length > 0) formData.append('sheets', sheets.join(','));
    const res = await this.client.post(`/api/v1/results/${resultId}/export-pdf`, formData);
    return res.data.result;
  }

  async healthCheck(): Promise<any> {
    const res = await this.client.get('/api/v1/health');
    return res.data;
  }
}

export const apiService = new ExcelApiService();
export default apiService;
