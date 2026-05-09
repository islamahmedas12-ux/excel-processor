import React, { useEffect, useState } from 'react';
import {
  FolderOpen, FileText, BriefcaseIcon, BookTemplate,
  ShieldCheck, HardDrive, TrendingUp, Activity,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useResults } from '../context/ResultsContext';

interface DashboardPageProps {
  lang: 'ar' | 'en';
  onTabChange: (tab: string) => void;
}

interface Stats {
  files: number;
  results: number;
  pdfResults: number;
  xlsxResults: number;
  totalStorageBytes: number;
  activeJobs: number;
  templates: number;
  tokens: number;
}

const L = {
  ar: {
    welcome: 'مرحباً بك',
    sub: 'إليك نظرة عامة على حسابك',
    files: 'الملفات',
    results: 'النتائج',
    jobs: 'المهام النشطة',
    templates: 'القوالب',
    tokens: 'رموز التحقق',
    storage: 'التخزين المستخدم',
    pdfResults: 'ملفات PDF',
    xlsxResults: 'ملفات Excel',
    loading: 'جارٍ التحميل...',
    goTo: 'فتح',
    recentTitle: 'النتائج الأخيرة',
    noRecent: 'لا توجد نتائج حتى الآن',
  },
  en: {
    welcome: 'Welcome back',
    sub: 'Here\'s an overview of your account',
    files: 'Files',
    results: 'Results',
    jobs: 'Active Jobs',
    templates: 'Templates',
    tokens: 'Verify Tokens',
    storage: 'Storage Used',
    pdfResults: 'PDF files',
    xlsxResults: 'Excel files',
    loading: 'Loading...',
    goTo: 'Go to',
    recentTitle: 'Recent Results',
    noRecent: 'No results yet',
  },
};

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ lang, onTabChange }) => {
  const { results } = useResults();
  const [stats, setStats] = useState<Stats | null>(null);
  const tr = L[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    (async () => {
      const [files, jobs, templates, tokens] = await Promise.allSettled([
        apiService.listFiles(),
        apiService.listJobs(),
        apiService.listTemplates(),
        apiService.listTokens(),
      ]);

      const fileList   = files.status      === 'fulfilled' ? files.value      : [];
      const jobList    = jobs.status       === 'fulfilled' ? jobs.value       : [];
      const tplList    = templates.status  === 'fulfilled' ? templates.value  : [];
      const tokenList  = tokens.status     === 'fulfilled' ? tokens.value     : [];

      const pdfResults  = results.filter(r => r.kind === 'pdf');
      const xlsxResults = results.filter(r => r.kind === 'xlsx');
      const totalStorageBytes = results.reduce((s, r) => s + (r.size || 0), 0)
        + fileList.reduce((s: number, f: any) => s + (f.size || 0), 0);

      setStats({
        files: fileList.length,
        results: results.length,
        pdfResults: pdfResults.length,
        xlsxResults: xlsxResults.length,
        totalStorageBytes,
        activeJobs: jobList.filter((j: any) => j.status === 'pending' || j.status === 'running').length,
        templates: tplList.length,
        tokens: tokenList.filter((t: any) => t.is_active).length,
      });
    })();
  }, [results]);

  const cards: Array<{
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string; tab: string;
  }> = stats ? [
    { label: tr.files,     value: stats.files,     icon: FolderOpen,     color: 'bg-blue-500',   tab: 'files'     },
    { label: tr.results,   value: stats.results,
      sub: `${stats.pdfResults} ${tr.pdfResults} · ${stats.xlsxResults} ${tr.xlsxResults}`,
      icon: FileText,       color: 'bg-violet-500', tab: 'results'   },
    { label: tr.jobs,      value: stats.activeJobs, icon: BriefcaseIcon,  color: 'bg-amber-500',  tab: 'jobs'      },
    { label: tr.templates, value: stats.templates,  icon: BookTemplate,   color: 'bg-emerald-500',tab: 'templates' },
    { label: tr.tokens,    value: stats.tokens,     icon: ShieldCheck,    color: 'bg-indigo-500', tab: 'verify'    },
    { label: tr.storage,   value: fmtBytes(stats.totalStorageBytes),
      icon: HardDrive,      color: 'bg-rose-500',   tab: 'files'     },
  ] : [];

  const recent = [...results].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{tr.welcome}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{tr.sub}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium">
          <Activity className="w-3.5 h-3.5" />
          {isRtl ? 'نشط' : 'Active'}
        </span>
      </div>

      {/* Stat cards */}
      {!stats ? (
        <p className="text-slate-500 text-sm animate-pulse">{tr.loading}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                onClick={() => onTabChange(card.tab)}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all text-start group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-slate-300 group-hover:text-primary-400 transition-colors" />
                </div>
                <p className="text-2xl font-black text-slate-800 leading-none">{card.value}</p>
                <p className="text-sm font-medium text-slate-500 mt-1">{card.label}</p>
                {card.sub && <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Recent results */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{tr.recentTitle}</h3>
          <button
            onClick={() => onTabChange('results')}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {isRtl ? 'عرض الكل' : 'View all'}
          </button>
        </div>

        {recent.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">{tr.noRecent}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map(r => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  r.kind === 'pdf' ? 'bg-red-50' : 'bg-emerald-50'
                }`}>
                  {r.kind === 'pdf'
                    ? <FileText className="w-4 h-4 text-red-500" />
                    : <FileText className="w-4 h-4 text-emerald-600" />
                  }
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{r.filename}</p>
                  <p className="text-xs text-slate-400">{fmtDate(r.created_at)}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  r.kind === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {r.kind.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};