import React from 'react';
import ReactDOM from 'react-dom/client';
import { HomePage } from './pages/HomePage';
import './index.css';

function App() {
  const [lang, setLang] = React.useState<'ar' | 'en'>('ar');

  return <HomePage lang={lang} onLangChange={setLang} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
