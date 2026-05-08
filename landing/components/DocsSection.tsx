import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface Endpoint {
  id: string;
  method: 'POST' | 'GET';
  path: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  auth: boolean;
  curl: string;
  python: string;
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: 'auth', method: 'POST', path: '/api/v1/auth/login',
    titleAr: 'المصادقة', titleEn: 'Authentication',
    descAr:  'احصل على JWT token لاستخدامه في كل الطلبات التالية.',
    descEn:  'Get a JWT token to use in all subsequent requests.',
    auth: false,
    curl: `curl -X POST https://api.yoursite.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"your_password"}'`,
    python: `import requests

res = requests.post("https://api.yoursite.com/api/v1/auth/login", json={
    "email": "user@example.com",
    "password": "your_password"
})
token = res.json()["token"]`,
    response: `{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "username": "Islam", "role": "user" }
}`,
  },
  {
    id: 'upload', method: 'POST', path: '/api/v1/files',
    titleAr: 'رفع الملفات', titleEn: 'Upload Files',
    descAr:  'ارفع ملف Excel للمستودع واحصل على file_id لاستخدامه في العمليات التالية.',
    descEn:  'Upload an Excel file to the repository and get a file_id for subsequent operations.',
    auth: true,
    curl: `curl -X POST https://api.yoursite.com/api/v1/files \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@salary.xlsx"`,
    python: `res = requests.post(
    "https://api.yoursite.com/api/v1/files",
    headers={"Authorization": f"Bearer {token}"},
    files={"file": open("salary.xlsx", "rb")}
)
file_id = res.json()["file"]["id"]`,
    response: `{
  "success": true,
  "file": {
    "id": "abc-123-def",
    "name": "salary.xlsx",
    "size": 204800,
    "uploaded_at": "2026-05-06T10:00:00Z"
  }
}`,
  },
  {
    id: 'read', method: 'POST', path: '/api/v1/read',
    titleAr: 'قراءة الخلايا', titleEn: 'Read Cells',
    descAr:  'اقرأ قيم خلايا محددة من ملف Excel.',
    descEn:  'Read the values of specific cells from an Excel file.',
    auth: true,
    curl: `curl -X POST https://api.yoursite.com/api/v1/read \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file_id=abc-123-def" \\
  -F "cells=C11,C12,C13" \\
  -F "sheet_name=Sheet1"`,
    python: `res = requests.post(
    "https://api.yoursite.com/api/v1/read",
    headers={"Authorization": f"Bearer {token}"},
    data={"file_id": file_id, "cells": "C11,C12,C13"}
)
data = res.json()["data"]`,
    response: `{
  "success": true,
  "data": { "C11": 5000, "C12": 750, "C13": 5750 },
  "sheet": "Sheet1"
}`,
  },
  {
    id: 'write', method: 'POST', path: '/api/v1/write',
    titleAr: 'تعديل الخلايا', titleEn: 'Edit Cells',
    descAr:  'عدّل قيم خلايا في الملف وحمّل الملف المعدّل.',
    descEn:  'Modify cell values and download the updated file.',
    auth: true,
    curl: `curl -X POST https://api.yoursite.com/api/v1/write \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file_id=abc-123-def" \\
  -F 'updates={"C11":6000,"C12":800}' \\
  --output updated.xlsx`,
    python: `import json

res = requests.post(
    "https://api.yoursite.com/api/v1/write",
    headers={"Authorization": f"Bearer {token}"},
    data={"file_id": file_id, "updates": json.dumps({"C11": 6000, "C12": 800})}
)
open("updated.xlsx", "wb").write(res.content)`,
    response: `# Returns the modified Excel file as binary (application/octet-stream)
# Content-Disposition: attachment; filename="updated.xlsx"`,
  },
  {
    id: 'execute', method: 'POST', path: '/api/v1/execute',
    titleAr: 'تشغيل الصيغ', titleEn: 'Run Formulas',
    descAr:  'أدخل قيم inputs وخلّي Excel يحسب الـ outputs تلقائياً.',
    descEn:  'Provide input values and let Excel compute the outputs automatically.',
    auth: true,
    curl: `curl -X POST https://api.yoursite.com/api/v1/execute \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file_id=abc-123-def" \\
  -F 'inputs={"C11":5000,"C12":750}' \\
  -F "outputs=C13,C14"`,
    python: `res = requests.post(
    "https://api.yoursite.com/api/v1/execute",
    headers={"Authorization": f"Bearer {token}"},
    data={
        "file_id": file_id,
        "inputs":  json.dumps({"C11": 5000, "C12": 750}),
        "outputs": "C13,C14"
    }
)
results = res.json()["results"]`,
    response: `{
  "success": true,
  "results": { "C13": 5750, "C14": 862.5 },
  "sheet": "Sheet1"
}`,
  },
  {
    id: 'pdf', method: 'POST', path: '/api/v1/export/pdf',
    titleAr: 'تصدير PDF', titleEn: 'Export PDF',
    descAr:  'صدّر ملف Excel أو sheets محددة كـ PDF.',
    descEn:  'Export an Excel file or specific sheets as PDF.',
    auth: true,
    curl: `curl -X POST https://api.yoursite.com/api/v1/export/pdf \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file_id=abc-123-def" \\
  -F "sheets=all" \\
  --output output.pdf`,
    python: `res = requests.post(
    "https://api.yoursite.com/api/v1/export/pdf",
    headers={"Authorization": f"Bearer {token}"},
    data={"file_id": file_id, "sheets": "all"}
)
open("output.pdf", "wb").write(res.content)`,
    response: `# Returns PDF file as binary (application/pdf)
# Content-Disposition: attachment; filename="output.pdf"`,
  },
];

function CodeBlock({ code, lang: codeLang }: { code: string; lang: string }) {
  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">{codeLang}</span>
      </div>
      <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export default function DocsSection({ lang }: { lang: Lang }) {
  const tr    = t[lang].docs;
  const isRtl = lang === 'ar';

  return (
    <section id="docs" className="py-24 bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">{tr.title}</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">{tr.sub}</p>
        </div>

        {/* Base URL */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-10 flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">Base URL</span>
          <code className="text-sm font-mono text-primary-700 bg-primary-50 px-3 py-1 rounded-lg">
            https://api.yoursite.com
          </code>
        </div>

        <div className="space-y-12">
          {ENDPOINTS.map(ep => (
            <div key={ep.id} id={ep.id}
              className="scroll-mt-24 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

              {/* Header */}
              <div className="flex items-start gap-4 p-6 bg-slate-50 border-b border-slate-200">
                <span className={`text-xs font-black px-3 py-1.5 rounded-lg shrink-0 font-mono
                  ${ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {ep.method}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-sm font-mono text-slate-800 font-bold">{ep.path}</code>
                    {ep.auth && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        🔐 {isRtl ? 'يتطلب مصادقة' : 'Auth required'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 mt-1">{isRtl ? ep.titleAr : ep.titleEn}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{isRtl ? ep.descAr : ep.descEn}</p>
                </div>
              </div>

              {/* Code examples */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">cURL</p>
                    <CodeBlock code={ep.curl} lang="bash" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Python</p>
                    <CodeBlock code={ep.python} lang="python" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    {isRtl ? 'مثال الاستجابة' : 'Response Example'}
                  </p>
                  <CodeBlock code={ep.response} lang="json" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
