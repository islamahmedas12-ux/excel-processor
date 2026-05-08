import React from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AdminPortal } from './pages/AdminPortal';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  return user?.role === 'admin' ? <AdminPortal /> : <LoginPage />;
};
