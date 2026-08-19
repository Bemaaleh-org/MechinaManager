/* ============================================================
   POST /api/lessons?action=meeting
   { sheetId, date, planned, reason, note }

   מוסיף מפגש לגיליון קיים. נשמר ב-monday מיד.

   ⚠ שם היום נגזר מהתאריך ולא מתקבל מהלקוח — ראו addMeeting
     ב-_lessons-data.js.

   ⚠ מפגש כפול לאותו תאריך נחסם. בייבוא מהקובץ המקורי היו שתי
     כפילויות כאלה, והן נראו זהות עד שבדקנו את סיבת הביטול.
   ============================================================ */

import { withAuth } from "./_session.js";
import { PLANNED } from "../shared/lessons-boards.js";
import {
  loadSheets, loadMeetings, addMeeting, updateMeeting, removeMeeting,
} from "./_lessons-data.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res) {
  if (req.method === "POST") return create(req, res);
  if (req.method === "PUT") return edit(req, res);
  if (req.method === "DELETE") return remove(req, res);
  return res.status(405).json({ error: "רק POST, PUT ו-DELETE נתמכים כאן" });
}

async function create(req, res) {
  try {
    const body = req.body ?? (await readJson(req));
    const sheetId = String(body?.sheetId || "").trim();
    const date = String(body?.date || "").trim();
    const planned = String(body?.planned || PLANNED.yes);
    const reason = String(body?.reason || "").trim();
    const note = String(body?.note || "").trim();

    if (!sheetId) return res.status(400).json({ error: "לא צוין גיליון" });
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: "תאריך לא תקין. הפורמט: YYYY-MM-DD" });
    }
    if (![PLANNED.yes, PLANNED.no].includes(planned)) {
      return res.status(400).json({ error: "לא צוין אם המפגש מתוכנן" });
    }
    if (planned === PLANNED.no && !reason) {
      return res.status(400).json({ error: "מפגש שלא יתקיים מחייב סיבת ביטול" });
    }

    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
    const sheet = sheets.find((s) => s.id === sheetId);
    if (!sheet) return res.status(404).json({ error: "הגיליון אינו נמצא" });

    const clash = meetings.find((m) => m.sheetId === sheetId && m.date === date);
    if (clash) {
      return res.status(409).json({ error: "כבר קיים מפגש בתאריך הזה בגיליון" });
    }

    const id = await addMeeting({
      sheetId, sheetName: sheet.subject, date, planned, reason, note,
    });

    res.status(200).json({ ok: true, id, date, planned });
  } catch (e) {
    console.error("[lesson-meeting:create]", e);
    res.status(502).json({ error: "הוספת המפגש נכשלה" });
  }
}

/* ---------- עריכה ---------- */
async function edit(req, res) {
  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || "").trim();
    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });

    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    const sheet = sheets.find((s) => s.id === meeting.sheetId);
    if (!sheet) return res.status(404).json({ error: "הגיליון אינו נמצא" });

    const fields = {};
    if (body?.date !== undefined) {
      const date = String(body.date).trim();
      if (!DATE_RE.test(date)) {
        return res.status(400).json({ error: "תאריך לא תקין. הפורמט: YYYY-MM-DD" });
      }
      /* ⚠ אין שתי שורות לאותו תאריך באותו גיליון */
      const clash = meetings.find(
        (m) => m.sheetId === meeting.sheetId && m.date === date && m.id !== meetingId);
      if (clash) return res.status(409).json({ error: "כבר קיים מפגש בתאריך הזה בגיליון" });
      fields.date = date;
    }

    const planned = body?.planned === undefined ? meeting.planned : String(body.planned);
    if (![PLANNED.yes, PLANNED.no].includes(planned)) {
      return res.status(400).json({ error: "ערך לא מוכר בשדה 'יתקיים'" });
    }
    const reason = body?.reason === undefined ? (meeting.reason || "") : String(body.reason).trim();
    if (planned === PLANNED.no && !reason) {
      return res.status(400).json({ error: "מפגש שלא יתקיים מחייב סיבת ביטול" });
    }
    fields.planned = planned;
    fields.reason = planned === PLANNED.no ? reason : "";
    if (body?.note !== undefined) fields.note = String(body.note).trim();

    const after = await updateMeeting(meetingId, sheet.subject, fields);
    res.status(200).json({ ok: true, id: meetingId, meeting: after });
  } catch (e) {
    console.error("[lesson-meeting:edit]", e);
    res.status(502).json({ error: "עדכון המפגש נכשל" });
  }
}

/* ---------- מחיקה ---------- */
async function remove(req, res) {
  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || req.query?.id || "").trim();
    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });

    const meetings = await loadMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    await removeMeeting(meetingId);
    res.status(200).json({ ok: true, id: meetingId, date: meeting.date });
  } catch (e) {
    console.error("[lesson-meeting:delete]", e);
    res.status(502).json({ error: "מחיקת המפגש נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { scheduler: true });
