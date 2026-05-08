'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Menu, X } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface Props { lang: Lang; onLangChange: (l: Lang) => void }

export default function Navbar({ lang, onLangChange }: Props) {
  const [open, setOpen] = useState(false);
  const tr    = t[lang].nav;
  const isRtl = lang === 'ar';

  const links = [
    { label: tr.features, href: '/#features' },
    { label: tr.pricing,  href: '/pricing'   },
    { label: tr.docs,     href: '/docs'      },
    { label: tr.verify,   href: '/verify'    },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">

      {/* Desktop row */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm hidden sm:block">
            {isRtl ? 'معالج Excel' : 'Excel Processor'}
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.label} href={l.href}
              className="px-3 py-2 text-sm text-slate-600 hover:text-primary-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => onLangChange(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <a href="http://localhost:3003"
            className="text-sm bg-primary-600 hover:bg-primary-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors">
            {tr.start}
          </a>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-1" dir={isRtl ? 'rtl' : 'ltr'}>
          {links.map(l => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="block text-sm text-slate-600 hover:text-primary-600 font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-slate-100 mt-2">
            <a href="http://localhost:3003"
              className="text-center text-sm bg-primary-600 text-white font-semibold px-4 py-2.5 rounded-xl">
              {tr.start}
            </a>
            <button onClick={() => { onLangChange(lang === 'ar' ? 'en' : 'ar'); setOpen(false); }}
              className="text-center text-sm text-slate-500 font-medium py-1">
              {lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
