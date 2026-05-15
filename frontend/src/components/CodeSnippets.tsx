import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeSnippetsProps {
  lang: 'ar' | 'en';
  fileId: string;
  endpointBase: string;
  inputs: Record<string, any>;
  apiKeyPrefix?: string;
  hasApiKey: boolean;
  onNavigateToKeys?: () => void;
}

type Language = 'curl' | 'javascript' | 'python';

type SnippetArgs = Pick<CodeSnippetsProps, 'fileId' | 'endpointBase' | 'inputs' | 'apiKeyPrefix'>;

const SNIPPETS: Record<Language, { ar: string; en: string; code: (props: SnippetArgs) => string }> = {
  curl: {
    ar: 'cURL',
    en: 'cURL',
    code: ({ fileId, endpointBase, inputs, apiKeyPrefix }) =>
      `curl -X POST "${endpointBase}/api/v1/files/${fileId}/run" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeyPrefix || 'ek_live_YOUR_KEY_HERE'}" \\
  -d '${JSON.stringify({ inputs }, null, 2)}'`,
  },
  javascript: {
    ar: 'JavaScript',
    en: 'JavaScript',
    code: ({ fileId, endpointBase, inputs, apiKeyPrefix }) =>
      `const response = await fetch(
  "${endpointBase}/api/v1/files/${fileId}/run",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "${apiKeyPrefix || 'ek_live_YOUR_KEY_HERE'}",
    },
    body: JSON.stringify({ inputs: ${JSON.stringify(inputs, null, 4).replace(/\n/g, '\n    ')} }),
  }
);
const data = await response.json();
console.log(data.outputs);`,
  },
  python: {
    ar: 'Python',
    en: 'Python',
    code: ({ fileId, endpointBase, inputs, apiKeyPrefix }) =>
      `import requests
import json

url = "${endpointBase}/api/v1/files/${fileId}/run"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKeyPrefix || 'ek_live_YOUR_KEY_HERE'}",
}
payload = {"inputs": ${JSON.stringify(inputs, null, 4)}}

response = requests.post(url, headers=headers, data=json.dumps(payload))
print(response.json()["outputs"])`,
  },
};

const T = {
  ar: {
    copy: 'نسخ',
    copied: 'تم!',
    noKeyTitle: 'لا يوجد مفتاح API بعد',
    noKeyBody: 'استخدم',
    placeholder: 'كـ placeholder',
    generateOne: 'إنشاء واحد ▸',
    orSection: 'أو أنشئ مفتاحاً في قسم',
  },
  en: {
    copy: 'Copy',
    copied: 'Copied!',
    noKeyTitle: 'No API key yet.',
    noKeyBody: 'Use',
    placeholder: 'as a placeholder.',
    generateOne: 'Generate one ▸',
    orSection: 'or generate a key in the',
  },
};

const CopyButton: React.FC<{ code: string; lang: 'ar' | 'en' }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);
  const t = T[lang];
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
      title={lang === 'ar' ? 'نسخ إلى الحافظة' : 'Copy to clipboard'}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? t.copied : t.copy}</span>
    </button>
  );
};

export const CodeSnippets: React.FC<CodeSnippetsProps> = ({
  lang, fileId, endpointBase, inputs, apiKeyPrefix, hasApiKey, onNavigateToKeys,
}) => {
  const [activeLang, setActiveLang] = useState<Language>('curl');
  const t = T[lang];
  const snippetDef = SNIPPETS[activeLang];

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Language tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {(Object.keys(SNIPPETS) as Language[]).map(l => (
          <button
            key={l}
            onClick={() => setActiveLang(l)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors
              ${activeLang === l
                ? 'bg-white text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {SNIPPETS[l][lang]}
          </button>
        ))}
      </div>

      {/* Code + copy */}
      <div className="relative">
        <pre className="p-4 text-xs text-slate-800 overflow-x-auto bg-white" dir="ltr">
          <code>{snippetDef.code({ fileId, endpointBase, inputs, apiKeyPrefix })}</code>
        </pre>
        <div className="absolute top-3 end-3">
          <CopyButton code={snippetDef.code({ fileId, endpointBase, inputs, apiKeyPrefix })} lang={lang} />
        </div>
      </div>

      {/* No-key warning */}
      {!hasApiKey && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
          <span className="font-medium">{t.noKeyTitle}</span>
          {' '}
          {t.noKeyBody}{' '}
          <code className="bg-amber-100 px-1 rounded">ek_live_…YOUR_KEY…</code>{' '}
          {t.placeholder}
          {onNavigateToKeys ? (
            <>
              {' '}
              <button
                onClick={onNavigateToKeys}
                className="underline hover:no-underline font-medium"
              >
                {t.generateOne}
              </button>
            </>
          ) : (
            <>
              {' '}{t.orSection} <strong>API Keys</strong>.
            </>
          )}
        </div>
      )}
    </div>
  );
};