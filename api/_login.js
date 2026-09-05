/* ============================================================
   POST /api/login   { code }

   קוד משותף  → תורן. השרת יודע "חניך", לא איזה חניך.
   קוד אישי   → מנהל מסוים, בשמו.

   ⚠ הקוד לא חוזר לדפדפן ולא נשמר בעוגייה — רק טביעת אצבע שלו.
   ⚠ רשומה שאינה פעילה נדחית, גם אם הקוד נכון.

   ⚠ **הקוד הוא מסלול הרשמה, לא מסלול כניסה קבוע.** איש צוות
     שנכנס עם קוד וטרם קבע שם משתמש וסיסמה מסומן `setup`,
     ו-withAuth חוסם לו כל נקודת קצה חוץ ממסך ההקמה — בדיוק
     כמו חניך שנכנס עם תעודת זהות.

     הקוד נשאר תקף גם אחר כך: הוא מה שמאפשר לראש המכינה לתת
     גישה למי שאיבד את הכול, בלי לגעת בסיסמאות. אבל מרגע
     שנקבעו שם וסיסמה, הם הדרך הרגילה.
   ============================================================ */

import {
  authRows, traineeRoster, setSession, fingerprint, codeMatches,
  attemptKey, checkThrottle, penalize, clearAttempts, AuthError, KIND,
} from "./_session.js";
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
    const code = String(body?.code || "").trim();
    if (!code) return res.status(400).json({ error: "לא הוזן קוד" });

    // force: בכניסה קוראים טרי, כדי שקוד שהוחלף עכשיו יתפוס מיד
    const rows = await authRows({ force: true });
    const match = rows.find(
      (r) => r.code && (r.kind === KIND.shared || r.kind === KIND.manager) && codeMatches(code, r.code)
    );

    if (!match) {
      await penalize(key);
      return res.status(401).json({ error: "קוד שגוי" });
    }
    if (!match.active) {
      await penalize(key);
      return res.status(403).json({ error: "הכניסה עם הקוד הזה כובתה" });
    }

    clearAttempts(key);

    const isManager = match.kind === KIND.manager;

    /* ⚠ איש צוות שטרם נרשם — הקוד פותח את ההרשמה ולא את
       המערכת. הקוד המשותף של התורנים אינו אדם ואינו נרשם. */
    let setup = false;
    if (isManager) {
      try {
        const me = (await identities()).find((r) => r.id === String(match.id));
        setup = Boolean(me && isFresh(me));
      } catch (e) {
        /* ⚠ כשל בקריאת הזהויות לא נועל את הצוות בחוץ. הוא
           נכנס כרגיל, וייתבקש להירשם בפעם הבאה. */
        console.error("[login] קריאת זהות נכשלה:", e && e.message);
      }
    }

    setSession(res, {
      kind: isManager ? "manager" : "trainee",
      itemId: match.id,
      name: isManager ? match.name : null, // חניך יבחר שם בשלב הבא
      cfp: fingerprint(match.code),
      ...(setup ? { setup: true } : {}),
    });

    res.status(200).json({
      ok: true,
      kind: isManager ? "manager" : "trainee",
      name: isManager ? match.name : null,
      needsName: !isManager,
      setup,
      roster: isManager ? [] : await traineeRoster(),
    });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    console.error("[login]", e.message);
    res.status(status).json({ error: status === 502 ? SERVICE_DOWN : e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
