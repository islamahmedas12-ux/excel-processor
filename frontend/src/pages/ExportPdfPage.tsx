import React, { useEffect, useState } from 'react';
import { FileText, Download, Loader, Layers, CheckSquare, Square, Trash2, BookMarked, Zap } from 'lucide-react';
import { Card, Button, Alert } from '../components/ui';
import { FileSelector } from '../components/FileSelector';
import { useFiles } from '../context/FilesContext';
import { useResults } from '../context/ResultsContext';
import { apiService } from '../services/api';

interface ExportPdfPageProps { lang: 'ar' | 'en'; onTabChange?: (tab: string) => void; }
type SheetMode = 'all' | 'specific';

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
}

export const ExportPdfPage: React.FC<ExportPdfPageProps> = ({ lang, onTabChange }) => {
  const { selectedFile } = useFiles();
  const { results, deleteResult, downloadResult, refresh: refreshResults } = useResults();

  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [mode, setMode] = useState<SheetMode>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [asyncExporting, setAsyncExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = {
    ar: {
      title: 'تصدير إلى PDF', description: 'اختر ملفاً وحدّد الأوراق ثم صدّر',
      file: 'الملف', sheetsTitle: 'الأوراق المراد تصديرها',
      modeAll: 'كل الأوراق', modeSpecific: 'اختيار محدد',
      sheetsLoading: 'جاري تحميل الأوراق...', noSheetsSelected: 'اختر ورقة واحدة على الأقل',
      selectAll: 'تحديد الكل', deselectAll: 'إلغاء الكل',
      download: 'تحميل PDF', saving: 'جاري الحفظ...', saveToServer: 'حفظ على السيرفر',
      exportAsync: 'تصدير في الخلفية', submitting: 'جاري الإرسال...',
      asyncSuccess: 'تم إرسال المهمة! تابعها في تبويب "المهام".',
      noFileError: 'الرجاء اختيار ملف', savedResults: 'PDFs المحفوظة',
      noSavedResults: 'لا توجد نتائج محفوظة بعد',
      downloadSuccess: 'تم تحميل PDF!', saveSuccess: 'تم حفظ PDF على السيرفر',
    },
    en: {
      title: 'Export to PDF', description: 'Select a file, choose sheets, then export',
      file: 'File', sheetsTitle: 'Sheets to Export',
      modeAll: 'All sheets', modeSpecific: 'Select sheets',
      sheetsLoading: 'Loading sheets...', noSheetsSelected: 'Select at least one sheet',
      selectAll: 'Select all', deselectAll: 'Deselect all',
      download: 'Download PDF', saving: 'Saving...', saveToServer: 'Save to Server',
      exportAsync: 'Export in Background', submitting: 'Submitting...',
      asyncSuccess: 'Job submitted! Track it in the "Jobs" tab.',
      noFileError: 'Please select a file', savedResults: 'Saved PDFs',
      noSavedResults: 'No saved PDFs yet',
      downloadSuccess: 'PDF downloaded!', saveSuccess: 'PDF saved to server',
    },
  }[lang];

  useEffect(() => {
    if (!selectedFile) { setSheets([]); setSelected(new Set()); return; }
    setSheetsLoading(true);
    apiService.getSheets(selectedFile.id)
      .then(data => { setSheets(data); setSelected(new Set(data)); })
      .catch(() => {})
      .finally(() => setSheetsLoading(false));
  }, [selectedFile?.id]);

  const toggle = (sheet: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(sheet) ? n.delete(sheet) : n.add(sheet); return n; });

  const sheetsArg = (): string[] | 'all' =>
    mode === 'all' ? 'all' : sheets.filter(s => selected.has(s));

  const validate = () => {
    if (!selectedFile) { setError(t.noFileError); return false; }
    if (mode === 'specific' && selected.size === 0) { setError(t.noSheetsSelected); return false; }
    return true;
  };

  const handleDownload = async () => {
    if (!validate()) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const blob = await apiService.exportPdf(selectedFile!.id, sheetsArg());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = selectedFile!.name.replace(/\.(xlsx|xls)$/, '.pdf');
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSuccess(t.downloadSuccess);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || (lang === 'ar' ? 'حدث خطأ' : 'Error'));
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const data = await apiService.exportPdfSave(selectedFile!.id, sheetsArg());
      if (!data.success) throw new Error(data.error);
      await refreshResults();
      setSuccess(t.saveSuccess);
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'حدث خطأ' : 'Error'));
    } finally { setSaving(false); }
  };

  const handleAsyncExport = async () => {
    if (!validate()) return;
    setAsyncExporting(true); setError(null); setSuccess(null);
    try {
      await apiService.exportPdfAsync(selectedFile!.id, sheetsArg());
      setSuccess(t.asyncSuccess);
      if (onTabChange) setTimeout(() => onTabChange('jobs'), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message_en || err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg || (lang === 'ar' ? 'حدث خطأ' : 'Error'));
    } finally { setAsyncExporting(false); }
  };

  const allChecked = sheets.length > 0 && sheets.every(s => selected.has(s));
  const savedPdfs = results.filter(r => r.kind === 'pdf');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card title={t.title} icon={<FileText className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.file}</label>
            <FileSelector lang={lang} />
          </div>

          {selectedFile && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> {t.sheetsTitle}
              </label>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-3">
                {(['all', 'specific'] as SheetMode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${mode === m ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    {m === 'all' ? t.modeAll : t.modeSpecific}
                  </button>
                ))}
              </div>

              {mode === 'specific' && (
                sheetsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                    <Loader className="w-4 h-4 animate-spin" /> {t.sheetsLoading}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs text-gray-500">{selected.size} / {sheets.length}</span>
                      <button onClick={() => setSelected(allChecked ? new Set() : new Set(sheets))}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                        {allChecked ? t.deselectAll : t.selectAll}
                      </button>
                    </div>
                    {sheets.map(sheet => (
                      <label key={sheet} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0">
                        <span className="text-primary-600">
                          {selected.has(sheet) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-500" />}
                        </span>
                        <input type="checkbox" checked={selected.has(sheet)} onChange={() => toggle(sheet)} className="hidden" />
                        <span className="text-sm text-gray-800">{sheet}</span>
                      </label>
                    ))}
                  </div>
                )
              )}

              {mode === 'all' && sheets.length > 0 && (
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? `سيتم تصدير كل ${sheets.length} أوراق` : `All ${sheets.length} sheets will be exported`}
                </p>
              )}
            </div>
          )}

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownload} loading={loading} disabled={!selectedFile || saving || asyncExporting}
              icon={loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}>
              {loading ? '...' : t.download}
            </Button>
            <Button variant="secondary" onClick={handleSave} loading={saving} disabled={!selectedFile || loading || asyncExporting}
              icon={saving ? <Loader className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}>
              {saving ? t.saving : t.saveToServer}
            </Button>
            <Button variant="secondary" onClick={handleAsyncExport} loading={asyncExporting} disabled={!selectedFile || loading || saving}
              icon={asyncExporting ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}>
              {asyncExporting ? t.submitting : t.exportAsync}
            </Button>
          </div>
        </div>
      </Card>

      {/* Saved PDFs panel */}
      <Card title={`${t.savedResults} (${savedPdfs.length})`} icon={<BookMarked className="w-5 h-5" />}>
        {savedPdfs.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">{t.noSavedResults}</p>
        ) : (
          <div className="divide-y divide-gray-100 -mx-6">
            {savedPdfs.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-6 py-3">
                <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.filename}</p>
                  <p className="text-xs text-gray-500">{formatSize(r.size)} · {formatDate(r.created_at, lang)}</p>
                </div>
                <button onClick={() => downloadResult(r.id, r.filename)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => deleteResult(r.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
