"""
Email Service — powered by Resend.
Sends welcome, verification, and password-reset emails.
"""

import os
import resend

ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', '')

FROM_EMAIL   = os.getenv('RESEND_FROM_EMAIL', 'noreply@authme.dev')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')


def _init():
    """Set API key lazily so .env changes are picked up without restart."""
    resend.api_key = os.getenv('RESEND_API_KEY', '')

# ── HTML helpers ──────────────────────────────────────────────────────────────

def _base(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6FA;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:12px;padding:12px 16px;margin-bottom:12px;">
                <span style="font-size:28px;">📊</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                معالج Excel
              </h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px;">Excel Processor</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              {body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:20px 40px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0;color:#94A3B8;font-size:12px;">
                هذا البريد أُرسل تلقائياً — لا ترد عليه<br/>
                Excel Processor &copy; 2026
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _btn(url: str, label: str, color: str = '#4f46e5') -> str:
    return f"""
    <div style="text-align:center;margin:28px 0;">
      <a href="{url}"
         style="display:inline-block;background:{color};color:#ffffff;text-decoration:none;
                padding:14px 36px;border-radius:12px;font-size:15px;font-weight:600;
                letter-spacing:-0.2px;box-shadow:0 4px 12px rgba(79,70,229,.3);">
        {label}
      </a>
    </div>"""


# ── Senders ───────────────────────────────────────────────────────────────────

def send_welcome_email(to_email: str, username: str) -> None:
    _init()
    body = f"""
      <h2 style="margin:0 0 8px;color:#1E293B;font-size:20px;font-weight:700;">
        أهلاً وسهلاً، {username}! 🎉
      </h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
        يسعدنا انضمامك إلى <strong>معالج Excel</strong>. حسابك جاهز الآن
        ويمكنك البدء في رفع ملفات Excel ومعالجتها فوراً.
      </p>

      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#166534;font-size:14px;font-weight:600;">ما يمكنك فعله الآن:</p>
        <ul style="margin:0;padding-right:18px;color:#166534;font-size:14px;line-height:2;">
          <li>رفع ملفات Excel وقراءة بياناتها</li>
          <li>تعديل الخلايا والصيغ الحسابية</li>
          <li>تصدير الملفات بصيغة PDF</li>
          <li>تنفيذ عمليات الدفعي على البيانات</li>
        </ul>
      </div>

      {_btn(FRONTEND_URL, 'ابدأ الآن →')}

      <p style="margin:24px 0 0;color:#94A3B8;font-size:12px;text-align:center;">
        إذا لم تقم بإنشاء هذا الحساب تجاهل هذه الرسالة.
      </p>"""

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": f"أهلاً بك في معالج Excel، {username}!",
        "html": _base("أهلاً بك", body),
    })


def send_verification_email(to_email: str, username: str, token: str) -> None:
    _init()
    url  = f"{FRONTEND_URL}?verify={token}"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1E293B;font-size:20px;font-weight:700;">
        تحقق من بريدك الإلكتروني ✉️
      </h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
        مرحباً <strong>{username}</strong>، اضغط على الزر أدناه لتأكيد
        عنوان بريدك الإلكتروني وتفعيل حسابك.
      </p>

      {_btn(url, 'تأكيد البريد الإلكتروني')}

      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px;margin-top:8px;">
        <p style="margin:0;color:#92400E;font-size:13px;text-align:center;">
          ⏳ هذا الرابط صالح لمدة <strong>24 ساعة</strong> فقط
        </p>
      </div>

      <p style="margin:20px 0 0;color:#94A3B8;font-size:12px;text-align:center;">
        إذا لم تطلب إنشاء حساب تجاهل هذه الرسالة.
      </p>"""

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": "تأكيد بريدك الإلكتروني — معالج Excel",
        "html": _base("تأكيد البريد", body),
    })


def send_subscription_request_email(username: str, email: str, plan: str, months: int, sub_id: str) -> None:
    """Notify the admin that a new subscription request arrived."""
    _init()
    admin = os.getenv('ADMIN_EMAIL', ADMIN_EMAIL)
    if not admin:
        return
    body = f"""
      <h2 style="margin:0 0 8px;color:#1E293B;font-size:20px;font-weight:700;">
        طلب اشتراك جديد 🔔
      </h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
        وصل طلب اشتراك جديد من <strong>{username}</strong>
      </p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;font-size:14px;color:#475569;">
          <tr><td style="padding:4px 0;font-weight:600;color:#1E293B;">الاسم:</td><td>{username}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;color:#1E293B;">الإيميل:</td><td>{email}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;color:#1E293B;">الخطة:</td><td>{plan.upper()}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;color:#1E293B;">المدة:</td><td>{months} شهر</td></tr>
        </table>
      </div>
      {_btn(f"{FRONTEND_URL}", 'فتح لوحة الإدارة')}"""

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to":   [admin],
        "subject": f"طلب اشتراك جديد — {username} ({plan.upper()})",
        "html": _base("طلب اشتراك جديد", body),
    })


def send_plan_activated_email(to_email: str, username: str, plan: str, expires_at: str) -> None:
    """Notify the user that their subscription has been activated."""
    _init()
    from .plans import PLANS
    plan_info = PLANS.get(plan, {})
    body = f"""
      <h2 style="margin:0 0 8px;color:#1E293B;font-size:20px;font-weight:700;">
        تم تفعيل اشتراكك! 🎉
      </h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
        مرحباً <strong>{username}</strong>، تم تفعيل اشتراك
        <strong>{plan_info.get('label_ar', plan)}</strong> بنجاح.
      </p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;font-size:14px;color:#166534;">
          <tr><td style="padding:4px 0;font-weight:600;">الخطة:</td><td>{plan_info.get('label_ar', plan)}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;">المساحة:</td><td>{plan_info.get('storage_gb', 0)} GB</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;">الملفات:</td><td>{plan_info.get('max_files', 0)}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;">ينتهي في:</td><td>{expires_at[:10] if expires_at else '—'}</td></tr>
        </table>
      </div>
      {_btn(FRONTEND_URL, 'ابدأ الاستخدام →')}"""

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to":   [to_email],
        "subject": f"تم تفعيل اشتراك {plan_info.get('label', plan)} — معالج Excel",
        "html": _base("تفعيل الاشتراك", body),
    })


def send_reset_email(to_email: str, username: str, token: str) -> None:
    _init()
    url  = f"{FRONTEND_URL}?reset={token}"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1E293B;font-size:20px;font-weight:700;">
        إعادة تعيين كلمة المرور 🔐
      </h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
        مرحباً <strong>{username}</strong>، تلقينا طلباً لإعادة تعيين
        كلمة مرور حسابك. اضغط على الزر أدناه للمتابعة.
      </p>

      {_btn(url, 'إعادة تعيين كلمة المرور', '#DC2626')}

      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:12px;padding:16px;margin-top:8px;">
        <p style="margin:0;color:#9F1239;font-size:13px;text-align:center;">
          ⏳ هذا الرابط صالح لمدة <strong>1 ساعة</strong> فقط
        </p>
      </div>

      <p style="margin:20px 0 0;color:#94A3B8;font-size:12px;text-align:center;">
        إذا لم تطلب إعادة تعيين كلمة المرور تجاهل هذه الرسالة — حسابك بأمان.
      </p>"""

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": "إعادة تعيين كلمة المرور — معالج Excel",
        "html": _base("إعادة تعيين كلمة المرور", body),
    })
