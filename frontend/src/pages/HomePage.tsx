import React, { useState } from 'react';
import { FileSpreadsheet, Edit3, Eye, Settings, Globe } from 'lucide-react';
import { Card, Tabs } from '../components/ui';
import { ReadPage } from './ReadPage';
import { WritePage } from './WritePage';
import { BatchWritePage } from './BatchWritePage';

interface HomePageProps {
  lang: 'ar' | 'en';
  onLangChange: (lang: 'ar' | 'en') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ lang, onLangChange }) => {
  const [activeTab, setActiveTab] = useState('read');

  const content = {
    ar: {
      title: 'معالج ملفات Excel',
      subtitle: 'واجهة رسومية لقراءة وتعديل ملفات Excel',
      tabs: [
        { id: 'read', label: 'قراءة البيانات', icon: Eye },
        { id: 'write', label: 'تعديل خلية', icon: Edit3 },
        { id: 'batch', label: 'تعديل متعدد', icon: Settings },
      ],
    },
    en: {
      title: 'Excel Processor',
      subtitle: 'GUI for reading and editing Excel files',
      tabs: [
        { id: 'read', label: 'Read Data', icon: Eye },
        { id: 'write', label: 'Edit Cell', icon: Edit3 },
        { id: 'batch', label: 'Batch Edit', icon: Settings },
      ],
    },
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-sm text-gray-500">{t.subtitle}</p>
              </div>
            </div>

            <button
              onClick={() => onLangChange(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <Tabs
            tabs={t.tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </Card>

        <div className="space-y-6">
          {activeTab === 'read' && <ReadPage lang={lang} />}
          {activeTab === 'write' && <WritePage lang={lang} />}
          {activeTab === 'batch' && <BatchWritePage lang={lang} />}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            {lang === 'ar' ? 'نظام معالجة ملفات Excel - API v1.0.0' : 'Excel Processor System - API v1.0.0'}
          </p>
        </div>
      </footer>
    </div>
  );
};
