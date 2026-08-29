/* ============================================================
   POST /api/auth?action=signin   { user, password }

   שם משתמש וסיסמה — מסלול אחד לצוות ולחניכים.

   ------------------------------------------------------------
   ⚠ **כניסה ראשונה — הסוד שבלוח בשני השדות.** אצל חניך זו
     תעודת הזהות; אצל איש צוות זהו קוד הכניסה. אותו כלל, אותו
     מסך, אותה שורת הסבר אחת.

     קודם היה לצוות מסלול נפרד (`?action=login`) מאחורי קישור
     "כניסת צוות עם קוד". זה יצר בעיה אמיתית: מי שנכנס פעם
     אחת עם קוד לא ידע מה להקליד בפעם הבאה, כי המסך שראה
     בכניסה הראשונה כלל לא היה המסך הרגיל.

     תעודת זהות וקוד אינם סוד חזק — הם מספיקים כדי לפתוח את
     הדלת פעם אחת, ולכן הדלת נסגרת מיד אחריה: הסשן מסומן
     `setup`, ו-withAuth חוסם כל נקודת קצה עד שייבחרו שם
     משתמש, סיסמה ואימייל.

   ⚠ **הראשון שנכנס עם הקוד הוא זה שתופס את החשבון.** זה נכון
     גם למסלול הקוד הישן, ולכן אינו רגרסיה — אבל זו הסיבה
     שהקודים אינם מסתובבים, ושכדאי שכל אנשי הצוות יירשמו
     בסמוך.

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

    /* ⚠ טרם נקבעה זהות: מזוהה לפי הסוד שבלוח, ורק אם **גם
       הסיסמה** היא אותו סוד. שני התנאים, אחרת די היה לדעת
       ת"ז אחת כדי להיכנס בלי כלום.

       ⚠ **רק שורות `isFresh`.** מי שכבר בחר שם וסיסמה אינו
         נגיש דרך המסלול הזה — אחרת מי שיודע את הקוד היה יכול
         לעקוף את הסיסמה של מנהל רשום.

       ⚠ שתי צורות לכל צד: כפי שהוקלד, וספרות בלבד. ת"ז נכתבת
         לפעמים עם מקף או רווח, וקוד צוות אינו בהכרח מספרי —
         ולכן שניהם נבדקים ולא רק אחד. */
    if (!row) {
      const raw = normalizeUser(rawUser);
      const forms = [raw, raw.replace(/\D/g, "")].filter(Boolean);
      const pws = [password.trim(), password.replace(/\D/g, "")].filter(Boolean);
      const cand = all.find((r) => isFresh(r) && r.secret
        && forms.some((f) => codeMatches(f, r.secret)));
      if (cand && pws.some((pw) => codeMatches(pw, cand.secret))) {
        row = cand; viaTz = true;
      }

      /* ============================================================
         ⚠ **"כבר נרשמת" — החריג היחיד לכלל ההודעה האחידה.**

         מי שנרשם פעם אחת חוזר כעבור חודש, זוכר שנכנס עם תעודת
         הזהות, מקליד אותה בשני השדות — ומקבל "שם משתמש או
         סיסמה שגויים". ההודעה הזו **נכונה ולא עוזרת**: הוא
         מסיק שהחשבון נמחק, ומנסה שוב ושוב את אותו דבר.

         ⚠ **ולמה זה לא שובר את כלל אי-הגילוי (4כח).** ההודעה
           יוצאת רק כששני השדות **זהים זה לזה** ושניהם תואמים
           את הסוד שבלוח — כלומר רק למי שכבר מחזיק בתעודת הזהות
           או בקוד ועשה בדיוק את מחוות הכניסה-הראשונה. זה אינו
           מנוע בדיקה: אי אפשר לשאול אותו "האם X רשום" בלי
           לדעת כבר את הסוד של X.

           שם משתמש שגוי, אימייל שגוי וסיסמה שגויה ממשיכים
           לקבל את אותה הודעה בדיוק, כמו קודם.

         ⚠ **וההשהיה חלה גם כאן.** בלעדיה זמן התשובה עצמו היה
           מבדיל בין רשום ללא-רשום.
         ============================================================ */
      if (!row) {
        const same = forms.some((f) => pws.some((pw) => f === pw));
        const registered = same && all.find((r) => !isFresh(r) && r.secret
          && forms.some((f) => codeMatches(f, r.secret)));
        if (registered) {
          /* ⚠ **בלי penalize כאן.** ההודעה הזו יוצאת רק למי שכבר
         הוכיח שהוא מחזיק בסוד — והוא בדיוק האדם שההודעה נועדה
         לו. השהיה גוברת עליו פירושה שמי שחוזר אחרי חודש, מנסה
         פעמיים את מה שהוא זוכר, וננעל לשש דקות.

         ⚠ והיא גם אינה מוסיפה הגנה: המסלול הזה דורש ידיעת
           הסוד מראש, ולכן אינו מנוע ניחוש. */
      
          return res.status(409).json({
            error: "כבר נרשמת למערכת. יש להיכנס עם שם המשתמש והסיסמה שבחרת"
              + (registered.email ? " — ואם שכחת, אפשר לאפס סיסמה במייל" : ""),
            registered: true,
          });
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
