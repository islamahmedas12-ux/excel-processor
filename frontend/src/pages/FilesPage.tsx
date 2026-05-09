import React from 'react';

interface Props { lang: 'ar' | 'en'; }

export const FilesPage: React.FC<Props> = ({ lang }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-bold mb-2">{lang === 'ar' ? 'الملفات' : 'Files'}</h2>
    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
      {lang === 'ar'
        ? 'TODO: هذه الصفحة كانت untracked وضاعت قبل التخزين المؤقت — يجب إعادة بنائها.'
        : 'TODO: this page was untracked and lost before stash — needs to be rebuilt.'}
    </p>
  </div>
);
