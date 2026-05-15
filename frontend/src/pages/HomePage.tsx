import React, { useState, lazy, Suspense } from 'react';
import { Layout } from '../components/Layout';
import { FilesProvider } from '../context/FilesContext';
import { CategoriesProvider } from '../context/CategoriesContext';
import { ResultsProvider } from '../context/ResultsContext';

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  </div>
);

const ReadPage = lazy(() => import('./ReadPage').then(m => ({ default: m.ReadPage })));
const WritePage = lazy(() => import('./WritePage').then(m => ({ default: m.WritePage })));
const BatchWritePage = lazy(() => import('./BatchWritePage').then(m => ({ default: m.BatchWritePage })));
const ExportPdfPage = lazy(() => import('./ExportPdfPage').then(m => ({ default: m.ExportPdfPage })));
const BatchExecutePage = lazy(() => import('./BatchExecutePage').then(m => ({ default: m.BatchExecutePage })));
const FilesPage = lazy(() => import('./FilesPage').then(m => ({ default: m.FilesPage })));
const MergePdfPage = lazy(() => import('./MergePdfPage').then(m => ({ default: m.MergePdfPage })));
const InsertImagePage = lazy(() => import('./InsertImagePage').then(m => ({ default: m.InsertImagePage })));
const JobsPage = lazy(() => import('./JobsPage').then(m => ({ default: m.JobsPage })));
const VerifyTokensPage = lazy(() => import('./VerifyTokensPage').then(m => ({ default: m.VerifyTokensPage })));
const PlansPage = lazy(() => import('./PlansPage').then(m => ({ default: m.PlansPage })));
const ResultsPage = lazy(() => import('./ResultsPage').then(m => ({ default: m.ResultsPage })));
const ProfilePage = lazy(() => import('./ProfilePage').then(m => ({ default: m.ProfilePage })));
const APIsPage = lazy(() => import('./APIsPage').then(m => ({ default: m.APIsPage })));
const APIKeysPage = lazy(() => import('./APIKeysPage').then(m => ({ default: m.APIKeysPage })));
const APIBuilderPage = lazy(() => import('./APIBuilderPage').then(m => ({ default: m.APIBuilderPage })));

interface HomePageProps {
  lang: 'ar' | 'en';
  onLangChange: (lang: 'ar' | 'en') => void;
  editApiFileId?: string | null;
  onApiEditComplete?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ lang, onLangChange, editApiFileId, onApiEditComplete }) => {
  const [activeTab, setActiveTab] = useState('apis');
  const [editApiFileIdState, setEditApiFileIdState] = useState<string | null>(editApiFileId || null);

  const handleEditApi = (fileId: string) => {
    setEditApiFileIdState(fileId);
    setActiveTab('api_builder');
  };

  const navigateToKeysWithDialog = () => {
    // Signal APIKeysPage to auto-open the create dialog via sessionStorage
    sessionStorage.setItem('openCreateDialog', '1');
    setActiveTab('api_keys');
  };

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
            <Suspense fallback={<PageLoader />}>
              {activeTab === 'apis'     && <APIsPage lang={lang} onEditApi={handleEditApi} />}
              {activeTab === 'files'    && <FilesPage lang={lang} />}
              {activeTab === 'results'  && <ResultsPage lang={lang} />}
              {activeTab === 'read'     && <ReadPage lang={lang} />}
              {activeTab === 'write'    && <WritePage lang={lang} />}
              {activeTab === 'batch'    && <BatchWritePage lang={lang} />}
              {activeTab === 'pdf'      && <ExportPdfPage lang={lang} onTabChange={setActiveTab} />}
              {activeTab === 'execute' && <BatchExecutePage lang={lang} />}
              {activeTab === 'merge'    && <MergePdfPage lang={lang} />}
              {activeTab === 'insert'   && <InsertImagePage lang={lang} />}
              {activeTab === 'jobs'     && <JobsPage lang={lang} />}
              {activeTab === 'api_keys' && <APIKeysPage lang={lang} />}
              {activeTab === 'api_builder' && <APIBuilderPage lang={lang} editFileId={editApiFileIdState} onComplete={onApiEditComplete} onNavigateToKeys={navigateToKeysWithDialog} />}
              {activeTab === 'verify'   && <VerifyTokensPage lang={lang} />}
              {activeTab === 'plans'    && <PlansPage lang={lang} />}
              {activeTab === 'profile' && <ProfilePage lang={lang} />}
            </Suspense>
          </Layout>
        </ResultsProvider>
      </CategoriesProvider>
    </FilesProvider>
  );
};