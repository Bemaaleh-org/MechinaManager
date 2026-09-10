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

import { withAuth, actorName } from "./_session.js";
import { lessonRights } from "./_lesson-rights.js";
import { HAPPENED } from "../shared/lessons-boards.js";
import {
  loadMeetings, loadSheets, setMeeting, ensureEvalForMeeting,
} from "./_lessons-data.js";

const VALUES = [HAPPENED.yes, HAPPENED.no];

const mayMark = (session) =>
  Boolean(session.isManager || session.isScheduler
    || session.isLeader || session.leadsAnyWeek);

async function handler(req, res, session) {
  /* ⚠ אותו איחוד כמו בלוח — ראו ההערה ב-api/_lessons-board.js.
     **איזה תאריך** מותר נבדק למטה, מול השבועות של החניך. */
  if (!mayMark(session)) {
    return res.status(403).json({
      error: "דיווח על מפגשים פתוח לצוות, לאחראי הלו״ז ולמובילי השבוע.",
    });
  }

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

    /* ============================================================
       ⚠⚠⚠ **מובילי שבוע ירדו מכאן לגמרי** (החלטת ראש המכינה,
       10.9.2026): *"תוריד באופן מוחלט את ההרשאות של מובילי שבוע
       לגבי סימון שיעורים האם התקיים או לא התקיים, זה מעכשיו
       יתבצע אך ורק על ידי אחראי לו״ז בלבד."*

       מה שהיה כאן: `{scheduler:true}` פתח את נקודת הקצה גם
       למוביל שבוע, ובדיקת טווח הגבילה אותו למפגשים של השבועות
       שהוא מוביל — הכלל של 4ע ו-5ב. **זה בוטל.** הבדיקה כולה
       ירדה, ואיתה הייבוא של `weeksOfStudent`.

       ⚠ **הם עדיין רואים את לוח השיעורים** (`mayBoard` ב-
         `_lessons-board.js` לא השתנה) — מוביל שבוע צריך לדעת
         מה הלו״ז. מה שנסגר הוא הדיווח.

       ⚠ **ו-`canMark` מוחזר ללוח** כדי שהכפתור לא יופיע ויקבל
         403 אחרי הלחיצה (4יד).

       ⚠ **והוועדה כן נכנסה** — היא זו שמסמנת "התקיים" לפני
         שהיא כותבת חוות דעת (5כח). שער אחד: `lessonRights`.
       ============================================================ */
    const rights = await lessonRights(session);
    if (!rights.write) return res.status(403).json({ error: rights.hint });

    const fields = { happened };
    if (body?.note !== undefined) fields.note = body.note;
    if (body?.lecturer !== undefined) fields.lecturer = body.lecturer;
    if (body?.opinion !== undefined) fields.opinion = body.opinion;

    await setMeeting(meetingId, fields);

    /* ⚠ שיעור מרצה אורח שסומן "התקיים" פותח חוות דעת במחזור ב׳.
       זה הצינור שהעביר את דירוגי החניכים למסך: בלעדיו הדירוג
       נשמר בלוח ולא הופיע בשום מקום. אידמפוטנטי — סימון חוזר
       לא פותח שורה שנייה.

       ⚠ כשל כאן לא מפיל את הסימון עצמו. הדיווח שהשיעור התקיים
         הוא הפעולה שהמשתמש ביקש; חוות הדעת היא תוצר לוואי,
         ותיפתח בסימון הבא. */
    let evalRow = null;
    if (happened === HAPPENED.yes) {
      try {
        const sheets = await loadSheets();
        const sheet = sheets.find((s) => s.id === meeting.sheetId);
        if (sheet && sheet.guestLecturer) {
          const lecturer = fields.lecturer !== undefined ? fields.lecturer : meeting.lecturer;
          evalRow = await ensureEvalForMeeting({
            meeting: { ...meeting, lecturer }, sheet, by: actorName(session),
          });
        }
      } catch (e) {
        console.error("[lesson-mark:eval]", e);
      }
    }

    res.status(200).json({
      ok: true, id: meetingId, happened, date: meeting.date,
      lecturer: meeting.lecturer, opinion: meeting.opinion,
      evalId: evalRow ? evalRow.id : null,
      evalCreated: Boolean(evalRow && evalRow.created),
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

export default withAuth(handler, { student: true });
