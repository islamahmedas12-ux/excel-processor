import {
  Database, Edit3, Cpu, FileText, Layers, Zap,
  FilePlus2, QrCode, BookTemplate, ShieldCheck, Image, Lock,
} from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

const ICONS = [
  Database, Edit3, Cpu, FileText, Layers, Zap,
  FilePlus2, QrCode, BookTemplate, ShieldCheck, Image, Lock,
];

const COLORS = [
  'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
  'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
  'bg-sky-50 text-sky-600 group-hover:bg-sky-100',
  'bg-red-50 text-red-500 group-hover:bg-red-100',
  'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
  'bg-rose-50 text-rose-500 group-hover:bg-rose-100',
  'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100',
  'bg-green-50 text-green-600 group-hover:bg-green-100',
  'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
  'bg-orange-50 text-orange-500 group-hover:bg-orange-100',
  'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
];

export default function Features({ lang }: { lang: Lang }) {
  const tr    = t[lang].features;
  const isRtl = lang === 'ar';

  return (
    <section id="features" className="py-24 bg-[#F8FAFC]" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">{tr.title}</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">{tr.sub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tr.items.map((item, i) => {
            const Icon     = ICONS[i % ICONS.length];
            const colorCls = COLORS[i % COLORS.length];
            return (
              <div key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-colors ${colorCls}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 mb-1.5 text-sm">{item.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
