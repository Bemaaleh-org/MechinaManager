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
import { lessonRights } from "./_lesson-rights.js";
import { stampChange } from "./_lesson-changes.js";
import { gql } from "./_monday.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";

const S = LESSON_COLS.sheets;

async function handler(req, res, session) {
  /* ⚠ שער אחד לארבע נקודות הקצה של הלו״ז — ראו
     `api/_lesson-rights.js`. קריאה: צוות · אחראי הלו״ז · ועדת
     קבוצה ותוכן. כתיבה: ראש המכינה · אחראי הלו״ז · הוועדה. */
  const rights = await lessonRights(session);
  if (!rights.read) return res.status(403).json({ error: rights.readHint });
  if (req.method !== "GET" && !rights.write) {
    return res.status(403).json({ error: rights.hint });
  }

  if (req.method === "GET") return read(req, res, session, rights);
  if (req.method === "POST") return create(req, res, session);
  if (req.method === "PUT") return edit(req, res, session);
  return res.status(405).json({ error: "רק GET, POST ו-PUT נתמכים כאן" });
}

async function read(req, res, session, rights) {
  try {
    const id = String(req.query?.id || "");
    if (!id) return res.status(400).json({ error: "לא צוין גיליון" });

    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
    const sheet = sheets.find((s) => s.id === id);
    if (!sheet) return res.status(404).json({ error: "הגיליון אינו נמצא" });

    /* ⚠ כל מפגש נושא את הדירוג שהחניכים נתנו ואת חוות הדעת
       שנפתחה לו. הממוצע מחושב חי מלוח הדירוגים, כדי שחניך
       שדירג אחרי הסימון ייספר גם הוא.

       ⚠⚠ **ולא רק בגיליון "מרצה מתחלף".** התנאי הזה היה כאן
         כחיסכון, ומרגע שאפשר לכתוב חוות דעת גם על מפגש בגיליון
         רגיל הוא הופך לבאג: בלי `evalId` המסך אינו יודע ששורה
         כבר נפתחה, מציג שוב "הוספת חוות דעת", **ולחיצה שנייה
         פותחת שורה שנייה לאותו מפגש**. ואין כאן חיסכון של ממש —
         שתי הטעינות ממוטמעות ומשותפות לכל הבקשה. */
    const [evals, ratings] = await Promise.all([loadEvals(), loadRatings()]);

    res.status(200).json({
      sheet,
      counts: countFor(id, meetings),
      meetings: meetings
        .filter((m) => m.sheetId === id)
        .map(({ sheetId, ...rest }) => {
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
      canEdit: rights.write,
      editHint: rights.write ? null : rights.hint,
    });
  } catch (e) {
    console.error("[lesson-sheet:read]", e);
    res.status(502).json({ error: "שליפת הגיליון נכשלה" });
  }
}

async function create(req, res, session) {
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
    /* ⚠ **גם יצירה היא שינוי ביומן החיצוני** — היא מוסיפה לו
       אירוע. הבקשה אמרה "הוזז, שונה או נמחק", והשלישייה הזו
       מתארת את מה שקורה לגיליון קיים; גיליון חדש דורש בדיוק
       את אותה פעולה, ולהשמיט אותו היה משאיר את היומן חסר. */
    await stampChange(id, "נוצר גיליון חדש" + (dayTime ? " — " + dayTime : ""), session);

    /* ⚠ הגיליון נוצר ריק. המפגשים נוספים אחד אחד או מיובאים —
       יצירה אוטומטית של תאריכים הייתה מנחשת את הלו״ז במקום
       המכינה. */
    res.status(200).json({ ok: true, id, subject, meetings: 0 });
  } catch (e) {
    console.error("[lesson-sheet:create]", e);
    res.status(502).json({ error: "יצירת הגיליון נכשלה" });
  }
}

/* ============================================================
   עריכת הגיליון — שם המרצה ופרטי הקשר אליו
   ------------------------------------------------------------
   ⚠ **פרטי הקשר יושבים כאן ולא בחוות הדעת.** חוות דעת היא
     אירוע; הגיליון הוא הקשר המתמשך. מי שצריך לתאם מפגש מחפש
     את המספר במקום שבו השיעור נמצא, לא ברשימת ההערות עליו.

   ⚠ **מיפוי מפורש ולא פריסה** — שדה שאינו ברשימה אינו נכתב,
     כדי שעמודה חדשה בלוח לא תיפתח לכתיבה מעצמה (4ש).

   ⚠ **שדה שלא נשלח אינו נוגע בערך הקיים; שדה ריק כן מנקה.**
     `undefined` ו-`""` הם שתי כוונות שונות, ואיחוד שלהן היה
     מוחק את הטלפון בכל שמירה שנעשתה מטופס שלא כלל אותו.
   ============================================================ */
const FIELDS = {
  lecturer: { col: S.lecturer, max: 200, label: "שם המרצה" },
  phone: { col: S.phone, max: 80, label: "טלפון המרצה" },
  mail: { col: S.mail, max: 160, label: "אימייל המרצה" },
  contact: { col: S.contact, max: 2000, label: "פרטי קשר נוספים" },
  dayTime: { col: S.dayTime, max: 120, label: "יום ושעה" },
};

async function edit(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));
    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין גיליון" });

    const sheet = (await loadSheets()).find((x) => x.id === id);
    if (!sheet) return res.status(404).json({ error: "הגיליון אינו נמצא" });

    const cols = {};
    const changed = [];
    for (const [key, f] of Object.entries(FIELDS)) {
      if (body[key] === undefined) continue;
      const next = String(body[key] ?? "").trim().slice(0, f.max);
      /* ⚠ התשובה אומרת מה השתנה **בפועל** ולא "נשמר". שדה
         שנשלח זהה לקיים אינו נספר, והמסך אומר אמת (4ש). */
      if (next === (sheet[key] || "")) continue;
      cols[f.col] = next;
      changed.push(f.label);
    }

    if (!changed.length) return res.status(200).json({ ok: true, changed: [] });

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                       create_labels_if_missing:false){ id } }`,
      { b: LESSON_BOARDS.sheets, i: id, v: JSON.stringify(cols) });
    invalidateLessons();

    /* ⚠ **רק שינוי שנוגע ליומן.** טלפון ואימייל של המרצה אינם
       משנים דבר במה שרשום ביומן החיצוני, והתראה עליהם הייתה
       מאמנת להתעלם מכל השאר (5כה). יום ושעה כן, ושם המרצה כן
       — הוא מה שכתוב בכותרת האירוע. */
    const inCal = changed.filter((x) => x === FIELDS.dayTime.label || x === FIELDS.lecturer.label);
    if (inCal.length) {
      await stampChange(id, "שונה בגיליון: " + inCal.join(" · "), session);
    }

    res.status(200).json({ ok: true, id, changed });
  } catch (e) {
    console.error("[lesson-sheet:edit]", e);
    res.status(502).json({ error: "עדכון הגיליון נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
