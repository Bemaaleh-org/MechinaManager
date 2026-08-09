/* ============================================================
   POST /api/login   { code }

   קוד משותף  → תורן. השרת יודע "חניך", לא איזה חניך.
   קוד אישי   → מנהל מסוים, בשמו.

   ⚠ הקוד לא חוזר לדפדפן ולא נשמר בעוגייה — רק טביעת אצבע שלו.
   ⚠ רשומה שאינה פעילה נדחית, גם אם הקוד נכון.
   ============================================================ */

import {
  authRows, traineeRoster, setSession, fingerprint, codeMatches,
  attemptKey, checkThrottle, penalize, clearAttempts, AuthError, KIND,
} from "./_session.js";

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
    setSession(res, {
      kind: isManager ? "manager" : "trainee",
      itemId: match.id,
      name: isManager ? match.name : null, // חניך יבחר שם בשלב הבא
      cfp: fingerprint(match.code),
    });

    res.status(200).json({
      ok: true,
      kind: isManager ? "manager" : "trainee",
      name: isManager ? match.name : null,
      needsName: !isManager,
      roster: isManager ? [] : await traineeRoster(),
    });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    console.error("[login]", e.message);
    res.status(status).json({ error: status === 502 ? "ההתחברות נכשלה" : e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
