import React, { useState } from 'react';
import { FileSpreadsheet, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

interface Props {
  token: string;
  lang: 'ar' | 'en';
  onDone: () => void;
}

const T = {
  ar: {
    title:     'إعادة تعيين كلمة المرور',
    sub:       'أدخل كلمة مرورك الجديدة',
    password:  'كلمة المرور الجديدة',
    confirm:   'تأكيد كلمة المرور',
    passPh:    'أدخل كلمة المرور الجديدة',
    confPh:    'أعد إدخال كلمة المرور',
    submit:    'تعيين كلمة المرور',
    loading:   'جاري التعيين...',
    noMatch:   'كلمتا المرور غير متطابقتين',
    done:      'تم تعيين كلمة المرور!',
    doneSub:   'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
    goLogin:   'تسجيل الدخول',
  },
  en: {
    title:     'Reset Password',
    sub:       'Enter your new password below',
    password:  'New Password',
    confirm:   'Confirm Password',
    passPh:    'Enter new password',
    confPh:    'Re-enter new password',
    submit:    'Set New Password',
    loading:   'Saving...',
    noMatch:   'Passwords do not match',
    done:      'Password Reset!',
    doneSub:   'You can now sign in with your new password.',
    goLogin:   'Sign In',
  },
} as const;

export const ResetPasswordPage: React.FC<Props> = ({ token, lang, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  const isRtl = lang === 'ar';
  const t = T[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError(t.noMatch); return; }
    setLoading(true); setError(null);

    try {
      const res  = await fetch('/api/v1/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || (isRtl ? 'حدث خطأ' : 'An error occurred'));
        return;
      }
      setDone(true);
    } catch {
      setError(isRtl ? 'خطأ في الاتصال بالسيرفر' : 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          {!done && (
            <>
              <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
              <p className="text-slate-500 text-sm mt-1 text-center">{t.sub}</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">{t.done}</h3>
              <p className="text-sm text-slate-500 mb-6">{t.doneSub}</p>
              <button
                onClick={onDone}
                className="px-8 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {t.goLogin}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.password}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'} value={password} autoComplete="new-password"
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    placeholder={t.passPh}
                    className="w-full ps-10 pe-10 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800
                      placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.confirm}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type={showConf ? 'text' : 'password'} value={confirm} autoComplete="new-password"
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    placeholder={t.confPh}
                    className="w-full ps-10 pe-10 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800
                      placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700
                  text-white font-semibold rounded-xl text-sm transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary-200"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? t.loading : t.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};