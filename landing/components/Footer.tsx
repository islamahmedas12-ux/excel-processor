import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

const PAGE_HREFS: Record<string, string> = {
  features: '/#features',
  pricing:  '/pricing',
  docs:     '/docs',
  privacy:  '/privacy',
  terms:    '/terms',
  app:      'http://localhost:3003',
};

export default function Footer({ lang }: { lang: Lang }) {
  const tr    = t[lang].footer;
  const isRtl = lang === 'ar';

  return (
    <footer className="bg-slate-950 text-slate-400 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">{isRtl ? 'معالج Excel' : 'Excel Processor'}</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
            {(Object.entries(tr.links) as [string, string][]).map(([key, label]) => {
              const href = PAGE_HREFS[key] ?? '#';
              const isExternal = href.startsWith('http');
              return isExternal ? (
                <a key={key} href={href} className="hover:text-white transition-colors">{label}</a>
              ) : (
                <Link key={key} href={href} className="hover:text-white transition-colors">{label}</Link>
              );
            })}
          </div>

          {/* Copy */}
          <p className="text-xs">{tr.copy}</p>
        </div>
      </div>
    </footer>
  );
}
