import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

interface LoginPageProps {
  lang: 'ar' | 'en';
  onLangChange: (lang: 'ar' | 'en') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ lang, onLangChange }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo]   = useState<string | null>(null);

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') {
        const res  = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Login failed');
        login(data.token, data.user);
      } else {
        const res  = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setInfo(data.message || t('تم إنشاء الحساب', 'Account created'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">
            {mode === 'login' ? t('تسجيل الدخول', 'Sign in') : t('إنشاء حساب', 'Sign up')}
          </h1>
          <button
            onClick={() => onLangChange(lang === 'ar' ? 'en' : 'ar')}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              required
              placeholder={t('اسم المستخدم', 'Username')}
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          )}
          <input
            type="email"
            required
            placeholder={t('البريد الإلكتروني', 'Email')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="password"
            required
            placeholder={t('كلمة المرور', 'Password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />

          {error && <div className="text-sm text-red-600">{error}</div>}
          {info  && <div className="text-sm text-green-700">{info}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? '...' : mode === 'login' ? t('دخول', 'Sign in') : t('إنشاء', 'Create account')}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setInfo(null); }}
          className="mt-4 w-full text-sm text-primary-600 hover:underline"
        >
          {mode === 'login'
            ? t('ما عندكش حساب؟ سجّل دلوقتي', "Don't have an account? Register")
            : t('عندك حساب؟ ادخل من هنا', 'Already have an account? Sign in')}
        </button>
      </div>
    </div>
  );
};
