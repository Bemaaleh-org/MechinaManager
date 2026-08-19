/* ============================================================
   GET  /api/lessons?action=rate   מפגשים שהחניך יכול לדרג
   POST /api/lessons?action=rate   { meetingId, score }  1–10

   דירוג שיעורי המרצה המתחלף (מדעי המדינה, כישורי חיים) על ידי
   החניכים. הממוצע מוצג בחוות הדעת של מחזור ב׳.

   ⚠ פתוח לכל חניך — {student:true}. הדירוג אישי, אבל בניגוד
     לבקשות היציאה הוא אינו מידע רגיש: רק המספר נשמר, והתצוגה
     כלפי חוץ היא ממוצע בלבד.

   ⚠ חניך מדרג מפגש פעם אחת. שם השורה בלוח — "מפגש · חניך" —
     הוא מפתח הכפילות; דירוג חוזר מעדכן את הקיים ולא מוסיף.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { LESSON_BOARDS, LESSON_COLS, PLANNED } from "../shared/lessons-boards.js";
import {
  loadSheets, loadMeetings, loadRatings, ratingFor, invalidateRatings,
} from "./_lessons-data.js";
import { todayFor } from "./_attendance-data.js";

const RT = LESSON_COLS.ratings;

/* כמה ימים אחורה מפגש עדיין ניתן לדירוג. מוגבל כדי שהמסך של
   החניך יציג את השיעורים הטריים ולא את כל השנה. */
const WINDOW_DAYS = 14;

async function handler(req, res, session) {
  if (req.method === "GET") return ratable(req, res, session);
  if (req.method === "POST") return rate(req, res, session);
  return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
}

async function guestMeetings() {
  const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
  const guest = new Map(sheets.filter((s) => s.guestLecturer).map((s) => [s.id, s]));
  return meetings
    .filter((m) => guest.has(m.sheetId) && m.planned === PLANNED.yes)
    .map((m) => ({ ...m, subject: guest.get(m.sheetId).subject }));
}

/* ---------- מה אפשר לדרג ---------- */
async function ratable(req, res, session) {
  try {
    const today = todayFor(req);
    const from = new Date(new Date(today + "T12:00:00Z").getTime() - WINDOW_DAYS * 86400000)
      .toISOString().slice(0, 10);

    const [meetings, ratings] = await Promise.all([guestMeetings(), loadRatings()]);
    const mineRated = new Set(
      ratings.filter((r) => r.studentId === session.itemId).map((r) => r.meetingId));

    const list = meetings
      .filter((m) => m.date >= from && m.date <= today)
      .map((m) => ({
        id: m.id,
        subject: m.subject,
        date: m.date,
        lecturer: m.lecturer || null,
        rated: mineRated.has(m.id),
        myScore: mineRated.has(m.id)
          ? (ratings.find((r) => r.studentId === session.itemId && r.meetingId === m.id) || {}).score
          : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    res.status(200).json({ meetings: list, count: list.length });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[lesson-rate:list]", e);
    res.status(502).json({ error: "שליפת השיעורים לדירוג נכשלה" });
  }
}

/* ---------- דירוג ---------- */
async function rate(req, res, session) {
  try {
    if (!session.isStudent) {
      return res.status(403).json({ error: "הדירוג נעשה על ידי חניכים" });
    }
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || "").trim();
    const score = Number(body?.score);

    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return res.status(400).json({ error: "דירוג הוא מספר שלם בין 1 ל-10" });
    }

    const meetings = await guestMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return res.status(404).json({ error: "המפגש אינו ניתן לדירוג" });

    const today = todayFor(req);
    if (meeting.date > today) {
      return res.status(400).json({ error: "אי אפשר לדרג שיעור שטרם התקיים" });
    }

    const ratings = await loadRatings({ force: true });
    const existing = ratings.find(
      (r) => r.meetingId === meetingId && r.studentId === session.itemId);

    if (existing) {
      /* דירוג חוזר מעדכן — לא שורה שנייה */
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
        { b: LESSON_BOARDS.ratings, i: existing.id, v: JSON.stringify({ [RT.score]: String(score) }) }
      );
    } else {
      await gql(
        `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
        {
          b: LESSON_BOARDS.ratings,
          n: `${meeting.subject} · ${meeting.date} · ${session.name}`,
          v: JSON.stringify({
            [RT.meeting]: meetingId,
            [RT.student]: String(session.itemId),
            [RT.score]: String(score),
            [RT.date]: { date: meeting.date },
          }),
        }
      );
    }

    invalidateRatings();
    const fresh = await loadRatings({ force: true });
    res.status(200).json({ ok: true, meetingId, score, ...ratingFor(meetingId, fresh) });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[lesson-rate:save]", e);
    res.status(502).json({ error: "שמירת הדירוג נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
