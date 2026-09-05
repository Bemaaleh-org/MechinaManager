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
import { HAPPENED } from "../shared/lessons-boards.js";
import {
  loadMeetings, loadSheets, setMeeting, ensureEvalForMeeting,
} from "./_lessons-data.js";
import { weeksOfStudent } from "./_leader-weeks.js";
import { israelToday } from "./_attendance-data.js";

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
       ⚠⚠ **מוביל שבוע מדווח על השבוע שלו, ולא על השנה כולה.**

       `{scheduler:true}` פותח את נקודת הקצה לשלושה: צוות, אחראי
       לו״ז, ומוביל שבוע. לשניים הראשונים זה נכון — הלו״ז הוא
       התפקיד שלהם. למוביל שבוע זה היה נותן לסמן כל מפגש בשנה,
       כולל בשבועות של אחרים ובחודשים שלא היה בהם.

       הכלל זהה לזה של סימון הנוכחות (5ב): **התאריך מול הטווח**,
       ולכן ההרשאה עוברת מעצמה כשהשבוע נגמר — בלי שאיש יעשה דבר.

       ⚠ **מי שהוא גם אחראי לו״ז אינו מוגבל.** התפקיד הזה הוא
         על כל הלו״ז, וההגבלה כאן היא על מי שכל סמכותו נובעת
         מהשיבוץ לשבוע.

       ⚠ **וההודעה מונה את השבועות שלו**, ולא אומרת "אין הרשאה":
         מי שנחסם צריך לדעת על מה כן מותר לו (4ע).
       ============================================================ */
    if (session.isStudent && !session.isScheduler) {
      const weeks = await weeksOfStudent(session.itemId);
      /* ⚠ **הסימון הידני בלוח החניכים נותן "היום בלבד".**
         הוא עוקף חירום בלי טווח, ולכן אינו נכנס ל-weeksOfStudent
         (5ב) — אבל הוא כן צריך לאפשר לדווח על היום עצמו, בדיוק
         כמו בסימון הנוכחות (`api/_attendance-day.js`). בלי
         השורה הזו חניך שסומן ידנית קיבל הרשאת מוביל שאינה
         פותחת לו כלום. */
      const inRange = weeks.some((w) => w.start <= meeting.date && meeting.date <= w.end)
        || (session.isLeader && meeting.date === israelToday());
      if (!inRange) {
        const list = weeks.map((w) => `${w.start}–${w.end}`).join(", ");
        return res.status(403).json({
          error: weeks.length
            ? `${meeting.date} אינו באחד השבועות שאתם מובילים (${list})`
            : "דיווח על מפגשים פתוח למי שמוביל שבוע, בימים שבשבוע שלו",
        });
      }
    }

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
