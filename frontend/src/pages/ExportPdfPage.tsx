import React, { useState } from 'react';
import { FileText, Upload, Download, Loader } from 'lucide-react';
import { Card, Button, Alert } from '../components/ui';

interface ExportPdfPageProps {
  lang: 'ar' | 'en';
}

export const ExportPdfPage: React.FC<ExportPdfPageProps> = ({ lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const content = {
    ar: {
      title: 'تصدير إلى PDF',
      description: 'حول ملف Excel إلى ملف PDF',
      selectFile: 'اختر ملف Excel',
      dropzone: 'اسحب ملف Excel هنا أو انقر للاختيار',
      export: 'تصدير PDF',
      converting: 'جاري التحويل...',
      success: 'تم تحويل الملف بنجاح!',
      downloadStarted: 'بدأ تحميل PDF',
      noFile: 'لم يتم اختيار ملف بعد',
    },
    en: {
      title: 'Export to PDF',
      description: 'Convert Excel file to PDF',
      selectFile: 'Select Excel File',
      dropzone: 'Drop Excel file here or click to browse',
      export: 'Export PDF',
      converting: 'Converting...',
      success: 'File converted successfully!',
      downloadStarted: 'PDF download started',
      noFile: 'No file selected yet',
    },
  };

  const t = content[lang];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setFile(selectedFile);
        setError(null);
        setSuccess(false);
      } else {
        setError(lang === 'ar' ? 'يرجى اختيار ملف Excel صحيح' : 'Please select a valid Excel file');
      }
    }
  };

  const handleExport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/v1/export/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.(xlsx|xls)$/, '.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card title={t.title} icon={<FileText className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.selectFile}
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t.dropzone}</p>
            </label>
          </div>
          {file && (
            <p className="mt-2 text-sm text-gray-500">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={t.success} onClose={() => setSuccess(false)} />}

        <Button
          onClick={handleExport}
          loading={loading}
          disabled={!file}
          icon={loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        >
          {loading ? t.converting : t.export}
        </Button>

        {!file && !loading && (
          <p className="mt-4 text-center text-gray-400 text-sm">{t.noFile}</p>
        )}
      </Card>
    </div>
  );
};