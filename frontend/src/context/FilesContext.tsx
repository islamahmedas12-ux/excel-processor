import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';

export interface FileEntry {
  id: string;
  name: string;
  size: number;
  uploaded_at: string;
  category_id: string | null;
}

interface FilesContextType {
  files: FileEntry[];
  selectedFile: FileEntry | null;
  setSelectedFile: (file: FileEntry | null) => void;
  refreshFiles: () => Promise<void>;
  uploadFile: (file: File, categoryId?: string | null) => Promise<FileEntry>;
  deleteFile: (id: string) => Promise<void>;
  assignCategory: (fileId: string, categoryId: string | null) => Promise<void>;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const FilesContext = createContext<FilesContextType | null>(null);

export const FilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshFiles = useCallback(async () => {
    const list = await apiService.listFiles();
    setFiles(list);
  }, []);

  const uploadFile = useCallback(async (file: File, categoryId?: string | null): Promise<FileEntry> => {
    const entry = await apiService.uploadFile(file, categoryId);
    setFiles(prev => [...prev, entry]);
    return entry;
  }, []);

  const assignCategory = useCallback(async (fileId: string, categoryId: string | null) => {
    await apiService.assignFileCategory(fileId, categoryId);
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, category_id: categoryId } : f));
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    await apiService.deleteFile(id);
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedFile(prev => (prev?.id === id ? null : prev));
  }, []);

  useEffect(() => {
    setLoading(true);
    refreshFiles().finally(() => setLoading(false));
  }, [refreshFiles]);

  return (
    <FilesContext.Provider value={{ files, selectedFile, setSelectedFile, refreshFiles, uploadFile, deleteFile, assignCategory, loading, searchQuery, setSearchQuery }}>
      {children}
    </FilesContext.Provider>
  );
};

export const useFiles = () => {
  const ctx = useContext(FilesContext);
  if (!ctx) throw new Error('useFiles must be used inside FilesProvider');
  return ctx;
};