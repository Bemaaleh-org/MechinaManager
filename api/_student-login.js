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
    res.status(status).json({ error: status === 502 ? "ההתחברות נכשלה" : e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
