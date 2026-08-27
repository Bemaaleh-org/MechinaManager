/* ============================================================
   שליחת דואר — אופציונלית ומנותקת
   ------------------------------------------------------------
   ⚠ המערכת עובדת **גם בלי** שירות דואר. אם לא הוגדר אחד,
     איפוס הסיסמה אינו נופל — הוא הופך לקוד בן שש ספרות שהמנהל
     מוסר לחניך פנים אל פנים. פחות נוח, ובדיוק באותה מידה בטוח.

     זו לא פשרה זמנית: מכינה היא מקום שבו כולם נמצאים באותו
     מתחם, ומסירה ידנית של קוד למי שמזוהה בעיניים חזקה יותר
     ממייל שאולי הגיע לתיבה שאולי פתוחה בטלפון שאולי אבד.

   ⚠ **שני מסלולים, ו-SMTP קודם.** המכינה כבר על Google
     Workspace — רשומת ה-MX של bemaaleh.com מצביעה ל-
     smtp.google.com, וה-SPF כולל את גוגל. כלומר יש כבר שירות
     דואר שעובד, משולם ומאומת, וכתובת אמיתית בדומיין.

     Resend דרש לאמת דומיין, והאימות שלו דורש רשומת MX על
     תת-דומיין — **ש-Wix אינה תומכת בה כלל**. הוא נשאר כמסלול
     שני למי שאין לו Workspace.

   ⚠ nodemailer היא החבילה החיצונית **היחידה** שנוספה למערכת,
     ורק בגללה SMTP אפשרי. כתיבת SMTP-over-TLS ביד היא כמאתיים
     שורות שצריך לתחזק, ולא היה בזה רווח.

   ⚠ מפתחות ה-API חיים ב-.env ובמשתני הסביבה של Vercel בלבד.
     לעולם לא בקוד ולא בקומיט.
   ============================================================ */

const KEY = () => process.env.RESEND_API_KEY || "";
const FROM = () => process.env.MAIL_FROM || "";
const SMTP_USER = () => process.env.SMTP_USER || "";
const SMTP_PASS = () => (process.env.SMTP_PASS || "").replace(/\s/g, "");

/* ⚠ סיסמת אפליקציה של גוגל מוצגת כ-"abcd efgh ijkl mnop", ואנשים
   מעתיקים אותה עם הרווחים. הסרתם כאן חוסכת תקלה שנראית כמו
   "הסיסמה שגויה" ואינה. */

/** המסלול שייבחר — SMTP קודם, ראו ההערה בראש הקובץ */
export const transport = () => {
  if (SMTP_USER() && SMTP_PASS()) return "smtp";
  if (KEY() && FROM()) return "resend";
  return null;
};

/** האם אפשר לשלוח בכלל */
export const mailerReady = () => Boolean(transport());

/** כתובת השולח בפועל */
const sender = () =>
  transport() === "smtp" ? (FROM() || SMTP_USER()) : FROM();

/**
 * מצב ההגדרה, לאבחון.
 * ⚠ לעולם לא המפתח עצמו — רק אם הוא קיים ומה אורכו. כתובת
 *   השולח אינה סוד ומוחזרת במלואה, כי היא בדיוק מה שצריך
 *   לבדוק מול הדומיין המאומת ב-Resend.
 */
export const mailerStatus = () => {
  const k = KEY(), f = FROM(), u = SMTP_USER(), p = SMTP_PASS();
  const via = transport();
  return {
    ready: Boolean(via),
    via,
    from: sender() || null,
    /* ---- SMTP ---- */
    smtpUser: u || null,
    /* ⚠ לעולם לא הסיסמה — רק אם היא קיימת ואם אורכה סביר.
       סיסמת אפליקציה של גוגל היא 16 תווים. */
    hasSmtpPass: Boolean(p),
    smtpPassLen: p.length,
    smtpPassLooksRight: p.length === 16,
    /* ---- Resend ---- */
    hasKey: Boolean(k),
    keyLooksRight: /^re_[A-Za-z0-9_-]{10,}$/.test(k),
    isTestFrom: f === "onboarding@resend.dev" || f.endsWith("@resend.dev"),
  };
};

/**
 * שליחה. מחזיר { sent, reason } ולעולם אינו זורק.
 * ⚠ כישלון בשליחה אינו מפיל את מסלול האיפוס. האסימון כבר
 *   נשמר, והמשתמש יקבל את הדרך החלופית.
 */
export async function sendMail({ to, subject, text, html }) {
  if (!mailerReady()) return { sent: false, reason: "לא הוגדר שירות דואר" };
  if (transport() === "smtp") return sendSmtp({ to, subject, text, html });
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender(), to: [to], subject,
        text, ...(html ? { html } : {}),
      }),
    });
    if (!r.ok) {
      /* ⚠ ההודעה של Resend נחוצה לאבחון — בלעדיה "השליחה
         נכשלה" הוא כל מה שיש, ואי אפשר לדעת אם הדומיין אינו
         מאומת, המפתח שגוי או המכסה נגמרה.

         ⚠ נקראת מהשדה message בלבד ולא מכל הגוף, ונחתכת —
         כדי שכתובת או פרט אחר לא ייכנסו ללוג בשלמותם. */
      let detail = "";
      try {
        const j = await r.json();
        detail = String(j?.message || j?.error?.message || "").slice(0, 200);
      } catch { /* גוף שאינו JSON — נשארים עם הסטטוס */ }
      console.error("[mailer] סטטוס", r.status, detail);
      return { sent: false, status: r.status, reason: detail || `סטטוס ${r.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[mailer]", e && e.message);
    return { sent: false, reason: String(e && e.message || "השליחה נכשלה").slice(0, 200) };
  }
}

/* ============================================================
   SMTP — גוגל
   ------------------------------------------------------------
   ⚠ **סיסמת אפליקציה, לא הסיסמה של החשבון.** גוגל חוסמת
     התחברות SMTP עם הסיסמה הרגילה, וסיסמת אפליקציה ניתנת
     לביטול בנפרד בלי לגעת בחשבון.

   ⚠ פורט 465 עם TLS ולא 587 עם STARTTLS: חלק מסביבות
     ה-serverless חוסמות את המשא ומתן של STARTTLS, ו-465
     מוצפן מהשנייה הראשונה.

   ⚠ החיבור נסגר אחרי כל שליחה. שמירת חיבור פתוח בין קריאות
     היא אשליה ב-serverless — המופע נעלם ממילא.
   ============================================================ */
async function sendSmtp({ to, subject, text, html }) {
  try {
    const { default: nodemailer } = await import("nodemailer");
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: SMTP_USER(), pass: SMTP_PASS() },
    });
    await t.sendMail({
      from: sender(), to, subject, text, ...(html ? { html } : {}),
    });
    t.close();
    return { sent: true };
  } catch (e) {
    /* ⚠ ההודעה של גוגל נחוצה לאבחון — "השליחה נכשלה" לבדו
       אינו מבדיל בין סיסמה שגויה לחסימת אבטחה. */
    const msg = String(e && e.message || "").slice(0, 220);
    console.error("[mailer:smtp]", msg);
    return { sent: false, status: e && e.responseCode, reason: msg || "השליחה נכשלה" };
  }
}

/* ============================================================
   מכתב האיפוס
   ⚠ בלי שם המשתמש ובלי פרטים מזהים מעבר לשם הפרטי. מייל שנשלח
     לכתובת שגויה לא אמור ללמד את מי שקיבל אותו מי אנחנו ומי
     האדם.
   ============================================================ */
export function resetLetter({ name, link, minutes }) {
  const first = String(name || "").split(" ")[0] || "";
  const subject = "איפוס סיסמה — מכינת ניר עוז";
  const text = [
    `שלום${first ? " " + first : ""},`,
    "",
    "התקבלה בקשה לאיפוס הסיסמה שלך במערכת המכינה.",
    "לקביעת סיסמה חדשה:",
    link,
    "",
    `הקישור בתוקף ל-${minutes} דקות ולשימוש אחד בלבד.`,
    "אם לא ביקשת לאפס — אפשר להתעלם מההודעה, הסיסמה לא השתנתה.",
    "",
    "במעלה הדרך · מכינת ניר עוז",
  ].join("\n");
  return { subject, text };
}
