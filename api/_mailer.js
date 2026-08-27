/* ============================================================
   שליחת דואר — אופציונלית ומנותקת
   ------------------------------------------------------------
   ⚠ המערכת עובדת **גם בלי** שירות דואר. אם לא הוגדר אחד,
     איפוס הסיסמה אינו נופל — הוא הופך לקוד בן שש ספרות שהמנהל
     מוסר לחניך פנים אל פנים. פחות נוח, ובדיוק באותה מידה בטוח.

     זו לא פשרה זמנית: מכינה היא מקום שבו כולם נמצאים באותו
     מתחם, ומסירה ידנית של קוד למי שמזוהה בעיניים חזקה יותר
     ממייל שאולי הגיע לתיבה שאולי פתוחה בטלפון שאולי אבד.

   ⚠ בלי חבילות חיצוניות. fetch מובנה, ו-Resend הוא HTTP רגיל.
     כל חבילה נוספת היא עוד דבר לעדכן ולאבטח.

   ⚠ מפתחות ה-API חיים ב-.env ובמשתני הסביבה של Vercel בלבד.
     לעולם לא בקוד ולא בקומיט.
   ============================================================ */

const KEY = () => process.env.RESEND_API_KEY || "";
const FROM = () => process.env.MAIL_FROM || "";

/** האם אפשר לשלוח בכלל */
export const mailerReady = () => Boolean(KEY() && FROM());

/**
 * מצב ההגדרה, לאבחון.
 * ⚠ לעולם לא המפתח עצמו — רק אם הוא קיים ומה אורכו. כתובת
 *   השולח אינה סוד ומוחזרת במלואה, כי היא בדיוק מה שצריך
 *   לבדוק מול הדומיין המאומת ב-Resend.
 */
export const mailerStatus = () => {
  const k = KEY(), f = FROM();
  return {
    ready: Boolean(k && f),
    hasKey: Boolean(k),
    keyLooksRight: /^re_[A-Za-z0-9_-]{10,}$/.test(k),
    from: f || null,
    /* ⚠ Resend מסרבת לכל דומיין שאינו מאומת, חוץ מזה. */
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
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM(), to: [to], subject,
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
