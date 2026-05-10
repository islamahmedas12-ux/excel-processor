import React, { useRef, useState } from 'react';
import {
  ImageIcon, QrCode, Upload, Loader, Download,
  FileSpreadsheet, ScanLine,
} from 'lucide-react';
import { Card, Button, Alert } from '../components/ui';
import { FileSelector } from '../components/FileSelector';
import { SheetSelector } from '../components/SheetSelector';
import { useFiles } from '../context/FilesContext';
import { useResults } from '../context/ResultsContext';
import { apiService } from '../services/api';

interface InsertImagePageProps { lang: 'ar' | 'en'; }

type Mode = 'image' | 'qr';

const T = {
  ar: {
    title: 'إدراج صورة أو QR',
    desc: 'أضف صورة أو رمز QR مباشرة داخل خلية من ملف Excel',
    modeImage: 'صورة',
    modeQr: 'رمز QR',
    file: 'الملف',
    sheet: 'الورقة',
    cell: 'الخلية (مثال: B5)',
    imageFile: 'اختر الصورة (PNG/JPG)',
    widthPx: 'العرض (px)',
    heightPx: 'الارتفاع (px)',
    qrData: 'نص أو رابط QR',
    qrDataPlaceholder: 'https://example.com',
    accessCode: 'أو رمز التحقق (6 أحرف)',
    accessCodePlaceholder: 'XK29AB',
    sizePx: 'الحجم (px)',
    insert: 'إدراج وحفظ',
    inserting: 'جاري الإدراج...',
    noFile: 'اختر ملفاً أولاً',
    noImage: 'اختر صورة أولاً',
    noQrData: 'أدخل نصاً أو رمز التحقق',
    success: 'تم الإدراج وحفظ النتيجة!',
    drop: 'اسحب صورة أو انقر للاختيار',
    qrNote: 'إذا أدخلت رمز التحقق سيُنشئ رابط التحقق تلقائياً',
    downloadResult: 'تحميل النتيجة',
  },
  en: {
    title: 'Insert Image or QR Code',
    desc: 'Embed an image or QR code directly into an Excel cell',
    modeImage: 'Image',
    modeQr: 'QR Code',
    file: 'File',
    sheet: 'Sheet',
    cell: 'Cell (e.g. B5)',
    imageFile: 'Choose image (PNG/JPG)',
    widthPx: 'Width (px)',
    heightPx: 'Height (px)',
    qrData: 'QR Text or URL',
    qrDataPlaceholder: 'https://example.com',
    accessCode: 'Or verification code (6 chars)',
    accessCodePlaceholder: 'XK29AB',
    sizePx: 'Size (px)',
    insert: 'Insert & Save',
    inserting: 'Inserting...',
    noFile: 'Please select a file first',
    noImage: 'Please select an image',
    noQrData: 'Enter text/URL or a verification code',
    success: 'Inserted and saved as a result!',
    drop: 'Drop an image or click to browse',
    qrNote: 'Providing a verification code auto-generates the verify URL',
    downloadResult: 'Download Result',
  },
} as const;

export const InsertImagePage: React.FC<InsertImagePageProps> = ({ lang }) => {
  const t = T[lang];
  const isRtl = lang === 'ar';
  const { selectedFile } = useFiles();
  const { downloadResult } = useResults();

  const [mode, setMode]           = useState<Mode>('image');
  const [sheet, setSheet]         = useState('');
  const [cell, setCell]           = useState('A1');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [widthPx, setWidthPx]     = useState(120);
  const [heightPx, setHeightPx]   = useState(120);
  const [qrData, setQrData]       = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [sizePx, setSizePx]       = useState(120);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [savedResultId, setSavedResultId]     = useState<string | null>(null);
  const [savedResultName, setSavedResultName] = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File | null) => {
    setImageFile(file);
    setImagePreview(null);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/'))) handleImageFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) { setError(t.noFile); return; }
    setError(null); setSuccess(null); setSavedResultId(null);
    setLoading(true);

    try {
      if (mode === 'image') {
        if (!imageFile) { setError(t.noImage); return; }
        const res = await apiService.insertImage({
          fileId:    selectedFile.id,
          image:     imageFile,
          cell:      cell.trim() || 'A1',
          sheetName: sheet || undefined,
          widthPx,
          heightPx,
        });
        setSavedResultId(res.result?.id ?? null);
        setSavedResultName(res.result?.filename ?? null);
      } else {
        const qd = qrData.trim();
        const ac = accessCode.trim().toUpperCase();
        if (!qd && !ac) { setError(t.noQrData); return; }
        const res = await apiService.insertQr({
          fileId:     selectedFile.id,
          qrData:     qd || undefined,
          accessCode: ac || undefined,
          cell:       cell.trim() || 'A1',
          sheetName:  sheet || undefined,
          sizePx,
        });
        setSavedResultId(res.result?.id ?? null);
        setSavedResultName(res.result?.filename ?? null);
      }
      setSuccess(t.success);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || (lang === 'ar' ? 'حدث خطأ' : 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, input: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {input}
    </div>
  );

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <Card title={t.title} icon={<ImageIcon className="w-5 h-5" />}>
        <p className="text-sm text-gray-500 mb-5">{t.desc}</p>

        {error   && <Alert type="error"   message={error}   onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Mode switcher */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-5">
          {(['image', 'qr'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {m === 'image' ? <ImageIcon className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
              {m === 'image' ? t.modeImage : t.modeQr}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {field(t.file, <FileSelector lang={lang} />)}

          <div className="grid grid-cols-2 gap-3">
            {field(t.sheet, <SheetSelector lang={lang} value={sheet} onChange={setSheet} />)}
            {field(t.cell,
              <input value={cell} onChange={e => setCell(e.target.value.toUpperCase())}
                className={inputCls} placeholder="A1" />
            )}
          </div>

          {mode === 'image' ? (
            <>
              {field(t.imageFile,
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => imgInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    imageFile ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleImageFile(e.target.files?.[0] ?? null)} />
                  {imagePreview
                    ? <img src={imagePreview} alt="" className="max-h-28 mx-auto rounded-lg object-contain" />
                    : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Upload className="w-8 h-8" />
                        <p className="text-sm">{t.drop}</p>
                      </div>
                    )
                  }
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {field(t.widthPx,
                  <input type="number" value={widthPx} onChange={e => setWidthPx(+e.target.value)}
                    min={20} max={600} className={inputCls} />
                )}
                {field(t.heightPx,
                  <input type="number" value={heightPx} onChange={e => setHeightPx(+e.target.value)}
                    min={20} max={600} className={inputCls} />
                )}
              </div>
            </>
          ) : (
            <>
              {field(t.qrData,
                <input value={qrData} onChange={e => setQrData(e.target.value)}
                  placeholder={t.qrDataPlaceholder} className={inputCls} />
              )}
              {field(t.accessCode,
                <div className="relative">
                  <ScanLine className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    placeholder={t.accessCodePlaceholder}
                    className={`${inputCls} ps-9 font-mono tracking-widest`}
                    maxLength={6}
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 -mt-2">{t.qrNote}</p>
              {field(t.sizePx,
                <input type="number" value={sizePx} onChange={e => setSizePx(+e.target.value)}
                  min={40} max={400} className={inputCls} />
              )}
            </>
          )}

          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!selectedFile}
            icon={loading ? <Loader className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          >
            {loading ? t.inserting : t.insert}
          </Button>

          {savedResultId && savedResultName && (
            <button
              onClick={() => downloadResult(savedResultId, savedResultName)}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> {t.downloadResult}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};