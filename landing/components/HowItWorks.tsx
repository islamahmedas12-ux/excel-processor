import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export default function HowItWorks({ lang }: { lang: Lang }) {
  const tr    = t[lang].howItWorks;
  const isRtl = lang === 'ar';

  return (
    <section className="py-24 bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">{tr.title}</h2>
        <p className="text-slate-500 text-lg mb-14">{tr.sub}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* connector line */}
          <div className="hidden md:block absolute top-8 start-1/4 end-1/4 h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200" />

          {tr.steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary-200 relative z-10">
                {step.n}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
