import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, Upload, Loader2, CreditCard } from 'lucide-react';

interface PlansPageProps { lang: 'ar' | 'en' }

const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<string, Record<string, string>> = {
  pending:  { ar: 'قيد المراجعة', en: 'Pending' },
  approved: { ar: 'مفعّل',        en: 'Approved' },
  rejected: { ar: 'مرفوض',        en: 'Rejected' },
};

export const PlansPage: React.FC<PlansPageProps> = ({ lang }) => {
  const isRtl = lang === 'ar';
  const [plans,    setPlans]    = useState<Record<string, any>>({});
  const [bank,     setBank]     = useState<Record<string, string>>({});
  const [status,   setStatus]   = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [months,   setMonths]   = useState(1);
  const [proof,    setProof]    = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/v1/plans').then(r => r.json()).then(d => {
      setPlans(d.plans ?? {});
      setBank(d.bank ?? {});
    });
    fetch('/api/v1/subscribe/status', {
      headers: { Authorization: `Bearer ${localStorage.getItem('excel_processor_token') ?? ''}` },
    }).then(r => r.json()).then(d => { if (d.success) setStatus(d); });
  }, []);

  const currentPlan = status?.plan ?? 'free';
  const PLAN_ORDER  = ['free', 'basic', 'pro', 'business'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !proof) return;
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('plan',   selected);
      fd.append('months', String(months));
      fd.append('proof',  proof);
      const res  = await fetch('/api/v1/subscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('excel_processor_token') ?? ''}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); return; }
      setSent(true);
    } catch { setError(isRtl ? 'خطأ في الاتصال' : 'Connection error'); }
    finally { setLoading(false); }
  };

  const T = {
    ar: {
      title:       'الخطط والأسعار',
      current:     'خطتك الحالية',
      upgrade:     'ترقية الخطة',
      perMonth:    '/ شهر',
      mo:          'شهر',
      mostPopular: 'الأكثر شيوعاً',
      selectPlan:  'اختر هذه الخطة',
      selected:    'محدد',
      bankInfo:    'بيانات الحساب البنكي',
      bankName:    'البنك',
      accName:     'اسم الحساب',
      accNum:      'رقم الحساب',
      iban:        'IBAN',
      uploadProof: 'صورة إثبات التحويل',
      chooseFile:  'اختر صورة',
      duration:    'مدة الاشتراك',
      sendReq:     'إرسال طلب الاشتراك',
      sending:     'جاري الإرسال...',
      sentTitle:   'تم إرسال طلبك بنجاح!',
      sentSub:     'سيتم مراجعة التحويل وتفعيل اشتراكك خلال 24 ساعة.',
      myRequests:  'طلباتي السابقة',
      noRequests:  'لا يوجد طلبات سابقة',
      expires:     'ينتهي في',
    },
    en: {
      title:       'Plans & Pricing',
      current:     'Your Current Plan',
      upgrade:     'Upgrade Plan',
      perMonth:    '/ mo',
      mo:          'months',
      mostPopular: 'Most Popular',
      selectPlan:  'Select Plan',
      selected:    'Selected',
      bankInfo:    'Bank Account Details',
      bankName:    'Bank',
      accName:     'Account Name',
      accNum:      'Account Number',
      iban:        'IBAN',
      uploadProof: 'Transfer Proof Image',
      chooseFile:  'Choose Image',
      duration:    'Subscription Duration',
      sendReq:     'Send Subscription Request',
      sending:     'Sending...',
      sentTitle:   'Request sent successfully!',
      sentSub:     'We will review your transfer and activate your plan within 24 hours.',
      myRequests:  'My Previous Requests',
      noRequests:  'No previous requests',
      expires:     'Expires',
    },
  }[lang];

  return (
    <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Plans grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">{T.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLAN_ORDER.map(key => {
            const p = plans[key]; if (!p) return null;
            const isCurrent  = currentPlan === key;
            const isSelected = selected === key;
            const isPopular  = p.popular;

            return (
              <div key={key}
                className={`relative bg-white rounded-2xl border-2 shadow-sm transition-all cursor-pointer
                  ${isCurrent  ? 'border-emerald-400'  : ''}
                  ${isSelected && !isCurrent ? 'border-primary-500 shadow-primary-100 shadow-lg' : ''}
                  ${!isCurrent && !isSelected ? 'border-slate-200 hover:border-slate-300' : ''}`}
                onClick={() => key !== 'free' && setSelected(isSelected ? null : key)}
              >
                {isPopular && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {T.mostPopular}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 end-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {T.current}
                  </div>
                )}

                <div className="p-5">
                  <p className="font-bold text-slate-800 text-base">{isRtl ? p.label_ar : p.label}</p>
                  <div className="flex items-end gap-1 mt-2 mb-4">
                    <span className="text-3xl font-black text-slate-900">${p.price_usd}</span>
                    {p.price_usd > 0 && <span className="text-slate-400 text-sm mb-1">{T.perMonth}</span>}
                  </div>
                  <ul className="space-y-2">
                    {(isRtl ? p.features : p.features_en).map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {key !== 'free' && (
                    <div className={`mt-4 w-full py-2 rounded-xl text-sm font-semibold text-center transition-colors
                      ${isSelected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {isSelected ? T.selected : T.selectPlan}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription form — shown when plan selected */}
      {selected && !sent && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-500" />
            {T.upgrade}
          </h2>

          {/* Bank info */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
            <p className="font-semibold text-slate-700 mb-3">{T.bankInfo}</p>
            {[
              [T.bankName, bank.bank_name],
              [T.accName,  bank.account_name],
              [T.accNum,   bank.account_number],
              [T.iban,     bank.iban],
            ].map(([label, val]) => val ? (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-mono font-semibold text-slate-800 select-all">{val}</span>
              </div>
            ) : null)}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{T.duration}</label>
              <div className="flex gap-2">
                {[1, 3, 6, 12].map(m => (
                  <button type="button" key={m}
                    onClick={() => setMonths(m)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors
                      ${months === m
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-primary-300'}`}>
                    {m} {isRtl ? 'شهر' : m === 1 ? 'month' : 'months'}
                  </button>
                ))}
              </div>
            </div>

            {/* Proof upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{T.uploadProof}</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => setProof(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-sm font-medium transition-colors
                  ${proof ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500 hover:border-primary-400 hover:text-primary-600'}`}>
                {proof
                  ? <><CheckCircle className="w-4 h-4" />{proof.name}</>
                  : <><Upload className="w-4 h-4" />{T.chooseFile}</>}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={loading || !proof}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700
                text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? T.sending : T.sendReq}
            </button>
          </form>
        </div>
      )}

      {/* Success state */}
      {sent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-emerald-800 text-lg mb-2">{T.sentTitle}</h3>
          <p className="text-emerald-700 text-sm">{T.sentSub}</p>
        </div>
      )}

      {/* Previous requests */}
      {status?.requests?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800 text-sm">
            {T.myRequests}
          </div>
          <div className="divide-y divide-slate-50">
            {status.requests.map((r: any) => (
              <div key={r.id} className="px-6 py-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-700 capitalize">{r.plan}</p>
                  <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]?.[lang] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};