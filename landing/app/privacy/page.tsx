'use client';
import Link from 'next/link';
import { useLang } from '@/lib/useLang';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  const [lang, setLang] = useLang();
  const isRtl = lang === 'ar';

  return (
    <>
      <Navbar lang={lang} onLangChange={setLang} />
      <main className="flex-1 pt-24 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
        <article className="max-w-3xl mx-auto px-4 sm:px-6 prose prose-slate">
          {isRtl ? <PrivacyAr /> : <PrivacyEn />}
        </article>
      </main>
      <Footer lang={lang} />
    </>
  );
}

function PrivacyAr() {
  return (
    <>
      <h1 className="text-3xl font-black text-slate-900 mb-2">سياسة الخصوصية</h1>
      <p className="text-slate-500 text-sm mb-8">آخر تحديث: مايو 2026</p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">١. البيانات التي نجمعها</h2>
      <p className="text-slate-600 leading-relaxed">
        عند التسجيل نجمع اسمك وبريدك الإلكتروني وكلمة المرور (مشفّرة). عند رفع ملفات Excel، يُخزّن محتواها على خوادمنا مرتبطاً بحسابك فقط.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٢. استخدام البيانات</h2>
      <p className="text-slate-600 leading-relaxed">
        نستخدم بياناتك فقط لتشغيل الخدمة وإرسال إيميلات ضرورية (تفعيل الحساب، إعادة تعيين كلمة المرور، إشعارات الاشتراك). لا نبيع أي بيانات لجهات خارجية.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٣. ملفات Excel</h2>
      <p className="text-slate-600 leading-relaxed">
        ملفاتك المرفوعة معزولة تماماً — لا يمكن لأي مستخدم آخر الوصول إليها. نحن لا نفحص محتوى ملفاتك ولا نستخدمها لأي غرض آخر.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٤. الاحتفاظ بالبيانات</h2>
      <p className="text-slate-600 leading-relaxed">
        عند حذف ملف، يُحذف فوراً من خوادمنا. عند حذف الحساب، تُحذف جميع ملفاتك وبياناتك الشخصية خلال 30 يوماً.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٥. الأمان</h2>
      <p className="text-slate-600 leading-relaxed">
        كلمات المرور مشفّرة باستخدام PBKDF2. الاتصالات مشفّرة عبر HTTPS. يتم تخزين الرموز (tokens) في الذاكرة المحلية فقط.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">٦. التواصل</h2>
      <p className="text-slate-600 leading-relaxed">
        لأي استفسار حول الخصوصية، تواصل معنا عبر:{' '}
        <a href="mailto:admin@authme.dev" className="text-indigo-600 hover:underline">admin@authme.dev</a>
      </p>
    </>
  );
}

function PrivacyEn() {
  return (
    <>
      <h1 className="text-3xl font-black text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-slate-500 text-sm mb-8">Last updated: May 2026</p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">1. Data We Collect</h2>
      <p className="text-slate-600 leading-relaxed">
        When you register, we collect your name, email address, and password (hashed). When you upload Excel files, their contents are stored on our servers and associated only with your account.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">2. How We Use Your Data</h2>
      <p className="text-slate-600 leading-relaxed">
        We use your data only to operate the service and to send necessary emails (account verification, password reset, subscription notifications). We do not sell any data to third parties.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">3. Excel Files</h2>
      <p className="text-slate-600 leading-relaxed">
        Your uploaded files are fully isolated — no other user can access them. We do not inspect the contents of your files or use them for any purpose other than serving your API requests.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">4. Data Retention</h2>
      <p className="text-slate-600 leading-relaxed">
        When you delete a file it is immediately removed from our servers. When you delete your account, all your files and personal data are deleted within 30 days.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">5. Security</h2>
      <p className="text-slate-600 leading-relaxed">
        Passwords are hashed with PBKDF2. All connections are encrypted via HTTPS. JWT tokens are stored in local storage only.
      </p>

      <h2 className="text-xl font-bold text-slate-800 mt-8 mb-3">6. Contact</h2>
      <p className="text-slate-600 leading-relaxed">
        For any privacy inquiries contact us at:{' '}
        <a href="mailto:admin@authme.dev" className="text-indigo-600 hover:underline">admin@authme.dev</a>
      </p>
    </>
  );
}
