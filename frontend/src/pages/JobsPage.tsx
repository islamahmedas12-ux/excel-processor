import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BriefcaseIcon, CheckCircle, Clock, Download, Loader,
  RefreshCw, Trash2, XCircle,
} from 'lucide-react';
import { Card, Alert, Button } from '../components/ui';
import { apiService, type Job, type JobStatus } from '../services/api';

interface JobsPageProps { lang: 'ar' | 'en'; }

const T = {
  ar: {
    title: 'المهام غير المتزامنة',
    desc: 'تابع تقدم عمليات التصدير والمعالجة الطويلة',
    empty: 'لا توجد مهام حتى الآن. شغّل عملية PDF غير متزامنة لترى النتائج هنا.',
    refresh: 'تحديث',
    download: 'تحميل',
    delete: 'حذف',
    status: { pending: 'في الانتظار', running: 'قيد التشغيل', done: 'مكتملة', failed: 'فشلت' },
    type: { pdf_export: 'تصدير PDF' },
    ago: (s: number) => s < 60 ? `منذ ${s} ث` : s < 3600 ? `منذ ${Math.floor(s / 60)} د` : `منذ ${Math.floor(s / 3600)} س`,
    autoRefresh: 'تحديث تلقائي',
  },
  en: {
    title: 'Async Jobs',
    desc: 'Track progress of long-running export and processing operations',
    empty: 'No jobs yet. Submit an async PDF export to see results here.',
    refresh: 'Refresh',
    download: 'Download',
    delete: 'Delete',
    status: { pending: 'Pending', running: 'Running', done: 'Done', failed: 'Failed' },
    type: { pdf_export: 'PDF Export' },
    ago: (s: number) => s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`,
    autoRefresh: 'Auto-refresh',
  },
} as const;

function statusBadge(status: JobStatus, labels: Record<JobStatus, string>) {
  const cfg: Record<JobStatus, { cls: string; icon: React.ReactNode }> = {
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
    running: { cls: 'bg-blue-50 text-blue-700 border-blue-200',   icon: <Loader className="w-3 h-3 animate-spin" /> },
    done:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
    failed:  { cls: 'bg-red-50 text-red-700 border-red-200',       icon: <XCircle className="w-3 h-3" /> },
  };
  const { cls, icon } = cfg[status] ?? cfg.failed;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {icon} {labels[status]}
    </span>
  );
}

function relativeTime(iso: string, ago: (s: number) => string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  return ago(Math.max(0, diff));
}

export const JobsPage: React.FC<JobsPageProps> = ({ lang }) => {
  const t = T[lang];
  const isRtl = lang === 'ar';

  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiService.listJobs();
      setJobs(data);
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Auto-refresh every 3 s when there are active jobs
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'running');
    if (hasActive) {
      intervalRef.current = setInterval(() => fetchJobs(true), 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobs, fetchJobs]);

  const handleDownload = async (job: Job) => {
    setDownloadingId(job.id);
    try {
      const blob = await apiService.downloadJob(job.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const base = job.params?.filename ?? 'result';
      a.href     = url;
      a.download = base.replace(/\.(xlsx|xls)$/i, '') + (job.result_ext ?? '.pdf');
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    setDeletingId(jobId);
    try {
      await apiService.deleteJob(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = jobs.filter(j => j.status === 'pending' || j.status === 'running').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <Card
        title={t.title}
        icon={<BriefcaseIcon className="w-5 h-5" />}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{t.desc}</p>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                {t.autoRefresh}
              </span>
            )}
            <Button
              variant="secondary"
              onClick={() => fetchJobs()}
              loading={loading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              {t.refresh}
            </Button>
          </div>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader className="w-5 h-5 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <BriefcaseIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 -mx-6">
            {jobs.map(job => (
              <div key={job.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">

                {/* Status + type */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {statusBadge(job.status, t.status)}
                    <span className="text-xs text-gray-400 font-mono">
                      {(t.type as any)[job.job_type] ?? job.job_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {job.params?.filename ?? job.id}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {relativeTime(job.created_at, t.ago)}
                  </p>
                  {job.status === 'failed' && job.error && (
                    <p className="text-xs text-red-500 mt-1 truncate">{job.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {job.status === 'done' && (
                    <button
                      onClick={() => handleDownload(job)}
                      disabled={downloadingId === job.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      title={t.download}
                    >
                      {downloadingId === job.id
                        ? <Loader className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id || job.status === 'running'}
                    className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                    title={t.delete}
                  >
                    {deletingId === job.id
                      ? <Loader className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};