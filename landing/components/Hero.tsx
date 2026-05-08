'use client';
import { ArrowLeft, ArrowRight, Play, Zap } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export default function Hero({ lang }: { lang: Lang }) {
  const tr    = t[lang].hero;
  const isRtl = lang === 'ar';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-primary-900 to-slate-900 pt-16">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.3) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      {/* Glow blobs */}
      <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-primary-600 rounded-full filter blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-1/4 end-1/4 w-72 h-72 bg-violet-600 rounded-full filter blur-[100px] opacity-15 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-bold px-4 py-2 rounded-full mb-8">
          <Zap className="w-3.5 h-3.5" />
          {tr.badge}
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 tracking-tight" style={{ whiteSpace: 'pre-line' }}>
          {tr.title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {tr.sub}
        </p>

        {/* CTAs */}
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
          <a href="http://localhost:3003"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-primary-900/50 text-sm">
            {tr.cta}
            <Arrow className="w-4 h-4" />
          </a>
          <a href="/docs"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-3.5 rounded-2xl transition-all border border-white/20 text-sm">
            <Play className="w-3.5 h-3.5" />
            {tr.ctaSub}
          </a>
        </div>

        {/* Code preview */}
        <div className="mt-16 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 text-start shadow-2xl backdrop-blur-sm max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="w-3 h-3 bg-amber-400 rounded-full" />
            <span className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="text-slate-500 text-xs ms-2">api-example.sh</span>
          </div>
          <pre className="text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed">
            <span className="text-slate-500"># 1. Write inputs and read formula results</span>{'\n'}
            <span className="text-emerald-400">curl</span>
            <span className="text-white">{' -X POST /api/v1/execute \\'}</span>{'\n'}
            <span className="text-amber-300">{'  -F '}</span><span className="text-sky-300">"file_id=abc123"</span>
            <span className="text-amber-300">{' -F '}</span><span className="text-sky-300">{'\'inputs={"C11":5000,"C12":750}\''}</span>{'\n'}
            <span className="text-amber-300">{'  -F '}</span><span className="text-sky-300">"outputs=C13,D5"</span>{'\n'}
            {'\n'}
            <span className="text-violet-300">{'{'}</span>
            <span className="text-sky-300">{' "C13"'}</span><span className="text-white">{': 5750,'}</span>
            <span className="text-sky-300">{' "D5"'}</span><span className="text-emerald-400">{': 1437.5 '}</span>
            <span className="text-slate-500">{'// formula results'}</span>
            <span className="text-violet-300">{' }'}</span>{'\n'}
            {'\n'}
            <span className="text-slate-500">{'# 2. Export to PDF in the background'}</span>{'\n'}
            <span className="text-emerald-400">curl</span>
            <span className="text-white">{' -X POST /api/v1/export/pdf?async=true \\'}</span>{'\n'}
            <span className="text-amber-300">{'  -F '}</span><span className="text-sky-300">"file_id=abc123"</span>{'\n'}
            {'\n'}
            <span className="text-violet-300">{'{'}</span>
            <span className="text-sky-300">{' "job"'}</span><span className="text-white">{': {'}</span>
            <span className="text-sky-300">{'"id"'}</span><span className="text-white">{': '}</span><span className="text-amber-300">"f4a1..."</span>
            <span className="text-white">{', '}</span><span className="text-sky-300">{'"status"'}</span><span className="text-white">{': '}</span>
            <span className="text-emerald-400">"done"</span><span className="text-white">{' } }'}</span>
          </pre>
        </div>
      </div>
    </section>
  );
}
