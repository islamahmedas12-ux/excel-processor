import React, { useEffect, useState } from 'react';
import {
  Layers, Download, Loader, BookMarked, FileText,
  CheckSquare, Square, GripVertical, Plus, X,
} from 'lucide-react';
import { Card, Button, Alert } from '../components/ui';
import { useResults } from '../context/ResultsContext';
import { apiService } from '../services/api';

interface MergePdfPageProps { lang: 'ar' | 'en'; }

const T = {
  ar: {
    title: 'دمج ملفات PDF',
    desc: 'اختر ملفين أو أكثر من نتائج PDF المحفوظة لدمجها في ملف واحد',
    selectTitle: 'اختر ملفات PDF',
    noPdfs: 'لا توجد نتائج PDF محفوظة. صدّر ملفات Excel إلى PDF أولاً.',
    coverTitle: 'صفحة الغلاف (اختياري)',
    coverTitleLabel: 'عنوان الوثيقة',
    coverSubLabel: 'عنوان فرعي',
    coverDateLabel: 'التاريخ',
    outputLabel: 'اسم الملف الناتج',
    minSelect: 'اختر ملفين على الأقل',
    merge: 'دمج وتحميل',
    mergeAndSave: 'دمج وحفظ',
    merging: 'جاري الدمج...',
    success: 'تم دمج الملفات بنجاح!',
    successSave: 'تم الدمج والحفظ!',
    selected: (n: number) => `${n} ملفات مختارة`,
    order: 'الترتيب مهم — الأول يظهر أولاً',
  },
  en: {
    title: 'Merge PDF Files',
    desc: 'Select two or more saved PDF results to merge into a single file',
    selectTitle: 'Choose PDF Files',
    noPdfs: 'No saved PDF results. Export Excel files to PDF first.',
    coverTitle: 'Cover Page (optional)',
    coverTitleLabel: 'Document Title',
    coverSubLabel: 'Subtitle',
    coverDateLabel: 'Date',
    outputLabel: 'Output Filename',
    minSelect: 'Select at least 2 files',
    merge: 'Merge & Download',
    mergeAndSave: 'Merge & Save',
    merging: 'Merging...',
    success: 'Files merged successfully!',
    successSave: 'Merged and saved!',
    selected: (n: number) => `${n} file${n !== 1 ? 's' : ''} selected`,
    order: 'Order matters — first file appears first',
  },
} as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MergePdfPage: React.FC<MergePdfPageProps> = ({ lang }) => {
  const t = T[lang];
  const isRtl = lang === 'ar';
  const { results, refresh } = useResults();

  const savedPdfs = results.filter(r => r.kind === 'pdf');

  const [selected, setSelected] = useState<string[]>([]);   // ordered list of result IDs
  const [coverTitle, setCoverTitle]     = useState('');
  const [coverSub, setCoverSub]         = useState('');
  const [coverDate, setCoverDate]       = useState('');
  const [outputName, setOutputName]     = useState('merged');
  const [merging, setMerging]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);

  useEffect(() => { refresh(); }, []);

  const toggle = (id: string) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const remove = (id: string) => setSelected(prev => prev.filter(x => x !== id));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelected(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  };

  const validate = () => {
    if (selected.length < 2) { setError(t.minSelect); return false; }
    return true;
  };

  const doMerge = async (save: boolean) => {
    if (!validate()) return;
    const setter = save ? setSaving : setMerging;
    setter(true); setError(null); setSuccess(null);
    try {
      const res = await apiService.mergePdfs({
        resultIds: selected,
        coverTitle:    coverTitle.trim() || undefined,
        coverSubtitle: coverSub.trim()   || undefined,
        coverDate:     coverDate.trim()  || undefined,
        outputName:    outputName.trim() || 'merged',
        saveResult:    save,
      });

      if (save) {
        await refresh();
        setSuccess(t.successSave);
      } else {
        const blob = res as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${outputName || 'merged'}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccess(t.success);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || (lang === 'ar' ? 'حدث خطأ' : 'Error'));
    } finally {
      setter(false);
    }
  };

  const selectedMeta = selected.map(id => results.find(r => r.id === id)).filter(Boolean) as typeof results;

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* PDF picker */}
      <Card title={t.selectTitle} icon={<Layers className="w-5 h-5" />}>
        <p className="text-sm text-gray-500 mb-4">{t.desc}</p>

        {error   && <Alert type="error"   message={error}   onClose={() => setError(null)}   />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {savedPdfs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t.noPdfs}</p>
          </div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
              {savedPdfs.map(r => {
                const checked = selected.includes(r.id);
                return (
                  <label key={r.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                    <span className={`flex-shrink-0 ${checked ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="hidden" />
                    <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.filename}</p>
                      <p className="text-xs text-gray-500">{formatSize(r.size)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {selected.length > 0 && (
              <p className="text-xs text-gray-500">{t.selected(selected.length)} · {t.order}</p>
            )}
          </>
        )}
      </Card>

      {/* Order panel — only when ≥2 selected */}
      {selected.length >= 2 && (
        <Card title={lang === 'ar' ? 'الترتيب' : 'Order'} icon={<GripVertical className="w-5 h-5" />}>
          <div className="space-y-2">
            {selectedMeta.map((r, idx) => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="flex-1 text-sm font-medium text-gray-800 truncate">{r.filename}</p>
                <div className="flex gap-1">
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    className="p-1 rounded text-gray-500 hover:text-indigo-600 disabled:opacity-20 transition-colors">
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(r.id)}
                    className="p-1 rounded text-gray-500 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cover page settings */}
      <Card title={t.coverTitle} icon={<Plus className="w-5 h-5" />}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.coverTitleLabel}</label>
            <input value={coverTitle} onChange={e => setCoverTitle(e.target.value)}
              placeholder={lang === 'ar' ? 'عنوان الوثيقة المدمجة' : 'Title of merged document'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.coverSubLabel}</label>
            <input value={coverSub} onChange={e => setCoverSub(e.target.value)}
              placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.coverDateLabel}</label>
              <input type="date" value={coverDate} onChange={e => setCoverDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.outputLabel}</label>
              <input value={outputName} onChange={e => setOutputName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => doMerge(false)}
          loading={merging}
          disabled={selected.length < 2 || saving}
          icon={merging ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        >
          {merging ? t.merging : t.merge}
        </Button>
        <Button
          variant="secondary"
          onClick={() => doMerge(true)}
          loading={saving}
          disabled={selected.length < 2 || merging}
          icon={saving ? <Loader className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
        >
          {saving ? t.merging : t.mergeAndSave}
        </Button>
      </div>
    </div>
  );
};