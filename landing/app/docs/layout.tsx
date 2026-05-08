import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { source } from '@/app/source';
import { FileSpreadsheet } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      themeSwitch={{ enabled: false }}
      nav={{
        title: (
          <span className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">Excel Processor</span>
          </span>
        ),
        url: '/',
      }}
    >
      {children}
    </DocsLayout>
  );
}
