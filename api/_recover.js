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
  hashPassword, passwordProblem, newResetToken, packReset, resetMatches,
  newHandCode, RESET_MINUTES,
} from "./_credentials.js";
import { sendMail, mailerReady, resetLetter } from "./_mailer.js";

/* ⚠ אותה תשובה תמיד. ראו ההערה בראש הקובץ. */
const SAME = {
  ok: true,
  message: "אם קיים חשבון בשם הזה, נשלחה אליו דרך לאיפוס. "
    + "אם אין אימייל רשום — יש לפנות לצוות המכינה לקבלת קוד.",
};

const originOf = (req) => {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  return host ? `${proto}://${host}` : "";
};

export default async function handler(req, res) {
  const key = attemptKey(req);
  try {
    checkThrottle(key);

    /* ---------- בדיקת אסימון ---------- */
    if (req.method === "GET") {
      const token = String(req.query?.token || "");
      if (!token) return res.status(400).json({ error: "חסר אסימון" });
      const all = await identities();
      const row = all.find((r) => r.reset && resetMatches(token, stripHand(r.reset)));
      if (!row) {
        await penalize(key);
        return res.status(404).json({ error: "הקישור פג תוקף או שכבר נעשה בו שימוש" });
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
      const all = await identities();
      const row = all.find((r) => r.reset && resetMatches(token, stripHand(r.reset)));
      if (!row) {
        await penalize(key);
        return res.status(404).json({ error: "הקישור פג תוקף או שכבר נעשה בו שימוש" });
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
    const row = byUser(all, who) || byEmail(all, who);

    /* ⚠ אין כאן penalize על "לא נמצא": ההשהיה עצמה הייתה הופכת
       את זמן התשובה לאינדיקציה שהמשתמש קיים. */
    if (!row || !row.active) return res.status(200).json(SAME);

    const token = newResetToken();
    const canMail = mailerReady() && row.email;

    if (canMail) {
      await writeIdentity(row, { reset: packReset(token) });
      const origin = originOf(req);
      const { subject, text } = resetLetter({
        name: row.name,
        link: `${origin}/?reset=${encodeURIComponent(token)}`,
        minutes: RESET_MINUTES,
      });
      const out = await sendMail({ to: row.email, subject, text });
      /* ⚠ כישלון שליחה אינו נחשף למי שביקש — הוא זהה לכל מצב
         אחר. הוא כן נרשם ללוג, ויש דרך חלופית. */
      if (!out.sent) console.error("[recover] שליחה נכשלה:", out.reason);
    } else {
      /* ⚠ קוד למסירה ביד. נשמר בלוח ואינו חוזר בתשובה. */
      const code = newHandCode();
      await writeIdentity(row, { reset: `hand:${code}|${packReset(code)}` });
    }

    return res.status(200).json(SAME);
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    console.error("[recover]", e && e.message);
    res.status(status).json({ error: status === 502 ? "הפעולה נכשלה" : e.message });
  }
}

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
