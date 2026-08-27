/* ============================================================
   /api/auth?action=recover
     POST { user }                  בקשת איפוס
     POST { token, password }       קביעת סיסמה חדשה
     GET  ?token=...                האם האסימון עוד בתוקף

   ------------------------------------------------------------
   ⚠ **התשובה לבקשת איפוס זהה תמיד**, בין אם המשתמש קיים ובין
     אם לא. מסלול שאומר "לא נמצא" הופך את הטופס למנוע בדיקה
     של מי רשום במכינה.

   ⚠ אין כאן withAuth בכוונה — מי ששכח סיסמה אינו מחובר. לכן
     ההשהיה הגוברת חלה, וחלה חזק: זו נקודת הקצה הכי חשופה
     במערכת.

   ⚠ **כשאין שירות דואר**, האיפוס לא נופל אלא הופך לקוד בן שש
     ספרות שהמנהל מוסר פנים אל פנים. במכינה כולם באותו מתחם,
     ומסירה לאדם שמזוהה בעיניים חזקה ממייל שאולי הגיע.

     ⚠ הקוד **אינו חוזר בתשובה** למי שביקש. הוא נכתב ללוח בלבד,
       והמנהל רואה אותו שם. אחרת די היה להקליד שם משתמש כדי
       לקבל מפתח לחשבון של מישהו אחר.
   ============================================================ */

import {
  attemptKey, checkThrottle, penalize, clearAttempts, AuthError,
} from "./_session.js";
import { identities, byUser, byEmail, writeIdentity } from "./_identity.js";
import {
  hashPassword, passwordProblem, packReset, resetMatches,
  newHandCode, RESET_MINUTES,
} from "./_credentials.js";
import { sendMail, mailerReady, resetLetter } from "./_mailer.js";

/* ⚠ אותה תשובה תמיד. ראו ההערה בראש הקובץ. */
const SAME = {
  ok: true,
  message: "אם קיים חשבון בשם הזה, נשלח אליו קוד בן שש ספרות. "
    + "יש להקליד אותו כאן. הקוד בתוקף לשעה.",
};

export default async function handler(req, res) {
  const key = attemptKey(req);
  try {
    checkThrottle(key);

    /* ---------- בדיקת הקוד ---------- */
    if (req.method === "GET") {
      const token = String(req.query?.token || "");
      const who = String(req.query?.user || "").trim();
      if (!token || !who) return res.status(400).json({ error: "חסר קוד או שם משתמש" });
      const all = await identities();
      const row = forUser(all, who);
      if (!row || !row.reset || !resetMatches(token, stripHand(row.reset))) {
        await penalize(key);
        return res.status(404).json({ error: "הקוד שגוי או שפג תוקפו" });
      }
      return res.status(200).json({ ok: true, name: row.name });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "שיטה לא נתמכת" });
    }

    const body = req.body ?? (await readJson(req));

    /* ============================================================
       קביעת סיסמה חדשה עם אסימון
       ============================================================ */
    if (body?.token) {
      const token = String(body.token);
      const who = String(body?.user || "").trim();
      if (!who) return res.status(400).json({ error: "חסר שם משתמש" });
      const all = await identities();
      const row = forUser(all, who);
      if (!row || !row.reset || !resetMatches(token, stripHand(row.reset))) {
        await penalize(key);
        return res.status(404).json({ error: "הקוד שגוי או שפג תוקפו" });
      }
      if (!row.active) {
        return res.status(403).json({ error: "החשבון אינו פעיל. יש לפנות לצוות" });
      }
      const problem = passwordProblem(body.password, {
        tz: row.kind === "student" ? row.secret : "", user: row.user,
      });
      if (problem) return res.status(400).json({ error: problem });

      await writeIdentity(row, {
        hash: await hashPassword(body.password),
        setAt: new Date().toISOString(),
        /* ⚠ האסימון נשרף מיד. שימוש אחד בלבד. */
        reset: "",
      });
      clearAttempts(key);
      return res.status(200).json({ ok: true, user: row.user || null });
    }

    /* ============================================================
       בקשת איפוס
       ============================================================ */
    const who = String(body?.user || "").trim();
    if (!who) return res.status(400).json({ error: "יש להזין שם משתמש או אימייל" });

    const all = await identities();
    const row = forUser(all, who);

    /* ⚠ אין כאן penalize על "לא נמצא": ההשהיה עצמה הייתה הופכת
       את זמן התשובה לאינדיקציה שהמשתמש קיים. */
    if (!row || !row.active) return res.status(200).json(SAME);

    /* ============================================================
       קוד אחד — נשמר, ואז נשלח
       ------------------------------------------------------------
       ⚠ נשמר **לפני** השליחה. אם השליחה תיכשל, הקוד כבר קיים
         בלוח וניתן לחלץ אותו משם; אילו היה נשמר אחריה, כשל
         באמצע היה משאיר בקשה בלי שום מפתח.
       ============================================================ */
    const code = newHandCode();
    await writeIdentity(row, { reset: `hand:${code}|${packReset(code)}` });

    if (mailerReady() && row.email) {
      const { subject, text } = resetLetter({
        name: row.name, code, minutes: RESET_MINUTES,
      });
      const out = await sendMail({ to: row.email, subject, text });
      /* ⚠ כישלון אינו נחשף למי שביקש — התשובה זהה תמיד. */
      if (!out.sent) console.error("[recover] שליחה נכשלה:", out.reason);
    } else {
      console.error("[recover] אין אימייל או שירות דואר עבור", row.kind);
    }

    return res.status(200).json(SAME);
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    console.error("[recover]", e && e.message);
    res.status(status).json({ error: status === 502 ? "הפעולה נכשלה" : e.message });
  }
}

/** שם משתמש או אימייל → השורה. אותו כלל בכל שלושת המסלולים. */
const forUser = (all, who) => byUser(all, who) || byEmail(all, who) || null;

/**
 * "hand:123456|hash|exp" → "hash|exp"
 * ⚠ הקוד הגלוי נשמר לצד הגיבוב **רק** כדי שהמנהל יוכל להקריא
 *   אותו. הוא בן שש ספרות, תקף לשעה, לשימוש אחד — ומי שרואה
 *   אותו בלוח הוא ממילא מי שמוסר אותו.
 */
function stripHand(stored) {
  const s = String(stored || "");
  return s.startsWith("hand:") ? s.slice(s.indexOf("|") + 1) : s;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
