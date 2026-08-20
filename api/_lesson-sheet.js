/* ============================================================
   GET  /api/lessons?action=sheet&id=<מזהה>   גיליון אחד ומפגשיו
   POST /api/lessons?action=sheet             יצירת גיליון חדש

   ⚠ צוות או אחראי לו״ז.
   ============================================================ */

import { withAuth } from "./_session.js";
import {
  loadSheets, loadMeetings, countFor, createSheet, invalidateLessons,
  loadEvals, loadRatings, evalForMeeting, ratingFor,
} from "./_lessons-data.js";

async function handler(req, res, session) {
  if (req.method === "GET") return read(req, res, session);
  if (req.method === "POST") return create(req, res, session);
  return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
}

async function read(req, res, session) {
  try {
    const id = String(req.query?.id || "");
    if (!id) return res.status(400).json({ error: "לא צוין גיליון" });

    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
    const sheet = sheets.find((s) => s.id === id);
    if (!sheet) return res.status(404).json({ error: "הגיליון אינו נמצא" });

    /* ⚠ בשיעורי מרצה אורח כל מפגש נושא את הדירוג שהחניכים נתנו
       ואת חוות הדעת שנפתחה לו. הממוצע מחושב חי מלוח הדירוגים,
       כדי שחניך שדירג אחרי הסימון ייספר גם הוא. */
    let evals = [], ratings = [];
    if (sheet.guestLecturer) {
      [evals, ratings] = await Promise.all([loadEvals(), loadRatings()]);
    }

    res.status(200).json({
      sheet,
      counts: countFor(id, meetings),
      meetings: meetings
        .filter((m) => m.sheetId === id)
        .map(({ sheetId, ...rest }) => {
          if (!sheet.guestLecturer) return rest;
          const ev = evalForMeeting(rest.id, evals);
          const r = ratingFor(rest.id, ratings);
          return {
            ...rest,
            evalId: ev ? ev.id : null,
            evalNote: ev ? ev.opinion : null,
            avg: r ? r.avg : null,
            votes: r ? r.votes : 0,
          };
        }),
      canEdit: session.isManager || session.isScheduler,
    });
  } catch (e) {
    console.error("[lesson-sheet:read]", e);
    res.status(502).json({ error: "שליפת הגיליון נכשלה" });
  }
}

async function create(req, res) {
  try {
    const body = req.body ?? (await readJson(req));
    const subject = String(body?.subject || "").trim();
    const lecturer = String(body?.lecturer || "").trim();
    const dayTime = String(body?.dayTime || "").trim();

    if (!subject) return res.status(400).json({ error: "לא הוזן שם השיעור" });

    const sheets = await loadSheets({ force: true });
    if (sheets.some((s) => s.subject === subject)) {
      return res.status(409).json({ error: "כבר קיים גיליון בשם הזה" });
    }

    const id = await createSheet({ subject, lecturer, dayTime });
    invalidateLessons();

    /* ⚠ הגיליון נוצר ריק. המפגשים נוספים אחד אחד או מיובאים —
       יצירה אוטומטית של תאריכים הייתה מנחשת את הלו״ז במקום
       המכינה. */
    res.status(200).json({ ok: true, id, subject, meetings: 0 });
  } catch (e) {
    console.error("[lesson-sheet:create]", e);
    res.status(502).json({ error: "יצירת הגיליון נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { scheduler: true });
