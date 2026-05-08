'use client';
import { useLang } from '@/lib/useLang';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function TermsPage() {
  const [lang, setLang] = useLang();
  const isRtl = lang === 'ar';

  return (
    <>
      <Navbar lang={lang} onLangChange={setLang} />
      <main className="flex-1 pt-24 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
        <article className="max-w-3xl mx-auto px-4 sm:px-6 prose prose-slate">
          {isRtl ? <TermsAr /> : <TermsEn />}
        </article>
      </main>
      <Footer lang={lang} />
    </>
  );
}

function TermsAr() {
  return (
    <>
      <h1 className="text-3xl font-black text-slate-900 mb-2">الشروط والأحكام</h1>
      <p className="text-slate-500 text-sm mb-8">آخر تحديث: مايو 2026</p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">١. القبول بالشروط</h2>
      <p className="text-slate-600 leading-relaxed">
        باستخدامك لخدمة معالج Excel، فإنك توافق على هذه الشروط. إذا كنت لا توافق على أي بند، يرجى التوقف عن استخدام الخدمة.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٢. الخدمة</h2>
      <p className="text-slate-600 leading-relaxed">
        معالج Excel هي خدمة تتيح لك رفع ملفات Excel والتعامل معها عبر API. نحتفظ بالحق في تعديل أو إيقاف الخدمة في أي وقت مع إشعار مسبق.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٣. حدود الاستخدام</h2>
      <p className="text-slate-600 leading-relaxed">
        يُحظر استخدام الخدمة لأغراض غير مشروعة أو مضرّة. يُحظر رفع ملفات تحتوي على فيروسات أو محتوى ضار.
        حدود التخزين وعدد الملفات مرتبطة بالخطة المشترك بها.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٤. الدفع والاشتراكات</h2>
      <p className="text-slate-600 leading-relaxed">
        الخطط المدفوعة تُفعَّل يدوياً بعد التحقق من التحويل البنكي. الاشتراكات غير قابلة للاسترداد بعد التفعيل إلا في حالات استثنائية تُدرس بشكل منفرد.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٥. الملكية الفكرية</h2>
      <p className="text-slate-600 leading-relaxed">
        الملفات التي ترفعها ملكيتها تعود لك بالكامل. أنت تمنحنا ترخيصاً محدوداً لمعالجة هذه الملفات لأغراض تشغيل الخدمة فقط.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٦. إخلاء المسؤولية</h2>
      <p className="text-slate-600 leading-relaxed">
        الخدمة تُقدَّم "كما هي". لا نضمن عدم الانقطاع أو خلوّها من الأخطاء. لا نتحمل مسؤولية أي خسائر ناتجة عن استخدام الخدمة أو توقفها.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٧. التواصل</h2>
      <p className="text-slate-600 leading-relaxed">
        لأي استفسار:{' '}
        <a href="mailto:admin@authme.dev" className="text-indigo-600 hover:underline">admin@authme.dev</a>
      </p>
    </>
  );
}

function TermsEn() {
  return (
    <>
      <h1 className="text-3xl font-black text-slate-900 mb-2">Terms & Conditions</h1>
      <p className="text-slate-500 text-sm mb-8">Last updated: May 2026</p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">1. Acceptance</h2>
      <p className="text-slate-600 leading-relaxed">
        By using Excel Processor, you agree to these terms. If you disagree with any clause, please stop using the service.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">2. The Service</h2>
      <p className="text-slate-600 leading-relaxed">
        Excel Processor is a service that lets you upload Excel files and interact with them via API. We reserve the right to modify or discontinue the service at any time with advance notice.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">3. Acceptable Use</h2>
      <p className="text-slate-600 leading-relaxed">
        You may not use the service for unlawful or harmful purposes. You may not upload files containing viruses or malicious content.
        Storage and file limits are tied to your subscription plan.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">4. Payments & Subscriptions</h2>
      <p className="text-slate-600 leading-relaxed">
        Paid plans are manually activated after bank transfer verification. Subscriptions are non-refundable after activation except in exceptional cases reviewed individually.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">5. Intellectual Property</h2>
      <p className="text-slate-600 leading-relaxed">
        Files you upload remain your property. You grant us a limited license to process those files solely for the purpose of operating the service.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">6. Disclaimer</h2>
      <p className="text-slate-600 leading-relaxed">
        The service is provided "as is." We do not guarantee uninterrupted or error-free operation. We are not liable for any losses resulting from the use or unavailability of the service.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">7. Contact</h2>
      <p className="text-slate-600 leading-relaxed">
        For any inquiries:{' '}
        <a href="mailto:admin@authme.dev" className="text-indigo-600 hover:underline">admin@authme.dev</a>
      </p>
    </>
  );
}
