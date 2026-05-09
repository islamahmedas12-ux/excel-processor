import React from 'react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  lang: 'ar' | 'en';
  onLangChange: (lang: 'ar' | 'en') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const TABS_AR: Array<{ id: string; label: string }> = [
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'files',     label: 'الملفات' },
  { id: 'results',   label: 'النتائج' },
  { id: 'read',      label: 'قراءة' },
  { id: 'write',     label: 'تعديل خلية' },
  { id: 'batch',     label: 'تعديل متعدد' },
  { id: 'pdf',       label: 'تصدير PDF' },
  { id: 'execute',   label: 'تنفيذ دفعي' },
  { id: 'merge',     label: 'دمج PDF' },
  { id: 'insert',    label: 'إدراج صورة' },
  { id: 'templates', label: 'القوالب' },
  { id: 'jobs',      label: 'المهام' },
  { id: 'verify',    label: 'التوكنز' },
  { id: 'plans',     label: 'الباقات' },
  { id: 'profile',   label: 'الحساب' },
];

const TABS_EN: Array<{ id: string; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'files',     label: 'Files' },
  { id: 'results',   label: 'Results' },
  { id: 'read',      label: 'Read' },
  { id: 'write',     label: 'Write Cell' },
  { id: 'batch',     label: 'Batch Write' },
  { id: 'pdf',       label: 'Export PDF' },
  { id: 'execute',   label: 'Batch Execute' },
  { id: 'merge',     label: 'Merge PDF' },
  { id: 'insert',    label: 'Insert Image' },
  { id: 'templates', label: 'Templates' },
  { id: 'jobs',      label: 'Jobs' },
  { id: 'verify',    label: 'Tokens' },
  { id: 'plans',     label: 'Plans' },
  { id: 'profile',   label: 'Profile' },
];

export const Layout: React.FC<LayoutProps> = ({ lang, onLangChange, activeTab, onTabChange, children }) => {
  const { user, logout } = useAuth();
  const tabs = lang === 'ar' ? TABS_AR : TABS_EN;
  const dir  = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="font-bold text-primary-600">Excel Processor</div>
          {user && <div className="text-xs text-gray-500 mt-1">{user.username}</div>}
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`w-full text-start px-3 py-2 rounded-md mb-1 text-sm transition-colors ${
                activeTab === t.id
                  ? 'bg-primary-100 text-primary-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => onLangChange(lang === 'ar' ? 'en' : 'ar')}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <button
            onClick={logout}
            className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
          >
            {lang === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
};
