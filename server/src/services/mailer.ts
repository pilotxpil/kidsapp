import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null | undefined;

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!isMailerConfigured()) {
    transporter = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[mailer:dev] to=${to} subject="${subject}"\n${text}`);
      return true;
    }
    return false;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || `KidsQuest <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
  return true;
}

export function resetCodeEmail(code: string) {
  const text = `קוד איפוס הסיסמה שלכם ל-KidsQuest הוא: ${code}\nהקוד בתוקף ל-15 דקות. אם לא ביקשתם איפוס — אפשר להתעלם מהמייל.`;
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#F4F1FF;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:440px;margin:32px auto;background:#fff;border-radius:24px;padding:32px;text-align:center;direction:rtl">
<div style="font-size:44px">🔑</div>
<h1 style="margin:8px 0 4px;color:#2B1B5A;font-size:22px">איפוס סיסמה</h1>
<p style="color:#6B6390;font-size:15px;margin:0 0 20px">הזינו את הקוד הזה באפליקציה:</p>
<div style="font-size:36px;letter-spacing:10px;font-weight:800;color:#6C3BFF;background:#F4F1FF;border-radius:16px;padding:16px 0">${code}</div>
<p style="color:#6B6390;font-size:13px;margin:20px 0 0">הקוד בתוקף ל-15 דקות. אם לא ביקשתם איפוס, אפשר להתעלם מהמייל.</p>
</div></body></html>`;
  return { subject: 'קוד איפוס סיסמה — KidsQuest', html, text };
}
