import React, { useState } from 'react';
import { FileSpreadsheet, Lock, User, Mail, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  lang: 'ar' | 'en';
  onLangChange: (l: 'ar' | 'en') => void;
}

type Mode = 'login' | 'register' | 'forgot';

const T = {
  ar: {
    loginTitle:    'مرحباً بك',
    loginSub:      'سجّل دخولك للمتابعة إلى معالج Excel',
    registerTitle: 'إنشاء حساب جديد',
    registerSub:   'أنشئ حسابك للوصول إلى معالج Excel',
    forgotTitle:   'نسيت كلمة المرور؟',
    forgotSub:     'أدخل بريدك وسنرسل لك رابط إعادة التعيين',
    username:      'اسم المستخدم',
    email:         'البريد الإلكتروني',
    password:      'كلمة المرور',
    confirm:       'تأكيد كلمة المرور',
    userPh:        'أدخل اسم المستخدم',
    emailPh:       'أدخل بريدك الإلكتروني',
    passPh:        'أدخل كلمة المرور',
    confirmPh:     'أعد إدخال كلمة المرور',
    loginBtn:      'تسجيل الدخول',
    registerBtn:   'إنشاء الحساب',
    sendResetBtn:  'إرسال رابط الاسترداد',
    loading:       'جاري التحميل...',
    toRegister:    'ليس لديك حساب؟',
    toRegisterLink:'إنشاء حساب',
    toLogin:       'لديك حساب بالفعل؟',
    toLoginLink:   'تسجيل الدخول',
    forgotLink:    'نسيت كلمة المرور؟',
    backToLogin:   'العودة لتسجيل الدخول',
    noMatch:       'كلمتا المرور غير متطابقتين',
    checkEmail:    'تحقق من بريدك الإلكتروني',
    verifyNote:    'أرسلنا رابط التحقق إلى بريدك، يرجى تأكيد حسابك قبل تسجيل الدخول.',
    resetSent:     'تم الإرسال! تحقق من بريدك لرابط إعادة تعيين كلمة المرور.',
    notVerified:   'يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد.',
    switchLang:    'English',
  },
  en: {
    loginTitle:    'Welcome back',
    loginSub:      'Sign in to continue to Excel Processor',
    registerTitle: 'Create an account',
    registerSub:   'Register to access Excel Processor',
    forgotTitle:   'Forgot your password?',
    forgotSub:     'Enter your email and we\'ll send a reset link',
    username:      'Username',
    email:         'Email',
    password:      'Password',
    confirm:       'Confirm Password',
    userPh:        'Enter your username',
    emailPh:       'Enter your email',
    passPh:        'Enter your password',
    confirmPh:     'Re-enter your password',
    loginBtn:      'Sign In',
    registerBtn:   'Create Account',
    sendResetBtn:  'Send Reset Link',
    loading:       'Please wait...',
    toRegister:    "Don't have an account?",
    toRegisterLink:'Register',
    toLogin:       'Already have an account?',
    toLoginLink:   'Sign In',
    forgotLink:    'Forgot password?',
    backToLogin:   'Back to Sign In',
    noMatch:       'Passwords do not match',
    checkEmail:    'Check your email',
    verifyNote:    'We sent a verification link to your email. Please verify your account before signing in.',
    resetSent:     'Sent! Check your email for the password reset link.',
    notVerified:   'Please verify your email first. Check your inbox.',
    switchLang:    'العربية',
  },
} as const;

export const LoginPage: React.FC<LoginPageProps> = ({ lang, onLangChange }) => {
  const { login }  = useAuth();
  const [mode,     setMode]     = useState<Mode>('login');
  const [username, setUsername] = useState('');  // display name (register only)
  const [email,    setEmail]    = useState('');  // used for login + register + forgot
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  const isRtl = lang === 'ar';
  const t = T[lang];

  const reset = (next: Mode) => {
    setMode(next);
    setUsername(''); setEmail(''); setPassword(''); setConfirm('');
    setError(null);  setSuccess(null);
    setShowPass(false); setShowConf(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (mode === 'register' && password !== confirm) {
      setError(t.noMatch);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res  = await fetch('/api/v1/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body:   JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.status === 403 && data.error === 'email_not_verified') {
          setError(t.notVerified);
          return;
        }
        if (res.status === 403 && data.error === 'wrong_portal') {
          setError(isRtl
            ? 'هذا الحساب يمتلك صلاحيات مدير. الرجاء استخدام بوابة المدير.'
            : 'This account has admin privileges. Please use the admin portal.');
          return;
        }
        if (!res.ok || !data.success) {
          setError(data.error || (isRtl ? 'بيانات غير صحيحة' : 'Invalid credentials'));
          return;
        }
        login(data.token, data.user);

      } else if (mode === 'register') {
        const res  = await fetch('/api/v1/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body:   JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || (isRtl ? 'حدث خطأ' : 'An error occurred'));
          return;
        }
        setSuccess(t.verifyNote);

      } else {
        // forgot
        const res  = await fetch('/api/v1/auth/forgot-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body:   JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || (isRtl ? 'حدث خطأ' : 'An error occurred'));
          return;
        }
        setSuccess(t.resetSent);
      }
    } catch {
      setError(isRtl ? 'خطأ في الاتصال بالسيرفر' : 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? t.loginTitle : mode === 'register' ? t.registerTitle : t.forgotTitle;
  const sub   = mode === 'login' ? t.loginSub   : mode === 'register' ? t.registerSub   : t.forgotSub;

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">{sub}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">
                {mode === 'register' ? t.checkEmail : (isRtl ? 'تم الإرسال!' : 'Sent!')}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{success}</p>
              <button
                onClick={() => reset('login')}
                className="mt-6 text-sm text-primary-600 font-semibold hover:underline"
              >
                {t.backToLogin}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Username — display name, register only */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.username}</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="text" value={username} autoComplete="username"
                      onChange={e => { setUsername(e.target.value); setError(null); }}
                      placeholder={t.userPh}
                      className="w-full ps-10 pe-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800
                        placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>
              )}

              {/* Email — all modes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.email}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="email" value={email} autoComplete="email"
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    placeholder={t.emailPh}
                    className="w-full ps-10 pe-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800
                      placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              {/* Password (login + register) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700">{t.password}</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => reset('forgot')}
                        className="text-xs text-primary-600 hover:underline font-medium">
                        {t.forgotLink}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      placeholder={t.passPh}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full ps-10 pe-10 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800
                        placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm password (register) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.confirm}</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type={showConf ? 'text' : 'password'} value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(null); }}
                      placeholder={t.confirmPh} autoComplete="new-password"
                      className="w-full ps-10 pe-10 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800
                        placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                    />
                    <button type="button" onClick={() => setShowConf(v => !v)}
                      className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600">
                      {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  loading ||
                  (mode === 'login'    && (!email || !password)) ||
                  (mode === 'register' && (!username || !email || !password || !confirm)) ||
                  (mode === 'forgot'   && !email)
                }
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700
                  text-white font-semibold rounded-xl text-sm transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary-200"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? t.loading : mode === 'login' ? t.loginBtn : mode === 'register' ? t.registerBtn : t.sendResetBtn}
              </button>
            </form>
          )}

          {/* Mode toggles */}
          {!success && (
            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === 'login' ? (
                <>{t.toRegister}{' '}
                  <button onClick={() => reset('register')} className="text-primary-600 font-semibold hover:underline">
                    {t.toRegisterLink}
                  </button>
                </>
              ) : (
                <>{t.toLogin}{' '}
                  <button onClick={() => reset('login')} className="text-primary-600 font-semibold hover:underline">
                    {t.toLoginLink}
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        {/* Lang + version */}
        <div className="flex items-center justify-between mt-6 text-xs text-slate-400">
          <span>Excel Processor v2.0.0</span>
          <button onClick={() => onLangChange(lang === 'ar' ? 'en' : 'ar')}
            className="hover:text-slate-600 transition-colors font-medium">
            {t.switchLang}
          </button>
        </div>
      </div>
    </div>
  );
};