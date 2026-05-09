import React, { createContext, useContext } from 'react';

const CategoriesContext = createContext<unknown>(null);

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CategoriesContext.Provider value={null}>{children}</CategoriesContext.Provider>
);

export const useCategories = () => useContext(CategoriesContext);
