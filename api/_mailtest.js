/* ============================================================
   /api/auth?action=mailtest
     GET   מצב ההגדרה של שירות הדואר
     POST  { to }   שליחת מכתב בדיקה, ומחזיר את השגיאה כלשונה

   ------------------------------------------------------------
   ⚠ הכלי הזה נולד מהצורך. איפוס סיסמה נכשל, והמסך אמר "הבקשה
     נקלטה" — כי הוא **חייב** לומר את זה לכל אחד, אחרת הוא
     הופך למנוע בדיקה של מי רשום במכינה. התוצאה: אין דרך לדעת
     אם המייל נכשל, ולמה.

     כאן, ורק כאן, מוחזרת השגיאה כלשונה. זה בטוח כי הפעולה
     יזומה על ידי מנהל מחובר ועל כתובת שהוא הקליד בעצמו —
     היא אינה מלמדת דבר על חשבון של מישהו אחר.

   ⚠ **המפתח עצמו לעולם אינו מוחזר.** רק אם הוא קיים ואם הוא
     נראה כמו מפתח של Resend. מי שמקבל 401 יידע שהמפתח שגוי
     בלי שאיש יראה אותו.

   ⚠ מנהל בלבד, וההשהיה הגוברת חלה.
   ============================================================ */

import { withAuth, attemptKey, checkThrottle, penalize, AuthError } from "./_session.js";
import { sendMail, mailerStatus } from "./_mailer.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** תרגום השגיאות הנפוצות של Resend למה שצריך לעשות */
function advise(status, reason) {
  const r = String(reason || "");
  if (status === 401 || /api key|unauthor/i.test(r)) {
    return "המפתח שגוי או שאינו קיים. יש ליצור מפתח חדש ב-Resend ולהחליף את RESEND_API_KEY.";
  }
  if (/domain is not verified|not verified/i.test(r)) {
    return "הדומיין של כתובת השולח אינו מאומת ב-Resend. "
      + "לבדיקה מהירה: MAIL_FROM = onboarding@resend.dev";
  }
  if (/only send testing emails to your own/i.test(r)) {
    return "עם onboarding@resend.dev אפשר לשלוח **רק לכתובת שאיתה נפתח חשבון Resend**. "
      + "לשליחה לכל כתובת — צריך לאמת דומיין.";
  }
  if (/rate|quota|limit/i.test(r)) return "נגמרה המכסה או קצב השליחה. יש להמתין.";
  if (status === 422 || /invalid|validation/i.test(r)) {
    return "אחד השדות אינו תקין — לרוב כתובת השולח.";
  }
  return null;
}

async function handler(req, res, session) {
  const st = mailerStatus();

  if (req.method === "GET") {
    return res.status(200).json({
      ...st,
      /* ⚠ אבחון שאומר מה חסר, ולא "לא מוגדר". */
      problems: [
        !st.hasKey && "לא הוגדר RESEND_API_KEY",
        st.hasKey && !st.keyLooksRight && "RESEND_API_KEY אינו נראה כמו מפתח של Resend (מתחיל ב-re_)",
        !st.from && "לא הוגדר MAIL_FROM",
      ].filter(Boolean),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "שיטה לא נתמכת" });
  }

  const key = attemptKey(req);
  try {
    checkThrottle(key);
    const body = req.body ?? (await readJson(req));
    const to = String(body?.to || "").trim();
    if (!EMAIL_RE.test(to)) {
      return res.status(400).json({ error: "כתובת אימייל לא תקינה" });
    }
    if (!st.ready) {
      return res.status(200).json({
        sent: false, ...st,
        reason: "שירות הדואר אינו מוגדר",
        advice: "יש להגדיר RESEND_API_KEY ו-MAIL_FROM ב-Vercel, ואז Redeploy.",
      });
    }

    /* ⚠ נספר כניסיון גם כשהצליח — כדי שהכלי לא יהפוך לצינור. */
    await penalize(key);

    const out = await sendMail({
      to,
      subject: "בדיקת שליחה — מכינת ניר עוז",
      text: [
        "זו הודעת בדיקה מהמערכת של מכינת ניר עוז.",
        "אם הגעת לכאן — שליחת הדואר עובדת, ואיפוס סיסמה יישלח במייל.",
        "",
        "במעלה הדרך · מכינת ניר עוז",
      ].join("\n"),
    });

    return res.status(200).json({
      ...out, ...st,
      advice: out.sent ? null : advise(out.status, out.reason),
    });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    console.error("[mailtest]", e && e.message);
    res.status(status).json({ error: status === 502 ? "הבדיקה נכשלה" : e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
