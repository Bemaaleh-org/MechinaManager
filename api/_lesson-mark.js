/* ============================================================
   POST /api/lessons?action=mark   { meetingId, happened, note }

   מדווח אם מפגש התקיים בפועל.

   happened: "כן" | "לא" | null
   ⚠ null מחזיר את המפגש ל"טרם דווח" — וזה מצב שלישי אמיתי,
     לא קיצור ל"לא התקיים". מפגש שאיש לא נגע בו אינו מוריד
     ממניין השיעורים שהמרצה העביר.

   ⚠ צוות או אחראי לו״ז. הבדיקה בשרת: אחראי לו״ז הוא חניך, ומי
     שיסיר ממנו את התפקיד בלוח סוגר לו את הגישה בבקשה הבאה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { HAPPENED } from "../shared/lessons-boards.js";
import { loadMeetings, setMeeting } from "./_lessons-data.js";

const VALUES = [HAPPENED.yes, HAPPENED.no];

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || "").trim();
    const happened = body?.happened === null || body?.happened === undefined
      ? null
      : String(body.happened);

    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });
    if (happened !== null && !VALUES.includes(happened)) {
      return res.status(400).json({ error: `ערך לא מוכר: ${happened}` });
    }

    /* ⚠ מהמטמון ולא force. שליפה טרייה כאן משכה את כל 689
       המפגשים בכל לחיצה על "התקיים", וזו הייתה כל האיטיות.
       אם המפגש אינו במטמון — ורק אז — נשלף מחדש. */
    let meetings = await loadMeetings();
    let meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) {
      meetings = await loadMeetings({ force: true });
      meeting = meetings.find((m) => m.id === meetingId);
    }
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    const fields = { happened };
    if (body?.note !== undefined) fields.note = body.note;
    if (body?.lecturer !== undefined) fields.lecturer = body.lecturer;
    if (body?.opinion !== undefined) fields.opinion = body.opinion;

    await setMeeting(meetingId, fields);

    res.status(200).json({
      ok: true, id: meetingId, happened, date: meeting.date,
      lecturer: meeting.lecturer, opinion: meeting.opinion,
    });
  } catch (e) {
    console.error("[lesson-mark]", e);
    res.status(502).json({ error: "עדכון המפגש נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { scheduler: true });
