import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, Play, ArrowLeft, ArrowRight, RefreshCw, Key, Code2, Copy, Check } from 'lucide-react';
import { useFiles } from '../context/FilesContext';
import { SheetSelector } from '../components/SheetSelector';
import { CodeSnippets } from '../components/CodeSnippets';
import apiService from '../services/api';
import type { FileConfig } from '../types/api';

interface APIBuilderPageProps {
  lang: 'ar' | 'en';
  onComplete?: () => void;
  onCancel?: () => void;
  editFileId?: string | null;
  onNavigateToKeys?: () => void;
}

type Step = 1 | 2 | 3;

const STEP_LABELS = {
  ar: ['المصدر', 'الإعداد', 'الاستخدام'],
  en: ['Source', 'Configure', 'Use'],
};

export const APIBuilderPage: React.FC<APIBuilderPageProps> = ({ lang, onComplete, onCancel, editFileId, onNavigateToKeys }) => {
  const { files, uploadFile } = useFiles();
  const [step, setStep] = useState<Step>(editFileId ? 2 : 1);
  const [editingFileId] = useState<string | null>(editFileId || null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(editFileId || null);
  const isRtl = lang === 'ar';

  // Step 1 state
  const [sourceMode, setSourceMode] = useState<'new' | 'existing' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [sheet, setSheet] = useState('');
  const [inputs, setInputs] = useState('');
  const [outputs, setOutputs] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Test preview state (step 2 inline)
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [testLoading, setTestLoading] = useState(false);
  const [testOutputs, setTestOutputs] = useState<Record<string, any> | null>(null);
  const [testError, setTestError] = useState('');

  // Step 3 state
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key_prefix: string }[]>([]);
  const [selectedKey, setSelectedKey] = useState<{ id: string; name: string; key_prefix: string } | null>(null);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  const t = {
    step1Title: isRtl ? 'اختر الملف' : 'Choose a file',
    step1Hint: isRtl ? 'رفع ملف جديد أو اختيار ملف موجود' : 'Upload a new file or pick an existing one',
    uploadNew: isRtl ? 'رفع ملف جديد' : 'Upload new file',
    useExisting: isRtl ? ' اختيار ملف موجود' : 'Use existing file',
    dragHint: isRtl ? 'اسحب ملف Excel هنا أو انقر للاختيار' : 'Drop an Excel file here or click to browse',
    uploading: isRtl ? 'جاري الرفع...' : 'Uploading...',
    step2Title: isRtl ? 'إعداد API' : 'Configure API',
    inputsLabel: isRtl ? 'خلية الإدخال' : 'Input cells',
    inputsHint: isRtl ? 'أسماء خلايا الإدخال مفصولة بفواصل (مثل: A1, B2)' : 'Input cell names separated by commas (e.g.: A1, B2)',
    outputsLabel: isRtl ? 'خلية الإخراج' : 'Output cells',
    outputsHint: isRtl ? 'أسماء خلايا الإخراج مفصولة بفواصل (مثل: C1, D2)' : 'Output cell names separated by commas (e.g.: C1, D2)',
    testPreview: isRtl ? 'معاينة' : 'Preview',
    runPreview: isRtl ? 'تشغيل المعاينة' : 'Run preview',
    step3Title: isRtl ? 'استخدم الـ API' : 'Use your API',
    endpoint: isRtl ? 'نقطة النهاية' : 'Endpoint',
    yourKey: isRtl ? 'مفتاح API' : 'API key',
    generateKey: isRtl ? 'إنشاء مفتاح ▸' : 'Generate a key ▸',
    copyKey: isRtl ? 'نسخ المفتاح' : 'Copy key',
    tryIt: isRtl ? 'جرّب الآن' : 'Try it now',
    back: isRtl ? 'رجوع' : 'Back',
    next: isRtl ? 'التالي' : 'Next',
    saveAndContinue: isRtl ? 'حفظ ومتابعة ▸' : 'Save & continue ▸',
    close: isRtl ? 'إغلاق' : 'Close',
    done: isRtl ? 'تم — إغلاق' : 'Done — Close',
    previewOutputs: isRtl ? 'النتيجة' : 'Output',
    noKeyPlaceholder: 'ek_live_YOUR_KEY_HERE',
    inputPlaceholder: isRtl ? 'أدخل قيمة...' : 'Enter value...',
  };

  // Load existing config when editing
  useEffect(() => {
    if (editingFileId) {
      apiService.getFileConfig(editingFileId).then(cfg => {
        setSheet(cfg.sheet || '');
        setInputs(cfg.inputs.join(', '));
        setOutputs(cfg.outputs.join(', '));
      }).catch(() => {});
    }
  }, [editingFileId]);

  // ─── Step 1 handlers ───────────────────────────────────────────────────────

  const handleFileDrop = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setUploadError(isRtl ? 'يرجى اختيار ملف Excel (.xlsx / .xls)' : 'Please select an Excel file (.xlsx / .xls)');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const entry = await uploadFile(file);
      setSelectedFileId(entry.id);
      setSourceMode('new');
    } catch {
      setUploadError(isRtl ? 'فشل رفع الملف' : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFileDrop(file);
  };

  const handleExistingFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  // ─── Step 2 handlers ───────────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    if (!selectedFileId || !inputs.trim() || !outputs.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const config: FileConfig = {
        inputs: inputs.split(',').map(s => s.trim()).filter(Boolean),
        outputs: outputs.split(',').map(s => s.trim()).filter(Boolean),
        sheet: sheet || null,
      };
      await apiService.saveFileConfig(selectedFileId, config);
      // load API keys for step 3
      const keys = await apiService.listApiKeys();
      setApiKeys(keys.filter(k => !k.revoked_at));
      setStep(3);
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || (isRtl ? 'فشل حفظ الإعداد' : 'Failed to save config'));
    } finally {
      setSaving(false);
    }
  };

  const handleRunPreview = async () => {
    if (!selectedFileId || !inputs.trim()) return;
    const inputList = inputs.split(',').map(s => s.trim()).filter(Boolean);
    const testInputs: Record<string, string> = {};
    inputList.forEach(k => { testInputs[k] = testValues[k] || ''; });
    setTestLoading(true);
    setTestError('');
    setTestOutputs(null);
    try {
      const res = await apiService.runFile(selectedFileId, testInputs);
      setTestOutputs(res.outputs);
    } catch (e: any) {
      setTestError(e?.response?.data?.error || 'Preview failed');
    } finally {
      setTestLoading(false);
    }
  };

  // ─── Step 3 handlers ───────────────────────────────────────────────────────

  const handleGenerateKey = async () => {
    try {
      const res = await apiService.createApiKey(isRtl ? 'مفتاح الإنتاج' : 'Production key');
      setNewKeyValue(res.api_key.key);
      setShowKeyDialog(true);
      const keys = await apiService.listApiKeys();
      setApiKeys(keys.filter(k => !k.revoked_at));
      setSelectedKey({ id: res.api_key.id, name: res.api_key.name, key_prefix: res.api_key.key_prefix });
    } catch { /* noop */ }
  };

  const handleCopyNewKey = async () => {
    await navigator.clipboard.writeText(newKeyValue);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1800);
  };

  const endpointUrl = selectedFileId ? `${window.location.origin}/api/v1/files/${selectedFileId}/run` : '';

  const inputList = inputs.split(',').map(s => s.trim()).filter(Boolean);
  const outputList = outputs.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              disabled={s >= step}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-primary-600 text-white'
                  : s < step
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                {s < step ? <CheckCircle className="w-3.5 h-3.5" /> : s}
              </span>
              <span>{STEP_LABELS[lang][i]}</span>
            </button>
            {i < 2 && <div className={`w-8 h-0.5 rounded ${s < step ? 'bg-primary-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1: Source ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">{t.step1Title}</h2>
          <p className="text-sm text-slate-500 mb-6">{t.step1Hint}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSourceMode('new')}
              className={`p-5 rounded-2xl border-2 transition-all text-left ${
                sourceMode === 'new' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{t.uploadNew}</p>
            </button>

            <button
              onClick={() => setSourceMode('existing')}
              className={`p-5 rounded-2xl border-2 transition-all text-left ${
                sourceMode === 'existing' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{t.useExisting}</p>
            </button>
          </div>

          {/* Upload zone */}
          {sourceMode === 'new' && (
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                dragOver ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileDrop(file);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileInputChange}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">{t.uploading}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">{t.dragHint}</p>
                </>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-red-500">{uploadError}</p>
              )}
            </div>
          )}

          {/* Existing files list */}
          {sourceMode === 'existing' && (
            <div className="space-y-2">
              {files.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  {isRtl ? 'لا توجد ملفات. قم برفع ملف أولاً.' : 'No files yet. Upload one first.'}
                </p>
              ) : (
                files.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleExistingFileSelect(f.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedFileId === f.id
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                    </div>
                    {selectedFileId === f.id && (
                      <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 1 footer */}
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedFileId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{t.next}</span>
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Configure ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep(1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t.step2Title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {files.find(f => f.id === selectedFileId)?.name || ''}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Sheet selector */}
            <div>
              <SheetSelector lang={lang} value={sheet} onChange={setSheet} />
            </div>

            {/* Inputs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.inputsLabel}</label>
              <input
                type="text"
                value={inputs}
                onChange={e => setInputs(e.target.value)}
                placeholder={isRtl ? 'A1, B2, C3' : 'A1, B2, C3'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-slate-400 mt-1">{t.inputsHint}</p>
            </div>

            {/* Outputs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.outputsLabel}</label>
              <input
                type="text"
                value={outputs}
                onChange={e => setOutputs(e.target.value)}
                placeholder={isRtl ? 'D1, E2, F3' : 'D1, E2, F3'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-slate-400 mt-1">{t.outputsHint}</p>
            </div>

            {/* Inline test preview */}
            {inputList.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                  <Play className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">{t.testPreview}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inputList.map(key => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{key}</label>
                        <input
                          type="text"
                          value={testValues[key] || ''}
                          onChange={e => setTestValues({ ...testValues, [key]: e.target.value })}
                          placeholder={t.inputPlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleRunPreview}
                    disabled={testLoading || inputList.some(k => !testValues[k]?.trim())}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {testLoading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Play className="w-4 h-4" />}
                    <span>{t.runPreview}</span>
                  </button>

                  {testError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                      {testError}
                    </div>
                  )}

                  {testOutputs && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{t.previewOutputs}</p>
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                        {outputList.map(out => (
                          <div key={out} className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-slate-500 w-8">{out}</span>
                            <span className="font-mono text-emerald-700 font-medium">
                              {testOutputs[out] !== undefined ? String(testOutputs[out]) : '(no value)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {saveError}
              </div>
            )}
          </div>

          {/* Step 2 footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t.back}
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={saving || !inputs.trim() || !outputs.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <CheckCircle className="w-4 h-4" />}
              <span>{t.saveAndContinue}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Use ─────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep(2)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t.step3Title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {files.find(f => f.id === selectedFileId)?.name || ''}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Endpoint */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{t.endpoint}</p>
              <code className="text-sm text-slate-700 font-mono break-all">{endpointUrl}</code>
            </div>

            {/* API Key selector */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">{t.yourKey}</p>
              <div className="flex items-center gap-3">
                <select
                  value={selectedKey?.id || ''}
                  onChange={e => {
                    const k = apiKeys.find(k => k.id === e.target.value);
                    setSelectedKey(k || null);
                  }}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— {isRtl ? 'اختر مفتاحاً' : 'Select a key'} —</option>
                  {apiKeys.map(k => (
                    <option key={k.id} value={k.id}>{k.name} ({k.key_prefix}…)</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateKey}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-600 transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>{t.generateKey}</span>
                </button>
              </div>
            </div>

            {/* Code snippets */}
            <CodeSnippets
              fileId={selectedFileId || ''}
              endpointBase={window.location.origin}
              inputs={Object.fromEntries(inputList.map(k => [k, '']))}
              apiKeyPrefix={selectedKey?.key_prefix}
              hasApiKey={!!selectedKey}
              onNavigateToKeys={onNavigateToKeys}
            />

            {/* Try it now — inline test panel */}
            {selectedKey && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                  <Play className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">{t.tryIt}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inputList.map(key => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{key}</label>
                        <input
                          type="text"
                          value={testValues[key] || ''}
                          onChange={e => setTestValues({ ...testValues, [key]: e.target.value })}
                          placeholder={t.inputPlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleRunPreview}
                    disabled={testLoading || inputList.some(k => !testValues[k]?.trim())}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {testLoading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Play className="w-4 h-4" />}
                    <span>{t.runPreview}</span>
                  </button>

                  {testError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                      {testError}
                    </div>
                  )}

                  {testOutputs && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{t.previewOutputs}</p>
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                        <pre className="text-sm font-mono text-slate-800 whitespace-pre-wrap">
                          {JSON.stringify(testOutputs, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3 footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t.back}
            </button>
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isRtl ? 'تم — إغلاق' : 'Done — Close'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Key-show-once dialog */}
      {showKeyDialog && newKeyValue && (
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
              <button
                onClick={handleCopyNewKey}
                className="flex-shrink-0 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                {keyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => { setShowKeyDialog(false); setNewKeyValue(''); }}
              className="w-full px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            >
              {isRtl ? 'تم — إغلاق' : 'Done — Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};