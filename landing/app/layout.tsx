import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'معالج Excel — Excel Processor API',
  description: 'حوّل ملفات Excel إلى API فوراً. قراءة وتعديل الخلايا، تشغيل الصيغ، وتصدير PDF عبر API بسيط.',
  keywords:    ['excel api', 'excel processor', 'excel as a service', 'معالج excel', 'api excel'],
  openGraph: {
    title:       'معالج Excel — Excel Processor API',
    description: 'Turn Excel files into instant APIs',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800;900&family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <RootProvider theme={{ defaultTheme: 'light', disableTransitionOnChange: true }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
