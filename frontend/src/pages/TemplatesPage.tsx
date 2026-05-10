import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookTemplate, Upload, Download, Trash2, Loader,
  RefreshCw, FileSpreadsheet, Plus, Pencil, Check, X, Play,
} from 'lucide-react';
import { Card, Alert, Button } from '../components/ui';
import { apiService } from '../services/api';

interface TemplatesPageProps { lang: 'ar' | 'en'; onTabChange?: (tab: string) => void; }

const T = {
  ar: {
    title: 'مكتبة القوالب',
    desc: 'قوالب Excel محفوظة — تُنسخ عند الاستخدام ولا تتأثر بالتعديلات',
    upload: 'رفع قالب',
    uploading: 'جاري الرفع...',
    name: 'اسم القالب',
    namePlaceholder: 'اسم مميز للقالب',
    description: 'وصف (اختياري)',
    empty: 'لا توجد قوالب. ارفع ملف Excel كقالب.',
    refresh: 'تحديث',
    download: 'تحميل',
    use: 'استخدام',
    delete: 'حذف',
    edit: 'تعديل',
    save: 'حفظ',
    cancel: 'إلغاء',
    usedSuccess: 'تم نسخ القالب إلى النتائج. يمكنك تعديله الآن.',
    dropzone: 'اسحب .xlsx هنا أو انقر للاختيار',
    limitError: 'تجاوزت حد القوالب في خطتك.',
    size: (b: number) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`,
  },
  en: {
    title: 'Template Library',
    desc: 'Saved Excel templates — copied on use, originals never modified',
    upload: 'Upload Template',
    uploading: 'Uploading...',
    name: 'Template Name',
    namePlaceholder: 'Descriptive name',
    description: 'Description (optional)',
    empty: 'No templates yet. Upload an Excel file as a template.',
    refresh: 'Refresh',
    download: 'Download',
    use: 'Use',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    usedSuccess: 'Template copied to results. You can now edit it.',
    dropzone: 'Drop .xlsx here or click to browse',
    limitError: 'Template limit reached for your plan.',
    size: (b: number) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`,
  },
} as const;

interface Template {
  id: string;
  name: string;
  description: string;
  filename: string;
  size_bytes: number;
  created_at: string;
}

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' });
}

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ lang, onTabChange }) => {
  const t = T[lang];
  const isRtl = lang === 'ar';

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // Upload form
  const [file, setFile]   = useState<File | null>(null);
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inline edit
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName, setEditName]     = useState('');
  const [editDesc, setEditDesc]     = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Per-row loading
  const [usingId, setUsingId]       = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dlId, setDlId]             = useState<string | null>(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setTemplates(await apiService.listTemplates());
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.(xlsx|xls)$/i, ''));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null); setSuccess(null);
    try {
      await apiService.uploadTemplate(file, name.trim() || file.name, desc.trim());
      await fetch(true);
      setFile(null); setName(''); setDesc('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (e: any) {
      const data = e.response?.data;
      setError(data?.message_en || data?.message || data?.error || e.message || t.limitError);
    } finally {
      setUploading(false);
    }
  };

  const handleUse = async (id: string) => {
    setUsingId(id); setError(null); setSuccess(null);
    try {
      await apiService.useTemplate(id);
      setSuccess(t.usedSuccess);
      if (onTabChange) setTimeout(() => onTabChange('batch'), 1500);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setUsingId(null);
    }
  };

  const handleDownload = async (tpl: Template) => {
    setDlId(tpl.id);
    try {
      const blob = await apiService.downloadTemplate(tpl.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = tpl.filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally { setDlId(null); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiService.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally { setDeletingId(null); }
  };

  const startEdit = (tpl: Template) => {
    setEditingId(tpl.id); setEditName(tpl.name); setEditDesc(tpl.description);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const updated = await apiService.updateTemplate(id, editName, editDesc);
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
      setEditingId(null);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally { setSavingEdit(false); }
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Upload card */}
      <Card title={t.title} icon={<BookTemplate className="w-5 h-5" />}>
        <p className="text-sm text-gray-500 mb-5">{t.desc}</p>

        {error   && <Alert type="error"   message={error}   onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        <div className="space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver || file ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <FileSpreadsheet className="w-5 h-5" /> <span className="text-sm font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <Upload className="w-8 h-8" />
                <p className="text-sm">{t.dropzone}</p>
              </div>
            )}
          </div>

          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={t.namePlaceholder} className={inputCls} />
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder={t.description} className={inputCls} />

          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={!file}
            icon={uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          >
            {uploading ? t.uploading : t.upload}
          </Button>
        </div>
      </Card>

      {/* Templates list */}
      <Card
        title={`${lang === 'ar' ? 'القوالب المحفوظة' : 'Saved Templates'} (${templates.length})`}
        icon={<BookTemplate className="w-5 h-5" />}
      >
        <div className="flex justify-end mb-4">
          <Button variant="secondary" onClick={() => fetch()} loading={loading}
            icon={<RefreshCw className="w-4 h-4" />}>{t.refresh}</Button>
        </div>

        {loading && templates.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-300"><Loader className="w-6 h-6 animate-spin" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <BookTemplate className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 -mx-6">
            {templates.map(tpl => (
              <div key={tpl.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">

                {editingId === tpl.id ? (
                  // Inline edit form
                  <div className="space-y-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className={inputCls}
                      placeholder={t.description} />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(tpl.id)} disabled={savingEdit}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {savingEdit ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        {t.save}
                      </button>
                      <button onClick={cancelEdit}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                        <X className="w-3 h-3" /> {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-50 rounded-xl flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tpl.name}</p>
                      {tpl.description && (
                        <p className="text-xs text-gray-500 truncate">{tpl.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.size(tpl.size_bytes)} · {formatDate(tpl.created_at, lang)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Use */}
                      <button onClick={() => handleUse(tpl.id)} disabled={!!usingId}
                        title={t.use}
                        className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30">
                        {usingId === tpl.id ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      {/* Download */}
                      <button onClick={() => handleDownload(tpl)} disabled={dlId === tpl.id}
                        title={t.download}
                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        {dlId === tpl.id ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>
                      {/* Edit */}
                      <button onClick={() => startEdit(tpl)} title={t.edit}
                        className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Delete */}
                      <button onClick={() => handleDelete(tpl.id)} disabled={deletingId === tpl.id}
                        title={t.delete}
                        className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                        {deletingId === tpl.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};