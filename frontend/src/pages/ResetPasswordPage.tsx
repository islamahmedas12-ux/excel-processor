import React, { useState } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

interface Props {
  token: string;
  lang: 'ar' | 'en';
  onDone: () => void;
}

export const ResetPasswordPage: React.FC<Props> = ({ token, lang, onDone }) => {
  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone]   = useState(false);

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Reset failed');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow rounded-lg w-full max-w-md p-6">
        <h1 className="text-xl font-bold mb-4">{t('إعادة تعيين كلمة المرور', 'Reset Password')}</h1>
        {done ? (
          <>
            <p className="text-green-700 mb-4">{t('تم تغيير كلمة المرور', 'Password updated')}</p>
            <button onClick={onDone} className="w-full py-2 bg-primary-600 text-white rounded-md">
              {t('تسجيل الدخول', 'Sign in')}
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder={t('كلمة المرور الجديدة', 'New password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? '...' : t('حفظ', 'Save')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
