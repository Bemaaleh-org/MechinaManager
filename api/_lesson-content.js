/* ============================================================
   /api/lessons?action=content   — מה היה בשיעור, ודפי העזר
   /api/lessons?action=archive   — "השיעורים שהיו", לחניך

   ------------------------------------------------------------
   ⚠⚠ **המפגש הופך מרשומת דיווח לרשומת תוכן.**

   עד היום מפגש נשא שאלה אחת: התקיים או לא. מה שנאמר בו נשאר
   אצל מי שהיה שם, ובסוף השנה אי אפשר היה לומר על שיעור בנובמבר
   יותר מ"הוא התקיים". שלוש עמודות משנות את זה — סיכום, דפי
   עזר ותיבת "פתוח לדירוג" — וזה כל מה שנוסף ללוח.

   ⚠ **`summary` נפרד מ-`note` בכוונה.** `note` היא הערה
     תפעולית של אחראי הלו״ז ("המרצה איחר בחצי שעה", "הועבר
     לכיתה ב׳") ו**אינה יוצאת לחניך**. הסיכום נכתב **כדי**
     שהחניכים יקראו אותו. עמודה אחת לשניהם הייתה מדליפה את
     הראשונה או מוחקת אותה.

   ⚠⚠ **הארכיון פתוח לכל חניך, והמיפוי שלו מפורש ונפרד.**
     גיליון נושא טלפון ואימייל של מרצה חיצוני ומחיר למפגש
     (`shared/lessons-boards.js`), ופריסה של `...sheet` הייתה
     מדליפה את כולם. מה שיוצא לחניך: נושא, תאריך, שם המרצה,
     סיכום, קבצים ודירוג. לא מחיר, לא טלפון, לא הערה תפעולית,
     ולא סיבת ביטול.

   ⚠ **כתיבה — צוות ואחראי לו״ז** (`edit: "scheduler"` על
     המסלול של התוכן). קריאה של הארכיון — כל מי שמחובר.

   ⚠ **וכשהעמודות טרם הוקמו:** הכתיבה נכשלת ב-503 מפורש עם שם
     הסקריפט, והקריאה **לא** — הארכיון מציג את השיעורים שהיו
     בלי תוכן. כשל הקמה נראה אחרת מ"אין מה להציג" (עיקרון 6),
     אבל מסך שלם שנופל בגלל עמודה חסרה גרוע משניהם.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { gql, uploadFile, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { mayEdit, editHint } from "../shared/edit-rights.js";
import { todayFor } from "./_attendance-data.js";
import {
  LESSON_BOARDS, LESSON_COLS, HAPPENED, PLANNED, contentReady,
  timeOf, minutesOf,
} from "../shared/lessons-boards.js";
import {
  loadSheets, loadMeetings, loadRatings, ratingFor, invalidateLessons,
} from "./_lessons-data.js";

const M = LESSON_COLS.meetings;
/* ⚠ מעל ~4MB גוף הבקשה נחסם על ידי Vercel עוד קודם. */
const MAX_FILE = 3.5 * 1024 * 1024;

const notReady = (res) =>
  res.status(503).json({
    error: "עמודות התוכן טרם הוקמו בלוח המפגשים",
    setupRequired: true,
    run: "node --env-file=.env tools/seed-lesson-content.mjs",
  });

/* ============================================================
   התוכן עצמו — שליפה נפרדת ומטמון משלה
   ------------------------------------------------------------
   ⚠ **לא הורחב `loadMeetings`.** הוא נשלף בכל דיווח מפגש
     ומחזיק 689 שורות; הוספת `assets` לשליפה ההיא הייתה מייקרת
     כל לחיצה על "התקיים" בשביל נתון שרוב המסכים אינם צריכים.
     ⚠ ולכן גם מטמון ארוך יותר: תוכן שיעור אינו משתנה בקצב של
       סימוני נוכחות.
   ============================================================ */
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ⚠ כל הקבצים של העמודה ולא הראשון: `assets` מחזיר את קבצי כל
   העמודות, והשיוך עובר דרך `value` של העמודה עצמה (4ס). */
function filesOf(item, colId) {
  const col = (item.column_values || []).find((x) => x.id === colId);
  if (!col || !col.value) return [];
  let ids = [];
  try {
    ids = (JSON.parse(col.value).files || [])
      .map((f) => String(f.assetId ?? f.asset_id ?? "")).filter(Boolean);
  } catch { return []; }
  if (!ids.length) return [];
  return (item.assets || [])
    .filter((a) => ids.includes(String(a.id)))
    .map((a) => ({ id: String(a.id), name: a.name || "קובץ", url: a.public_url }));
}

export async function loadContent({ force = false } = {}) {
  if (!contentReady()) return new Map();
  return cached("lesson-content", async () => {
    const items = await allItems(LESSON_BOARDS.meetings, "assets { id name public_url }");
    const out = new Map();
    for (const i of items) {
      out.set(String(i.id), {
        summary: val(i, M.summary) || null,
        files: filesOf(i, M.files),
        /* ⚠ תיבת סימון של monday מחזירה "v" כשמסומנת. */
        openRate: val(i, M.openRate) === "v",
      });
    }
    return out;
  }, { force, ttl: 5 * 60_000 });
}

export const invalidateContent = () => invalidate("lesson-content");

const EMPTY = { summary: null, files: [], openRate: false };

/* ============================================================
   ⚠ **מה שחניך רואה על שיעור — מיפוי מפורש.**
     ראו ההערה בראש הקובץ: הגיליון נושא פרטי מרצה חיצוני
     ומחיר, ופריסה הייתה מדליפה אותם.
   ============================================================ */
function toStudentLesson(m, sheet, content, rating, myScore) {
  return {
    id: m.id,
    date: m.date,
    day: m.day,
    subject: sheet ? sheet.subject : "—",
    /* המרצה של המפגש גובר על זה של הגיליון — שיעור אורח נושא
       מרצה משלו. */
    lecturer: m.lecturer || (sheet ? sheet.lecturer : null),
    time: sheet ? timeOf(sheet.dayTime) : null,
    summary: content.summary,
    files: content.files,
    /* ⚠ הדירוג הממוצע מחושב חי מלוח הדירוגים ולא מהשדה השמור,
       כדי שחניך שדירג אחרי הכתיבה ייספר גם הוא. */
    avg: rating ? rating.avg : null,
    votes: rating ? rating.votes : 0,
    myScore: myScore ?? null,
    canRate: content.openRate,
  };
}

/* ============================================================
   הארכיון — "השיעורים שהיו"
   ============================================================ */
async function archive(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "רק GET נתמך כאן" });
  try {
    const today = todayFor(req);
    const [sheets, meetings, ratings, content] = await Promise.all([
      loadSheets(), loadMeetings(), loadRatings(), loadContent(),
    ]);
    const byId = new Map(sheets.map((s) => [s.id, s]));
    const me = String(session.itemId || "");

    /* ⚠ **מה שהתקיים בפועל, ולא מה שתוכנן.** שיעור שטרם דווח
       אינו "שיעור שהיה" — זה המצב השלישי שכל לוח השיעורים
       קיים בשבילו (4ח). */
    const rows = meetings
      .filter((m) => m.happened === HAPPENED.yes && m.date && m.date <= today)
      .map((m) => {
        const sheet = byId.get(m.sheetId) || null;
        const c = content.get(m.id) || EMPTY;
        const mine = ratings.find((r) => r.meetingId === m.id && r.studentId === me);
        return toStudentLesson(m, sheet, c, ratingFor(m.id, ratings), mine ? mine.score : null);
      })
      /* החדש למעלה — מי שמחפש שיעור מחפש את מה שהיה השבוע. */
      .sort((a, b) => b.date.localeCompare(a.date)
        || minutesOf(a.time) - minutesOf(b.time));

    /* הנושאים לסינון — נאספים מהנתונים ולא מרשימה בקוד, כדי
       שגיליון חדש יופיע במסנן מעצמו. */
    const subjects = [...new Set(rows.map((r) => r.subject))].sort((a, b) => a.localeCompare(b, "he"));

    res.status(200).json({
      ok: true, today,
      lessons: rows,
      subjects,
      counts: {
        total: rows.length,
        withSummary: rows.filter((r) => r.summary).length,
        withFiles: rows.filter((r) => r.files.length).length,
        rateable: rows.filter((r) => r.canRate).length,
      },
      /* ⚠ המסך אומר כמה חסר תוכן — "שיעורים שהיו" בלי סיכומים
         נראה כמו מסך שבור, וזה מספר שאחראי הלו״ז צריך לראות. */
      canWrite: mayEdit(session, "scheduler"),
      ready: contentReady(),
      me: { id: me, isStudent: Boolean(session.isStudent) },
    });
  } catch (e) {
    console.error("[lesson-archive]", e);
    res.status(502).json({ error: "שליפת ארכיון השיעורים נכשלה" });
  }
}

/* ============================================================
   כתיבת התוכן — צוות ואחראי לו״ז
   ============================================================ */
async function content(req, res, session) {
  if (!contentReady()) return notReady(res);
  if (!mayEdit(session, "scheduler")) {
    return res.status(403).json({ error: editHint("scheduler") });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || "").trim();
    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });

    let meetings = await loadMeetings();
    let meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) {
      meetings = await loadMeetings({ force: true });
      meeting = meetings.find((m) => m.id === meetingId);
    }
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    if (req.method === "PUT") {
      const cols = {};
      const changed = [];
      if (body.summary !== undefined) {
        cols[M.summary] = String(body.summary || "").trim().slice(0, 8000);
        changed.push("סיכום");
      }
      /* ============================================================
         ⚠ **"פתוח לדירוג" הוא החלטה של אחראי הלו״ז, ולא נגזרת.**

         היה מתבקש לפתוח דירוג אוטומטית לכל מפגש שיש לו סיכום —
         ובדיוק זה היה הופך את הדירוג לרעש: לא כל שיעור ראוי
         לדירוג, ומפגש שנפתח מעצמו מייצר לחניך רשימה של עשרים
         שיעורים לדרג. התיבה נדלקת ביד, לשיעור שרוצים עליו
         משוב.
         ============================================================ */
      if (body.openRate !== undefined) {
        cols[M.openRate] = { checked: body.openRate ? "true" : "false" };
        changed.push(body.openRate ? "נפתח לדירוג" : "נסגר לדירוג");
      }
      if (Object.keys(cols).length) {
        await gql(
          `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
          { b: LESSON_BOARDS.meetings, i: meetingId, v: JSON.stringify(cols) });
      }

      /* ---------- דף עזר ----------
         ⚠ עולה **אחרי** כתיבת השדות, וכישלון בו אינו מפיל את
           השמירה: הסיכום כבר נכתב, ו-502 כאן היה נראה כאילו
           כלום לא נשמר. אותו דפוס כמו תמונת התקלה (4ס). */
      let fileUploaded = null;
      if (body.fileData) {
        fileUploaded = false;
        try {
          const buf = Buffer.from(String(body.fileData), "base64");
          if (!buf.length) return res.status(400).json({ error: "הקובץ לא נקרא" });
          if (buf.length > MAX_FILE) {
            return res.status(400).json({ error: "הקובץ גדול מדי — עד 3.5MB" });
          }
          await uploadFile(meetingId, M.files,
            String(body.fileName || "דף-עזר").replace(/[^\w.֐-׿-]/g, "_").slice(0, 80),
            buf, String(body.fileMime || "application/octet-stream").slice(0, 60));
          fileUploaded = true;
          changed.push("דף עזר");
        } catch (e2) {
          console.error("[lesson-content:file]", e2 && e2.message);
        }
      }

      invalidateContent();
      const fresh = (await loadContent({ force: true })).get(meetingId) || EMPTY;
      /* ⚠ מחזיר **מה השתנה בפועל** ולא "נשמר" (4ש). */
      return res.status(200).json({
        ok: true, id: meetingId, changed, fileUploaded,
        summary: fresh.summary, files: fresh.files, openRate: fresh.openRate,
      });
    }

    return res.status(405).json({ error: "רק PUT נתמך כאן" });
  } catch (e) {
    console.error("[lesson-content]", e);
    res.status(502).json({ error: "שמירת תוכן השיעור נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ הארכיון פתוח לכל מי שמחובר — זו כל תכליתו. הסינון שמגן
   על פרטי המרצה הוא המיפוי המפורש, לא הדגל. */
export const lessonArchive = withAuth(archive, { student: true });
/* ⚠ הכתיבה מצומצמת: `{student:true}` פותח את השער, ו-`mayEdit`
   בתוך ההנדלר הוא ההרשאה — כדי שההודעה תאמר מי כן רשאי. */
export const lessonContent = withAuth(content, { student: true });
