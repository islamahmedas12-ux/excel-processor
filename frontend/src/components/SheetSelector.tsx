import React, { useEffect, useState } from 'react';
import { useFiles } from '../context/FilesContext';
import { apiService } from '../services/api';

interface Props {
  lang: 'ar' | 'en';
  value: string;
  onChange: (sheet: string) => void;
}

export const SheetSelector: React.FC<Props> = ({ lang, value, onChange }) => {
  const { selectedFile } = useFiles();
  const [sheets, setSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!selectedFile) { setSheets([]); return; }
    setLoading(true);
    apiService.getSheets(selectedFile.id)
      .then(s => { if (!cancelled) setSheets(s); })
      .catch(() => { if (!cancelled) setSheets([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedFile]);

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={!selectedFile || loading}
      className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
    >
      <option value="">{t('-- الورقة الافتراضية --', '-- Default sheet --')}</option>
      {sheets.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
};
