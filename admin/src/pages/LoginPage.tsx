import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { adminApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, username, role } = await adminApi.login(email.trim(), password);
      if (role !== 'admin') {
        setError('هذا الحساب ليس لديه صلاحيات المسؤول');
        return;
      }
      login(token, { username, role });
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg === 'account_disabled') setError('الحساب موقوف');
      else if (msg === 'email_not_verified') setError('البريد الإلكتروني غير مفعّل');
      else setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center shadow-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Excel Processor — المسؤولون فقط</p>
        </div>

        {/* Card */}
        <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl p-8 space-y-5">

          {error && (
            <div className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              البريد الإلكتروني
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder-slate-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              كلمة المرور
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-slate-400 hover:text-slate-600 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold
              py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {loading ? 'جارٍ تسجيل الدخول...' : 'دخول'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          هذه اللوحة مخصصة للمسؤولين فقط
        </p>
      </div>
    </div>
  );
};
