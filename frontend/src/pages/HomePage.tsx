import React, { useState, lazy } from 'react';
import { Layout } from '../components/Layout';
import { FilesProvider } from '../context/FilesContext';
import { CategoriesProvider } from '../context/CategoriesContext';
import { ResultsProvider } from '../context/ResultsContext';

const ReadPage = lazy(() => import('./ReadPage').then(m => ({ default: m.ReadPage })));
const WritePage = lazy(() => import('./WritePage').then(m => ({ default: m.WritePage })));
const BatchWritePage = lazy(() => import('./BatchWritePage').then(m => ({ default: m.BatchWritePage })));
const ExportPdfPage = lazy(() => import('./ExportPdfPage').then(m => ({ default: m.ExportPdfPage })));
const BatchExecutePage = lazy(() => import('./BatchExecutePage').then(m => ({ default: m.BatchExecutePage })));
const FilesPage = lazy(() => import('./FilesPage').then(m => ({ default: m.FilesPage })));
const MergePdfPage = lazy(() => import('./MergePdfPage').then(m => ({ default: m.MergePdfPage })));
const InsertImagePage = lazy(() => import('./InsertImagePage').then(m => ({ default: m.InsertImagePage })));
const TemplatesPage = lazy(() => import('./TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const JobsPage = lazy(() => import('./JobsPage').then(m => ({ default: m.JobsPage })));
const VerifyTokensPage = lazy(() => import('./VerifyTokensPage').then(m => ({ default: m.VerifyTokensPage })));
const PlansPage = lazy(() => import('./PlansPage').then(m => ({ default: m.PlansPage })));
const ResultsPage = lazy(() => import('./ResultsPage').then(m => ({ default: m.ResultsPage })));
const DashboardPage = lazy(() => import('./DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import('./ProfilePage').then(m => ({ default: m.ProfilePage })));

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
