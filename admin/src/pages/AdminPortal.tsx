import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, LogOut, Menu, X,
  FileSpreadsheet, HardDrive, CheckCircle, XCircle,
  Trash2, Shield, ChevronDown, RefreshCw, AlertCircle,
  CreditCard, Clock, Eye, TrendingUp, Plus, Save, Star,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';

type AdminTab = 'dashboard' | 'users' | 'subscriptions' | 'plans';

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:     { label: 'Free',     color: 'bg-slate-100 text-slate-600'   },
  basic:    { label: 'Basic',    color: 'bg-blue-100 text-blue-700'     },
  pro:      { label: 'Pro',      color: 'bg-violet-100 text-violet-700' },
  business: { label: 'Business', color: 'bg-amber-100 text-amber-700'   },
};
const PLANS = ['free', 'basic', 'pro', 'business'];

function fmt(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return (bytes / 1024 ** 3).toFixed(2) + ' GB';
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStats(await adminApi.getStats()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!stats)  return null;

  const cards = [
    { label: 'إجمالي المستخدمين', value: stats.total_users,               icon: Users,          color: 'bg-blue-500'    },
    { label: 'حسابات نشطة',       value: stats.active_users,              icon: CheckCircle,    color: 'bg-emerald-500' },
    { label: 'إجمالي الملفات',    value: stats.total_files,               icon: FileSpreadsheet,color: 'bg-violet-500'  },
    { label: 'إجمالي المساحة',    value: fmt(stats.total_storage_bytes),  icon: HardDrive,      color: 'bg-amber-500'   },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-500" />
          توزيع الخطط
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(stats.plans ?? {}).map(([plan, count]) => {
            const cfg = PLAN_LABELS[plan] ?? { label: plan, color: 'bg-slate-100 text-slate-600' };
            return (
              <div key={plan} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                <span className="text-lg font-bold text-slate-700">{count as number}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Users Table ───────────────────────────────────────────────────────────────
function UsersTable() {
  const [users,      setUsers]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [working,    setWorking]    = useState<string | null>(null);
  const [planPicker, setPlanPicker] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await adminApi.listUsers()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (email: string, current: boolean) => {
    setWorking(email + '_status');
    try { await adminApi.setUserActive(email, !current); await load(); }
    finally { setWorking(null); }
  };

  const changePlan = async (email: string, plan: string) => {
    setWorking(email + '_plan'); setPlanPicker(null);
    try { await adminApi.setUserPlan(email, plan); await load(); }
    finally { setWorking(null); }
  };

  const removeUser = async (email: string) => {
    if (!confirm(`حذف المستخدم ${email}؟`)) return;
    setWorking(email + '_delete');
    try { await adminApi.deleteUser(email); await load(); }
    finally { setWorking(null); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-800">المستخدمون ({users.length})</h2>
        <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['الاسم', 'الإيميل', 'الخطة', 'الحالة', 'مفعّل', 'تاريخ التسجيل', 'حذف'].map(h => (
                <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => {
              const planCfg  = PLAN_LABELS[u.plan] ?? PLAN_LABELS.free;
              const isActive = u.active !== false;
              const busy     = !!working?.startsWith(u.email);
              return (
                <tr key={u.email} className={`hover:bg-slate-50 transition-colors ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>

                  {/* Plan picker */}
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setPlanPicker(planPicker === u.email ? null : u.email)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${planCfg.color} hover:opacity-80 transition-opacity`}
                      >
                        {planCfg.label} <ChevronDown className="w-3 h-3" />
                      </button>
                      {planPicker === u.email && (
                        <div className="absolute z-20 top-full mt-1 start-0 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                          {PLANS.map(p => (
                            <button key={p} onClick={() => changePlan(u.email, p)}
                              className={`w-full text-start px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors
                                ${u.plan === p ? 'text-primary-600' : 'text-slate-700'}`}>
                              {PLAN_LABELS[p].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Active toggle */}
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u.email, isActive)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors
                        ${isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                      {isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isActive ? 'نشط' : 'موقوف'}
                    </button>
                  </td>

                  {/* Email verified */}
                  <td className="px-4 py-3">
                    {u.email_verified
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : <AlertCircle className="w-4 h-4 text-amber-400" />}
                  </td>

                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <button onClick={() => removeUser(u.email)}
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا يوجد مستخدمون بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<string, string> = {
  pending:  'قيد المراجعة',
  approved: 'مفعّل',
  rejected: 'مرفوض',
};

function SubscriptionsTable() {
  const [reqs,    setReqs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReqs(await adminApi.listSubscriptions()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    if (!confirm('تفعيل هذا الاشتراك؟')) return;
    setWorking(id);
    try { await adminApi.approveSubscription(id); await load(); } finally { setWorking(null); }
  };

  const reject = async (id: string) => {
    setWorking(id);
    try { await adminApi.rejectSubscription(id, 'رفض يدوي'); await load(); } finally { setWorking(null); }
  };

  if (loading) return <Spinner />;

  return (
    <>
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)}
              className="absolute -top-3 -end-3 bg-white rounded-full p-1 shadow-lg text-slate-500 hover:text-slate-800">
              <X className="w-5 h-5" />
            </button>
            <img src={preview} alt="proof" className="w-full rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">طلبات الاشتراك ({reqs.length})</h2>
          <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['المستخدم', 'الإيميل', 'الخطة', 'المدة', 'الحالة', 'التاريخ', 'إثبات', 'إجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reqs.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50 ${working === r.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.username}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_LABELS[r.plan]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                      {PLAN_LABELS[r.plan]?.label ?? r.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.months} شهر</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? ''}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(r.created_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPreview(adminApi.proofImageUrl(r.id))}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => approve(r.id)}
                          className="px-2.5 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-bold rounded-lg transition-colors">
                          تفعيل
                        </button>
                        <button onClick={() => reject(r.id)}
                          className="px-2.5 py-1 bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold rounded-lg transition-colors">
                          رفض
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reqs.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا يوجد طلبات اشتراك بعد</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Plans Manager ────────────────────────────────────────────────────────────

const EMPTY_PLAN = {
  id: '', label: '', label_ar: '', price_usd: 0,
  max_files: 10, max_file_mb: 100, storage_gb: 1,
  max_concurrent_jobs: 1, max_templates: 10,
  description: '', description_en: '',
  popular: false, active: true,
};

const NUM_FIELDS = [
  { key: 'price_usd',           label: 'السعر (USD/شهر)'  },
  { key: 'max_files',           label: 'عدد الملفات'       },
  { key: 'max_file_mb',         label: 'حجم الملف (MB)'   },
  { key: 'storage_gb',          label: 'التخزين (GB)'      },
  { key: 'max_concurrent_jobs', label: 'مهام متزامنة'      },
  { key: 'max_templates',       label: 'القوالب'            },
];

const PLAN_COLOR_MAP: Record<string, string> = {
  free: 'border-slate-200', basic: 'border-blue-200',
  pro:  'border-violet-300', business: 'border-amber-300',
};
const PLAN_ICON_COLOR: Record<string, string> = {
  free: 'bg-slate-400', basic: 'bg-blue-500',
  pro: 'bg-violet-600', business: 'bg-amber-500',
};

// ── Shared modal form ─────────────────────────────────────────────────────────
interface PlanModalProps {
  mode: 'create' | 'edit';
  initial: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  error: string;
}

function PlanModal({ mode, initial, onSave, onClose, saving, error }: PlanModalProps) {
  const [form, setForm] = useState<Record<string, any>>(initial);
  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="font-black text-slate-800 text-base">
            {mode === 'create' ? '+ إنشاء خطة جديدة' : `تعديل خطة — ${initial.label || initial.id}`}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Plan ID — only for create */}
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                معرّف الخطة (ID) <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={form.id ?? ''}
                onChange={e => set('id', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="مثال: enterprise"
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">حروف إنجليزية صغيرة وunderscore فقط</p>
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'label',    label: 'الاسم (English)', ph: 'Pro' },
              { key: 'label_ar', label: 'الاسم (عربي)',    ph: 'احترافي' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{f.label}</label>
                <input
                  value={form[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.ph}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Numeric limits */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">الحدود</p>
            <div className="grid grid-cols-2 gap-3">
              {NUM_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] text-slate-400 mb-1">{f.label}</label>
                  <input
                    type="number" min={0}
                    value={form[f.key] ?? 0}
                    onChange={e => set(f.key, Number(e.target.value))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-3">
            {[
              { key: 'description',    label: 'الوصف (عربي)',   ph: '200 ملف، كل ملف حتى 1 GB' },
              { key: 'description_en', label: 'الوصف (English)', ph: '200 files, up to 1 GB each' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{f.label}</label>
                <input
                  value={form[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.ph}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Toggles: active + popular */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'active',  label: 'ظاهر للمستخدمين', desc: 'تفعيل / إخفاء الخطة من صفحة الأسعار' },
              { key: 'popular', label: 'الأشهر (Popular)', desc: 'يظهر شارة "الأشهر" على الخطة' },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => set(t.key, !form[t.key])}
                className={`flex flex-col items-start gap-1 px-4 py-3 rounded-2xl border-2 transition-all text-start
                  ${form[t.key]
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0
                    ${form[t.key] ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`}>
                    {form[t.key] && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className={`text-sm font-bold ${form[t.key] ? 'text-primary-700' : 'text-slate-600'}`}>{t.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight pe-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl hover:bg-white transition-colors">
            إلغاء
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.label || (mode === 'create' && !form.id)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {mode === 'create' ? 'إنشاء الخطة' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plans Manager main ────────────────────────────────────────────────────────
function PlansManager() {
  const [plans,   setPlans]   = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [modalErr, setModalErr] = useState('');
  // modal: null=closed | 'create' | planId string for edit
  const [modal,   setModal]   = useState<null | 'create' | string>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlans(await adminApi.listPlans()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setModalErr(''); setModal('create'); };
  const openEdit   = (id: string) => { setModalErr(''); setModal(id); };
  const closeModal = () => { setModal(null); setModalErr(''); };

  const handleCreate = async (form: Record<string, any>) => {
    const { id, ...data } = form;
    if (!id) { setModalErr('الـ ID مطلوب'); return; }
    setSaving(true); setModalErr('');
    try {
      await adminApi.createPlan(id, data);
      closeModal(); await load();
    } catch (e: any) {
      setModalErr(e.response?.data?.error ?? 'فشل إنشاء الخطة');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form: Record<string, any>) => {
    if (!modal || modal === 'create') return;
    setSaving(true); setModalErr('');
    try {
      await adminApi.updatePlan(modal, form);
      closeModal(); await load();
    } catch {
      setModalErr('فشل الحفظ');
    } finally { setSaving(false); }
  };

  const removePlan = async (id: string) => {
    if (!confirm(`حذف خطة "${id}"؟`)) return;
    await adminApi.deletePlan(id); await load();
  };

  const quickToggle = async (id: string, key: string, val: boolean) => {
    await adminApi.updatePlan(id, { [key]: val }); await load();
  };

  if (loading) return <Spinner />;

  const sorted = Object.entries(plans).sort(([,a],[,b]) => (a.order ?? 99) - (b.order ?? 99));

  return (
    <>
      {/* Modal */}
      {modal === 'create' && (
        <PlanModal
          mode="create" initial={EMPTY_PLAN}
          onSave={handleCreate} onClose={closeModal}
          saving={saving} error={modalErr}
        />
      )}
      {modal && modal !== 'create' && plans[modal] && (
        <PlanModal
          mode="edit" initial={{ ...plans[modal], id: modal }}
          onSave={handleEdit} onClose={closeModal}
          saving={saving} error={modalErr}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">الخطط والأسعار ({sorted.length})</h2>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> خطة جديدة
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sorted.map(([id, plan]) => {
            const isActive  = plan.active !== false;
            const borderCol = PLAN_COLOR_MAP[id] ?? 'border-slate-200';
            const iconCol   = PLAN_ICON_COLOR[id] ?? 'bg-primary-600';
            return (
              <div key={id} className={`bg-white rounded-2xl border-2 ${borderCol} shadow-sm overflow-hidden ${!isActive ? 'opacity-60' : ''}`}>
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white ${iconCol}`}>
                      {plan.label?.[0] ?? id[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 text-sm">{plan.label}</p>
                        {plan.label_ar && <span className="text-slate-400 text-xs">/ {plan.label_ar}</span>}
                        {plan.popular && <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />}
                        {!isActive && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-bold">مخفي</span>}
                      </div>
                      <p className="text-xs text-slate-500">${plan.price_usd}/شهر</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick: active toggle */}
                    <button
                      onClick={() => quickToggle(id, 'active', !isActive)}
                      title={isActive ? 'إخفاء الخطة' : 'إظهار الخطة'}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors
                        ${isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {isActive ? 'ظاهر' : 'مخفي'}
                    </button>
                    {/* Edit */}
                    <button onClick={() => openEdit(id)}
                      className="text-xs font-semibold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-xl transition-colors">
                      تعديل
                    </button>
                    {/* Delete */}
                    {id !== 'free' && (
                      <button onClick={() => removePlan(id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card body — always show summary */}
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'ملفات', value: plan.max_files >= 999 ? '∞' : plan.max_files },
                      { label: 'MB',    value: plan.max_file_mb },
                      { label: 'GB',    value: plan.storage_gb  },
                      { label: 'مهام',  value: plan.max_concurrent_jobs },
                      { label: 'قوالب', value: plan.max_templates >= 999 ? '∞' : plan.max_templates },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 rounded-xl py-2.5">
                        <p className="text-base font-black text-slate-700">{s.value}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-slate-400 mt-3 text-center">{plan.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const [tab,        setTab]        = useState<AdminTab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard',     label: 'لوحة التحكم',    icon: LayoutDashboard },
    { id: 'users',         label: 'المستخدمون',     icon: Users           },
    { id: 'subscriptions', label: 'طلبات الاشتراك', icon: CreditCard      },
    { id: 'plans',         label: 'الخطط والأسعار', icon: Package         },
  ];

  const SidebarBody = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm leading-tight">Admin Portal</p>
          <p className="text-[11px] text-slate-400">Excel Processor</p>
        </div>
      </div>

      <nav className="flex-1 py-5 px-3 space-y-0.5">
        {NAV.map(item => {
          const Icon   = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => { setTab(item.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-start
                ${active ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'}`}>
              <span className={`flex-shrink-0 p-1.5 rounded-lg ${active ? 'bg-primary-100' : 'bg-slate-100'}`}>
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary-600' : 'text-slate-500'}`} />
              </span>
              <span className="flex-1">{item.label}</span>
              {active && <span className="w-1 h-5 rounded-full bg-primary-500 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors text-start">
          <span className="p-1.5 rounded-lg bg-slate-100">
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
          </span>
          تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F4F6FA] overflow-hidden" dir="rtl">

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)' }}
        className="fixed inset-y-0 start-0 z-40 w-64 bg-white shadow-xl transition-transform duration-300 lg:hidden"
      >
        <button onClick={() => setMobileOpen(false)}
          className="absolute top-4 end-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
        <SidebarBody />
      </aside>

      <aside className="hidden lg:block w-64 bg-white border-e border-slate-200 flex-shrink-0 shadow-sm">
        <SidebarBody />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-slate-800">
              {NAV.find(n => n.id === tab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm ring-2 ring-transparent">
              <span className="text-white text-sm font-bold uppercase">{user?.username?.[0] ?? 'A'}</span>
            </div>
            <div className="hidden sm:block text-start">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.username}</p>
              <p className="text-[11px] text-slate-400 leading-tight">Admin</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {tab === 'dashboard'     && <Dashboard />}
          {tab === 'users'         && <UsersTable />}
          {tab === 'subscriptions' && <SubscriptionsTable />}
          {tab === 'plans'         && <PlansManager />}
        </main>
      </div>
    </div>
  );
};
