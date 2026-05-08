'use client';
import { useLang } from '@/lib/useLang';
import Navbar  from '@/components/Navbar';
import Pricing from '@/components/Pricing';
import Footer  from '@/components/Footer';

export default function PricingPage() {
  const [lang, setLang] = useLang();

  return (
    <>
      <Navbar lang={lang} onLangChange={setLang} />
      <main className="flex-1 pt-16">
        <Pricing lang={lang} />
      </main>
      <Footer lang={lang} />
    </>
  );
}
