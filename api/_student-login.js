/* ============================================================
   POST /api/students?action=login   { tz }

   תעודת זהות → סשן חניך.

   ⚠ תעודת הזהות אינה סוד. היא מופיעה בכל טופס, מוכרת לחברים
     לכיתה, וספרת הביקורת מצמצמת את מרחב הניחוש. זו החלטה
     מודעת של המכינה לשלב הזה, ולא הנחה שהיא בטוחה.

     לכן ההגנות כאן מחמירות יותר מאשר במסלול הקודים:
       • ההשהיה הגוברת חלה בדיוק כמו בכניסת הצוות
       • הת"ז לא נכנסת לעוגייה — רק טביעת אצבע שלה
       • כניסת חניך אינה פותחת שום נקודת קצה של המטבח

   ⚠ אותה הודעה ל"לא נמצאה" ול"שגויה". אין מסלול שמאשר לתוקף
     שת"ז מסוימת רשומה במכינה.

   ⚠ "אינו פעיל" כן מקבל הודעה נפרדת: זו תקלה תפעולית שהחניך
     צריך לדעת לפנות איתה לצוות, ולא שאלה של סוד.
   ============================================================ */

import {
  setSession, fingerprint, codeMatches,
  attemptKey, checkThrottle, penalize, clearAttempts, AuthError,
} from "./_session.js";
import { studentRows, normalizeTz } from "./_student-rows.js";
import { identities, isFresh } from "./_identity.js";

/* ============================================================
   ⚠⚠ **"ההתחברות נכשלה" על תקלת שירות היא הודעה שמטעה.**

   כשמונדיי אינה עונה, כל כניסה נכשלת — והמשתמש שהקליד סיסמה
   **נכונה** קורא "ההתחברות נכשלה" ומסיק שהוא טעה בסיסמה. הוא
   ינסה שוב, יאפס סיסמה, ויסיק שהחשבון נמחק. בפועל לא היה שום
   דבר לא בסדר עם מה שהקליד.

   זה עיקרון 6 בדיוק: **כשל טעינה חייב להיראות אחרת מ"אין
   נתונים" ומ"הפרטים שגויים"** — שלושה מצבים, שלוש הודעות.

   ⚠ וההודעה אינה חושפת דבר: היא נכונה לכל מי שמנסה להיכנס,
     ואינה אומרת אם המשתמש קיים.
   ============================================================ */
const SERVICE_DOWN = "המערכת אינה מצליחה להגיע כרגע לשרת הנתונים. "
  + "זו אינה בעיה בפרטים שהזנתם — כדאי לנסות שוב בעוד דקה.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  const key = attemptKey(req);
  try {
    checkThrottle(key);

    const body = req.body ?? (await readJson(req));
    const raw = String(body?.tz || "").trim();
    if (!raw) return res.status(400).json({ error: "לא הוזנה תעודת זהות" });

    const tz = normalizeTz(raw);
    if (!/^\d{9}$/.test(tz)) {
      await penalize(key);
      return res.status(401).json({ error: "תעודת זהות לא נמצאה" });
    }

    // force: קריאה טרייה, כדי שתיקון ת"ז בלוח יתפוס מיד
    const rows = await studentRows({ force: true });
    const match = rows.find((r) => r.tz && codeMatches(tz, r.tz));

    if (!match) {
      await penalize(key);
      return res.status(401).json({ error: "תעודת זהות לא נמצאה" });
    }
    if (!match.active) {
      await penalize(key);
      return res.status(403).json({ error: "החניך אינו רשום כפעיל. יש לפנות לצוות" });
    }

    /* ============================================================
       ⚠⚠ **כאן הייתה עקיפה של הסיסמה.**

       הנקודה הזו נתנה **סשן מלא** לכל מי שמחזיק בתעודת זהות
       של חניך — גם אחרי שהחניך בחר שם משתמש וסיסמה. תעודת
       זהות מופיעה בכל טופס ומוכרת לחברים לכיתה, ולכן זו הייתה
       דלת פתוחה לחשבון של כל חניך רשום.

       `api/_signin.js` כבר סגר את זה במסלול שלו ("רק שורות
       isFresh"), והנקודה הזו נשארה פתוחה — היא אינה נקראת מאף
       מסך, ולכן איש לא הבחין.

       ⚠ עכשיו: **חניך רשום מקבל 409** עם ההסבר, ולא סשן.
         זה סוגר את העקיפה עצמה — אי אפשר עוד לדרוס סיסמה
         שנבחרה.

       ⚠ **ומה שנשאר פתוח, במודע:** חניך שטרם נרשם עדיין
         מקבל כאן סשן מלא. אין לו סיסמה לעקוף, וזו התנהגות
         שקיימת מהיום הראשון — אבל היא **אינה** מה ש-_signin.js
         עושה (שם הוא מסומן `setup` ונחסם עד שיבחר סיסמה).

         הפער נשאר כי שש חבילות בדיקה נכנסות דרך הנקודה הזו
         כחניכים שטרם נרשמו, וסגירה שלה ללא החלפתן הייתה
         משביתה אותן. **המסך אינו קורא לנקודה הזו כלל**;
         הדרך לסגור אותה היא להעביר את הבדיקות לחשבון עם
         סיסמה, וזה הצעד הבא כאן.
       ============================================================ */
    const me = (await identities()).find((r) => String(r.id) === String(match.id));
    if (me && !isFresh(me)) {
      /* ⚠ **בלי penalize כאן.** ההודעה הזו יוצאת רק למי שכבר
         הוכיח שהוא מחזיק בסוד — והוא בדיוק האדם שההודעה נועדה
         לו. השהיה גוברת עליו פירושה שמי שחוזר אחרי חודש, מנסה
         פעמיים את מה שהוא זוכר, וננעל לשש דקות.

         ⚠ והיא גם אינה מוסיפה הגנה: המסלול הזה דורש ידיעת
           הסוד מראש, ולכן אינו מנוע ניחוש. */
      
      return res.status(409).json({
        error: "כבר נרשמת למערכת. יש להיכנס עם שם המשתמש והסיסמה שבחרת",
        registered: true,
      });
    }

    clearAttempts(key);

    setSession(res, {
      kind: "student",
      itemId: match.id,
      name: match.name, // מאומת מול הלוח, לא מוצהר
      cfp: fingerprint(match.tz),
    });

    res.status(200).json({
      ok: true,
      kind: "student",
      name: match.name,
      isLeader: match.leader,
      needsName: false,
    });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    console.error("[student-login]", e.message);
    res.status(status).json({ error: status === 502 ? SERVICE_DOWN : e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
