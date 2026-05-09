import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';

export interface ResultEntry {
  id: string;
  filename: string;
  kind: 'xlsx' | 'pdf';
  size: number;
  size_bytes?: number;
  created_at: string;
}

interface ResultsContextValue {
  results: ResultEntry[];
  refresh: () => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
  downloadResult: (id: string, filename?: string) => Promise<void>;
  loading: boolean;
}

const ResultsContext = createContext<ResultsContextValue | null>(null);

export const ResultsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.listResults();
      setResults(list as ResultEntry[]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const deleteResult = useCallback(async (id: string) => {
    await apiService.deleteResult(id);
    await refresh();
  }, [refresh]);

  const downloadResult = useCallback(async (id: string, filename?: string) => {
    const blob = await apiService.downloadResult(id);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename || `result-${id}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <ResultsContext.Provider value={{ results, refresh, deleteResult, downloadResult, loading }}>
      {children}
    </ResultsContext.Provider>
  );
};

export const useResults = (): ResultsContextValue => {
  const ctx = useContext(ResultsContext);
  if (!ctx) throw new Error('useResults must be used inside <ResultsProvider>');
  return ctx;
};
