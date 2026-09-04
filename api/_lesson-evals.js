/* ============================================================
   GET  /api/lessons?action=evals   חוות הדעת על מרצים
   POST /api/lessons?action=evals   הוספת חוות דעת

   31 חוות הדעת ממחזור א׳ יובאו כפי שהן. חדשות נוספות עם
   מחזור ב׳ ועם שם מי שכתב אותן.

   ⚠ צוות או אחראי לו״ז. חוות דעת נושאות שמות של מרצים חיצוניים
     ומספרי טלפון שלהם, ואין סיבה שיגיעו לחניך שאינו אחראי הלו״ז.

   ⚠ לדירוג יש שני מקורות, והם לעולם לא מתערבבים:

       students  ממוצע חי של הצבעות החניכים למפגש
       manual    ציון שאיש צוות הזין ביד

     הצבעות גוברות תמיד. חוות דעת עם שניהם מציגה את החניכים,
     והציון הידני נשאר לצידו ומסומן ככזה — לא נמחק ולא מנצח.
     הסיבה פשוטה: ברגע שהחניכים דיברו, ההערכה של אדם אחד אינה
     מחליפה אותם, אבל גם אין סיבה למחוק מה שמישהו זכר.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { gql } from "./_monday.js";
import { LESSON_BOARDS, LESSON_COLS, CYCLE } from "../shared/lessons-boards.js";
import {
  loadEvals, invalidateEvals, loadRatings, ratingFor, loadMeetings,
} from "./_lessons-data.js";

const E = LESSON_COLS.evals;

/* ⚠ תאריך נשמר כ-{date:"YYYY-MM-DD"}. מחרוזת גולמית לעמודת
   date נדחית על ידי monday **בשקט** ואינה כותבת דבר (4ש). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res, session) {
  if (req.method === "GET") return list(req, res);
  if (req.method === "POST") return add(req, res, session);
  if (req.method === "PUT") return edit(req, res, session);
  if (req.method === "DELETE") return remove(req, res, session);
  return res.status(405).json({ error: "רק GET, POST, PUT ו-DELETE נתמכים כאן" });
}

async function list(req, res) {
  try {
    const [evals, ratings] = await Promise.all([loadEvals(), loadRatings()]);
    const wanted = req.query?.cycle ? String(req.query.cycle) : null;
    const shown = wanted ? evals.filter((e) => e.cycle === wanted) : evals;

    /* התחומים נאספים מהנתונים ולא מרשימה בקוד — תחום חדש שיתווסף
       בלוח יופיע במסנן מעצמו. */
    const fields = [...new Set(evals.map((e) => e.field).filter(Boolean))].sort();

    /* ⚠ הדירוג הממוצע מחושב חי מלוח הדירוגים, לא מהשדה השמור —
       חניך שמדרג אחרי שחוות הדעת נכתבה עדיין נספר. */
    const withRating = shown.map((e) => {
      const live = e.meetingId ? ratingFor(e.meetingId, ratings) : null;
      const students = live || (e.votes ? { avg: e.avg, votes: e.votes } : null);
      return {
        ...e,
        avg: students ? students.avg : null,
        votes: students ? students.votes : null,
        /* ⚠ score הוא המספר להצגה, ו-source אומר מאיפה הוא בא.
           מסך שיציג score בלי source יטשטש בדיוק את ההבחנה
           שבגללה יש כאן שתי עמודות. */
        score: students ? students.avg : e.manual,
        source: students ? "students" : e.manual != null ? "manual" : null,
      };
    });

    res.status(200).json({
      evals: withRating,
      count: shown.length,
      fields,
      cycles: [...new Set(evals.map((e) => e.cycle).filter(Boolean))],
    });
  } catch (e) {
    console.error("[lesson-evals:list]", e);
    res.status(502).json({ error: "שליפת חוות הדעת נכשלה" });
  }
}

async function add(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));
    const name = String(body?.name || "").trim();
    const opinion = String(body?.opinion || "").trim();

    if (!name) return res.status(400).json({ error: "לא הוזן שם המרצה" });
    if (!opinion) return res.status(400).json({ error: "לא הוזנה חוות דעת" });

    const cols = {
      [E.opinion]: opinion.slice(0, 2000),
      [E.cycle]: { label: String(body?.cycle || CYCLE.second) },
      [E.by]: actorName(session).slice(0, 120),
      [E.at]: { date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date()) },
    };
    if (body?.topic) cols[E.topic] = String(body.topic).slice(0, 200);
    if (body?.phone) cols[E.phone] = String(body.phone).slice(0, 40);
    /* ⚠ תחום חדש מותר להיווצר כאן: המכינה מוסיפה תחומים לאורך
       השנה, ורשימה סגורה הייתה מחייבת דיפלוי לכל תחום. */
    if (body?.field) cols[E.field] = { label: String(body.field) };

    /* חוות דעת שנכתבה מתוך מפגש — נושאת את מזההו ואת ממוצע
       הדירוג הנוכחי כתמונת מצב. התצוגה מחשבת חי בכל מקרה. */
    if (body?.meetingId) {
      cols[E.meetingId] = String(body.meetingId);
      const r = ratingFor(String(body.meetingId), await loadRatings());
      if (r) { cols[E.avg] = String(r.avg); cols[E.votes] = String(r.votes); }
      /* ⚠ **התאריך נגזר מהמפגש וגובר על מה שנשלח.** הצהרה
         מפורשת על הפריט גוברת על קלט — וכאן המפגש הוא הפריט. */
      const m = (await loadMeetings()).find((x) => x.id === String(body.meetingId));
      if (m?.date) cols[E.lessonDate] = { date: m.date };
    }

    /* ידני, רק כשאין מפגש מאחורי חוות הדעת */
    if (!cols[E.lessonDate] && body?.lessonDate) {
      const d = String(body.lessonDate).trim();
      if (!DATE_RE.test(d)) {
        return res.status(400).json({ error: "תאריך השיעור חייב להיות בפורמט YYYY-MM-DD" });
      }
      cols[E.lessonDate] = { date: d };
    }

    const d = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:true){ id } }`,
      { b: LESSON_BOARDS.evals, n: name, v: JSON.stringify(cols) }
    );
    invalidateEvals();

    res.status(200).json({ ok: true, id: String(d.create_item.id), name });
  } catch (e) {
    console.error("[lesson-evals:add]", e);
    res.status(502).json({ error: "הוספת חוות הדעת נכשלה" });
  }
}

/* ---------- עריכה ----------
   ⚠ בעיקר בשביל ההערה על חוות דעת שנפתחה אוטומטית כשהשיעור
     סומן "התקיים": השורה נוצרת עם הדירוגים, והמדריך מוסיף לה
     מילים אחר כך. גם שם המרצה ניתן לתיקון — שורה שנפתחה לפני
     שנרשם מי הגיע נושאת שם זמני. */
async function edit(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));
    const evalId = String(body?.evalId || "").trim();
    if (!evalId) return res.status(400).json({ error: "לא צוינה חוות דעת" });

    const evals = await loadEvals();
    const row = evals.find((e) => e.id === evalId);
    if (!row) return res.status(404).json({ error: "חוות הדעת אינה נמצאת" });

    const cols = {};
    if (body.opinion !== undefined) cols[E.opinion] = String(body.opinion).slice(0, 2000);
    if (body.topic !== undefined) cols[E.topic] = String(body.topic).slice(0, 200);
    if (body.phone !== undefined) cols[E.phone] = String(body.phone).slice(0, 40);
    if (body.field !== undefined && body.field) cols[E.field] = { label: String(body.field) };

    /* ---------- תאריך השיעור ----------
       ⚠ ריק מנקה, ומחרוזת ריקה היא הדרך היחידה לנקות עמודת
         date ב-monday. */
    if (body.lessonDate !== undefined) {
      const d = String(body.lessonDate || "").trim();
      if (!d) cols[E.lessonDate] = "";
      else if (!DATE_RE.test(d)) {
        return res.status(400).json({ error: "תאריך השיעור חייב להיות בפורמט YYYY-MM-DD" });
      } else cols[E.lessonDate] = { date: d };
    }

    /* ---------- דירוג ידני ----------
       ⚠ null מנקה. הסולם זהה לזה של החניכים (1–10) כדי ששני
         המספרים יהיו ברי-השוואה; ספרה אחת אחרי הנקודה, כמו
         שהממוצע מוצג ממילא. */
    if (body.manualScore !== undefined) {
      if (body.manualScore === null || body.manualScore === "") {
        cols[E.manual] = "";
      } else {
        const n = Number(body.manualScore);
        if (!Number.isFinite(n) || n < 1 || n > 10) {
          return res.status(400).json({ error: "דירוג חייב להיות בין 1 ל-10" });
        }
        cols[E.manual] = String(Math.round(n * 10) / 10);
      }
    }

    /* ⚠ נרשם מי נגע אחרון — חוות דעת היא טקסט שאדם כתב, ולא
       נתון אנונימי כמו סימון משימה. */
    if (Object.keys(cols).length) {
      cols[E.by] = actorName(session).slice(0, 120);
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:true){ id } }`,
        { b: LESSON_BOARDS.evals, i: evalId, v: JSON.stringify(cols) }
      );
    }

    const name = body.name === undefined ? null : String(body.name).trim();
    if (name) {
      await gql(
        `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
        { i: evalId, b: LESSON_BOARDS.evals, n: name }
      );
    }

    invalidateEvals();
    res.status(200).json({ ok: true, id: evalId });
  } catch (e) {
    console.error("[lesson-evals:edit]", e);
    res.status(502).json({ error: "עדכון חוות הדעת נכשל" });
  }
}

/* ============================================================
   מחיקת חוות דעת — מחזור ב׳ בלבד
   ------------------------------------------------------------
   ⚠⚠ **31 חוות הדעת של מחזור א׳ אינן ניתנות למחיקה.** הן יובאו
     ממקור שכבר אינו קיים: השיעורים התקיימו לפני שהיה מנגנון
     דירוג, והציון והטקסט קיימים רק בשורה הזו. מחיקה שלהן היא
     אובדן ידע שאין ממנו דרך חזרה, ולא "שורה מיותרת".

   מחזור ב׳ נכתב מתוך האפליקציה, על ידי מי שיושב כאן עכשיו,
   והוא זה שיודע שהשורה מיותרת או כפולה.

   ⚠ **הגבול נבדק בשרת מול הערך שבלוח**, ולא לפי מה שהדפדפן
     שולח — אחרת אפשר היה למחוק שורה של מחזור א׳ בטענה שהיא
     של מחזור ב׳.

   ⚠ **וגם מזהה מאומת מול הלוח לפני `delete_item`**, שנשלחת
     בלי `board_id` (4ס).
   ============================================================ */
async function remove(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));
    const evalId = String(body?.evalId || req.query?.evalId || "").trim();
    if (!evalId) return res.status(400).json({ error: "לא צוינה חוות דעת" });

    const row = (await loadEvals()).find((e) => e.id === evalId);
    if (!row) return res.status(404).json({ error: "חוות הדעת אינה נמצאת" });

    if (row.cycle !== CYCLE.second) {
      return res.status(403).json({
        error: `חוות דעת מ${row.cycle || "מחזור קודם"} אינה נמחקת — ` +
          "היא יובאה ממקור שאינו קיים עוד, והטקסט שבה הוא הידע היחיד שנשאר. " +
          "אפשר לערוך אותה.",
      });
    }

    await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: evalId });
    invalidateEvals();
    res.status(200).json({ ok: true, id: evalId, name: row.name });
  } catch (e) {
    console.error("[lesson-evals:remove]", e);
    res.status(502).json({ error: "מחיקת חוות הדעת נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { scheduler: true, edit: "scheduler" });
