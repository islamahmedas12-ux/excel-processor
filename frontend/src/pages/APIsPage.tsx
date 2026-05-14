import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Plus, Play, Settings, Copy, Trash2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useFiles } from '../context/FilesContext';
import apiService from '../services/api';
import type { FileConfig } from '../types/api';
import { CodeSnippets } from '../components/CodeSnippets';

interface APIsPageProps {
  lang: 'ar' | 'en';
  onTabChange?: (tab: string) => void;
}

interface ApiFileCard {
  id: string;
  name: string;
  size: number;
  uploaded_at: string;
  category_id: string | null;
  api_config: FileConfig | null;
}

interface TestModal {
  fileId: string;
  fileName: string;
  config: FileConfig;
  inputs: Record<string, string>;
  outputs: Record<string, any> | null;
  error: string | null;
  loading: boolean;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const APIsPage: React.FC<APIsPageProps> = ({ lang, onTabChange }) => {
  const { files, loading, deleteFile, refreshFiles } = useFiles();
  const [cards, setCards] = useState<ApiFileCard[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testModal, setTestModal] = useState<TestModal | null>(null);
  const isRtl = lang === 'ar';

  const t = {
    title: isRtl ? 'واجهات API' : 'My APIs',
    newApi: isRtl ? 'API جديد' : 'New API',
    emptyTitle: isRtl ? 'لم يتم إنشاء أي API بعد' : 'No APIs yet',
    emptyHint: isRtl
      ? 'قم برفع ملف Excel الأول وحوّله إلى API'
      : 'Upload your first Excel file to turn it into an API',
    emptyBtn: isRtl ? 'إنشاء API الأول ▸' : 'Turn your first Excel into an API ▸',
    configured: isRtl ? 'مُعدّ' : 'Configured',
    notConfigured: isRtl ? 'غير مُعدّ' : 'Not configured',
    test: isRtl ? 'اختبار' : 'Test',
    editConfig: isRtl ? 'تعديل الإعداد' : 'Edit config',
    copyCurl: isRtl ? 'نسخ curl' : 'Copy curl',
    delete: isRtl ? 'حذف' : 'Delete',
    endpoint: isRtl ? 'نقطة النهاية' : 'Endpoint',
    inputs: isRtl ? 'المدخلات' : 'Inputs',
    runTest: isRtl ? 'تشغيل الاختبار' : 'Run test',
    close: isRtl ? 'إغلاق' : 'Close',
    output: isRtl ? 'النتيجة' : 'Output',
    inputPlaceholder: isRtl ? 'أدخل قيمة...' : 'Enter value...',
  };

  useEffect(() => {
    const loadConfigs = async () => {
      const withConfigs = await Promise.all(
        files.map(async (f) => {
          try {
            const cfg = await apiService.getFileConfig(f.id);
            return { ...f, api_config: cfg } as ApiFileCard;
          } catch {
            return { ...f, api_config: null } as ApiFileCard;
          }
        })
      );
      setCards(withConfigs);
    };
    if (files.length > 0) loadConfigs();
    else setCards([]);
  }, [files]);

  const handleCopyCurl = async (card: ApiFileCard) => {
    const base = window.location.origin;
    const code = `curl -X POST "${base}/api/v1/files/${card.id}/run" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ek_live_YOUR_KEY_HERE" \\
  -d '${JSON.stringify({ inputs: {} }, null, 2)}'`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch { /* noop */ }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isRtl ? 'حذف هذا الملف؟' : 'Delete this file?')) return;
    await deleteFile(id);
  };

  const openTestModal = (card: ApiFileCard) => {
    if (!card.api_config) return;
    const inputs: Record<string, string> = {};
    card.api_config.inputs.forEach(k => { inputs[k] = ''; });
    setTestModal({
      fileId: card.id, fileName: card.name, config: card.api_config,
      inputs, outputs: null, error: null, loading: false,
    });
  };

  const runTest = async () => {
    if (!testModal) return;
    setTestModal({ ...testModal, loading: true, error: null, outputs: null });
    try {
      const res = await apiService.runFile(testModal.fileId, testModal.inputs);
      setTestModal({ ...testModal, loading: false, outputs: res.outputs });
    } catch (e: any) {
      setTestModal({ ...testModal, loading: false, error: e?.response?.data?.error || 'Failed' });
    }
  };

  const activeCards = cards.filter(c => c.api_config);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isRtl ? `${activeCards.length} API نشط` : `${activeCards.length} active API${activeCards.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {onTabChange && (
          <>
            <button
              onClick={() => onTabChange('api_builder')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newApi}</span>
            </button>
            <button
              onClick={() => onTabChange('files')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'رفع ملف' : 'Upload file'}</span>
            </button>
          </>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">{t.emptyTitle}</p>
          <p className="text-slate-400 text-sm mt-1">{t.emptyHint}</p>
          {onTabChange && (
            <button
              onClick={() => onTabChange('files')}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t.emptyBtn}</span>
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {!loading && cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map(card => {
            const configured = !!card.api_config;
            return (
              <div key={card.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{card.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatSize(card.size)}</p>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    configured
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {configured
                      ? <><CheckCircle className="w-3 h-3" /> {t.configured}</>
                      : <><XCircle className="w-3 h-3" /> {t.notConfigured}</>}
                  </span>
                </div>

                {/* Endpoint preview */}
                {configured && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{t.endpoint}</p>
                    <code className="text-xs text-slate-600 font-mono break-all">
                      {window.location.origin}/api/v1/files/{card.id}/run
                    </code>
                  </div>
                )}

                {/* Inputs preview */}
                {configured && card.api_config?.inputs.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t.inputs}</p>
                    <div className="flex flex-wrap gap-1">
                      {card.api_config.inputs.map(inp => (
                        <span key={inp} className="px-2 py-0.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-mono">
                          {inp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  {configured && (
                    <button
                      onClick={() => openTestModal(card)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 hover:bg-primary-100 text-primary-700 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{t.test}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCopyCurl(card)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    {copiedId === card.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === card.id ? (isRtl ? 'تم!' : 'Copied!') : t.copyCurl}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ms-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.delete}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Test modal */}
      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{testModal.fileName}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{isRtl ? 'اختبار API' : 'Test API'}</p>
              </div>
              <button onClick={() => setTestModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <span className="sr-only">{t.close}</span>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Input fields */}
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{t.inputs}</p>
              <div className="space-y-3">
                {testModal.config.inputs.map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{key}</label>
                    <input
                      type="text"
                      value={testModal.inputs[key] || ''}
                      onChange={e => setTestModal({
                        ...testModal,
                        inputs: { ...testModal.inputs, [key]: e.target.value },
                      })}
                      placeholder={t.inputPlaceholder}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={runTest}
              disabled={testModal.loading || Object.values(testModal.inputs).some(v => !v.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50 mb-4"
            >
              {testModal.loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Play className="w-4 h-4" />}
              <span>{t.runTest}</span>
            </button>

            {/* Error */}
            {testModal.error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {testModal.error}
              </div>
            )}

            {/* Output */}
            {testModal.outputs && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{t.output}</p>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <pre className="text-sm font-mono text-slate-800 whitespace-pre-wrap">
                    {JSON.stringify(testModal.outputs, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};