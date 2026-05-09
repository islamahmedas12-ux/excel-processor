import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';

export interface ResultEntry {
  id: string;
  kind: 'xlsx' | 'pdf';
  source_file_id: string;
  source_file_name: string;
  filename: string;
  size: number;
  created_at: string;
}

interface ResultsContextType {
  results: ResultEntry[];
  refresh: () => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
  downloadResult: (id: string, filename: string) => Promise<void>;
  exportResultToPdf: (resultId: string, sheets?: string[]) => Promise<ResultEntry>;
}

const ResultsContext = createContext<ResultsContextType | null>(null);

export const ResultsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [results, setResults] = useState<ResultEntry[]>([]);

  const refresh = useCallback(async () => {
    const list = await apiService.listResults();
    setResults(list);
  }, []);

  const deleteResult = useCallback(async (id: string) => {
    await apiService.deleteResult(id);
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);

  const downloadResult = useCallback(async (id: string, filename: string) => {
    const blob = await apiService.downloadResult(id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, []);

  const exportResultToPdf = useCallback(async (resultId: string, sheets?: string[]): Promise<ResultEntry> => {
    const entry = await apiService.exportResultToPdf(resultId, sheets);
    setResults(prev => [...prev, entry]);
    return entry;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <ResultsContext.Provider value={{ results, refresh, deleteResult, downloadResult, exportResultToPdf }}>
      {children}
    </ResultsContext.Provider>
  );
};

export const useResults = () => {
  const ctx = useContext(ResultsContext);
  if (!ctx) throw new Error('useResults must be used inside ResultsProvider');
  return ctx;
};