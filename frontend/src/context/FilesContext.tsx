import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';

export interface FileEntry {
  id: string;
  filename: string;
  name: string;
  size_bytes?: number;
  uploaded_at?: string;
  category_id?: string | null;
}

interface FilesContextValue {
  files: FileEntry[];
  selectedFile: FileEntry | null;
  setSelectedFile: (f: FileEntry | null) => void;
  refresh: () => Promise<void>;
  loading: boolean;
}

const FilesContext = createContext<FilesContextValue | null>(null);

export const FilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.listFiles();
      setFiles(list);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <FilesContext.Provider value={{ files, selectedFile, setSelectedFile, refresh, loading }}>
      {children}
    </FilesContext.Provider>
  );
};

export const useFiles = (): FilesContextValue => {
  const ctx = useContext(FilesContext);
  if (!ctx) throw new Error('useFiles must be used inside <FilesProvider>');
  return ctx;
};
