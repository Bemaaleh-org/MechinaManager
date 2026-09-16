/* ============================================================
   POST /api/lessons?action=meeting
   { sheetId, date, planned, reason, note }

   מוסיף מפגש לגיליון קיים. נשמר ב-monday מיד.

   ⚠ שם היום נגזר מהתאריך ולא מתקבל מהלקוח — ראו addMeeting
     ב-_lessons-data.js.

   ⚠⚠ **שני מפגשים באותו יום — מותר, ועם אישור**
     (בקשת ראש המכינה, 16.9.2026: *"בכל גיליון ובייחוד
     בגליונות השיעורים המתחלפים אי אפשר להוסיף יותר
     משיעור אחד ביום מסוים … לפעמים יש שני שיעורי
     מדעי המדינה באותו היום"*).

     קודם זה היה **409 חוסם**, והנימוק היה הייבוא: בקובץ
     המקורי היו שתי כפילויות שנראו זהות. אבל שני שיעורים
     באותו יום הם מצב אמיתי במכינה, וחסימה שלו שלחה
     את אחראי הלו״ז ל-monday — וזה בדיוק מה שהאפליקציה
     נועדה למנוע.

     ⚠ **החיכוך נשאר, הקיר ירד.** בלי `same:true` התשובה
       היא 409 שאומר **כמה כבר יש באותו יום** (`sameDate`),
       והמסך מבקש אישור ושולח שוב. לחיצה כפולה או
       ייבוא שמכפיל עדיין נעצרים — אותו דפוס של "החיכוך
       הוא העניין" (4טז), ולא חסימה שאין לה מוצא.

     ⚠ **והדגל אינו עובר בייבוא ולא בזריעה** — רק מהמסך,
       אחרי שאדם ראה מה כבר קיים באותו יום.
   ============================================================ */

import { withAuth } from "./_session.js";
import { lessonRights } from "./_lesson-rights.js";
import { stampChange, dm } from "./_lesson-changes.js";
import { PLANNED } from "../shared/lessons-boards.js";
import {
  loadSheets, loadMeetings, addMeeting, updateMeeting, removeMeeting,
} from "./_lessons-data.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ============================================================
   ⚠⚠⚠ **הצמצום לפי גיליון נשכח כאן לגמרי.**

   `rights.write` הוא בוליאני גורף, והוא היה הבדיקה
   היחידה בשלושת המסלולים. כלומר חבר ועדה יכול היה
   **להוסיף, להזיז ולמחוק מפגשים בכל גיליון במכינה** —
   אימונים, תנ״ך, מליאה.

   `_lesson-mark.js` כן מצמצם (`rights.limited` + `mayWrite`),
   והקובץ הזה נשאר מאחור — אותו דפוס של "5יז שנשאר
   מאחור". זה הכלל שכתוב ב-`shared/lessons-boards.js`: הועדה
   עורכת את הגיליונות שלה ולא את כולם.

   ⚠ **הגיליון נלקח מהמפגש ולא מגוף הבקשה** בעריכה
     ובמחיקה, אחרת היה אפשר לעקוף בשליחת מזהה
     של גיליון אחר (4כב).

   ⚠ **404 ולא 403** — 403 מאשר שהשורה קיימת (4נ).
   ============================================================ */
const outOfScope = (rights, sheet) => rights.limited && !rights.mayWrite(sheet);
const NOT_FOUND = { error: "הגיליון אינו נמצא" };

async function handler(req, res, session) {
  const rights = await lessonRights(session);
  if (!rights.write) return res.status(403).json({ error: rights.hint });

  if (req.method === "POST") return create(req, res, session, rights);
  if (req.method === "PUT") return edit(req, res, session, rights);
  if (req.method === "DELETE") return remove(req, res, session, rights);
  return res.status(405).json({ error: "רק POST, PUT ו-DELETE נתמכים כאן" });
}

async function create(req, res, session, rights) {
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
    if (!sheet) return res.status(404).json(NOT_FOUND);
    if (outOfScope(rights, sheet)) return res.status(404).json(NOT_FOUND);

    /* ⚠ אישור מפורש ולא חסימה — ראו ראש הקובץ. */
    const same = meetings.filter((m) => m.sheetId === sheetId && m.date === date);
    if (same.length && body?.same !== true) {
      return res.status(409).json({
        error: same.length === 1
          ? "כבר קיים מפגש בתאריך הזה בגיליון"
          : `כבר קיימים ${same.length} מפגשים בתאריך הזה בגיליון`,
        /* ⚠ המספר הוא מה שמבדיל בין "אסור" לבין "בטוחה?" —
           בלעדיו המסך אינו יודע שיש לו מה להציע. */
        sameDate: same.length,
      });
    }

    const id = await addMeeting({
      sheetId, sheetName: sheet.subject, date, planned, reason, note,
    });

    await stampChange(sheetId, `נוסף מפגש ב-${dm(date)}`, session);

    res.status(200).json({ ok: true, id, date, planned });
  } catch (e) {
    console.error("[lesson-meeting:create]", e);
    res.status(502).json({ error: "הוספת המפגש נכשלה" });
  }
}

/* ---------- עריכה ---------- */
async function edit(req, res, session, rights) {
  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || "").trim();
    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });

    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    const sheet = sheets.find((s) => s.id === meeting.sheetId);
    if (!sheet) return res.status(404).json(NOT_FOUND);
    /* ⚠ מהמפגש, ולא מגוף הבקשה. */
    if (outOfScope(rights, sheet)) {
      return res.status(404).json({ error: "המפגש אינו נמצא" });
    }

    const fields = {};
    if (body?.date !== undefined) {
      const date = String(body.date).trim();
      if (!DATE_RE.test(date)) {
        return res.status(400).json({ error: "תאריך לא תקין. הפורמט: YYYY-MM-DD" });
      }
      /* ⚠ אותו אישור כמו ביצירה: הזזת מפגש ליום שכבר
         יש בו אחד היא אותה פעולה בדיוק, ושתי התנהגויות
         שונות היו הדרך לעקוף את הראשונה (5יח: כללים
         בפונקציה אחת להגשה ולעריכה). */
      const same = meetings.filter(
        (m) => m.sheetId === meeting.sheetId && m.date === date && m.id !== meetingId);
      if (same.length && body?.same !== true) {
        return res.status(409).json({
          error: same.length === 1
            ? "כבר קיים מפגש בתאריך הזה בגיליון"
            : `כבר קיימים ${same.length} מפגשים בתאריך הזה בגיליון`,
          sameDate: same.length,
        });
      }
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

    /* ⚠ **"הוזז" ו"שונה" הם שני דברים ביומן החיצוני.**
       הזזה דורשת לגרור את האירוע ליום אחר; ביטול דורש למחוק
       אותו. הודעה אחת לשניהם הייתה מחזירה את אחראי הלו״ז
       לפתוח את המערכת כדי לדעת מה לעשות — וזה בדיוק מה
       שההתראה נועדה לחסוך. */
    const moved = fields.date && fields.date !== meeting.date;
    const off = planned === PLANNED.no && meeting.planned !== PLANNED.no;
    const back = planned !== PLANNED.no && meeting.planned === PLANNED.no;
    const what = moved
      ? `המפגש ב-${dm(meeting.date)} הוזז ל-${dm(fields.date)}`
      : off ? `המפגש ב-${dm(meeting.date)} לא יתקיים${reason ? " — " + reason : ""}`
      : back ? `המפגש ב-${dm(meeting.date)} חזר ללו״ז`
      : null;
    /* ⚠ שינוי שאינו נוגע ביומן (הערה תפעולית) — אין עליו
       מה להתריע. התראה על כל שמירה מאמנת להתעלם (5כה). */
    if (what) await stampChange(sheet.id, what, session);

    res.status(200).json({ ok: true, id: meetingId, meeting: after });
  } catch (e) {
    console.error("[lesson-meeting:edit]", e);
    res.status(502).json({ error: "עדכון המפגש נכשל" });
  }
}

/* ---------- מחיקה ---------- */
async function remove(req, res, session, rights) {
  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || req.query?.id || "").trim();
    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });

    const meetings = await loadMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    /* ⚠ וגם במחיקה — הגיליון מהמפגש. */
    if (rights.limited) {
      const sheet = (await loadSheets()).find((x) => x.id === meeting.sheetId);
      if (!sheet || !rights.mayWrite(sheet)) {
        return res.status(404).json({ error: "המפגש אינו נמצא" });
      }
    }

    await removeMeeting(meetingId);
    await stampChange(meeting.sheetId, `המפגש ב-${dm(meeting.date)} נמחק`, session);
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

/* ⚠ שער אחד ללו״ז — ראו api/_lesson-rights.js. `{student:true}`
   כי חבר ועדת קבוצה ותוכן הוא חניך (4כב). */
export default withAuth(handler, { student: true });
