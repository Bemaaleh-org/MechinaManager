/* ============================================================
   POST /api/auth?action=signin   { user, password }

   שם משתמש וסיסמה — מסלול אחד לצוות ולחניכים.

   ------------------------------------------------------------
   ⚠ **כניסה ראשונה של חניך**: שם המשתמש והסיסמה הם שניהם
     תעודת הזהות. מיד אחריה הוא נדרש לבחור שם וסיסמה קבועים,
     והסשן מסומן `setup` עד שיעשה זאת — ראו _session.js.

     תעודת זהות אינה סוד: היא מופיעה בכל טופס ומוכרת לחברים
     לכיתה. היא מספיקה כדי לפתוח את הדלת פעם אחת, ולכן הדלת
     נסגרת מיד אחריה.

   ⚠ **אותה הודעה לכל כישלון.** "שם משתמש לא קיים" ו"סיסמה
     שגויה" הם שני מסלולים שמלמדים תוקף אילו שמות רשומים.
     ההודעה אחת, והיא זהה גם כשהזיהוי נעשה לפי אימייל — אחרת
     הטופס היה הופך למנוע בדיקה של אילו כתובות רשומות במכינה.

   ⚠ **"אינו פעיל" כן מקבל הודעה נפרדת.** זו תקלה תפעולית
     שהמשתמש צריך לדעת לפנות איתה לצוות, ולא שאלה של סוד —
     והיא מתגלה רק אחרי שהסיסמה כבר אומתה.

   ⚠ ההשהיה הגוברת חלה כאן בדיוק כמו במסלולים הישנים.
   ============================================================ */

import {
  setSession, fingerprint, codeMatches,
  attemptKey, checkThrottle, penalize, clearAttempts, AuthError,
} from "./_session.js";
import { identities, byUser, byEmail, isFresh } from "./_identity.js";
import { verifyPassword, normalizeUser } from "./_credentials.js";
import { traineeRoster } from "./_session.js";

const BAD = "שם משתמש, אימייל או סיסמה שגויים";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  const key = attemptKey(req);
  try {
    checkThrottle(key);

    const body = req.body ?? (await readJson(req));
    const rawUser = String(body?.user || "").trim();
    const password = String(body?.password || "");
    if (!rawUser || !password) {
      return res.status(400).json({ error: "יש להזין שם משתמש וסיסמה" });
    }

    const all = await identities();

    /* ============================================================
       מי זה — שם משתמש **או** אימייל
       ------------------------------------------------------------
       ⚠ שדה אחד לשניהם, ולא בורר. אדם שזה עתה איפס סיסמה דרך
         המייל שלו מנסה להיכנס עם אותה כתובת, כי זה מה שהיה
         מול העיניים שלו לפני שנייה. דרישה שיזכור דווקא את שם
         המשתמש היא בדיוק הרגע שבו הוא נתקע שוב.

       ⚠ אין התנגשות אפשרית: שם משתמש אינו יכול להכיל @
         (ראו USER_RE ב-_credentials.js), ואימייל חייב להכיל
         אותו. שני מרחבי השמות זרים זה לזה.

       ⚠ ואימייל ייחודי לחשבון — _account.js דוחה כתובת שכבר
         רשומה למישהו אחר.
       ============================================================ */
    let row = byUser(all, rawUser) || byEmail(all, rawUser);
    let viaTz = false;

    /* ⚠ טרם נקבעה זהות: מזוהה לפי תעודת הזהות, ורק אם הסיסמה
       היא אותה תעודת זהות. שני התנאים, אחרת די היה לדעת ת"ז
       אחת כדי להיכנס בלי כלום. */
    if (!row) {
      const digits = normalizeUser(rawUser).replace(/\D/g, "");
      if (/^\d{9}$/.test(digits)) {
        const cand = all.find((r) => isFresh(r) && r.secret
          && codeMatches(digits, r.secret));
        if (cand && codeMatches(password.replace(/\D/g, ""), cand.secret)) {
          row = cand; viaTz = true;
        }
      }
    }

    if (!row) {
      await penalize(key);
      return res.status(401).json({ error: BAD });
    }

    /* ---------- הסיסמה ---------- */
    if (!viaTz) {
      const ok = row.hash && await verifyPassword(password, row.hash);
      if (!ok) {
        await penalize(key);
        return res.status(401).json({ error: BAD });
      }
    }

    /* ⚠ אחרי אימות ולא לפניו: מי שאינו יודע את הסיסמה לא
       אמור ללמוד מהתשובה שהחשבון קיים אך כבוי. */
    if (!row.active) {
      await penalize(key);
      return res.status(403).json({
        error: row.kind === "student"
          ? "החניך אינו רשום כפעיל. יש לפנות לצוות"
          : "הכניסה למשתמש הזה כובתה",
      });
    }

    clearAttempts(key);

    /* ⚠ עד שייקבעו שם וסיסמה — הסשן מסומן setup, ו-withAuth
       חוסם כל נקודת קצה אחרת. ראו _session.js. */
    const setup = viaTz || isFresh(row);

    const kind = row.kind === "student" ? "student" : "manager";
    setSession(res, {
      kind, itemId: row.id, name: row.name,
      /* ⚠ טביעת האצבע היא של ה**סוד שבלוח** (ת"ז אצל חניך, קוד
         אצל צוות) ולא של גיבוב הסיסמה — כי זה מה ש-requireAuth
         בודק מול הלוח בכל בקשה.

         המשמעות: החלפת סיסמה אינה מנתקת סשנים פתוחים אחרים.
         זה פער מוכר ומקובל כאן: הסשן קצר ממילא, וכיבוי "פעיל"
         בלוח מנתק מיד — וזו הפעולה שעושים כשמישהו חושש. */
      cfp: fingerprint(row.secret),
      ...(setup ? { setup: true } : {}),
    });

    return res.status(200).json({
      ok: true, kind, name: row.name, setup,
      needsName: false,
      roster: [],
      /* ⚠ מוחזר כדי שמסך ההקמה יוכל להסביר מה נדרש, ולא
         כדי לאמת משהו — האימות כבר קרה. */
      hint: setup ? "יש לבחור שם משתמש וסיסמה קבועים" : null,
    });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    console.error("[signin]", e.message);
    res.status(status).json({ error: status === 502 ? "ההתחברות נכשלה" : e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
