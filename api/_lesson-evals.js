/* ============================================================
   GET  /api/lessons?action=evals   חוות הדעת על מרצים
   POST /api/lessons?action=evals   הוספת חוות דעת

   31 חוות הדעת ממחזור א׳ יובאו כפי שהן. חדשות נוספות עם
   מחזור ב׳ ועם שם מי שכתב אותן.

   ⚠ צוות או אחראי לו״ז. חוות דעת נושאות שמות של מרצים חיצוניים
     ומספרי טלפון שלהם, ואין סיבה שיגיעו לחניך שאינו אחראי הלו״ז.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { gql } from "./_monday.js";
import { LESSON_BOARDS, LESSON_COLS, CYCLE } from "../shared/lessons-boards.js";
import { loadEvals, invalidateEvals, loadRatings, ratingFor } from "./_lessons-data.js";

const E = LESSON_COLS.evals;

async function handler(req, res, session) {
  if (req.method === "GET") return list(req, res);
  if (req.method === "POST") return add(req, res, session);
  if (req.method === "PUT") return edit(req, res, session);
  return res.status(405).json({ error: "רק GET, POST ו-PUT נתמכים כאן" });
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
      if (!e.meetingId) return e;
      const r = ratingFor(e.meetingId, ratings);
      return r ? { ...e, avg: r.avg, votes: r.votes } : e;
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

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { scheduler: true });
