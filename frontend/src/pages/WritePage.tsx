import React, { useState } from 'react';
import { Edit3, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { Card, Button, Input, Alert, LoadingSpinner } from '../components/ui';
import { apiService } from '../services/api';

interface WritePageProps {
  lang: 'ar' | 'en';
}

export const WritePage: React.FC<WritePageProps> = ({ lang }) => {
  const [filePath, setFilePath] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [value, setValue] = useState('');
  const [preserveFormat, setPreserveFormat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const content = {
    ar: {
      title: 'تعديل خلية',
      description: 'عدّل قيمة خلية واحدة في ملف Excel',
      filePath: 'مسار الملف',
      filePathPlaceholder: '/path/to/file.xlsx',
      sheetName: 'اسم الورقة (اختياري)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'الإحداثيات',
      coordinatesPlaceholder: 'A1',
      value: 'القيمة الجديدة',
      valuePlaceholder: 'أدخل القيمة الجديدة',
      preserveFormat: 'الحفاظ على التنسيق',
      submit: 'تعديل',
      resultTitle: 'نتيجة التعديل',
      oldValue: 'القيمة القديمة',
      newValue: 'القيمة الجديدة',
      success: 'تم التعديل بنجاح',
    },
    en: {
      title: 'Edit Cell',
      description: 'Modify a single cell value in Excel file',
      filePath: 'File Path',
      filePathPlaceholder: '/path/to/file.xlsx',
      sheetName: 'Sheet Name (optional)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'Coordinates',
      coordinatesPlaceholder: 'A1',
      value: 'New Value',
      valuePlaceholder: 'Enter new value',
      preserveFormat: 'Preserve Format',
      submit: 'Modify',
      resultTitle: 'Edit Result',
      oldValue: 'Old Value',
      newValue: 'New Value',
      success: 'Modified successfully',
    },
  };

  const t = content[lang];

  const handleSubmit = async () => {
    if (!filePath || !coordinates || !value) {
      setError(lang === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.writeCell(
        {
          file_path: filePath,
          coordinates,
          value,
          sheet_name: sheetName || undefined,
          preserve_format: preserveFormat,
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
      <Card title={t.title} icon={<Edit3 className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="space-y-4">
          <Input
            label={t.filePath}
            placeholder={t.filePathPlaceholder}
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
          />

          <Input
            label={t.coordinates}
            placeholder={t.coordinatesPlaceholder}
            value={coordinates}
            onChange={(e) => setCoordinates(e.target.value)}
          />

          <Input
            label={t.value}
            placeholder={t.valuePlaceholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <Input
            label={t.sheetName}
            placeholder={t.sheetNamePlaceholder}
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preserveFormat}
              onChange={(e) => setPreserveFormat(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">{t.preserveFormat}</span>
          </label>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <Button onClick={handleSubmit} loading={loading} disabled={!filePath || !coordinates || !value}>
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
          </div>
        ) : (
          <div className="text-center py-12">
            <Edit3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {lang === 'ar' ? 'لم يتم تعديل أي خلية بعد' : 'No cell modified yet'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
