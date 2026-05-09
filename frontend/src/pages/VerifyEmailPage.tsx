import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Props {
  token: string;
  lang: 'ar' | 'en';
  onDone: () => void;
}

const T = {
  ar: {
    verifying: 'جاري التحقق...',
    success:   'تم التحقق بنجاح!',
    successSub:'تم تأكيد بريدك الإلكتروني. يمكنك تسجيل الدخول الآن.',
    error:     'رابط غير صالح',
    errorSub:  'هذا الرابط منتهي الصلاحية أو غير صحيح.',
    goLogin:   'الذهاب لتسجيل الدخول',
  },
  en: {
    verifying: 'Verifying...',
    success:   'Email Verified!',
    successSub:'Your email has been confirmed. You can now sign in.',
    error:     'Invalid Link',
    errorSub:  'This verification link is expired or invalid.',
    goLogin:   'Go to Sign In',
  },
} as const;

export const VerifyEmailPage: React.FC<Props> = ({ token, lang, onDone }) => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const t = T[lang];

  useEffect(() => {
    fetch('/api/v1/auth/verify-email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => setStatus(d.success ? 'ok' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">{t.verifying}</p>
            </>
          )}

          {status === 'ok' && (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t.success}</h2>
              <p className="text-sm text-slate-500 mb-6">{t.successSub}</p>
              <button
                onClick={onDone}
                className="px-8 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {t.goLogin}
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t.error}</h2>
              <p className="text-sm text-slate-500 mb-6">{t.errorSub}</p>
              <button
                onClick={onDone}
                className="px-8 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                {t.goLogin}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};