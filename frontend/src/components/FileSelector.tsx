import React, { useRef } from 'react';
import { useFiles } from '../context/FilesContext';
import { apiService } from '../services/api';

interface Props { lang: 'ar' | 'en'; }

export const FileSelector: React.FC<Props> = ({ lang }) => {
  const { files, selectedFile, setSelectedFile, refresh, loading } = useFiles();
  const inputRef = useRef<HTMLInputElement>(null);
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const created = await apiService.uploadFile(f);
      await refresh();
      setSelectedFile(created);
    } catch (err) {
      alert(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          onChange={onUpload}
          className="text-sm"
        />
        <button
          onClick={refresh}
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          {t('تحديث', 'Refresh')}
        </button>
      </div>
      {loading && <div className="text-xs text-gray-500">{t('جاري التحميل...', 'Loading...')}</div>}
      {files.length === 0 && !loading && (
        <div className="text-xs text-gray-500">{t('لا توجد ملفات', 'No files yet')}</div>
      )}
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
        {files.map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFile(f)}
            className={`block w-full text-start px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 ${
              selectedFile?.id === f.id ? 'bg-primary-50 text-primary-700 font-semibold' : 'hover:bg-gray-50'
            }`}
          >
            {f.filename}
          </button>
        ))}
      </div>
    </div>
  );
};
