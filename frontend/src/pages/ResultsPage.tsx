import React, { useState } from 'react';
import {
  Download, Trash2, FileText, FileSpreadsheet,
  RefreshCw, Filter, FileOutput, Search, X,
} from 'lucide-react';
import { useResults, ResultEntry } from '../context/ResultsContext';

interface ResultsPageProps {
  lang: 'ar' | 'en';
  onTabChange?: (tab: string) => void;
}

type KindFilter = 'all' | 'xlsx' | 'pdf';

const L = {
  ar: {
    title: 'النتائج المحفوظة',
    refresh: 'تحديث',
    filter: 'تصفية',
    all: 'الكل',
    xlsx: 'Excel',
    pdf: 'PDF',
    empty: 'لا توجد نتائج بعد',
    emptyDesc: 'ستظهر ملفات الناتج هنا بعد تنفيذ العمليات',
    download: 'تحميل',
    delete: 'حذف',
    exportPdf: 'تصدير PDF',
    source: 'المصدر',
    size: 'الحجم',
    date: 'التاريخ',
    name: 'الملف',
    kind: 'النوع',
    actions: 'إجراءات',
    confirmDelete: 'هل تريد حذف هذا الملف؟',
    exporting: 'جارٍ التصدير...',
    searchPlaceholder: 'ابحث في النتائج...',
  },
  en: {
    title: 'Saved Results',
    refresh: 'Refresh',
    filter: 'Filter',
    all: 'All',
    xlsx: 'Excel',
    pdf: 'PDF',
    empty: 'No results yet',
    emptyDesc: 'Output files from operations will appear here',
    download: 'Download',
    delete: 'Delete',
    exportPdf: 'Export PDF',
    source: 'Source',
    size: 'Size',
    date: 'Date',
    name: 'File',
    kind: 'Type',
    actions: 'Actions',
    confirmDelete: 'Delete this file?',
    exporting: 'Exporting...',
    searchPlaceholder: 'Search results...',
  },
};

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ lang }) => {
  const { results, refresh, deleteResult, downloadResult, exportResultToPdf } = useResults();
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tr = L[lang];
  const isRtl = lang === 'ar';

  const filtered = results.filter(r => {
    const matchesKind = kindFilter === 'all' || r.kind === kindFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      r.filename.toLowerCase().includes(query) ||
      (r.source_file_name && r.source_file_name.toLowerCase().includes(query));
    return matchesKind && matchesSearch;
  });

  const handleRefresh = async () => {
    setLoading(true);
    try { await refresh(); } finally { setLoading(false); }
  };

  const handleDelete = async (r: ResultEntry) => {
    if (!window.confirm(tr.confirmDelete)) return;
    await deleteResult(r.id);
  };

  const handleDownload = async (r: ResultEntry) => {
    await downloadResult(r.id, r.filename);
  };

  const handleExportPdf = async (r: ResultEntry) => {
    setExportingId(r.id);
    try { await exportResultToPdf(r.id); } finally { setExportingId(null); }
  };

  return (
    <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {(['all', 'xlsx', 'pdf'] as KindFilter[]).map(k => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                kindFilter === k
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tr[k]}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {tr.refresh}
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tr.searchPlaceholder}
            className="flex-1 bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Filter className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-700 font-semibold">{tr.empty}</p>
          <p className="text-slate-400 text-sm mt-1">{tr.emptyDesc}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-start font-semibold text-slate-600">{tr.kind}</th>
                  <th className="px-5 py-3.5 text-start font-semibold text-slate-600">{tr.name}</th>
                  <th className="px-5 py-3.5 text-start font-semibold text-slate-600">{tr.source}</th>
                  <th className="px-5 py-3.5 text-start font-semibold text-slate-600">{tr.size}</th>
                  <th className="px-5 py-3.5 text-start font-semibold text-slate-600">{tr.date}</th>
                  <th className="px-5 py-3.5 text-end font-semibold text-slate-600">{tr.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        r.kind === 'pdf'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {r.kind === 'pdf'
                          ? <FileText className="w-3 h-3" />
                          : <FileSpreadsheet className="w-3 h-3" />
                        }
                        {r.kind.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 max-w-[200px] truncate">
                      {r.filename}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-[160px] truncate">
                      {r.source_file_name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {fmtBytes(r.size)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(r)}
                          title={tr.download}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {r.kind === 'xlsx' && (
                          <button
                            onClick={() => handleExportPdf(r)}
                            disabled={exportingId === r.id}
                            title={exportingId === r.id ? tr.exporting : tr.exportPdf}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                          >
                            <FileOutput className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(r)}
                          title={tr.delete}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};