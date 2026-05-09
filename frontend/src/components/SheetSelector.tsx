import React, { useEffect, useState } from 'react';
import { Layers, Loader } from 'lucide-react';
import { useFiles } from '../context/FilesContext';
import { apiService } from '../services/api';

interface SheetSelectorProps {
  lang: 'ar' | 'en';
  value: string;
  onChange: (sheet: string) => void;
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({ lang, value, onChange }) => {
  const { selectedFile } = useFiles();
  const [sheets, setSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const t = {
    ar: {
      label: 'الورقة',
      loading: 'جاري تحميل الأوراق...',
      noFile: 'اختر ملفاً أولاً',
      error: 'تعذّر قراءة الأوراق',
      select: 'اختر ورقة...',
    },
    en: {
      label: 'Sheet',
      loading: 'Loading sheets...',
      noFile: 'Select a file first',
      error: 'Failed to read sheets',
      select: 'Select a sheet...',
    },
  }[lang];

  useEffect(() => {
    if (!selectedFile) {
      setSheets([]);
      onChange('');
      return;
    }

    setLoading(true);
    setError(false);

    apiService.getSheets(selectedFile.id)
      .then(data => {
        setSheets(data);
        // auto-select first sheet
        if (data.length > 0) onChange(data[0]);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [selectedFile?.id]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          {t.label}
        </span>
      </label>

      {loading ? (
        <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
          <Loader className="w-4 h-4 animate-spin" />
          {t.loading}
        </div>
      ) : !selectedFile ? (
        <div className="px-4 py-2.5 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
          {t.noFile}
        </div>
      ) : error ? (
        <div className="px-4 py-2.5 border border-red-200 rounded-lg text-sm text-red-500 bg-red-50">
          {t.error}
        </div>
      ) : (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {sheets.length === 0 && (
            <option value="">{t.select}</option>
          )}
          {sheets.map(sheet => (
            <option key={sheet} value={sheet}>{sheet}</option>
          ))}
        </select>
      )}

      {/* sheet pills for quick reference */}
      {sheets.length > 1 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {sheets.map(sheet => (
            <button
              key={sheet}
              type="button"
              onClick={() => onChange(sheet)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                value === sheet
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {sheet}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};