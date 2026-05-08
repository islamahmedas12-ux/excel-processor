'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldX, Loader, FileSpreadsheet, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLang } from '@/lib/useLang';

const T = {
  ar: {
    title: 'التحقق من أصالة وثيقة',
    desc: 'أدخل الرمز المكوّن من ٦ أحرف للتحقق من صحة الوثيقة',
    placeholder: 'مثال: XK29AB',
    verify: 'تحقق',
    verifying: 'جاري التحقق...',
    validTitle: 'وثيقة موثّقة',
    validDesc: 'هذه الوثيقة صادرة من معالج Excel وأصالتها مؤكدة.',
    invalidTitle: 'لم يتم العثور على الوثيقة',
    invalidDesc: 'لا توجد وثيقة مرتبطة بهذا الرمز أو أن الرمز غير صحيح.',
    file: 'اسم الملف',
    type: 'النوع',
    size: 'الحجم',
    issuedAt: 'تاريخ الإصدار',
    verifiedAt: 'وقت التحقق',
    typeFile: 'ملف Excel',
    typeResult: 'نتيجة تصدير',
    rateLimited: 'عدد كبير من الطلبات. حاول مرة أخرى بعد دقيقة.',
  },
  en: {
    title: 'Verify Document Authenticity',
    desc: 'Enter the 6-character code to verify a document\'s authenticity',
    placeholder: 'e.g. XK29AB',
    verify: 'Verify',
    verifying: 'Verifying...',
    validTitle: 'Document Verified',
    validDesc: 'This document was issued by Excel Processor and its authenticity is confirmed.',
    invalidTitle: 'Document Not Found',
    invalidDesc: 'No document is associated with this code, or the code is incorrect.',
    file: 'Filename',
    type: 'Type',
    size: 'Size',
    issuedAt: 'Issued',
    verifiedAt: 'Verified at',
    typeFile: 'Excel File',
    typeResult: 'Export Result',
    rateLimited: 'Too many requests. Please try again in a minute.',
  },
} as const;

function formatSize(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

interface VerifyResult {
  filename: string;
  size_bytes: number;
  resource_type: string;
  issued_at: string;
  verified_at: string;
}

function VerifyForm() {
  const [lang, setLang] = useLang();
  const searchParams    = useSearchParams();
  const t = T[lang];
  const isRtl = lang === 'ar';

  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<VerifyResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-verify if ?code= is in the URL
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode.toUpperCase());
      doVerify(urlCode.toUpperCase());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doVerify = async (codeArg?: string) => {
    const target = (codeArg ?? code).trim().toUpperCase();
    if (target.length !== 6) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res  = await fetch(`/api/v1/verify/${target}`);
      const data = await res.json();
      if (data.success) {
        setResult(data.document);
      } else if (res.status === 429) {
        setError(t.rateLimited);
      } else {
        setError(t.invalidDesc);
      }
    } catch {
      setError(t.invalidDesc);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (v: string) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(clean);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <Navbar lang={lang} onLangChange={setLang} />

      <main className="flex-1 pt-24 pb-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-lg mx-auto px-4" dir={isRtl ? 'rtl' : 'ltr'}>

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
              <ShieldCheck className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">{t.title}</h1>
            <p className="text-slate-500 text-sm">{t.desc}</p>
          </div>

          {/* Input card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                value={code}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doVerify()}
                placeholder={t.placeholder}
                maxLength={6}
                className="flex-1 font-mono text-xl font-bold tracking-[0.2em] uppercase text-center
                  border border-slate-200 rounded-xl px-4 py-3
                  focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
                  placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-normal placeholder:text-base"
              />
              <button
                onClick={() => doVerify()}
                disabled={loading || code.length !== 6}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-200
                  text-white font-semibold px-5 py-3 rounded-xl transition-colors disabled:text-slate-400"
              >
                {loading
                  ? <Loader className="w-5 h-5 animate-spin" />
                  : <Search className="w-5 h-5" />}
                <span className="hidden sm:block">{loading ? t.verifying : t.verify}</span>
              </button>
            </div>
          </div>

          {/* Valid result */}
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-4 mb-5">
                <div className="p-2.5 bg-emerald-100 rounded-xl flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-emerald-800 text-lg">{t.validTitle}</h2>
                  <p className="text-emerald-600 text-sm mt-0.5">{t.validDesc}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-emerald-100 divide-y divide-emerald-100">
                {[
                  { label: t.file, value: (
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      <span className="font-mono text-sm">{result.filename}</span>
                    </span>
                  )},
                  { label: t.type,  value: result.resource_type === 'file' ? t.typeFile : t.typeResult },
                  { label: t.size,  value: formatSize(result.size_bytes) },
                  { label: t.issuedAt,   value: formatDate(result.issued_at, lang) },
                  { label: t.verifiedAt, value: formatDate(result.verified_at, lang) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3 gap-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0">
                      {row.label}
                    </span>
                    <span className="text-sm text-slate-800 text-end">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invalid / error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
                  <ShieldX className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="font-bold text-red-700 text-lg">{t.invalidTitle}</h2>
                  <p className="text-red-500 text-sm mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer lang={lang} />
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
