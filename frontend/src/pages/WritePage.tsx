import React, { useState } from 'react';
import { Edit3, FileSpreadsheet, CheckCircle, Download, FileText } from 'lucide-react';
import { Card, Button, Input, Alert, LoadingSpinner } from '../components/ui';
import { FileSelector } from '../components/FileSelector';
import { SheetSelector } from '../components/SheetSelector';
import { useFiles } from '../context/FilesContext';
import { useResults } from '../context/ResultsContext';
import { apiService } from '../services/api';

interface WritePageProps {
  lang: 'ar' | 'en';
}

export const WritePage: React.FC<WritePageProps> = ({ lang }) => {
  const { selectedFile } = useFiles();
  const { downloadResult } = useResults();
  const [sheetName, setSheetName] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    ar: {
      title: 'تعديل خلية',
      description: 'اختر ملفاً من المستودع وعدّل قيمة خلية',
      file: 'الملف',
      sheetName: 'اسم الورقة (اختياري)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'الإحداثيات',
      coordinatesPlaceholder: 'A1',
      value: 'القيمة الجديدة',
      valuePlaceholder: 'أدخل القيمة الجديدة',
      submit: 'تعديل',
      resultTitle: 'نتيجة التعديل',
      oldValue: 'القيمة القديمة',
      newValue: 'القيمة الجديدة',
      success: 'تم التعديل بنجاح — تم حفظ نسخة معدّلة',
      downloadResult: 'تحميل الملف المعدّل',
      exportPdf: 'تصدير PDF',
      noFileError: 'الرجاء اختيار ملف من المستودع',
    },
    en: {
      title: 'Edit Cell',
      description: 'Select a file from the repository and modify a cell value',
      file: 'File',
      sheetName: 'Sheet Name (optional)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'Coordinates',
      coordinatesPlaceholder: 'A1',
      value: 'New Value',
      valuePlaceholder: 'Enter new value',
      submit: 'Modify',
      resultTitle: 'Edit Result',
      oldValue: 'Old Value',
      newValue: 'New Value',
      success: 'Modified successfully — a copy has been saved',
      downloadResult: 'Download Modified File',
      exportPdf: 'Export to PDF',
      noFileError: 'Please select a file from the repository',
    },
  }[lang];

  const handleSubmit = async () => {
    if (!selectedFile) { setError(t.noFileError); return; }
    if (!coordinates || !value) {
      setError(lang === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.writeCells(selectedFile.id, { [coordinates]: value }, sheetName || undefined, lang);
      if (response.success) {
        const cell = response.updated?.[0] || {};
        setResult({ ...cell, _resultMeta: response.result });
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
      <Card title={t.title} icon={<Edit3 className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.file}</label>
            <FileSelector lang={lang} />
          </div>

          <Input
            label={t.coordinates}
            placeholder={t.coordinatesPlaceholder}
            value={coordinates}
            onChange={e => setCoordinates(e.target.value)}
          />

          <Input
            label={t.value}
            placeholder={t.valuePlaceholder}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
          />

          <SheetSelector lang={lang} value={sheetName} onChange={setSheetName} />

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <Button onClick={handleSubmit} loading={loading} disabled={!selectedFile || !coordinates || !value}>
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
            <Alert type="success" message={t.success} />
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500">{t.oldValue}</span>
                <span className="font-medium">{result.old_value ?? '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500">{t.newValue}</span>
                <span className="font-medium text-primary-600">{result.new_value ?? '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">{t.coordinates}</span>
                <span className="font-medium">{result.coordinates}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{result.sheet}</span>
            </div>

            {result._resultMeta && (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => downloadResult(result._resultMeta.id, result._resultMeta.filename)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" /> {t.downloadResult}
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
                  <FileText className="w-4 h-4" /> {t.exportPdf}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Edit3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{lang === 'ar' ? 'لم يتم تعديل أي خلية بعد' : 'No cell modified yet'}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
