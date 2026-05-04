import React, { useState } from 'react';
import { Eye, FileSpreadsheet, Table } from 'lucide-react';
import { Card, Button, Input, Alert, Table as TableComponent, LoadingSpinner } from '../components/ui';
import { apiService } from '../services/api';

interface ReadPageProps {
  lang: 'ar' | 'en';
}

export const ReadPage: React.FC<ReadPageProps> = ({ lang }) => {
  const [filePath, setFilePath] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'cell' | 'all'>('cell');

  const content = {
    ar: {
      title: 'قراءة البيانات',
      description: 'اقرأ بيانات من خلية واحدة أو كل البيانات',
      filePath: 'مسار الملف',
      filePathPlaceholder: '/path/to/file.xlsx',
      sheetName: 'اسم الورقة (اختياري)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'الإحداثيات (اختياري)',
      coordinatesPlaceholder: 'A1',
      readCell: 'قراءة خلية',
      readAll: 'قراءة الكل',
      modeCell: 'خلية واحدة',
      modeAll: 'جميع البيانات',
      resultTitle: 'النتيجة',
      noResult: 'لم يتم تحميل أي بيانات بعد',
      sheet: 'الورقة',
      value: 'القيمة',
      dimensions: 'الأبعاد',
      rows: 'صفوف',
      columns: 'أعمدة',
    },
    en: {
      title: 'Read Data',
      description: 'Read data from a single cell or all data',
      filePath: 'File Path',
      filePathPlaceholder: '/path/to/file.xlsx',
      sheetName: 'Sheet Name (optional)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'Coordinates (optional)',
      coordinatesPlaceholder: 'A1',
      readCell: 'Read Cell',
      readAll: 'Read All',
      modeCell: 'Single Cell',
      modeAll: 'All Data',
      resultTitle: 'Result',
      noResult: 'No data loaded yet',
      sheet: 'Sheet',
      value: 'Value',
      dimensions: 'Dimensions',
      rows: 'rows',
      columns: 'columns',
    },
  };

  const t = content[lang];

  const handleReadCell = async () => {
    if (!filePath) {
      setError(lang === 'ar' ? 'الرجاء إدخال مسار الملف' : 'Please enter file path');
      return;
    }

    if (!coordinates) {
      setError(lang === 'ar' ? 'الرجاء إدخال الإحداثيات' : 'Please enter coordinates');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.readCell(
        { file_path: filePath, sheet_name: sheetName || undefined, coordinates },
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

  const handleReadAll = async () => {
    if (!filePath) {
      setError(lang === 'ar' ? 'الرجاء إدخال مسار الملف' : 'Please enter file path');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.readAllData(
        { file_path: filePath, sheet_name: sheetName || undefined },
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
      <Card title={t.title} icon={<Eye className="w-5 h-5" />}>
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

          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setMode('cell')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'cell' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.modeCell}
            </button>
            <button
              onClick={() => setMode('all')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'all' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.modeAll}
            </button>
          </div>

          {mode === 'cell' && (
            <Input
              label={t.coordinates}
              placeholder={t.coordinatesPlaceholder}
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
            />
          )}

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <div className="flex gap-3">
            {mode === 'cell' ? (
              <Button onClick={handleReadCell} loading={loading} disabled={!filePath || !coordinates}>
                {t.readCell}
              </Button>
            ) : (
              <Button onClick={handleReadAll} loading={loading} disabled={!filePath}>
                {t.readAll}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card title={t.resultTitle} icon={<FileSpreadsheet className="w-5 h-5" />}>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
          </div>
        ) : result ? (
          <div className="space-y-4">
            {mode === 'cell' ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">{t.sheet}</p>
                    <p className="font-medium">{result.sheet}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">{t.coordinates}</p>
                    <p className="font-medium">{result.coordinates}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase">{t.value}</p>
                  <p className="font-medium text-lg mt-1">{result.value ?? '-'}</p>
                </div>
              </div>
            ) : (
              <div>
                {result.dimensions && (
                  <div className="flex gap-4 mb-4 text-sm">
                    <span className="text-gray-600">
                      {t.dimensions}: {result.dimensions.rows} {t.rows} × {result.dimensions.columns} {t.columns}
                    </span>
                  </div>
                )}
                {result.data && result.data.length > 0 ? (
                  <TableComponent
                    headers={result.data[0].map((_: any, i: number) => `${i + 1}`)}
                    data={result.data.slice(0, 20)}
                    emptyMessage={t.noResult}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-8">{t.noResult}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Table className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t.noResult}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
