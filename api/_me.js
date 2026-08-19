/* ============================================================
   GET  /api/me   — מי מחובר עכשיו
   POST /api/me   { name } — חניך בוחר או מחליף את שמו

   ⚠ שם החניך מוצהר ולא מאומת: הקוד המשותף מזהה "תורן", לא
     תורן מסוים. השם משמש לתפעול ולא כראיה למי ביצע פעולה.
     לכן הוא נבדק רק מול רשימת החניכים הפעילים בלוח.
   ============================================================ */

import { requireAuth, setSession, traineeRoster, AuthError } from "./_session.js";

export default async function handler(req, res) {
  try {
    const session = await requireAuth(req, res);

    if (req.method === "GET") {
      return res.status(200).json({
        kind: session.kind,
        name: session.name,
        isManager: session.isManager,
        needsName: session.kind === "trainee" && !session.name,
        roster: session.kind === "trainee" ? await traineeRoster() : [],
        /* ⚠ נוסף רק לחניך. אצל תורן ומנהל התשובה נשארת זהה
           בתו למה שהייתה, וכך גם התיעוד ב-api-snapshot. */
        ...(session.isStudent ? {
          isStudent: true,
          isLeader: session.isLeader,
          /* התפקידים קובעים אילו מסכים מוצגים לו. נקראים טרי
             מהלוח בכל בקשה, ולכן הסרת תפקיד סוגרת מיד. */
          roles: session.roles || [],
          isScheduler: session.isScheduler,
        } : {}),
      });
    }

    if (req.method === "POST") {
      if (session.isManager) {
        return res.status(403).json({ error: "שם המנהל נקבע לפי הקוד האישי" });
      }
      /* ⚠ שם החניך מגיע מלוח המכינה ומאומת מול תעודת הזהות.
         בניגוד לתורן, אין כאן מה לבחור ואין מה להצהיר. */
      if (session.isStudent) {
        return res.status(403).json({ error: "שם החניך נקבע לפי תעודת הזהות" });
      }
      const body = req.body ?? (await readJson(req));
      const name = String(body?.name || "").trim();

      const roster = await traineeRoster();
      const hit = roster.find((r) => r.name === name);
      if (!hit) return res.status(400).json({ error: "השם אינו ברשימת החניכים הפעילים" });

      // מחדשים את העוגייה עם השם. שאר הפרטים נשארים כפי שהם.
      const current = await requireAuth(req, null);
      setSession(res, {
        kind: current.kind, itemId: current.itemId, name: hit.name,
        cfp: (await cfpOf(req)) ,
      });
      return res.status(200).json({ ok: true, name: hit.name });
    }

    res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 502;
    res.status(status).json({ error: e.message, authRequired: status === 401 });
  }
}

/** טביעת האצבע שבעוגייה הנוכחית — נשמרת כמות שהיא בחידוש */
async function cfpOf(req) {
  const raw = req.headers?.cookie || "";
  const hit = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith("mk_session="));
  const token = hit ? decodeURIComponent(hit.slice("mk_session=".length)) : "";
  const body = token.split(".")[0];
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")).cfp;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
