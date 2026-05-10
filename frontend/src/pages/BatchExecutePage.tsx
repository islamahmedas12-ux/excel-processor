import React, { useCallback, useState } from 'react';
import { Play, FileSpreadsheet, Loader } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';

interface BatchExecutePageProps {
  lang: 'ar' | 'en';
}

interface BatchJob {
  id: string;
  filename: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: any;
  error?: string;
}

export const BatchExecutePage: React.FC<BatchExecutePageProps> = ({ lang }) => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(false);

  const content = {
    ar: {
      title: 'تنفيذ دفعي',
      description: 'نفذ عدة ملفات Excel دفعة واحدة',
      selectFiles: 'اختر ملفات Excel',
      dropzone: 'اسحب ملفات Excel هنا أو انقر للاختيار',
      execute: 'تنفيذ الكل',
      executing: 'جاري التنفيذ...',
      pending: 'في الانتظار',
      running: 'قيد التنفيذ',
      done: 'تم',
      error: 'خطأ',
      noJobs: 'لم تتم إضافة أي ملفات بعد',
    },
    en: {
      title: 'Batch Execute',
      description: 'Execute multiple Excel files at once',
      selectFiles: 'Select Excel Files',
      dropzone: 'Drop Excel files here or click to browse',
      execute: 'Execute All',
      executing: 'Executing...',
      pending: 'Pending',
      running: 'Running',
      done: 'Done',
      error: 'Error',
      noJobs: 'No files added yet',
    },
  };

  const t = content[lang];

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newJobs: BatchJob[] = files.map((file, idx) => ({
      id: `job-${Date.now()}-${idx}`,
      filename: file.name,
      status: 'pending' as const,
    }));
    setJobs(prev => [...prev, ...newJobs]);
  };

  const handleExecute = useCallback(async () => {
    if (jobs.length === 0) return;

    setLoading(true);

    // Chunk size for parallel execution (limit concurrency)
    const CHUNK_SIZE = 5;

    // Helper to update a single job's status
    const updateJobStatus = (jobId: string, status: BatchJob['status'], result?: any, error?: string) => {
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? { ...job, status, result, error }
          : job
      ));
    };

    // Helper to execute a single job
    const executeJob = async (job: BatchJob): Promise<void> => {
      updateJobStatus(job.id, 'running');
      try {
        // Simulate processing - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 500));
        updateJobStatus(job.id, 'done', { success: true });
      } catch (err: any) {
        updateJobStatus(job.id, 'error', undefined, err.message);
      }
    };

    // Process jobs in chunks using Promise.all for parallel execution
    for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
      const chunk = jobs.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(job => executeJob(job)));
    }

    setLoading(false);
  }, [jobs]);

  const handleClear = () => {
    setJobs([]);
  };

  const getStatusBadge = (status: BatchJob['status']) => {
    const variants: Record<BatchJob['status'], 'default' | 'success' | 'warning' | 'error'> = {
      pending: 'default',
      running: 'warning',
      done: 'success',
      error: 'error',
    };
    return <Badge variant={variants[status]}>{t[status]}</Badge>;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card title={t.title} icon={<Play className="w-5 h-5" />}>
        <p className="text-gray-600 mb-6">{t.description}</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.selectFiles}
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={handleFilesChange}
              className="hidden"
              id="batch-file-input"
            />
            <label htmlFor="batch-file-input" className="cursor-pointer">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-600 text-sm">{t.dropzone}</p>
            </label>
          </div>
        </div>

        {jobs.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 mb-3">
              <Button
                onClick={handleExecute}
                loading={loading}
                disabled={jobs.length === 0}
                icon={<Play className="w-4 h-4" />}
              >
                {loading ? t.executing : t.execute}
              </Button>
              <Button variant="secondary" onClick={handleClear}>
                {lang === 'ar' ? 'مسح' : 'Clear'}
              </Button>
            </div>

            <div className="space-y-2">
              {jobs.map((job, idx) => (
                <div key={job.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-500">{idx + 1}.</span>
                    <span className="text-sm font-medium">{job.filename}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'running' && <Loader className="w-4 h-4 animate-spin text-primary-500" />}
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && !loading && (
          <p className="text-center text-gray-500 text-sm py-8">{t.noJobs}</p>
        )}
      </Card>
    </div>
  );
};