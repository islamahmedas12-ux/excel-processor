import React, { useEffect, useState } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

interface Props {
  token: string;
  lang: 'ar' | 'en';
  onDone: () => void;
}

export const VerifyEmailPage: React.FC<Props> = ({ token, lang, onDone }) => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        setStatus(ok ? 'ok' : 'fail');
        setMessage(d.message || d.error || '');
      })
      .catch(e => { setStatus('fail'); setMessage(String(e)); });
  }, [token]);

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow rounded-lg w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-bold mb-4">{t('تفعيل البريد الإلكتروني', 'Email Verification')}</h1>
        {status === 'loading' && <p>{t('جاري التحقق...', 'Verifying...')}</p>}
        {status === 'ok'      && <p className="text-green-700">{message || t('تم التفعيل', 'Verified')}</p>}
        {status === 'fail'    && <p className="text-red-600">{message || t('فشل التفعيل', 'Verification failed')}</p>}
        <button
          onClick={onDone}
          className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          {t('متابعة', 'Continue')}
        </button>
      </div>
    </div>
  );
};
