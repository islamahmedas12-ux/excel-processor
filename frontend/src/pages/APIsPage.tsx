import React from 'react';

interface APIsPageProps {
  lang: 'ar' | 'en';
}

export const APIsPage: React.FC<APIsPageProps> = ({ lang }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-700">
          {lang === 'ar' ? 'واجهات API' : 'APIs'}
        </p>
        <p className="text-sm text-slate-400 mt-1">
          {lang === 'ar' ? 'الصفحة قيد الإنشاء...' : 'Page under construction...'}
        </p>
      </div>
    </div>
  );
};