import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileSpreadsheet, FolderOpen, Trash2, X } from 'lucide-react';
import { useFiles, FileEntry } from '../context/FilesContext';
import { useCategories, Category } from '../context/CategoriesContext';

interface FileSelectorProps {
  lang: 'ar' | 'en';
  onChange?: (file: FileEntry | null) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CategoryPill({ cat }: { cat: Category }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: cat.color + '20', color: cat.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
      {cat.name}
    </span>
  );
}

export const FileSelector: React.FC<FileSelectorProps> = ({ lang, onChange }) => {
  const { files, selectedFile, setSelectedFile, deleteFile } = useFiles();
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const t = {
    ar: {
      noFile: 'لم يتم اختيار ملف',
      choose: 'اختر من المستودع',
      change: 'تغيير',
      repository: 'مستودع الملفات',
      empty: 'لا توجد ملفات — ارفع ملفاتك من صفحة "الملفات"',
      select: 'اختر',
      uncategorized: 'غير مصنّف',
    },
    en: {
      noFile: 'No file selected',
      choose: 'Choose from repository',
      change: 'Change',
      repository: 'File Repository',
      empty: 'No files — upload your files from the "Files" page',
      select: 'Select',
      uncategorized: 'Uncategorized',
    },
  }[lang];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const select = (file: FileEntry) => {
    setSelectedFile(file);
    onChange?.(file);
    setOpen(false);
  };

  const getCat = (file: FileEntry): Category | undefined =>
    categories.find(c => c.id === file.category_id);

  // Group files: by category, then uncategorized
  const grouped: Array<{ cat: Category | null; files: FileEntry[] }> = [];
  categories.forEach(cat => {
    const catFiles = files.filter(f => f.category_id === cat.id);
    if (catFiles.length > 0) grouped.push({ cat, files: catFiles });
  });
  const uncategorized = files.filter(f => !f.category_id || !categories.find(c => c.id === f.category_id));
  if (uncategorized.length > 0) grouped.push({ cat: null, files: uncategorized });

  const selectedCat = selectedFile ? getCat(selectedFile) : undefined;

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors text-left ${
          selectedFile
            ? 'border-primary-400 bg-primary-50 hover:border-primary-500'
            : 'border-dashed border-gray-300 bg-white hover:border-primary-400'
        }`}
      >
        {/* category color bar on the left */}
        {selectedCat && (
          <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: selectedCat.color }} />
        )}

        <FileSpreadsheet className={`w-6 h-6 flex-shrink-0 ${selectedFile ? 'text-primary-500' : 'text-gray-400'}`} />

        <div className="flex-1 min-w-0">
          {selectedFile ? (
            <>
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-500">{formatSize(selectedFile.size)}</p>
                {selectedCat && <CategoryPill cat={selectedCat} />}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">{t.noFile}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-primary-600 flex items-center gap-1">
            <FolderOpen className="w-3.5 h-3.5" />
            {selectedFile ? t.change : t.choose}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">{t.repository}</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {files.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8 px-4">{t.empty}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {grouped.map(({ cat, files: groupFiles }) => (
                <div key={cat?.id ?? '__none__'}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-y border-gray-100 sticky top-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: cat?.color ?? '#9ca3af' }}
                    />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {cat?.name ?? t.uncategorized}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">{groupFiles.length}</span>
                  </div>

                  {/* Files in group */}
                  {groupFiles.map(file => (
                    <div
                      key={file.id}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                        selectedFile?.id === file.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      {/* category accent */}
                      <span
                        className="w-0.5 self-stretch rounded-full flex-shrink-0"
                        style={{ background: cat?.color ?? 'transparent' }}
                      />

                      <FileSpreadsheet className="w-4 h-4 text-green-500 flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => select(file)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                            selectedFile?.id === file.id
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-700'
                          }`}
                        >
                          {t.select}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};