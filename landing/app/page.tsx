'use client';
import { useLang } from '@/lib/useLang';
import Navbar      from '@/components/Navbar';
import Hero        from '@/components/Hero';
import Features    from '@/components/Features';
import HowItWorks  from '@/components/HowItWorks';
import Footer      from '@/components/Footer';

export default function Home() {
  const [lang, setLang] = useLang();

  return (
    <>
      <Navbar lang={lang} onLangChange={setLang} />
      <main className="flex-1">
        <Hero        lang={lang} />
        <Features    lang={lang} />
        <HowItWorks  lang={lang} />
      </main>
      <Footer lang={lang} />
    </>
  );
}
