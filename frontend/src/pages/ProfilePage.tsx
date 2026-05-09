import React, { useEffect, useRef, useState } from 'react';
import {
  User, Mail, Shield, Camera, Save,
  Lock, Eye, EyeOff, CheckCircle, AlertCircle,
  FileSpreadsheet, FileText, HardDrive, Edit3,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FilesContext';
import { useResults } from '../context/ResultsContext';

interface ProfilePageProps {
  lang: 'ar' | 'en';
}

const L = {
  ar: {
    profile: 'الملف الشخصي',
    avatar: 'الصورة الشخصية',
    avatarHint: 'انقر أو اسحب صورة (JPG/PNG، حد أقصى 5 MB)',
    changeAvatar: 'تغيير الصورة',
    info: 'المعلومات الشخصية',
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    bio: 'نبذة شخصية',
    bioPlaceholder: 'أخبرنا عن نفسك...',
    plan: 'الخطة',
    member: 'عضو منذ',
    role: 'الدور',
    saveInfo: 'حفظ التغييرات',
    saving: 'جارٍ الحفظ...',
    saved: 'تم الحفظ!',
    password: 'تغيير كلمة المرور',
    oldPw: 'كلمة المرور الحالية',
    newPw: 'كلمة المرور الجديدة',
    confirmPw: 'تأكيد كلمة المرور الجديدة',
    changePw: 'تغيير كلمة المرور',
    changing: 'جارٍ التغيير...',
    pwChanged: 'تم تغيير كلمة المرور بنجاح!',
    pwMismatch: 'كلمة المرور الجديدة غير متطابقة',
    stats: 'إحصائيات الحساب',
    files: 'الملفات المرفوعة',
    results: 'الملفات الناتجة',
    storage: 'التخزين المستخدم',
    plans: { free: 'مجاني', basic: 'أساسي', pro: 'احترافي', business: 'الأعمال' },
    roles: { user: 'مستخدم', admin: 'مسؤول' },
    loading: 'جارٍ التحميل...',
    uploadingAvatar: 'جارٍ رفع الصورة...',
    avatarUploaded: 'تم تحديث الصورة!',
  },
  en: {
    profile: 'Profile',
    avatar: 'Profile Picture',
    avatarHint: 'Click or drag image (JPG/PNG, max 5 MB)',
    changeAvatar: 'Change Photo',
    info: 'Personal Info',
    username: 'Username',
    email: 'Email',
    bio: 'Bio',
    bioPlaceholder: 'Tell us about yourself...',
    plan: 'Plan',
    member: 'Member since',
    role: 'Role',
    saveInfo: 'Save Changes',
    saving: 'Saving...',
    saved: 'Saved!',
    password: 'Change Password',
    oldPw: 'Current Password',
    newPw: 'New Password',
    confirmPw: 'Confirm New Password',
    changePw: 'Change Password',
    changing: 'Changing...',
    pwChanged: 'Password changed successfully!',
    pwMismatch: 'New passwords do not match',
    stats: 'Account Stats',
    files: 'Uploaded Files',
    results: 'Result Files',
    storage: 'Storage Used',
    plans: { free: 'Free', basic: 'Basic', pro: 'Pro', business: 'Business' },
    roles: { user: 'User', admin: 'Admin' },
    loading: 'Loading...',
    uploadingAvatar: 'Uploading photo...',
    avatarUploaded: 'Photo updated!',
  },
};

const PLAN_COLOR: Record<string, string> = {
  free:     'bg-slate-100 text-slate-600',
  basic:    'bg-blue-100 text-blue-700',
  pro:      'bg-violet-100 text-violet-700',
  business: 'bg-amber-100 text-amber-700',
};

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string, lang: 'ar' | 'en') {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ lang }) => {
  const tr = L[lang];
  const isRtl = lang === 'ar';
  const { user, login, token } = useAuth();
  const { files } = useFiles();
  const { results } = useResults();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profile, setProfile]     = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [username, setUsername]   = useState('');
  const [bio, setBio]             = useState('');
  const [infoMsg, setInfoMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password state
  const [oldPw, setOldPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [pwMsg, setPwMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    apiService.getProfile().then(p => {
      setProfile(p);
      setUsername(p.username || '');
      setBio(p.bio || '');
      if (p.has_avatar) {
        const safe = p.email.toLowerCase().replace('@', '_').replace(/\./g, '_');
        setAvatarUrl(`${baseUrl}/api/v1/auth/profile/avatar/${safe}.png?t=${Date.now()}`);
      }
    }).catch(() => {});
  }, []);

  const totalStorage = files.reduce((s, f) => s + (f.size || 0), 0)
    + results.reduce((s, r) => s + (r.size || 0), 0);

  // ── Avatar ────────────────────────────────────────────────────────────────

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    setInfoMsg(null);
    try {
      const url = await apiService.uploadAvatar(file);
      setAvatarUrl(`${baseUrl}${url}?t=${Date.now()}`);
      setInfoMsg({ type: 'ok', text: tr.avatarUploaded });
    } catch (e: any) {
      setInfoMsg({ type: 'err', text: e.response?.data?.error || e.message });
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleAvatarFile(file);
  };

  // ── Profile info ─────────────────────────────────────────────────────────

  const handleSaveInfo = async () => {
    setSavingInfo(true); setInfoMsg(null);
    try {
      const p = await apiService.updateProfile(username.trim(), bio.trim());
      setProfile(p);
      // Update AuthContext display name
      if (token && user) login(token, { ...user, username: p.username });
      setInfoMsg({ type: 'ok', text: tr.saved });
    } catch (e: any) {
      setInfoMsg({ type: 'err', text: e.response?.data?.error || e.message });
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Password ──────────────────────────────────────────────────────────────

  const handleChangePw = async () => {
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: tr.pwMismatch }); return; }
    setChangingPw(true);
    try {
      await apiService.changePassword(oldPw, newPw);
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg({ type: 'ok', text: tr.pwChanged });
    } catch (e: any) {
      setPwMsg({ type: 'err', text: e.response?.data?.error || e.message });
    } finally {
      setChangingPw(false);
    }
  };

  const initials = (username || user?.username || '?')[0]?.toUpperCase();
  const displayAvatar = avatarPreview || avatarUrl;

  if (!profile) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm animate-pulse">
      {tr.loading}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Avatar + basic info card ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header band */}
        <div className="h-28 bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end gap-4 -mt-12 mb-5">
            <div className="relative group">
              <div
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden
                  bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center
                  cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={onAvatarDrop}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-3xl font-black">{initials}</span>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  {uploadingAvatar
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />
                  }
                  <span className="text-white text-[10px] font-bold mt-1">{tr.changeAvatar}</span>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }}
              />
            </div>

            <div className="flex-1 pb-1">
              <h2 className="text-xl font-black text-slate-800">{profile.username}</h2>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${PLAN_COLOR[profile.plan] || PLAN_COLOR.free}`}>
                  {tr.plans[profile.plan as keyof typeof tr.plans] || profile.plan}
                </span>
                <span className="text-xs text-slate-400">
                  {tr.member} {fmtDate(profile.created_at, lang)}
                </span>
              </div>
            </div>
          </div>

          {/* Avatar hint */}
          <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
            <Camera className="w-3 h-3" /> {tr.avatarHint}
          </p>

          {infoMsg && (
            <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-4 ${
              infoMsg.type === 'ok'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {infoMsg.type === 'ok'
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {infoMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FileSpreadsheet, label: tr.files,   value: files.length,    color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { icon: FileText,        label: tr.results,  value: results.length,  color: 'text-violet-600',  bg: 'bg-violet-50'  },
          { icon: HardDrive,       label: tr.storage,  value: fmtBytes(totalStorage), color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Edit info ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-primary-600" /> {tr.info}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              {tr.username}
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
                placeholder={tr.username}
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              {tr.email}
            </label>
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-500 select-all">{profile.email}</span>
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
            {tr.bio}
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder={tr.bioPlaceholder}
            rows={3}
            maxLength={250}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100
              resize-none transition-colors"
          />
          <p className="text-xs text-slate-400 mt-1 text-end">{bio.length}/250</p>
        </div>

        <button
          onClick={handleSaveInfo}
          disabled={savingInfo}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-60
            text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {savingInfo ? tr.saving : tr.saveInfo}
        </button>
      </div>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-600" /> {tr.password}
        </h3>

        {pwMsg && (
          <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl ${
            pwMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {pwMsg.type === 'ok'
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />
            }
            {pwMsg.text}
          </div>
        )}

        <div className="space-y-3">
          {[
            { label: tr.oldPw,     val: oldPw,     set: setOldPw,     show: showOld, toggle: () => setShowOld(v => !v) },
            { label: tr.newPw,     val: newPw,     set: setNewPw,     show: showNew, toggle: () => setShowNew(v => !v) },
            { label: tr.confirmPw, val: confirmPw, set: setConfirmPw, show: showNew, toggle: () => setShowNew(v => !v) },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                {field.label}
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type={field.show ? 'text' : 'password'}
                  value={field.val}
                  onChange={e => field.set(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
                />
                <button type="button" onClick={field.toggle} className="text-slate-400 hover:text-slate-600">
                  {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleChangePw}
          disabled={changingPw || !oldPw || !newPw || !confirmPw}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50
            text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Lock className="w-4 h-4" />
          {changingPw ? tr.changing : tr.changePw}
        </button>
      </div>
    </div>
  );
};