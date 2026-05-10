import React, { useState } from 'react';
import { Settings, FileSpreadsheet, CheckCircle, Download, FileText, Loader2 } from 'lucide-react';
import { Card, Button, Alert, LoadingSpinner, Badge } from '../components/ui';
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
  const [jsonValid, setJsonValid] = useState<boolean | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedJson, setParsedJson] = useState<Record<string, any> | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleJsonChange = (text: string) => {
    setUpdatesText(text);
    if (!text.trim()) {
      setJsonValid(null);
      setJsonError(null);
      setParsedJson(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    if (validationTimeout) clearTimeout(validationTimeout);
    const timeout = setTimeout(() => {
      try {
        const parsed = JSON.parse(text);
        setJsonValid(true);
        setJsonError(null);
        setParsedJson(parsed);
      } catch (err: any) {
        setJsonValid(false);
        setJsonError(err.message);
        setParsedJson(null);
      } finally {
        setIsValidating(false);
      }
    }, 300);
    setValidationTimeout(timeout);
  };

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
      preview: 'معاينة JSON',
      previewEmpty: 'أدخل JSON صالح لعرض المعاينة',
      submit: 'تعديل الكل',
      resultTitle: 'نتيجة التعديل',
      updatedCount: 'تم تعديل',
      cells: 'خلايا',
      coordinates: 'الإحداثيات',
      oldValue: 'القديمة',
      newValue: 'الجديدة',
      noFileError: 'الرجاء اختيار ملف من المستودع',
      validating: 'جارٍ التحقق من JSON...',
      validJson: 'صالح',
      invalidJson: 'غير صالح',
      awaitingInput: 'في انتظار الإدخال',
      validJsonMessage: '✓ JSON صالح',
      entries: 'إدخال',
      downloadModified: 'تحميل الملف المعدّل',
      exportPdf: 'تصدير PDF',
      modifying: 'جاري التعديل...',
      noCellsModified: 'لم يتم تعديل أي خلية بعد',
      enterUpdatesError: 'الرجاء إدخال التحديثات',
      invalidJsonFormat: 'صيغة JSON غير صالحة',
      errorOccurred: 'حدث خطأ',
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
      preview: 'JSON Preview',
      previewEmpty: 'Enter valid JSON to see preview',
      submit: 'Modify All',
      resultTitle: 'Edit Result',
      updatedCount: 'Updated',
      cells: 'cells',
      coordinates: 'Coordinates',
      oldValue: 'Old',
      newValue: 'New',
      noFileError: 'Please select a file from the repository',
      validating: 'Validating JSON...',
      validJson: 'Valid',
      invalidJson: 'Invalid',
      awaitingInput: 'Awaiting Input',
      validJsonMessage: '✓ Valid JSON',
      entries: 'entries',
      downloadModified: 'Download Modified File',
      exportPdf: 'Export PDF',
      modifying: 'Modifying...',
      noCellsModified: 'No cells modified yet',
      enterUpdatesError: 'Please enter updates',
      invalidJsonFormat: 'Invalid JSON format',
      errorOccurred: 'An error occurred',
    },
  }[lang];

  const handleSubmit = async () => {
    if (!selectedFile) { setError(t.noFileError); return; }
    if (!updatesText) {
      setError(t.enterUpdatesError);
      return;
    }

    if (jsonValid === false || !parsedJson) {
      setError(t.invalidJsonFormat);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.writeCells(selectedFile.id, parsedJson, sheetName || undefined, lang);
      if (response.success) {
        setResult({ ...response, _resultMeta: response.result });
      } else {
        setError(response.error || t.errorOccurred);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || t.errorOccurred);
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t.updates}</label>
              <div className="flex items-center gap-2">
                {isValidating && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t.validating}
                  </span>
                )}
                {jsonValid === true && (
                  <Badge variant="success">
                    {t.validJson}
                  </Badge>
                )}
                {jsonValid === false && (
                  <Badge variant="error">
                    {t.invalidJson}
                  </Badge>
                )}
                {jsonValid === null && !isValidating && (
                  <Badge variant="default">
                    {t.awaitingInput}
                  </Badge>
                )}
              </div>
            </div>
            <textarea
              value={updatesText}
              onChange={e => handleJsonChange(e.target.value)}
              placeholder={t.updatesPlaceholder}
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono ${
                jsonValid === false ? 'border-red-300 bg-red-50' : jsonValid === true ? 'border-green-300' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">{t.updatesHelp}</p>
            {jsonValid === false && jsonError && (
              <p className="mt-1 text-xs text-red-600">{jsonError}</p>
            )}
            {jsonValid === true && parsedJson && (
              <p className="mt-1 text-xs text-green-600">
                {t.validJsonMessage} - {Object.keys(parsedJson).length} {t.entries}
              </p>
            )}
          </div>

          {jsonValid === true && parsedJson && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t.preview}</span>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 overflow-auto max-h-48">
                <pre className="text-xs text-slate-100 font-mono whitespace-pre-wrap">
                  {JSON.stringify(parsedJson, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {jsonValid === false && (
            <div className="mt-3">
              <div className="bg-slate-800 rounded-lg p-4">
                <pre className="text-xs text-red-400 font-mono">
                  {updatesText}
                </pre>
              </div>
            </div>
          )}

          {jsonValid === null && !isValidating && updatesText.trim() === '' && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-sm text-gray-500 text-center">{t.previewEmpty}</p>
            </div>
          )}

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <Button onClick={handleSubmit} loading={loading} disabled={!selectedFile || !updatesText}>
            {t.submit}
          </Button>
        </div>
      </Card>

      <Card title={t.resultTitle} icon={<FileSpreadsheet className="w-5 h-5" />}>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text={t.modifying} />
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
                  {t.downloadModified}
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
                  {t.exportPdf}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t.noCellsModified}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
