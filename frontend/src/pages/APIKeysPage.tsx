import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Check, Trash2, X } from 'lucide-react';
import apiService from '../services/api';
import type { ApiKey } from '../types/api';

interface APIKeysPageProps {
  lang: 'ar' | 'en';
  openCreateDialog?: boolean;
  onCreateSuccess?: (key: string) => void;
}

export const APIKeysPage: React.FC<APIKeysPageProps> = ({
  lang, openCreateDialog = false, onCreateSuccess,
}) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(openCreateDialog);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revokeConfirmName, setRevokeConfirmName] = useState('');

  const isRtl = lang === 'ar';
  const t = {
    title: isRtl ? 'مفاتيح API' : 'API Keys',
    empty: isRtl ? 'لم يتم إنشاء أي مفاتيح بعد.' : 'No API keys yet.',
    emptyHint: isRtl
      ? 'قم بإنشاء مفتاحك الأول لبدء استدعاء نقاط النهاية.'
      : 'Generate your first key to start calling your endpoints.',
    createBtn: isRtl ? 'إنشاء مفتاح جديد' : 'Generate new key',
    nameLabel: isRtl ? 'اسم المفتاح' : 'Key name',
    namePlaceholder: isRtl ? 'مثال: مفتاح الإنتاج' : 'e.g. Production key',
    cancel: isRtl ? 'إلغاء' : 'Cancel',
    create: isRtl ? 'إنشاء' : 'Create',
    revoke: isRtl ? 'إلغاء' : 'Revoke',
    never: isRtl ? 'لم يُستخدم بعد' : 'Never used',
    confirmRevoke: isRtl
      ? `اكتب "${revokeTarget?.name}" للتأكيد`
      : `Type "${revokeTarget?.name}" to confirm`,
    lastUsed: isRtl ? 'آخر استخدام' : 'Last used',
    created: isRtl ? 'تاريخ الإنشاء' : 'Created',
    prefix: isRtl ? 'البادئة' : 'Prefix',
  };

  const loadKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const k = await apiService.listApiKeys();
      setKeys(k);
    } catch {
      setError(isRtl ? 'فشل تحميل المفاتيح' : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await apiService.createApiKey(newKeyName.trim());
      setNewKeyValue(res.api_key.key);
      setNewKeyName('');
      await loadKeys();
    } catch {
      setError(isRtl ? 'فشل إنشاء المفتاح' : 'Failed to create key');
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      if (onCreateSuccess) onCreateSuccess(newKeyValue);
    } catch { /* noop */ }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || revokeConfirmName !== revokeTarget.name) return;
    try {
      await apiService.revokeApiKey(revokeTarget.id);
      setRevokeTarget(null);
      setRevokeConfirmName('');
      await loadKeys();
    } catch {
      setError(isRtl ? 'فشل إلغاء المفتاح' : 'Failed to revoke key');
    }
  };

  const activeKeys = keys.filter(k => !k.revoked_at);
  const revokedKeys = keys.filter(k => k.revoked_at);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-100">
            <Key className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl ? `${activeKeys.length} مفتاح نشط` : `${activeKeys.length} active key${activeKeys.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t.createBtn}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Empty state */}
      {keys.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Key className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">{t.empty}</p>
          <p className="text-slate-400 text-sm mt-1">{t.emptyHint}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createBtn}</span>
          </button>
        </div>
      )}

      {/* Active keys list */}
      {activeKeys.length > 0 && (
        <div className="space-y-3">
          {activeKeys.map(k => (
            <div key={k.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{k.name}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{k.key_prefix}…</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                  <span>{t.created}: {new Date(k.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                  <span>{k.last_used_at ? `${t.lastUsed}: ${new Date(k.last_used_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}` : t.never}</span>
                </div>
              </div>
              <button
                onClick={() => setRevokeTarget(k)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.revoke}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            {isRtl ? 'ملغاة' : 'Revoked'}
          </p>
          <div className="space-y-2">
            {revokedKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 opacity-60">
                <div>
                  <p className="text-sm text-slate-500 line-through">{k.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{k.key_prefix}…</p>
                </div>
                <span className="text-xs text-slate-400">
                  {isRtl ? 'ملغى' : 'Revoked'} {new Date(k.revoked_at!).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create dialog */}
      {showCreate && !newKeyValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{t.createBtn}</h3>
              <button onClick={() => { setShowCreate(false); setNewKeyValue(''); }} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.nameLabel}</label>
              <input
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCreate(false); setNewKeyName(''); }} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                {t.cancel}
              </button>
              <button onClick={handleCreate} disabled={!newKeyName.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {t.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key created — show once */}
      {showCreate && newKeyValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{isRtl ? 'تم إنشاء المفتاح!' : 'Key created!'}</h3>
            </div>
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
              {isRtl
                ? 'هذه هي المرة الوحيدة التي ستظهر فيها هذا المفتاح. انسخه الآن.'
                : 'This is the only time you will see this key. Copy it now.'}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 text-white mb-4">
              <code className="flex-1 text-xs font-mono break-all">{newKeyValue}</code>
              <button onClick={handleCopyKey} className="flex-shrink-0 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => { setShowCreate(false); setNewKeyValue(''); }} className="w-full px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
              {isRtl ? 'تم — إغلاق' : 'Done — Close'}
            </button>
          </div>
        </div>
      )}

      {/* Revoke confirmation modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{isRtl ? 'تأكيد إلغاء المفتاح' : 'Confirm key revocation'}</h3>
              <button onClick={() => { setRevokeTarget(null); setRevokeConfirmName(''); }} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {isRtl
                ? `سيتوقف المفتاح "${revokeTarget.name}" عن العمل فوراً. لا يمكن التراجع عن هذا.`
                : `Key "${revokeTarget.name}" will stop working immediately. This cannot be undone.`}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t.confirmRevoke}
              </label>
              <input
                type="text"
                value={revokeConfirmName}
                onChange={e => setRevokeConfirmName(e.target.value)}
                placeholder={revokeTarget.name}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRevokeTarget(null); setRevokeConfirmName(''); }} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                {t.cancel}
              </button>
              <button
                onClick={handleRevoke}
                disabled={revokeConfirmName !== revokeTarget.name}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {t.revoke}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};