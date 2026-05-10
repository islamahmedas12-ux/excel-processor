import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, FolderOpen, Eye, Edit3, Settings,
  FileText, Play, Globe, Menu, ChevronRight, Bell,
  Search, X, LogOut, CreditCard, BriefcaseIcon, ShieldCheck, Layers, QrCode, BookTemplate,
  LayoutDashboard, Archive, UserCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StorageBar } from './StorageBar';
import apiService from '../services/api';

type TabId = 'dashboard' | 'files' | 'read' | 'write' | 'batch' | 'pdf' | 'execute' | 'merge' | 'insert' | 'templates' | 'jobs' | 'verify' | 'results' | 'plans' | 'profile';

const NAV: Array<{ id: TabId; ar: string; en: string; icon: React.ElementType; dividerBefore?: boolean }> = [
  { id: 'dashboard', ar: 'لوحة التحكم',     en: 'Dashboard',     icon: LayoutDashboard },
  { id: 'files',   ar: 'الملفات',           en: 'Files',         icon: FolderOpen      },
  { id: 'results', ar: 'النتائج',           en: 'Results',       icon: Archive         },
  { id: 'read',    ar: 'قراءة البيانات',    en: 'Read Data',     icon: Eye             },
  { id: 'write',   ar: 'تعديل خلية',       en: 'Edit Cell',     icon: Edit3           },
  { id: 'batch',   ar: 'تعديل متعدد',      en: 'Batch Edit',    icon: Settings        },
  { id: 'pdf',     ar: 'تصدير PDF',        en: 'Export PDF',    icon: FileText        },
  { id: 'execute', ar: 'تنفيذ دفعي',       en: 'Batch Execute', icon: Play            },
  { id: 'merge',   ar: 'دمج PDF',          en: 'Merge PDF',     icon: Layers,         dividerBefore: true },
  { id: 'insert',    ar: 'إدراج صورة / QR',  en: 'Insert Image / QR', icon: QrCode        },
  { id: 'templates', ar: 'مكتبة القوالب',    en: 'Templates',         icon: BookTemplate  },
  { id: 'jobs',    ar: 'المهام',            en: 'Jobs',          icon: BriefcaseIcon   },
  { id: 'verify',  ar: 'التحقق من الوثائق',en: 'Verify Docs',   icon: ShieldCheck     },
  { id: 'plans',   ar: 'الخطط والأسعار',   en: 'Plans',         icon: CreditCard      },
  { id: 'profile', ar: 'الملف الشخصي',    en: 'Profile',       icon: UserCircle,     dividerBefore: true },
];

interface LayoutProps {
  lang: 'ar' | 'en';
  onLangChange: (l: 'ar' | 'en') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  lang, onLangChange, activeTab, onTabChange, children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { user, logout } = useAuth();
  const isRtl = lang === 'ar';
  const dir   = isRtl ? 'rtl' : 'ltr';

  // keep the <html> element in sync for third-party libs that read it
  useEffect(() => {
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  useEffect(() => {
    apiService.getProfile().then(p => {
      if (p?.has_avatar && p.email) {
        const safe = p.email.toLowerCase().replace('@', '_').replace(/\./g, '_');
        setAvatarUrl(`/api/v1/auth/profile/avatar/${safe}.png?t=${Date.now()}`);
      } else {
        setAvatarUrl(null);
      }
    }).catch(() => setAvatarUrl(null));
  }, [activeTab]);

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeItem = NAV.find(n => n.id === activeTab);
  const pageTitle  = activeItem ? (isRtl ? activeItem.ar : activeItem.en) : '';

  /* ─── shared sidebar body ─────────────────────────────────────────── */
  const SidebarBody = () => (
    <div className="flex flex-col h-full" dir={dir}>

      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 text-sm leading-tight truncate">
            {isRtl ? 'معالج Excel' : 'Excel Processor'}
          </p>
          <p className="text-[11px] text-slate-400">API v2.0.0</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {isRtl ? 'الأدوات' : 'Tools'}
        </p>

        <div className="space-y-0.5">
          {NAV.map(item => {
            const Icon   = item.icon;
            const active = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
              {item.dividerBefore && <div className="my-2 border-t border-slate-100" />}
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); setMobileOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                  transition-all duration-150 group text-start
                  ${active
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                  }
                `}
              >
                <span className={`flex-shrink-0 p-1.5 rounded-lg transition-colors
                  ${active ? 'bg-primary-100' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                </span>

                <span className="flex-1">{isRtl ? item.ar : item.en}</span>

                {active && (
                  <span className="w-1 h-5 rounded-full bg-primary-500 flex-shrink-0" />
                )}
              </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>

      {/* Storage bar */}
      <StorageBar lang={lang} onUpgradePlan={() => onTabChange('plans')} />

      {/* Sidebar footer: language toggle + logout */}
      <div className="border-t border-slate-100 p-3 flex-shrink-0 space-y-0.5">
        <button
          onClick={() => onLangChange(lang === 'ar' ? 'en' : 'ar')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors text-start"
        >
          <span className="flex-shrink-0 p-1.5 rounded-lg bg-slate-100">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
          </span>
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors text-start"
        >
          <span className="flex-shrink-0 p-1.5 rounded-lg bg-slate-100">
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
          </span>
          <span>{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    // dir set here so that CSS flex-direction:row automatically respects RTL/LTR
    <div className="flex h-screen bg-[#F4F6FA] overflow-hidden" dir={dir}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (drawer from inline-start edge) ── */}
      <aside
        style={{
          transform: mobileOpen ? 'translateX(0)' : (isRtl ? 'translateX(100%)' : 'translateX(-100%)'),
        }}
        className="fixed inset-y-0 start-0 z-40 w-64 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden"
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 end-4 z-10 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarBody />
      </aside>

      {/* ── Desktop sidebar (first flex child → start side) ── */}
      {/*
        With dir="rtl" on the parent, this first flex child sits on the RIGHT.
        With dir="ltr", it sits on the LEFT. No flex-row-reverse needed.
      */}
      <aside className="hidden lg:block w-64 bg-white border-e border-slate-200 flex-shrink-0 shadow-sm">
        <SidebarBody />
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        {/*
          dir is inherited from parent, so justify-between puts
          first child at the inline-start and second at inline-end.
          In RTL: first child (search/menu) → RIGHT, second child (user) → LEFT.
          In LTR: first child (search/menu) → LEFT, second child (user) → RIGHT.
        */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 shadow-sm">

          {/* Start slot */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-56">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث...' : 'Search...'}
                className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* End slot */}
          <div className="flex items-center gap-2">
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 me-3">
              <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
              {/* ChevronRight points in the inline direction automatically via dir */}
              <ChevronRight className="w-3 h-3 rtl:rotate-180" />
              <span className="text-primary-600 font-semibold">{pageTitle}</span>
            </div>

            {/* Bell */}
            <button className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <div className="w-px h-7 bg-slate-200 mx-1" />

            {/* User */}
            <button
              onClick={() => onTabChange('profile')}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm flex-shrink-0 ring-2 ring-transparent hover:ring-primary-300 transition-all overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.username ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold uppercase">
                    {user?.username?.[0] ?? 'U'}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-start">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.username}</p>
                <p className="text-[11px] text-slate-400 leading-tight capitalize">{user?.role ?? 'user'}</p>
              </div>
            </button>

            <div className="w-px h-7 bg-slate-200 mx-1" />

            {/* Logout */}
            <button
              onClick={logout}
              title={isRtl ? 'تسجيل الخروج' : 'Sign out'}
              className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Title bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{pageTitle}</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
                <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                <span className="text-primary-600 font-medium">{pageTitle}</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isRtl ? 'متصل' : 'Online'}
            </span>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};