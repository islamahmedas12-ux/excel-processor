import React, { useState } from 'react';
import { Settings, FileSpreadsheet, CheckCircle, Download, FileText } from 'lucide-react';
import { Card, Button, Alert, LoadingSpinner } from '../components/ui';
import { FileSelector } from '../components/FileSelector';
import { SheetSelector } from '../components/SheetSelector';
import { useFiles } from '../context/FilesContext';
import { useResults } from '../context/ResultsContext';
import { apiService } from '../services/api';

interface BatchWritePageProps {
  lang: 'ar' | 'en';
}

export const BatchWritePage: React.FC<BatchWritePageProps> = ({ lang }) => {
  const { selectedFile } = useFiles();
  const { downloadResult } = useResults();
  const [sheetName, setSheetName] = useState('');
  const [updatesText, setUpdatesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    ar: {
      title: 'تعديل متعدد',
      description: 'اختر ملفاً من المستودع وعدّل عدة خلايا دفعة واحدة',
      file: 'الملف',
      sheetName: 'اسم الورقة (اختياري)',
      sheetNamePlaceholder: 'Sheet1',
      updates: 'التحديثات',
      updatesPlaceholder: '{"A1": "قيمة1", "B2": 100, "C3": "قيمة3"}',
      updatesHelp: 'أدخل الإحداثيات والقيم بتنسيق JSON',
      submit: 'تعديل الكل',
      resultTitle: 'نتيجة التعديل',
      updatedCount: 'تم تعديل',
      cells: 'خلايا',
      coordinates: 'الإحداثيات',
      oldValue: 'القديمة',
      newValue: 'الجديدة',
      noFileError: 'الرجاء اختيار ملف من المستودع',
    },
    en: {
      title: 'Batch Edit',
      description: 'Select a file from the repository and modify multiple cells at once',
      file: 'File',
      sheetName: 'Sheet Name (optional)',
      sheetNamePlaceholder: 'Sheet1',
      updates: 'Updates',
      updatesPlaceholder: '{"A1": "value1", "B2": 100, "C3": "value3"}',
      updatesHelp: 'Enter coordinates and values in JSON format',
      submit: 'Modify All',
      resultTitle: 'Edit Result',
      updatedCount: 'Updated',
      cells: 'cells',
      coordinates: 'Coordinates',
      oldValue: 'Old',
      newValue: 'New',
      noFileError: 'Please select a file from the repository',
    },
  }[lang];

  const handleSubmit = async () => {
    if (!selectedFile) { setError(t.noFileError); return; }
    if (!updatesText) {
      setError(lang === 'ar' ? 'الرجاء إدخال التحديثات' : 'Please enter updates');
      return;
    }

    let updates: Record<string, any>;
    try {
      updates = JSON.parse(updatesText);
    } catch {
      setError(lang === 'ar' ? 'صيغة JSON غير صالحة' : 'Invalid JSON format');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.writeCells(selectedFile.id, updates, sheetName || undefined, lang);
      if (response.success) {
        setResult({ ...response, _resultMeta: response.result });
      } else {
        setError(response.error || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title={t.title} icon={<Settings className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.file}</label>
            <FileSelector lang={lang} />
          </div>

          <SheetSelector lang={lang} value={sheetName} onChange={setSheetName} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.updates}</label>
            <textarea
              value={updatesText}
              onChange={e => setUpdatesText(e.target.value)}
              placeholder={t.updatesPlaceholder}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">{t.updatesHelp}</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <Button onClick={handleSubmit} loading={loading} disabled={!selectedFile || !updatesText}>
            {t.submit}
          </Button>
        </div>
      </Card>

      <Card title={t.resultTitle} icon={<FileSpreadsheet className="w-5 h-5" />}>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text={lang === 'ar' ? 'جاري التعديل...' : 'Modifying...'} />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{t.updatedCount} {result.updated?.length ?? 0} {t.cells}</span>
            </div>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                <span>{t.coordinates}</span>
                <span>{t.oldValue}</span>
                <span>{t.newValue}</span>
              </div>
              {(result.updated || []).map((cell: any, idx: number) => (
                <div key={idx} className="grid grid-cols-3 px-4 py-3 text-sm">
                  <span className="font-mono font-medium text-primary-600">{cell.coordinates}</span>
                  <span className="text-gray-500">{cell.old_value ?? '-'}</span>
                  <span className="text-gray-800 font-medium">{cell.new_value ?? '-'}</span>
                </div>
              ))}
            </div>

            {result._resultMeta && (
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => downloadResult(result._resultMeta.id, result._resultMeta.filename)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {lang === 'ar' ? 'تحميل الملف المعدّل' : 'Download Modified File'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const entry = await apiService.exportResultToPdf(result._resultMeta.id);
                      if (entry?.id) await downloadResult(entry.id, entry.filename);
                    } catch { /* silent */ }
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {lang === 'ar' ? 'تصدير PDF' : 'Export PDF'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{lang === 'ar' ? 'لم يتم تعديل أي خلية بعد' : 'No cells modified yet'}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
