import React, { useState } from 'react';
import { Settings, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Input, Alert, LoadingSpinner, Badge } from '../components/ui';
import { apiService } from '../services/api';

interface BatchWritePageProps {
  lang: 'ar' | 'en';
}

export const BatchWritePage: React.FC<BatchWritePageProps> = ({ lang }) => {
  const [filePath, setFilePath] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [updatesText, setUpdatesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const content = {
    ar: {
      title: 'تعديل متعدد',
      description: 'عدّل عدة خلايا دفعة واحدة',
      filePath: 'مسار الملف',
      filePathPlaceholder: '/path/to/file.xlsx',
      sheetName: 'اسم الورقة (اختياري)',
      sheetNamePlaceholder: 'Sheet1',
      updates: 'التحديثات',
      updatesPlaceholder: '{"A1": "قيمة1", "B2": 100, "C3": "قيمة3"}',
      updatesHelp: 'أدخل الإحداثيات والقيم بتنسيق JSON',
      submit: 'تعديل الكل',
      resultTitle: 'نتيجة التعديل',
      successCount: 'تم التعديل بنجاح',
      failedCount: 'فشل',
      successful: 'ناجحة',
      failed: 'فاشلة',
      coordinates: 'الإحداثيات',
      status: 'الحالة',
    },
    en: {
      title: 'Batch Edit',
      description: 'Modify multiple cells at once',
      filePath: 'File Path',
      filePathPlaceholder: '/path/to/file.xlsx',
      sheetName: 'Sheet Name (optional)',
      sheetNamePlaceholder: 'Sheet1',
      updates: 'Updates',
      updatesPlaceholder: '{"A1": "value1", "B2": 100, "C3": "value3"}',
      updatesHelp: 'Enter coordinates and values in JSON format',
      submit: 'Modify All',
      resultTitle: 'Edit Result',
      successCount: 'Successfully modified',
      failedCount: 'Failed',
      successful: 'Successful',
      failed: 'Failed',
      coordinates: 'Coordinates',
      status: 'Status',
    },
  };

  const t = content[lang];

  const handleSubmit = async () => {
    if (!filePath || !updatesText) {
      setError(lang === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
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
      const response = await apiService.batchWrite(
        {
          file_path: filePath,
          updates,
          sheet_name: sheetName || undefined,
        },
        lang
      );

      if (apiService.isSuccess(response)) {
        setResult(response.بيانات || response.data);
      } else {
        setError(apiService.getErrorMessage(response));
      }
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title={t.title} icon={<Settings className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="space-y-4">
          <Input
            label={t.filePath}
            placeholder={t.filePathPlaceholder}
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
          />

          <Input
            label={t.sheetName}
            placeholder={t.sheetNamePlaceholder}
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.updates}
            </label>
            <textarea
              value={updatesText}
              onChange={(e) => setUpdatesText(e.target.value)}
              placeholder={t.updatesPlaceholder}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">{t.updatesHelp}</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <Button onClick={handleSubmit} loading={loading} disabled={!filePath || !updatesText}>
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
            <div className="flex gap-4">
              <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{result.total_updated}</p>
                <p className="text-sm text-green-600">{t.successfulCount}</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{result.total_failed}</p>
                <p className="text-sm text-red-600">{t.failedCount}</p>
              </div>
            </div>

            {result.successful_cells && result.successful_cells.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t.successful}
                </h4>
                <div className="space-y-2">
                  {result.successful_cells.map((cell: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-mono">{cell.coordinates}</span>
                      <Badge variant="success">{cell.new_value?.toString() || '-'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.failed_cells && result.failed_cells.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  {t.failed}
                </h4>
                <div className="space-y-2">
                  {result.failed_cells.map((cell: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-red-50 rounded-lg text-sm">
                      <span className="font-mono">{cell.coordinates}</span>
                      <Badge variant="error">{cell.error}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {lang === 'ar' ? 'لم يتم تعديل أي خلية بعد' : 'No cells modified yet'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
