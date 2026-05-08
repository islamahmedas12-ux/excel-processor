'use client';
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface ApiPlan {
  label: string;
  label_ar: string;
  price_usd: number;
  features: string[];
  features_en: string[];
  popular: boolean;
  active: boolean;
  order: number;
}

interface NormalizedPlan {
  name: string;
  nameAr: string;
  price: number;
  features: string[];
  featuresEn: string[];
  popular: boolean;
}

function normalizePlans(raw: Record<string, ApiPlan>): NormalizedPlan[] {
  return Object.values(raw)
    .filter(p => p.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(p => ({
      name:       p.label,
      nameAr:     p.label_ar,
      price:      p.price_usd,
      features:   p.features ?? [],
      featuresEn: p.features_en ?? [],
      popular:    !!p.popular,
    }));
}

export default function Pricing({ lang }: { lang: Lang }) {
  const tr    = t[lang].pricing;
  const isRtl = lang === 'ar';

  const staticPlans: NormalizedPlan[] = tr.plans.map(p => ({
    name:       p.name,
    nameAr:     p.nameAr,
    price:      p.price,
    features:   [...p.features],
    featuresEn: [...p.features],
    popular:    'popular' in p ? !!p.popular : false,
  }));

  const [plans, setPlans] = useState<NormalizedPlan[]>(staticPlans);

  useEffect(() => {
    fetch('/api/v1/plans')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.plans && typeof data.plans === 'object') {
          const normalized = normalizePlans(data.plans);
          if (normalized.length > 0) setPlans(normalized);
        }
      })
      .catch(() => {/* keep static fallback */});
  }, []);

  return (
    <section id="pricing" className="py-24 bg-[#F8FAFC]" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">{tr.title}</h2>
          <p className="text-slate-500 text-lg">{tr.sub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {plans.map((plan, i) => (
            <div key={i}
              className={`relative bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all
                ${plan.popular
                  ? 'border-primary-500 shadow-primary-100 shadow-xl scale-105'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>

              {plan.popular && (
                <div className="bg-primary-600 text-white text-xs font-bold text-center py-2">
                  ⭐ {tr.popular}
                </div>
              )}

              <div className="p-6">
                <p className="font-bold text-slate-800 text-lg mb-1">{isRtl ? plan.nameAr : plan.name}</p>
                <div className="flex items-end gap-1 mb-6">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-black text-slate-900">{tr.free}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-slate-900">${plan.price}</span>
                      <span className="text-slate-400 text-sm mb-1">/{tr.month}</span>
                    </>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6">
                  {(isRtl ? plan.features : plan.featuresEn).map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <a href="http://localhost:3003"
                  className={`block text-center text-sm font-bold py-2.5 rounded-xl transition-colors
                    ${plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {tr.start}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
