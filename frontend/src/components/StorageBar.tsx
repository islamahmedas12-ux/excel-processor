import React, { useEffect, useState } from 'react';
import { HardDrive, TrendingUp } from 'lucide-react';

function fmt(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return (bytes / 1024 ** 3).toFixed(2) + ' GB';
}

interface Props {
  lang: 'ar' | 'en';
  onUpgradePlan?: () => void;
}

export const StorageBar: React.FC<Props> = ({ lang, onUpgradePlan }) => {
  const [data, setData] = useState<any>(null);
  const isRtl = lang === 'ar';

  useEffect(() => {
    fetch('/api/v1/storage/usage', {
      headers: { Authorization: `Bearer ${localStorage.getItem('excel_processor_token') ?? ''}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const pctFiles   = Math.min((data.file_count / data.max_files) * 100, 100);
  const pctStorage = Math.min((data.used_bytes  / data.max_bytes)  * 100, 100);
  const isNearLimit = pctFiles >= 80 || pctStorage >= 80;
  const planLabel   = isRtl ? (data.plan?.label_ar ?? data.plan?.label) : data.plan?.label;

  return (
    <div className="mx-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">

      {/* Plan badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">{planLabel}</span>
        </div>
        {isNearLimit && onUpgradePlan && (
          <button
            onClick={onUpgradePlan}
            className="flex items-center gap-0.5 text-[10px] font-bold text-primary-600 hover:text-primary-700"
          >
            <TrendingUp className="w-3 h-3" />
            {isRtl ? 'ترقية' : 'Upgrade'}
          </button>
        )}
      </div>

      {/* Files counter */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>{isRtl ? 'الملفات' : 'Files'}</span>
          <span>{Math.round(pctFiles)}% ({data.file_count}/{data.max_files})</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pctFiles >= 90 ? 'bg-red-500' : pctFiles >= 70 ? 'bg-amber-400' : 'bg-primary-500'}`}
            style={{ width: `${pctFiles}%` }}
          />
        </div>
        <div className={`text-[10px] mt-0.5 ${pctFiles >= 90 ? 'text-red-500' : pctFiles >= 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
          {pctFiles >= 90
            ? (isRtl ? 'اقترب الامتلاء' : 'Nearly full')
            : pctFiles >= 70
              ? (isRtl ? 'المساحة تنخفض' : 'Running low')
              : (isRtl ? 'الملفات كافية' : 'Files OK')}
        </div>
      </div>

      {/* Storage bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>{isRtl ? 'المساحة' : 'Storage'}</span>
          <span>{Math.round(pctStorage)}% ({fmt(data.used_bytes)}/{fmt(data.max_bytes)})</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pctStorage >= 90 ? 'bg-red-500' : pctStorage >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
            style={{ width: `${pctStorage}%` }}
          />
        </div>
        <div className={`text-[10px] mt-0.5 ${pctStorage >= 90 ? 'text-red-500' : pctStorage >= 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
          {pctStorage >= 90
            ? (isRtl ? 'اقترب الامتلاء' : 'Nearly full')
            : pctStorage >= 70
              ? (isRtl ? 'المساحة تنخفض' : 'Running low')
              : (isRtl ? 'المساحة كافية' : 'Storage OK')}
        </div>
      </div>
    </div>
  );
};