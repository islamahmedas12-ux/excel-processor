import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, ArrowLeft, ArrowRight, Plus, Trash2,
  Play, Check, Database, Link2,
} from 'lucide-react';
import { useFiles } from '../context/FilesContext';
import apiService from '../services/api';
import type {
  FileConfigV2, DataSource, RunParam, InputBinding, OutputCell, AuthType,
} from '../types/api';

interface APIBuilderPageProps {
  lang: 'ar' | 'en';
  onComplete?: () => void;
  editFileId?: string | null;
  onNavigateToKeys?: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

const AUTH_TYPES: AuthType[] = [
  'none', 'bearer', 'api_key_header', 'query_param', 'basic', 'custom_header',
];

const uid = () => Math.random().toString(36).slice(2, 9);

/** Pull {param} names out of a URL template. */
const placeholdersOf = (url: string): string[] =>
  Array.from(new Set((url.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [])
    .map(s => s.slice(1, -1))));

export const APIBuilderPage: React.FC<APIBuilderPageProps> = ({
  lang, onComplete, editFileId, onNavigateToKeys,
}) => {
  const isRtl = lang === 'ar';
  const { files, uploadFile } = useFiles();

  const [step, setStep] = useState<Step>(editFileId ? 2 : 1);
  const [fileId, setFileId] = useState<string | null>(editFileId || null);

  // Step 1
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheet names of the selected file (populated once a file is chosen)
  const [sheets, setSheets] = useState<string[]>([]);

  // v2 config model
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [runParams, setRunParams] = useState<RunParam[]>([]);
  const [bindings, setBindings] = useState<InputBinding[]>([]);
  const [outputs, setOutputs] = useState<OutputCell[]>([]);

  // Sample responses fetched via /data-source/test, keyed by source id
  const [samples, setSamples] = useState<Record<string, any>>({});
  const [testParams, setTestParams] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Step 5
  const [apiKeyPrefix, setApiKeyPrefix] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<Record<string, any> | null>(null);
  const [runError, setRunError] = useState('');
  const [running, setRunning] = useState(false);

  const t = {
    steps: isRtl
      ? ['المصدر', 'مصادر البيانات', 'الربط', 'المخرجات', 'الاستخدام']
      : ['Source', 'Data Sources', 'Mapping', 'Outputs', 'Use'],
    chooseFile: isRtl ? 'اختر ملف Excel' : 'Choose an Excel file',
    dragHint: isRtl ? 'اسحب ملف هنا أو انقر' : 'Drop a file here or click',
    uploading: isRtl ? 'جاري الرفع...' : 'Uploading...',
    existing: isRtl ? 'أو اختر ملفاً موجوداً' : 'Or pick an existing file',
    back: isRtl ? 'رجوع' : 'Back',
    next: isRtl ? 'التالي ▸' : 'Next ▸',
    addSource: isRtl ? '+ مصدر بيانات' : '+ Data source',
    addBinding: isRtl ? '+ ربط خلية' : '+ Cell binding',
    addOutput: isRtl ? '+ خلية إخراج' : '+ Output cell',
    name: isRtl ? 'الاسم' : 'Name',
    method: isRtl ? 'الطريقة' : 'Method',
    url: isRtl ? 'الرابط (يدعم {param})' : 'URL (supports {param})',
    auth: isRtl ? 'المصادقة' : 'Auth',
    test: isRtl ? 'اختبار' : 'Test',
    testing: isRtl ? '...' : '...',
    sheet: isRtl ? 'الورقة' : 'Sheet',
    cell: isRtl ? 'الخلية' : 'Cell',
    sourceType: isRtl ? 'المصدر' : 'Source',
    value: isRtl ? 'القيمة' : 'Value',
    path: isRtl ? 'مسار JSON' : 'JSON path',
    layout: isRtl ? 'التوزيع' : 'Layout',
    anchor: isRtl ? 'خلية البداية' : 'Anchor',
    cellsCsv: isRtl ? 'خلايا (بفواصل)' : 'Cells (comma-sep)',
    outName: isRtl ? 'اسم (اختياري)' : 'Name (optional)',
    save: isRtl ? 'حفظ ومتابعة ▸' : 'Save & continue ▸',
    saving: isRtl ? 'جاري الحفظ...' : 'Saving...',
    runParams: isRtl ? 'مفاتيح التشغيل' : 'Run params',
    tryIt: isRtl ? 'جرّب الآن' : 'Try it now',
    result: isRtl ? 'النتيجة' : 'Result',
    done: isRtl ? 'تم — إغلاق' : 'Done — Close',
    genKey: isRtl ? 'إنشاء مفتاح API ▸' : 'Generate an API key ▸',
    constant: isRtl ? 'قيمة ثابتة' : 'Constant',
    param: isRtl ? 'مفتاح تشغيل' : 'Run param',
    fromApi: isRtl ? 'حقل من API' : 'API field',
    fromApiArr: isRtl ? 'مصفوفة من API' : 'API array',
  };

  // Load existing v2 config when editing
  useEffect(() => {
    if (!editFileId) return;
    apiService.getFileConfig(editFileId).then((cfg: any) => {
      if (cfg && cfg.version === 2) {
        setDataSources(cfg.data_sources || []);
        setRunParams(cfg.run_params || []);
        setBindings(cfg.inputs || []);
        setOutputs(cfg.outputs || []);
      }
    }).catch(() => {});
  }, [editFileId]);

  // Load the file's real sheet names whenever the selected file changes.
  useEffect(() => {
    if (!fileId) { setSheets([]); return; }
    apiService.getSheets(fileId)
      .then(s => setSheets(s || []))
      .catch(() => setSheets([]));
  }, [fileId]);

  // Keep run params in sync with URL placeholders across all sources.
  useEffect(() => {
    const fromUrls = new Set<string>();
    dataSources.forEach(s => placeholdersOf(s.url).forEach(p => fromUrls.add(p)));
    setRunParams(prev => {
      const kept = prev.filter(p => fromUrls.has(p.name));
      const keptNames = new Set(kept.map(p => p.name));
      const added = [...fromUrls].filter(n => !keptNames.has(n))
        .map(name => ({ name, required: true }));
      return [...kept, ...added];
    });
  }, [dataSources]);

  // ── Step 1 ────────────────────────────────────────────────────────────────

  const onPickFile = async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setUploadError(isRtl ? 'ملف Excel فقط' : 'Excel files only');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const entry = await uploadFile(file);
      setFileId(entry.id);
      setStep(2);
    } catch {
      setUploadError(isRtl ? 'فشل الرفع' : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Step 2: data sources ──────────────────────────────────────────────────

  const addSource = () => setDataSources(s => [...s, {
    id: uid(), name: '', method: 'GET', url: '', auth: { type: 'none' },
  }]);

  const updateSource = (i: number, patch: Partial<DataSource>) =>
    setDataSources(s => s.map((src, idx) => idx === i ? { ...src, ...patch } : src));

  const removeSource = (i: number) =>
    setDataSources(s => s.filter((_, idx) => idx !== i));

  const testSource = async (src: DataSource) => {
    try {
      const params: Record<string, any> = {};
      placeholdersOf(src.url).forEach(p => { params[p] = testParams[p] ?? ''; });
      const res = await apiService.testDataSource(src, params);
      setSamples(prev => ({ ...prev, [src.id]: res.data }));
    } catch (e: any) {
      setSamples(prev => ({
        ...prev,
        [src.id]: { _error: e?.response?.data?.details || 'fetch failed' },
      }));
    }
  };

  // ── Step 3: bindings ──────────────────────────────────────────────────────

  const addBinding = () => setBindings(b => [...b, {
    target: { sheet: '', cell: '' },
    source: { type: 'constant', value: '' },
  }]);

  const updateBinding = (i: number, patch: Partial<InputBinding>) =>
    setBindings(b => b.map((bn, idx) => idx === i ? { ...bn, ...patch } : bn));

  const removeBinding = (i: number) =>
    setBindings(b => b.filter((_, idx) => idx !== i));

  // ── Step 4: outputs ───────────────────────────────────────────────────────

  const addOutput = () => setOutputs(o => [...o, { sheet: '', cell: '', name: '' }]);
  const updateOutput = (i: number, patch: Partial<OutputCell>) =>
    setOutputs(o => o.map((ou, idx) => idx === i ? { ...ou, ...patch } : ou));
  const removeOutput = (i: number) =>
    setOutputs(o => o.filter((_, idx) => idx !== i));

  const buildConfig = (): FileConfigV2 => ({
    version: 2,
    run_params: runParams,
    data_sources: dataSources.map(s => ({
      ...s,
      url: s.url.trim(),
    })),
    inputs: bindings
      .filter(b => b.target.cell.trim())
      .map(b => ({
        target: {
          sheet: b.target.sheet?.trim() || null,
          cell: b.target.cell.trim().toUpperCase(),
        },
        source: b.source,
      })),
    outputs: outputs
      .filter(o => o.cell.trim())
      .map(o => ({
        sheet: o.sheet?.trim() || null,
        cell: o.cell.trim().toUpperCase(),
        name: o.name?.trim() || undefined,
      })),
  });

  const saveConfig = async () => {
    if (!fileId) return;
    setSaving(true);
    setSaveError('');
    try {
      await apiService.saveFileConfig(fileId, buildConfig());
      setStep(5);
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || (isRtl ? 'فشل الحفظ' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  // ── Step 5: try it ────────────────────────────────────────────────────────

  const tryRun = async () => {
    if (!fileId) return;
    setRunning(true);
    setRunError('');
    setRunResult(null);
    try {
      const params: Record<string, any> = {};
      runParams.forEach(p => { params[p.name] = testParams[p.name] ?? ''; });
      const res = await apiService.runFile(fileId, {}, params);
      setRunResult(res.outputs as any);
    } catch (e: any) {
      setRunError(e?.response?.data?.details || e?.response?.data?.error
        || (isRtl ? 'فشل التشغيل' : 'Run failed'));
    } finally {
      setRunning(false);
    }
  };

  const generateKey = async () => {
    try {
      const r = await apiService.createApiKey(isRtl ? 'مفتاح الإنتاج' : 'Production key');
      setApiKeyPrefix(r.api_key?.key_prefix || r.api_key?.key?.slice(0, 12) || null);
    } catch {
      onNavigateToKeys?.();
    }
  };

  const curlSnippet = useMemo(() => {
    const base = window.location.origin;
    const params: Record<string, any> = {};
    runParams.forEach(p => { params[p.name] = testParams[p.name] || `<${p.name}>`; });
    return `curl -X POST "${base}/api/v1/files/${fileId}/run" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeyPrefix || 'ek_live_YOUR_KEY'}" \\
  -d '${JSON.stringify({ params })}'`;
  }, [fileId, runParams, testParams, apiKeyPrefix]);

  // ── render helpers ────────────────────────────────────────────────────────

  const StepBar = () => (
    <div className="flex items-center gap-2 mb-8 flex-wrap" dir={isRtl ? 'rtl' : 'ltr'}>
      {t.steps.map((label, idx) => {
        const n = (idx + 1) as Step;
        const active = n === step, done = n < step;
        return (
          <React.Fragment key={label}>
            <button
              onClick={() => done && setStep(n)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition
                ${active ? 'bg-primary-600 text-white'
                  : done ? 'bg-primary-50 text-primary-600'
                    : 'bg-slate-100 text-slate-400'}`}>
              {done ? <Check className="inline w-3.5 h-3.5 me-1" /> : `${n} `}{label}
            </button>
            {idx < t.steps.length - 1 && <span className="text-slate-300">—</span>}
          </React.Fragment>
        );
      })}
    </div>
  );

  const input = "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200";
  const label = "block text-xs font-bold text-slate-500 mb-1";

  return (
    <div className="max-w-4xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <StepBar />

      {/* ── Step 1: Source ── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{t.chooseFile}</h2>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0]; if (f) onPickFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition
              ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">{uploading ? t.uploading : t.dragHint}</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onPickFile(f); }} />
          </div>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          {files.length > 0 && (
            <div>
              <p className={label}>{t.existing}</p>
              <div className="flex flex-wrap gap-2">
                {files.map(f => (
                  <button key={f.id}
                    onClick={() => { setFileId(f.id); setStep(2); }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm hover:border-primary-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />{f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Data sources ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-600" />{t.steps[1]}
            </h2>
            <button onClick={addSource} className="text-sm text-primary-600 font-bold">{t.addSource}</button>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl ? 'اختياري — لو كل القيم يدوية أو ثوابت تجاوز الخطوة دي.'
              : 'Optional — skip if every cell is a constant or manual.'}
          </p>

          {dataSources.map((src, i) => (
            <div key={src.id} className="border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex gap-2">
                <input className={input} placeholder={t.name} value={src.name}
                  onChange={e => updateSource(i, { name: e.target.value })} />
                <select className={`${input} w-28`} value={src.method}
                  onChange={e => updateSource(i, { method: e.target.value })}>
                  {['GET', 'POST', 'PUT', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                </select>
                <button onClick={() => removeSource(i)}
                  className="px-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input className={input} placeholder="https://api.example.com/items/{id}"
                value={src.url} onChange={e => updateSource(i, { url: e.target.value })} />

              <div className="flex gap-2">
                <select className={`${input} w-40`} value={src.auth.type}
                  onChange={e => updateSource(i, { auth: { type: e.target.value as AuthType } })}>
                  {AUTH_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {src.auth.type === 'bearer' && (
                  <input className={input} placeholder="token" value={src.auth.token || ''}
                    onChange={e => updateSource(i, { auth: { ...src.auth, token: e.target.value } })} />
                )}
                {src.auth.type === 'api_key_header' && (<>
                  <input className={input} placeholder="Header name (X-API-Key)"
                    value={src.auth.header_name || ''}
                    onChange={e => updateSource(i, { auth: { ...src.auth, header_name: e.target.value } })} />
                  <input className={input} placeholder="value" value={src.auth.value || ''}
                    onChange={e => updateSource(i, { auth: { ...src.auth, value: e.target.value } })} />
                </>)}
                {src.auth.type === 'query_param' && (<>
                  <input className={input} placeholder="param name (api_key)"
                    value={src.auth.param_name || ''}
                    onChange={e => updateSource(i, { auth: { ...src.auth, param_name: e.target.value } })} />
                  <input className={input} placeholder="value" value={src.auth.value || ''}
                    onChange={e => updateSource(i, { auth: { ...src.auth, value: e.target.value } })} />
                </>)}
                {src.auth.type === 'basic' && (<>
                  <input className={input} placeholder="username" value={src.auth.username || ''}
                    onChange={e => updateSource(i, { auth: { ...src.auth, username: e.target.value } })} />
                  <input className={input} placeholder="password" type="password"
                    value={src.auth.password || ''}
                    onChange={e => updateSource(i, { auth: { ...src.auth, password: e.target.value } })} />
                </>)}
              </div>

              {placeholdersOf(src.url).length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs text-slate-400">{t.runParams}:</span>
                  {placeholdersOf(src.url).map(p => (
                    <input key={p} className={`${input} w-40`} placeholder={`${p} (test value)`}
                      value={testParams[p] || ''}
                      onChange={e => setTestParams(tp => ({ ...tp, [p]: e.target.value }))} />
                  ))}
                </div>
              )}

              <button onClick={() => testSource(src)}
                className="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold">
                {t.test}
              </button>
              {samples[src.id] && (
                <pre className="text-[11px] bg-slate-900 text-slate-100 rounded-xl p-3 overflow-auto max-h-56" dir="ltr">
                  {JSON.stringify(samples[src.id], null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 3: Bindings ── */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary-600" />{t.steps[2]}
            </h2>
            <button onClick={addBinding} className="text-sm text-primary-600 font-bold">{t.addBinding}</button>
          </div>

          {bindings.map((b, i) => {
            const st = b.source.type;
            return (
              <div key={i} className="border border-slate-200 rounded-2xl p-3 grid grid-cols-12 gap-2 items-start">
                <select className={`${input} col-span-2`}
                  value={b.target.sheet || ''}
                  onChange={e => updateBinding(i, { target: { ...b.target, sheet: e.target.value } })}>
                  <option value="">{isRtl ? '(افتراضي)' : '(default)'}</option>
                  {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className={`${input} col-span-2`} placeholder="A1"
                  value={b.target.cell}
                  onChange={e => updateBinding(i, { target: { ...b.target, cell: e.target.value } })} />
                <select className={`${input} col-span-3`} value={st}
                  onChange={e => {
                    const v = e.target.value;
                    const next =
                      v === 'constant' ? { type: 'constant', value: '' }
                        : v === 'param' ? { type: 'param', name: runParams[0]?.name || '' }
                          : v === 'jsonpath' ? { type: 'jsonpath', source: dataSources[0]?.id || '', path: '' }
                            : { type: 'jsonpath_array', source: dataSources[0]?.id || '', path: '', layout: { mode: 'down', anchor: b.target.cell || 'A1' } };
                    updateBinding(i, { source: next as any });
                  }}>
                  <option value="constant">{t.constant}</option>
                  <option value="param">{t.param}</option>
                  <option value="jsonpath">{t.fromApi}</option>
                  <option value="jsonpath_array">{t.fromApiArr}</option>
                </select>

                <div className="col-span-4 flex gap-2">
                  {st === 'constant' && (
                    <input className={input} placeholder={t.value}
                      value={(b.source as any).value ?? ''}
                      onChange={e => updateBinding(i, { source: { type: 'constant', value: e.target.value } })} />
                  )}
                  {st === 'param' && (
                    <select className={input} value={(b.source as any).name}
                      onChange={e => updateBinding(i, { source: { type: 'param', name: e.target.value } })}>
                      {runParams.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  )}
                  {(st === 'jsonpath' || st === 'jsonpath_array') && (
                    <select className={`${input} w-32`} value={(b.source as any).source}
                      onChange={e => updateBinding(i, { source: { ...(b.source as any), source: e.target.value } })}>
                      {dataSources.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                    </select>
                  )}
                  {(st === 'jsonpath' || st === 'jsonpath_array') && (
                    <input className={input} placeholder="items[0].f07 / items[*].n01"
                      value={(b.source as any).path}
                      onChange={e => updateBinding(i, { source: { ...(b.source as any), path: e.target.value } })} />
                  )}
                </div>

                {st === 'jsonpath_array' && (
                  <div className="col-span-11 flex gap-2 items-center">
                    <span className="text-xs text-slate-400">{t.layout}:</span>
                    <select className={`${input} w-28`}
                      value={(b.source as any).layout?.mode || 'down'}
                      onChange={e => {
                        const mode = e.target.value;
                        const layout = mode === 'explicit'
                          ? { mode, cells: [] } : { mode, anchor: b.target.cell || 'A1' };
                        updateBinding(i, { source: { ...(b.source as any), layout } });
                      }}>
                      <option value="down">down</option>
                      <option value="right">right</option>
                      <option value="explicit">explicit</option>
                    </select>
                    {(b.source as any).layout?.mode === 'explicit' ? (
                      <input className={input} placeholder={t.cellsCsv}
                        value={((b.source as any).layout?.cells || []).join(', ')}
                        onChange={e => updateBinding(i, {
                          source: {
                            ...(b.source as any),
                            layout: { mode: 'explicit', cells: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) },
                          },
                        })} />
                    ) : (
                      <input className={`${input} w-28`} placeholder={t.anchor}
                        value={(b.source as any).layout?.anchor || ''}
                        onChange={e => updateBinding(i, {
                          source: { ...(b.source as any), layout: { mode: (b.source as any).layout.mode, anchor: e.target.value.toUpperCase() } },
                        })} />
                    )}
                  </div>
                )}
                <button onClick={() => removeBinding(i)}
                  className="col-span-1 text-red-500 hover:bg-red-50 rounded-lg flex justify-center pt-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {Object.keys(samples).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500">
                {isRtl ? 'عرض عينات الاستجابة (لنسخ المسارات)' : 'Show sampled responses (to copy paths)'}
              </summary>
              {Object.entries(samples).map(([sid, data]) => (
                <pre key={sid} className="bg-slate-900 text-slate-100 rounded-xl p-3 overflow-auto max-h-56 mt-2" dir="ltr">
                  {sid}: {JSON.stringify(data, null, 2)}
                </pre>
              ))}
            </details>
          )}
        </div>
      )}

      {/* ── Step 4: Outputs ── */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.steps[3]}</h2>
            <button onClick={addOutput} className="text-sm text-primary-600 font-bold">{t.addOutput}</button>
          </div>
          {outputs.map((o, i) => (
            <div key={i} className="flex gap-2">
              <select className={`${input} w-40`} value={o.sheet || ''}
                onChange={e => updateOutput(i, { sheet: e.target.value })}>
                <option value="">{isRtl ? '(افتراضي)' : '(default)'}</option>
                {sheets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className={`${input} w-28`} placeholder="C1" value={o.cell}
                onChange={e => updateOutput(i, { cell: e.target.value })} />
              <input className={input} placeholder={t.outName} value={o.name || ''}
                onChange={e => updateOutput(i, { name: e.target.value })} />
              <button onClick={() => removeOutput(i)}
                className="px-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        </div>
      )}

      {/* ── Step 5: Use ── */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{t.steps[4]}</h2>
          {!apiKeyPrefix && (
            <button onClick={generateKey}
              className="text-sm px-4 py-2 rounded-xl bg-primary-600 text-white font-bold">
              {t.genKey}
            </button>
          )}
          <pre className="text-[11px] bg-slate-900 text-slate-100 rounded-xl p-4 overflow-auto" dir="ltr">
            {curlSnippet}
          </pre>

          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="font-bold text-sm">{t.tryIt}</p>
            {runParams.map(p => (
              <div key={p.name}>
                <label className={label}>{p.name}</label>
                <input className={input} value={testParams[p.name] || ''}
                  onChange={e => setTestParams(tp => ({ ...tp, [p.name]: e.target.value }))} />
              </div>
            ))}
            <button onClick={tryRun} disabled={running}
              className="text-sm px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1.5">
              <Play className="w-4 h-4" />{running ? '...' : t.tryIt}
            </button>
            {runError && <p className="text-sm text-red-600">{runError}</p>}
            {runResult && (
              <pre className="text-xs bg-emerald-50 text-emerald-900 rounded-xl p-3 overflow-auto" dir="ltr">
                {JSON.stringify(runResult, null, 2)}
              </pre>
            )}
          </div>

          <button onClick={() => onComplete?.()}
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 font-bold">
            {t.done}
          </button>
        </div>
      )}

      {/* ── Nav ── */}
      {step > 1 && step < 5 && (
        <div className="flex justify-between mt-8">
          <button onClick={() => setStep((step - 1) as Step)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />{t.back}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep((step + 1) as Step)}
              className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold flex items-center gap-1.5">
              {t.next}<ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={saveConfig} disabled={saving || !fileId}
              className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold flex items-center gap-1.5">
              {saving ? t.saving : t.save}<Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
