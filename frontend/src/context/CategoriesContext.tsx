import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface CategoriesContextType {
  categories: Category[];
  createCategory: (name: string, color: string) => Promise<Category>;
  updateCategory: (id: string, name: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | null>(null);

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);

  const refresh = useCallback(async () => {
    const list = await apiService.listCategories();
    setCategories(list);
  }, []);

  const createCategory = useCallback(async (name: string, color: string): Promise<Category> => {
    const cat = await apiService.createCategory(name, color);
    setCategories(prev => [...prev, cat]);
    return cat;
  }, []);

  const updateCategory = useCallback(async (id: string, name: string, color: string) => {
    const updated = await apiService.updateCategory(id, name, color);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await apiService.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CategoriesContext.Provider value={{ categories, createCategory, updateCategory, deleteCategory, refresh }}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used inside CategoriesProvider');
  return ctx;
};