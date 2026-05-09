import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { FilesProvider } from '../context/FilesContext';
import { CategoriesProvider } from '../context/CategoriesContext';
import { ResultsProvider } from '../context/ResultsContext';
import { ReadPage } from './ReadPage';
import { WritePage } from './WritePage';
import { BatchWritePage } from './BatchWritePage';
import { ExportPdfPage } from './ExportPdfPage';
import { BatchExecutePage } from './BatchExecutePage';
import { FilesPage } from './FilesPage';
import { MergePdfPage } from './MergePdfPage';
import { InsertImagePage } from './InsertImagePage';
import { TemplatesPage } from './TemplatesPage';
import { JobsPage } from './JobsPage';
import { VerifyTokensPage } from './VerifyTokensPage';
import { PlansPage } from './PlansPage';
import { ResultsPage } from './ResultsPage';
import { DashboardPage } from './DashboardPage';
import { ProfilePage } from './ProfilePage';

interface HomePageProps {
  lang: 'ar' | 'en';
  onLangChange: (lang: 'ar' | 'en') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ lang, onLangChange }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <FilesProvider>
      <CategoriesProvider>
        <ResultsProvider>
          <Layout
            lang={lang}
            onLangChange={onLangChange}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {activeTab === 'dashboard' && <DashboardPage lang={lang} onTabChange={setActiveTab} />}
            {activeTab === 'files'   && <FilesPage lang={lang} />}
            {activeTab === 'results' && <ResultsPage lang={lang} />}
            {activeTab === 'read'    && <ReadPage lang={lang} />}
            {activeTab === 'write'   && <WritePage lang={lang} />}
            {activeTab === 'batch'   && <BatchWritePage lang={lang} />}
            {activeTab === 'pdf'     && <ExportPdfPage lang={lang} onTabChange={setActiveTab} />}
            {activeTab === 'execute' && <BatchExecutePage lang={lang} />}
            {activeTab === 'merge'   && <MergePdfPage lang={lang} />}
            {activeTab === 'insert'    && <InsertImagePage lang={lang} />}
            {activeTab === 'templates' && <TemplatesPage lang={lang} onTabChange={setActiveTab} />}
            {activeTab === 'jobs'    && <JobsPage lang={lang} />}
            {activeTab === 'verify'  && <VerifyTokensPage lang={lang} />}
            {activeTab === 'plans'   && <PlansPage lang={lang} />}
            {activeTab === 'profile' && <ProfilePage lang={lang} />}
          </Layout>
        </ResultsProvider>
      </CategoriesProvider>
    </FilesProvider>
  );
};
