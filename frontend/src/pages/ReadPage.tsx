import React, { useState } from 'react';
import { Eye, FileSpreadsheet, Table } from 'lucide-react';
import { Card, Button, Input, Alert, LoadingSpinner } from '../components/ui';
import { FileSelector } from '../components/FileSelector';
import { SheetSelector } from '../components/SheetSelector';
import { useFiles } from '../context/FilesContext';
import { apiService } from '../services/api';

interface ReadPageProps {
  lang: 'ar' | 'en';
}

export const ReadPage: React.FC<ReadPageProps> = ({ lang }) => {
  const { selectedFile } = useFiles();
  const [sheetName, setSheetName] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    ar: {
      title: 'قراءة البيانات',
      description: 'اختر ملفاً من المستودع واقرأ قيم الخلايا',
      file: 'الملف',
      sheetName: 'اسم الورقة (اختياري)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'الخلايا',
      coordinatesPlaceholder: 'A1 أو A1,B2,C3',
      coordinatesHelp: 'خلية واحدة أو عدة خلايا مفصولة بفاصلة',
      read: 'قراءة',
      resultTitle: 'النتيجة',
      noResult: 'لم يتم تحميل أي بيانات بعد',
      cell: 'الخلية',
      value: 'القيمة',
      sheet: 'الورقة',
      noFileError: 'الرجاء اختيار ملف من المستودع',
    },
    en: {
      title: 'Read Data',
      description: 'Select a file from the repository and read cell values',
      file: 'File',
      sheetName: 'Sheet Name (optional)',
      sheetNamePlaceholder: 'Sheet1',
      coordinates: 'Cells',
      coordinatesPlaceholder: 'A1 or A1,B2,C3',
      coordinatesHelp: 'Single cell or multiple cells separated by commas',
      read: 'Read',
      resultTitle: 'Result',
      noResult: 'No data loaded yet',
      cell: 'Cell',
      value: 'Value',
      sheet: 'Sheet',
      noFileError: 'Please select a file from the repository',
    },
  }[lang];

  const handleRead = async () => {
    if (!selectedFile) { setError(t.noFileError); return; }
    if (!coordinates) { setError(lang === 'ar' ? 'الرجاء إدخال الخلايا' : 'Please enter cell coordinates'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.readCells(selectedFile.id, coordinates, sheetName || undefined, lang);
      if (response.success) {
        setResult(response);
      } else {
        setError(response.error || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const cellEntries = result?.cells ? Object.entries(result.cells) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title={t.title} icon={<Eye className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.file}</label>
            <FileSelector lang={lang} />
          </div>

          <SheetSelector lang={lang} value={sheetName} onChange={setSheetName} />

          <div>
            <Input
              label={t.coordinates}
              placeholder={t.coordinatesPlaceholder}
              value={coordinates}
              onChange={e => setCoordinates(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRead(); } }}
            />
            <p className="mt-1 text-xs text-gray-500">{t.coordinatesHelp}</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <Button onClick={handleRead} loading={loading} disabled={!selectedFile || !coordinates}>
            {t.read}
          </Button>
        </div>
      </Card>

      <Card title={t.resultTitle} icon={<FileSpreadsheet className="w-5 h-5" />}>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              {t.sheet}: <span className="font-medium text-gray-700">{result.sheet}</span>
            </p>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-2 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                <span>{t.cell}</span>
                <span>{t.value}</span>
              </div>
              {cellEntries.map(([cell, val]) => (
                <div key={cell} className="grid grid-cols-2 px-4 py-3 text-sm">
                  <span className="font-mono font-medium text-primary-600">{cell}</span>
                  <span className="text-gray-800">{val === null || val === undefined ? '-' : String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Table className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{t.noResult}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
