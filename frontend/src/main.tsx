import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import './index.css';

function getQueryParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

function clearQuery() {
  window.history.replaceState({}, '', window.location.pathname);
}

function App() {
  const [lang, setLang]          = React.useState<'ar' | 'en'>('ar');
  const [verifyToken, setVerify] = React.useState<string | null>(() => getQueryParam('verify'));
  const [resetToken,  setReset]  = React.useState<string | null>(() => getQueryParam('reset'));
  const { isAuthenticated, isLoading } = useAuth();

  if (verifyToken) {
    return (
      <VerifyEmailPage
        token={verifyToken}
        lang={lang}
        onDone={() => { clearQuery(); setVerify(null); }}
      />
    );
  }

  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        lang={lang}
        onDone={() => { clearQuery(); setReset(null); }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage lang={lang} onLangChange={setLang} />;
  }

  return <HomePage lang={lang} onLangChange={setLang} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
