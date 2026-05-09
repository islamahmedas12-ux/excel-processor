import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Copy, Check, Trash2, Loader, RefreshCw,
  FileSpreadsheet, Plus, ExternalLink,
} from 'lucide-react';
import { Card, Alert, Button } from '../components/ui';
import { FileSelector } from '../components/FileSelector';
import { useFiles } from '../context/FilesContext';
import { apiService, type VerifyToken } from '../services/api';

interface VerifyTokensPageProps { lang: 'ar' | 'en'; }

const VERIFY_BASE = `${window.location.protocol}//${window.location.hostname}:3001/verify`;

const T = {
  ar: {
    title: 'رموز التحقق من الوثائق',
    desc: 'أنشئ رمزاً سرياً لأي ملف — يتيح للآخرين التحقق من أصالته عبر صفحة عامة',
    createTitle: 'إنشاء رمز تحقق',
    fileLabel: 'اختر الملف',
    generate: 'إنشاء رمز',
    generating: 'جاري الإنشاء...',
    existing: 'هذا الملف لديه رمز بالفعل — تم إرجاعه.',
    tokensTitle: 'الرموز الحالية',
    empty: 'لا توجد رموز بعد. اختر ملفاً وانقر "إنشاء رمز".',
    copy: 'نسخ الرمز',
    copied: 'تم النسخ',
    openVerify: 'صفحة التحقق',
    revoke: 'حذف',
    fileTag: 'ملف',
    resultTag: 'نتيجة',
    refresh: 'تحديث',
    noFile: 'اختر ملفاً أولاً',
    createdAt: 'تم الإنشاء:',
  },
  en: {
    title: 'Document Verification Codes',
    desc: 'Generate a secret code for any file — lets others verify its authenticity on a public page',
    createTitle: 'Create Verification Code',
    fileLabel: 'Select File',
    generate: 'Generate Code',
    generating: 'Generating...',
    existing: 'This file already has a code — returning existing one.',
    tokensTitle: 'Active Codes',
    empty: 'No codes yet. Select a file and click "Generate Code".',
    copy: 'Copy Code',
    copied: 'Copied',
    openVerify: 'Verify Page',
    revoke: 'Delete',
    fileTag: 'File',
    resultTag: 'Result',
    refresh: 'Refresh',
    noFile: 'Please select a file first',
    createdAt: 'Created:',
  },
} as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
}

function CodeBadge({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xl font-black tracking-[0.25em] text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-1.5 rounded-xl select-all">
        {code}
      </span>
      <button
        onClick={doCopy}
        title={copied ? copiedLabel : copyLabel}
        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export const VerifyTokensPage: React.FC<VerifyTokensPageProps> = ({ lang }) => {
  const t = T[lang];
  const isRtl = lang === 'ar';
  const { selectedFile } = useFiles();

  const [tokens, setTokens]         = useState<VerifyToken[]>([]);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [info, setInfo]             = useState<string | null>(null);

  const fetchTokens = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiService.listTokens();
      setTokens(data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const handleGenerate = async () => {
    if (!selectedFile) { setError(t.noFile); return; }
    setGenerating(true); setError(null); setInfo(null);
    try {
      const { token, existing } = await apiService.createToken('file', selectedFile.id);
      if (existing) setInfo(t.existing);
      setTokens(prev => {
        if (prev.some(tk => tk.id === token.id)) return prev;
        return [token, ...prev];
      });
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (tokenId: string) => {
    setDeletingId(tokenId);
    try {
      await apiService.deleteToken(tokenId);
      setTokens(prev => prev.filter(tk => tk.id !== tokenId));
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Create token card */}
      <Card title={t.createTitle} icon={<ShieldCheck className="w-5 h-5" />}>
        <p className="text-sm text-gray-500 mb-5">{t.desc}</p>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {info  && <Alert type="success" message={info} onClose={() => setInfo(null)} />}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.fileLabel}</label>
            <FileSelector lang={lang} />
          </div>
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!selectedFile}
            icon={generating ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          >
            {generating ? t.generating : t.generate}
          </Button>
        </div>
      </Card>

      {/* Tokens list card */}
      <Card
        title={`${t.tokensTitle} (${tokens.length})`}
        icon={<ShieldCheck className="w-5 h-5" />}
      >
        <div className="flex justify-end mb-4">
          <Button variant="secondary" onClick={() => fetchTokens()} loading={loading}
            icon={<RefreshCw className="w-4 h-4" />}>
            {t.refresh}
          </Button>
        </div>

        {loading && tokens.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-300">
            <Loader className="w-6 h-6 animate-spin" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 -mx-6">
            {tokens.map(tok => (
              <div key={tok.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-indigo-50 rounded-xl flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tok.filename}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        {tok.resource_type === 'file' ? t.fileTag : t.resultTag}
                      </span>
                      {tok.size_bytes > 0 && (
                        <span className="text-xs text-gray-400">{formatSize(tok.size_bytes)}</span>
                      )}
                    </div>

                    <CodeBadge code={tok.access_code} copyLabel={t.copy} copiedLabel={t.copied} />

                    <p className="text-xs text-gray-400 mt-2">
                      {t.createdAt} {formatDate(tok.created_at, lang)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={`${VERIFY_BASE}?code=${tok.access_code}`}
                      target="_blank"
                      rel="noreferrer"
                      title={t.openVerify}
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(tok.id)}
                      disabled={deletingId === tok.id}
                      title={t.revoke}
                      className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      {deletingId === tok.id
                        ? <Loader className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};