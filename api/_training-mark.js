/* ============================================================
   POST /api/attendance?action=train
   { meetingId, present: [id], absent: [id], kitchen: [id] }

   נוכחות פרטנית באימון. שלושה מצבים לחניך — נכח, לא נכח,
   תורן אוכל — ומי שלא באף רשימה נשאר "לא סומן".

   ⚠ עצמאית לחלוטין מהנוכחות היומית. תורן אוכל שנעדר מהאימון
     עדיין נוכח באותו יום; חניך חולה לא חייב להיות מסומן
     "לא נכח" באימון. שני רישומים, שתי אמיתות.

   ⚠ מנהל או מוביל שבוע — כמו הסימון היומי. מוביל מוגבל
     למפגש של היום הנוכחי, מאותה סיבה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { activeStudents } from "./_student-rows.js";
import { loadMeetings, loadSheets, setTrainingAttendance } from "./_lessons-data.js";
import { todayFor } from "./_attendance-data.js";

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || "").trim();
    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });

    const [meetings, sheets, students] = await Promise.all([
      loadMeetings(), loadSheets(), activeStudents(),
    ]);
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    const sheet = sheets.find((s) => s.id === meeting.sheetId);
    if (!sheet || !sheet.inDaily) {
      return res.status(400).json({ error: "המפגש אינו מסומן לנוכחות יומית" });
    }

    if (!session.isManager && meeting.date !== todayFor(req)) {
      return res.status(403).json({ error: "מוביל שבוע מסמן את אימון היום בלבד" });
    }

    /* אימות: מזהים מוכרים, וחניך באחת הרשימות בלבד */
    const known = new Set(students.map((s) => s.id));
    const clean = (a) => (Array.isArray(a) ? a.map(String).filter((id) => known.has(id)) : []);
    const present = clean(body.present), absent = clean(body.absent), kitchen = clean(body.kitchen);

    const seen = new Set();
    for (const id of [...present, ...absent, ...kitchen]) {
      if (seen.has(id)) {
        const name = (students.find((s) => s.id === id) || {}).name || id;
        return res.status(400).json({ error: `${name} מופיע ביותר ממצב אחד` });
      }
      seen.add(id);
    }

    const counts = await setTrainingAttendance(meetingId, { present, absent, kitchen });
    res.status(200).json({ ok: true, meetingId, ...counts,
      unmarked: students.length - seen.size });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[training-mark]", e);
    res.status(502).json({ error: "שמירת נוכחות האימון נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { marker: true });
