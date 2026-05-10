import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet, Trash2, Upload, CheckCircle, Plus, Tag, Pencil, X, ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { Button, Alert } from '../components/ui';
import { useFiles, FileEntry } from '../context/FilesContext';
import { useCategories, Category } from '../context/CategoriesContext';

interface FilesPageProps { lang: 'ar' | 'en'; }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Category Manager Modal ──────────────────────────────────────────────────

const PRESET_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

function CategoryModal({ lang, onClose }: { lang: 'ar' | 'en'; onClose: () => void }) {
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');

  const t = lang === 'ar' ? {
    title: 'إدارة التصنيفات', newCat: 'تصنيف جديد', name: 'الاسم',
    namePlaceholder: 'اسم التصنيف', add: 'إضافة', save: 'حفظ',
    cancel: 'إلغاء', noCats: 'لا توجد تصنيفات بعد', confirmDelete: (n: string) => `حذف "${n}"؟`
  } : {
    title: 'Manage Categories', newCat: 'New Category', name: 'Name',
    namePlaceholder: 'Category name', add: 'Add', save: 'Save',
    cancel: 'Cancel', noCats: 'No categories yet', confirmDelete: (n: string) => `Delete "${n}"?`
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError(lang === 'ar' ? 'الاسم مطلوب' : 'Name is required'); return; }
    try {
      if (editing) {
        await updateCategory(editing.id, name.trim(), color);
        setEditing(null);
      } else {
        await createCategory(name.trim(), color);
      }
      setName(''); setColor(PRESET_COLORS[0]); setError('');
    } catch { setError(lang === 'ar' ? 'حدث خطأ' : 'An error occurred'); }
  };

  const startEdit = (cat: Category) => { setEditing(cat); setName(cat.name); setColor(cat.color); };
  const cancelEdit = () => { setEditing(null); setName(''); setColor(PRESET_COLORS[0]); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{t.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Add / edit form */}
          <div className="space-y-3">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSubmit}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                {editing ? t.save : t.add}
              </button>
              {editing && (
                <button onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                  {t.cancel}
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">{t.noCats}</p>
              : categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="flex-1 text-sm font-medium text-gray-700">{cat.name}</span>
                  <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (window.confirm(t.confirmDelete(cat.name))) deleteCategory(cat.id); }}
                    className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── File Card ───────────────────────────────────────────────────────────────

function FileCard({ file, lang, categories, isSelected, onSelect, onDelete, onAssignCategory }: {
  file: FileEntry; lang: 'ar' | 'en'; categories: Category[];
  isSelected: boolean; onSelect: () => void; onDelete: () => void;
  onAssignCategory: (catId: string | null) => void;
}) {
  const [catOpen, setCatOpen] = useState(false);
  const currentCat = categories.find(c => c.id === file.category_id);
  const t = lang === 'ar'
    ? { select: 'اختر للعمل', selected: 'محدد', move: 'نقل إلى', unassign: 'بدون تصنيف' }
    : { select: 'Select', selected: 'Selected', move: 'Move to', unassign: 'No category' };

  return (
    <div className={`relative group bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden ${
      isSelected ? 'border-indigo-400 shadow-md shadow-indigo-100' : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
    }`}>
      {/* Color accent */}
      <div className="h-1.5 w-full" style={{ background: currentCat?.color || '#e5e7eb' }} />

      <div className="p-4">
        {/* Icon + name */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatSize(file.size)}</p>
          </div>
          {isSelected && <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />}
        </div>

        {/* Category badge */}
        {currentCat && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-3"
            style={{ background: currentCat.color + '20', color: currentCat.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentCat.color }} />
            {currentCat.name}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-1">
          <button onClick={onSelect}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isSelected
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
            }`}>
            {isSelected ? t.selected : t.select}
          </button>

          {/* Category assign */}
          <div className="relative">
            <button onClick={() => setCatOpen(o => !o)}
              className="p-1.5 text-gray-400 hover:text-indigo-500 bg-gray-100 rounded-lg transition-colors">
              <Tag className="w-3.5 h-3.5" />
            </button>
            {catOpen && (
              <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-36 py-1 text-sm">
                <p className="px-3 py-1 text-xs text-gray-400 font-medium uppercase">{t.move}</p>
                <button onClick={() => { onAssignCategory(null); setCatOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-500 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-200" />{t.unassign}
                </button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => { onAssignCategory(c.id); setCatOpen(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-xs flex items-center gap-2 ${file.category_id === c.id ? 'font-semibold' : ''}`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />{c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 bg-gray-100 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Group ──────────────────────────────────────────────────────────

function CategoryGroup({ title, color, files, lang, categories, selectedFile, onSelect, onDelete, onAssignCategory }: {
  title: string; color: string; files: FileEntry[]; lang: 'ar' | 'en';
  categories: Category[]; selectedFile: FileEntry | null;
  onSelect: (f: FileEntry) => void; onDelete: (id: string) => void;
  onAssignCategory: (fileId: string, catId: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-8">
      <button
        onClick={() => setCollapsed(o => !o)}
        className="flex items-center gap-3 mb-4 group w-full text-left"
      >
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="font-semibold text-gray-700">{title}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{files.length}</span>
        <span className="ml-auto text-gray-400 group-hover:text-gray-600">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map(file => (
            <FileCard key={file.id} file={file} lang={lang} categories={categories}
              isSelected={selectedFile?.id === file.id}
              onSelect={() => onSelect(file)}
              onDelete={() => onDelete(file.id)}
              onAssignCategory={catId => onAssignCategory(file.id, catId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FilesPage ───────────────────────────────────────────────────────────────

export const FilesPage: React.FC<FilesPageProps> = ({ lang }) => {
  const { files, selectedFile, setSelectedFile, uploadFile, deleteFile, assignCategory, searchQuery, setSearchQuery } = useFiles();
  const { categories } = useCategories();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = lang === 'ar' ? {
    title: 'مستودع الملفات', description: 'ارفع ملفات Excel كـ templates — تُستخدم في جميع الأدوات دون تعديل',
    upload: 'ارفع ملف', uploading: 'جاري الرفع...', dropzone: 'اسحب .xlsx أو .xls هنا أو انقر للاختيار',
    manageCats: 'إدارة التصنيفات', noFiles: 'لا توجد ملفات — ارفع أول ملف لديك',
    uncategorized: 'غير مصنّف', uploadSuccess: (n: string) => `تم رفع "${n}"`,
    deleteConfirm: (n: string) => `حذف "${n}"؟`, searchPlaceholder: 'ابحث في الملفات...',
  } : {
    title: 'File Repository', description: 'Upload Excel files as templates — used across all tools without modification',
    upload: 'Upload File', uploading: 'Uploading...', dropzone: 'Drop .xlsx or .xls here or click to browse',
    manageCats: 'Manage Categories', noFiles: 'No files yet — upload your first file',
    uncategorized: 'Uncategorized', uploadSuccess: (n: string) => `"${n}" uploaded`,
    deleteConfirm: (n: string) => `Delete "${n}"?`, searchPlaceholder: 'Search files...',
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError(lang === 'ar' ? 'الرجاء اختيار ملف Excel' : 'Please select an Excel file'); return;
    }
    setUploading(true); setError(null); setSuccess(null);
    try {
      const entry = await uploadFile(file);
      setSelectedFile(entry);
      setSuccess(t.uploadSuccess(entry.name));
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.error === 'plan_limit') {
        const msgs: Record<string, string> = {
          files:     lang === 'ar' ? `وصلت للحد الأقصى (${data.limit} ملف). قم بترقية خطتك من قائمة الخطط والأسعار.` : `File limit reached (${data.limit} files). Upgrade your plan.`,
          file_size: lang === 'ar' ? `حجم الملف يتجاوز ${data.limit} MB. قم بترقية خطتك.` : `File exceeds ${data.limit} MB limit. Upgrade your plan.`,
          storage:   lang === 'ar' ? `مساحة التخزين ممتلئة. قم بترقية خطتك.` : `Storage full. Upgrade your plan.`,
        };
        setError(msgs[data.reason] ?? data.message ?? (lang === 'ar' ? 'تجاوزت حدود الخطة' : 'Plan limit exceeded'));
      } else {
        setError(data?.error || err.message || (lang === 'ar' ? 'فشل الرفع' : 'Upload failed'));
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file || !window.confirm(t.deleteConfirm(file.name))) return;
    try { await deleteFile(id); } catch { setError(lang === 'ar' ? 'فشل الحذف' : 'Delete failed'); }
  };

  // Filter files by search query
  const filteredFiles = searchQuery.trim()
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : files;

  // Group files by category
  const grouped: Array<{ cat: Category | null; files: FileEntry[] }> = [];
  categories.forEach(cat => {
    const catFiles = filteredFiles.filter(f => f.category_id === cat.id);
    if (catFiles.length > 0) grouped.push({ cat, files: catFiles });
  });
  const uncategorized = filteredFiles.filter(f => !f.category_id || !categories.find(c => c.id === f.category_id));

  return (
    <div className="space-y-6">
      {showCatModal && <CategoryModal lang={lang} onClose={() => setShowCatModal(false)} />}

      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" /> {t.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t.description}</p>
          </div>
          <button onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <Tag className="w-4 h-4" /> {t.manageCats}
          </button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
          }`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => handleFiles(e.target.files)} />
          <Upload className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">{t.dropzone}</p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => inputRef.current?.click()} loading={uploading} icon={<Plus className="w-4 h-4" />}>
            {uploading ? t.uploading : t.upload}
          </Button>
        </div>

        {error && <div className="mt-3"><Alert type="error" message={error} onClose={() => setError(null)} /></div>}
        {success && <div className="mt-3"><Alert type="success" message={success} onClose={() => setSuccess(null)} /></div>}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Files grouped by category */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileSpreadsheet className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-sm">{searchQuery ? (lang === 'ar' ? 'لا توجد نتائج' : 'No results found') : t.noFiles}</p>
        </div>
      ) : (
        <div>
          {grouped.map(({ cat, files: catFiles }) => (
            <CategoryGroup key={cat!.id} title={cat!.name} color={cat!.color}
              files={catFiles} lang={lang} categories={categories}
              selectedFile={selectedFile}
              onSelect={f => setSelectedFile(selectedFile?.id === f.id ? null : f)}
              onDelete={handleDelete}
              onAssignCategory={assignCategory}
            />
          ))}

          {uncategorized.length > 0 && (
            <CategoryGroup title={t.uncategorized} color="#9ca3af"
              files={uncategorized} lang={lang} categories={categories}
              selectedFile={selectedFile}
              onSelect={f => setSelectedFile(selectedFile?.id === f.id ? null : f)}
              onDelete={handleDelete}
              onAssignCategory={assignCategory}
            />
          )}
        </div>
      )}
    </div>
  );
};