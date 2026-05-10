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

  /**
   * Retrieves a list of all files owned by the authenticated user.
   * @returns {Promise<FileEntry[]>} An array of file entries containing id, filename, size, category, and metadata.
   * @throws {Error} When the API request fails or authentication is invalid.
   */
  async listFiles(): Promise<FileEntry[]> {
    const res = await this.client.get('/api/v1/files');
    return res.data.files;
  }

  /**
   * Uploads a file to the server and optionally assigns it to a category.
   * @param {File} file - The file object to upload (from input[type="file"]).
   * @param {string | null} [categoryId] - Optional category ID to assign the file to. If not provided, file remains uncategorized.
   * @returns {Promise<FileEntry>} The created file entry with server-assigned id and metadata.
   * @throws {Error} When the upload fails, file exceeds size limits, or category does not exist.
   */
  async uploadFile(file: File, categoryId?: string | null): Promise<FileEntry> {
    const formData = new FormData();
    formData.append('file', file);
    if (categoryId) formData.append('category_id', categoryId);
    const res = await this.client.post('/api/v1/files', formData);
    return res.data.file;
  }

  /**
   * Assigns or removes a category assignment for a specific file.
   * @param {string} fileId - The unique identifier of the file to update.
   * @param {string | null} categoryId - The category ID to assign, or null to remove any existing category.
   * @returns {Promise<void>} Resolves when the category has been successfully updated.
   * @throws {Error} When the file does not exist or category assignment fails.
   */
  async assignFileCategory(fileId: string, categoryId: string | null): Promise<void> {
    await this.client.patch(`/api/v1/files/${fileId}`, { category_id: categoryId });
  }

  /**
   * Permanently deletes a file from the repository.
   * @param {string} id - The unique identifier of the file to delete.
   * @returns {Promise<void>} Resolves when the file has been successfully deleted.
   * @throws {Error} When the file does not exist or deletion fails.
   */
  async deleteFile(id: string): Promise<void> {
    await this.client.delete(`/api/v1/files/${id}`);
  }

  // -------------------------------------------------------------------------
  // Excel Operations (use file_id from repository)
  // -------------------------------------------------------------------------

  /**
   * Reads cell values from an Excel file.
   * @param {string} fileId - The unique identifier of the file to read from.
   * @param {string} cells - The cell reference or range to read (e.g., "A1" or "A1:C5").
   * @param {string} [sheetName] - Optional name of the sheet to read from. Defaults to the first active sheet.
   * @param {'ar' | 'en'} [lang='ar'] - The language for error messages ('ar' for Arabic, 'en' for English).
   * @returns {Promise<any>} An object containing the cell values and any error information.
   * @throws {Error} When the file does not exist, cells format is invalid, or the read operation fails.
   */
  async readCells(fileId: string, cells: string, sheetName?: string, lang: 'ar' | 'en' = 'ar'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('cells', cells);
    if (sheetName) formData.append('sheet_name', sheetName);
    const res = await this.client.post(`/api/v1/read?lang=${lang}`, formData);
    return res.data;
  }

  /**
   * Writes or updates cell values in an Excel file.
   * @param {string} fileId - The unique identifier of the file to write to.
   * @param {Record<string, any>} updates - An object mapping cell references to their new values (e.g., { "A1": "Hello", "B2": 42 }).
   * @param {string} [sheetName] - Optional name of the target sheet. Defaults to the first active sheet.
   * @param {'ar' | 'en'} [lang='ar'] - The language for error messages ('ar' for Arabic, 'en' for English).
   * @returns {Promise<any>} An object containing the result of the write operation and any errors.
   * @throws {Error} When the file does not exist, cell references are invalid, or the write operation fails.
   */
  async writeCells(fileId: string, updates: Record<string, any>, sheetName?: string, lang: 'ar' | 'en' = 'ar'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('updates', JSON.stringify(updates));
    if (sheetName) formData.append('sheet_name', sheetName);
    const res = await this.client.post(`/api/v1/write?lang=${lang}`, formData);
    return res.data;
  }

  /**
   * Retrieves a list of sheet names from an Excel file.
   * @param {string} fileId - The unique identifier of the file to inspect.
   * @returns {Promise<string[]>} An array of sheet names available in the file.
   * @throws {Error} When the file does not exist or cannot be parsed as an Excel file.
   */
  async getSheets(fileId: string): Promise<string[]> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    const res = await this.client.post('/api/v1/sheets', formData);
    return res.data.data?.sheets || [];
  }

  /**
   * Executes a batch of Excel operations (read/write) defined by inputs and outputs configuration.
   * @param {string} fileId - The unique identifier of the file to operate on.
   * @param {Record<string, any>} inputs - An object defining input cell references and their expected transformations.
   * @param {string[]} outputs - An array of output cell references that should be computed/updated.
   * @param {string} [sheetName] - Optional name of the sheet to operate on. Defaults to the first active sheet.
   * @param {'ar' | 'en'} [lang='ar'] - The language for error messages ('ar' for Arabic, 'en' for English).
   * @returns {Promise<any>} An object containing the execution results and any errors.
   * @throws {Error} When the file does not exist, configuration is invalid, or execution fails.
   */
  async execute(fileId: string, inputs: Record<string, any>, outputs: string[], sheetName?: string, lang: 'ar' | 'en' = 'ar'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('inputs', JSON.stringify(inputs));
    formData.append('outputs', outputs.join(','));
    if (sheetName) formData.append('sheet_name', sheetName);
    const res = await this.client.post(`/api/v1/execute?lang=${lang}`, formData);
    return res.data;
  }

  /**
   * Exports the specified sheets of an Excel file to a PDF and returns the file as a Blob.
   * @param {string} fileId - The unique identifier of the file to export.
   * @param {string[] | 'all'} [sheets='all'] - An array of sheet names to export, or 'all' to export every sheet.
   * @returns {Promise<Blob>} A Blob containing the PDF data, suitable for downloading or displaying.
   * @throws {Error} When the file does not exist, specified sheets are not found, or PDF generation fails.
   */
  async exportPdf(fileId: string, sheets: string[] | 'all' = 'all'): Promise<Blob> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('sheets', sheets === 'all' ? 'all' : sheets.join(','));
    const res = await this.client.post('/api/v1/export/pdf', formData, { responseType: 'blob' });
    return res.data;
  }

  /**
   * Exports the specified sheets of an Excel file to a PDF and saves the result to the server.
   * @param {string} fileId - The unique identifier of the file to export.
   * @param {string[] | 'all'} [sheets='all'] - An array of sheet names to export, or 'all' to export every sheet.
   * @returns {Promise<any>} An object containing metadata about the saved PDF result.
   * @throws {Error} When the file does not exist, specified sheets are not found, or saving fails.
   */
  async exportPdfSave(fileId: string, sheets: string[] | 'all' = 'all'): Promise<any> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('sheets', sheets === 'all' ? 'all' : sheets.join(','));
    formData.append('save_result', 'true');
    const res = await this.client.post('/api/v1/export/pdf', formData);
    return res.data;
  }

  /**
   * Initiates an asynchronous PDF export job for an Excel file. The job runs in the background
   * and can be polled for status using the returned Job object.
   * @param {string} fileId - The unique identifier of the file to export.
   * @param {string[] | 'all'} [sheets='all'] - An array of sheet names to export, or 'all' to export every sheet.
   * @returns {Promise<Job>} The created Job object representing the background export task.
   * @throws {Error} When the file does not exist or job creation fails.
   */
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

  /**
   * Retrieves a list of all background jobs owned by the authenticated user.
   * @returns {Promise<Job[]>} An array of Job objects representing all async tasks.
   * @throws {Error} When the API request fails or authentication is invalid.
   */
  async listJobs(): Promise<Job[]> {
    const res = await this.client.get('/api/v1/jobs');
    return res.data.jobs;
  }

  /**
   * Retrieves the details of a specific background job by its ID.
   * @param {string} jobId - The unique identifier of the job to retrieve.
   * @returns {Promise<Job>} The Job object containing status, parameters, and results.
   * @throws {Error} When the job does not exist or the API request fails.
   */
  async getJob(jobId: string): Promise<Job> {
    const res = await this.client.get(`/api/v1/jobs/${jobId}`);
    return res.data.job;
  }

  /**
   * Downloads the result file generated by a completed background job.
   * @param {string} jobId - The unique identifier of the completed job to download.
   * @returns {Promise<Blob>} A Blob containing the job result file data.
   * @throws {Error} When the job is not yet complete, does not exist, or download fails.
   */
  async downloadJob(jobId: string): Promise<Blob> {
    const res = await this.client.get(`/api/v1/jobs/${jobId}/download`, { responseType: 'blob' });
    return res.data;
  }

  /**
   * Permanently deletes a background job and its associated resources.
   * @param {string} jobId - The unique identifier of the job to delete.
   * @returns {Promise<void>} Resolves when the job has been successfully deleted.
   * @throws {Error} When the job does not exist or deletion fails.
   */
  async deleteJob(jobId: string): Promise<void> {
    await this.client.delete(`/api/v1/jobs/${jobId}`);
  }

  // -------------------------------------------------------------------------
  // Image & QR Injection
  // -------------------------------------------------------------------------

  /**
   * Inserts an image into an Excel file at a specified cell position.
   * @param {Object} options - The insertion options.
   * @param {string} options.fileId - The unique identifier of the target Excel file.
   * @param {File} options.image - The image file to insert (PNG, JPG, or other supported formats).
   * @param {string} [options.cell] - The cell reference where the image should be placed (e.g., "A1"). Defaults to top-left corner.
   * @param {string} [options.sheetName] - The name of the sheet to insert the image into. Defaults to the first active sheet.
   * @param {number} [options.widthPx] - The desired width of the image in pixels. If omitted, uses original image width.
   * @param {number} [options.heightPx] - The desired height of the image in pixels. If omitted, uses original image height.
   * @returns {Promise<any>} An object containing the result of the image insertion operation.
   * @throws {Error} When the file does not exist, image format is unsupported, or insertion fails.
   */
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

  /**
   * Generates and inserts a QR code into an Excel file at a specified cell position.
   * @param {Object} options - The QR code insertion options.
   * @param {string} options.fileId - The unique identifier of the target Excel file.
   * @param {string} [options.qrData] - The data string to encode in the QR code (text, URL, or any encodeable content).
   * @param {string} [options.accessCode] - An optional access code to include in the QR code payload.
   * @param {string} [options.cell] - The cell reference where the QR code should be placed (e.g., "A1"). Defaults to top-left corner.
   * @param {string} [options.sheetName] - The name of the sheet to insert the QR code into. Defaults to the first active sheet.
   * @param {number} [options.sizePx] - The desired size of the QR code in pixels (both width and height). Defaults to a standard size.
   * @returns {Promise<any>} An object containing the result of the QR code insertion operation.
   * @throws {Error} When the file does not exist, QR data is invalid, or insertion fails.
   */
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

  /**
   * Merges multiple PDF result files into a single PDF with an optional cover page.
   * @param {Object} options - The merge options.
   * @param {string[]} options.resultIds - An array of result IDs to merge, in the desired order.
   * @param {string} [options.coverTitle] - Optional title text to display on the cover page.
   * @param {string} [options.coverSubtitle] - Optional subtitle text to display on the cover page.
   * @param {string} [options.coverDate] - Optional date text to display on the cover page.
   * @param {string} [options.outputName] - Optional custom name for the merged output file.
   * @param {boolean} [options.saveResult] - When true, saves the merged PDF to the server and returns metadata instead of a Blob.
   * @returns {Promise<Blob | { result: any }>} Returns a Blob of the merged PDF if saveResult is false; otherwise returns server metadata.
   * @throws {Error} When one or more result IDs are invalid, no results are found, or the merge operation fails.
   */
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

  /**
   * Creates a new verification token for granting limited access to a file or result.
   * @param {'file' | 'result'} resourceType - The type of resource the token grants access to ('file' or 'result').
   * @param {string} resourceId - The unique identifier of the file or result to create a token for.
   * @returns {Promise<{token: VerifyToken, existing: boolean}>} An object containing the created VerifyToken and a flag indicating if this token already existed.
   * @throws {Error} When the resource does not exist or token creation fails.
   */
  async createToken(resourceType: 'file' | 'result', resourceId: string): Promise<{ token: VerifyToken; existing: boolean }> {
    const res = await this.client.post('/api/v1/tokens', { resource_type: resourceType, resource_id: resourceId });
    return { token: res.data.token, existing: !!res.data.existing };
  }

  /**
   * Retrieves a list of all verification tokens owned by the authenticated user.
   * @returns {Promise<VerifyToken[]>} An array of VerifyToken objects representing all active and inactive tokens.
   * @throws {Error} When the API request fails or authentication is invalid.
   */
  async listTokens(): Promise<VerifyToken[]> {
    const res = await this.client.get('/api/v1/tokens');
    return res.data.tokens;
  }

  /**
   * Permanently deletes a verification token and revokes access for anyone holding it.
   * @param {string} tokenId - The unique identifier of the token to delete.
   * @returns {Promise<void>} Resolves when the token has been successfully deleted.
   * @throws {Error} When the token does not exist or deletion fails.
   */
  async deleteToken(tokenId: string): Promise<void> {
    await this.client.delete(`/api/v1/tokens/${tokenId}`);
  }

  // -------------------------------------------------------------------------
  // Template Library
  // -------------------------------------------------------------------------

  /**
   * Uploads a file to the template library, optionally with a custom name and description.
   * @param {File} file - The file object to upload as a template (from input[type="file"]).
   * @param {string} [name] - Optional custom name for the template. If not provided, the original filename is used.
   * @param {string} [description] - Optional description explaining the template's purpose or contents.
   * @returns {Promise<any>} The created template entry with server-assigned id and metadata.
   * @throws {Error} When the upload fails, file exceeds size limits, or format is unsupported.
   */
  async uploadTemplate(file: File, name?: string, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (name)        formData.append('name',        name);
    if (description) formData.append('description', description);
    const res = await this.client.post('/api/v1/templates', formData);
    return res.data.template;
  }

  /**
   * Retrieves a list of all templates in the library owned by the authenticated user.
   * @returns {Promise<any[]>} An array of template objects containing id, name, description, and metadata.
   * @throws {Error} When the API request fails or authentication is invalid.
   */
  async listTemplates(): Promise<any[]> {
    const res = await this.client.get('/api/v1/templates');
    return res.data.templates;
  }

  /**
   * Updates the name and/or description of an existing template.
   * @param {string} id - The unique identifier of the template to update.
   * @param {string} [name] - Optional new name for the template.
   * @param {string} [description] - Optional new description for the template.
   * @returns {Promise<any>} The updated template entry with modified metadata.
   * @throws {Error} When the template does not exist or update fails.
   */
  async updateTemplate(id: string, name?: string, description?: string): Promise<any> {
    const res = await this.client.patch(`/api/v1/templates/${id}`, { name, description });
    return res.data.template;
  }

  /**
   * Permanently deletes a template from the library.
   * @param {string} id - The unique identifier of the template to delete.
   * @returns {Promise<void>} Resolves when the template has been successfully deleted.
   * @throws {Error} When the template does not exist or deletion fails.
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.client.delete(`/api/v1/templates/${id}`);
  }

  /**
   * Creates a result by applying a template's configuration to create a new output file.
   * @param {string} id - The unique identifier of the template to use.
   * @returns {Promise<any>} The created result object containing the output file information.
   * @throws {Error} When the template does not exist or result creation fails.
   */
  async useTemplate(id: string): Promise<any> {
    const res = await this.client.post(`/api/v1/templates/${id}/use`);
    return res.data.result;
  }

  /**
   * Downloads the original template file as a Blob.
   * @param {string} id - The unique identifier of the template to download.
   * @returns {Promise<Blob>} A Blob containing the template file data, suitable for downloading.
   * @throws {Error} When the template does not exist or download fails.
   */
  async downloadTemplate(id: string): Promise<Blob> {
    const res = await this.client.get(`/api/v1/templates/${id}/download`, { responseType: 'blob' });
    return res.data;
  }

  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------

  /**
   * Retrieves the profile information of the authenticated user.
   * @returns {Promise<any>} The user's profile object containing username, email, bio, and avatar information.
   * @throws {Error} When the API request fails or authentication is invalid.
   */
  async getProfile(): Promise<any> {
    const res = await this.client.get('/api/v1/auth/profile');
    return res.data.profile;
  }

  /**
   * Updates the profile information of the authenticated user.
   * @param {string} [username] - Optional new username to set for the profile.
   * @param {string} [bio] - Optional new biography or description to set for the profile.
   * @returns {Promise<any>} The updated profile object with modified fields.
   * @throws {Error} When the update fails or validation errors occur.
   */
  async updateProfile(username?: string, bio?: string): Promise<any> {
    const res = await this.client.patch('/api/v1/auth/profile', { username, bio });
    return res.data.profile;
  }

  /**
   * Uploads a new avatar image for the authenticated user.
   * @param {File} file - The image file to use as the new avatar (from input[type="file"]).
   * @returns {Promise<string>} The URL of the newly uploaded avatar image.
   * @throws {Error} When the upload fails, file format is unsupported, or file exceeds size limits.
   */
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await this.client.post('/api/v1/auth/profile/avatar', formData);
    return res.data.avatar_url;
  }

  /**
   * Changes the password for the authenticated user.
   * @param {string} oldPassword - The user's current password for verification.
   * @param {string} newPassword - The new password to set for the account.
   * @returns {Promise<void>} Resolves when the password has been successfully changed.
   * @throws {Error} When the old password is incorrect or the new password fails validation.
   */
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
