/* ============================================================
   GET /api/lessons?action=gantt

   הגאנט השנתי — כל אירועי השנה, מקובצים לפי חודש.

   POST   { name, start, end?, type }   אירוע חדש
   PUT    { id, ...שדות }               עריכה
   DELETE { id }                        מחיקה

   ⚠ הצפייה פתוחה לכל מי שמחובר, כולל חניכים: הלו״ז השנתי הוא
     מידע של כל המכינה ולא של מי שמנהל גיליונות מרצים.
     הכתיבה שמורה למנהל ולאחראי הלו״ז בלבד.

   ⚠ הלו״ז מזין את תקציב המטבח: סוג היום שם נגזר מהאירועים כאן.
     שינוי אירוע מנקה את המטמון כדי שהתקציב יראה אותו מיד ולא
     בעוד עשר דקות.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems, gql } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";

/** סוגי האירוע. חייבים להיות זהים בתו לתוויות שבלוח. */
const TYPES = ["פעילות", "שבת", "חג ומועד"];
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));

const G = LESSON_COLS.gantt;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

export async function loadGantt({ force = false } = {}) {
  return cached("lessons-gantt", async () => {
    const items = await allItems(LESSON_BOARDS.gantt);
    return items
      .map((i) => ({
        id: String(i.id),
        /* השם בלוח נושא " · תאריך" לזיהוי כפילויות — מוסר בתצוגה */
        name: String(i.name || "").replace(/\s*·\s*\d{4}-\d{2}-\d{2}\s*$/, "").trim(),
        start: val(i, G.start),
        end: val(i, G.end) || val(i, G.start),
        type: val(i, G.type) || "פעילות",
      }))
      .filter((e) => e.name && e.start)
      .sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name, "he"));
  }, { force, ttl: 10 * 60_000 });
}

async function handler(req, res, session) {
  try {
    if (req.method === "GET") {
      const events = await loadGantt();
      return res.status(200).json({
        events, count: events.length,
        /* התצוגה יודעת אם להציג כפתורי עריכה. ⚠ נוחות בלבד —
           האכיפה למטה, בשרת. */
        canEdit: Boolean(session.isManager || session.isScheduler),
      });
    }

    if (!session.isManager && !session.isScheduler) {
      return res.status(403).json({ error: "עריכת הלו״ז מותרת למנהל ולאחראי הלו״ז" });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין אירוע" });
      await gql(`mutation{ delete_item(item_id:${Number(id)}){ id } }`);
      invalidate("lessons-gantt");
      return res.status(200).json({ ok: true, id });
    }

    const name = body?.name === undefined ? undefined : String(body.name).trim().slice(0, 200);
    const start = body?.start === undefined ? undefined : String(body.start).trim();
    const end = body?.end === undefined || body.end === null || body.end === ""
      ? undefined : String(body.end).trim();
    const type = body?.type === undefined ? undefined : String(body.type);

    if (start !== undefined && !isDate(start)) return res.status(400).json({ error: "תאריך התחלה לא תקין" });
    if (end !== undefined && !isDate(end)) return res.status(400).json({ error: "תאריך סיום לא תקין" });
    if (type !== undefined && !TYPES.includes(type)) return res.status(400).json({ error: "סוג אירוע לא מוכר" });

    if (req.method === "POST") {
      if (!name) return res.status(400).json({ error: "לא הוזן שם האירוע" });
      if (!start) return res.status(400).json({ error: "לא צוין תאריך" });
      const last = end || start;
      if (last < start) return res.status(400).json({ error: "תאריך הסיום לפני ההתחלה" });

      /* ⚠ שם הפריט נושא " · תאריך" — מפתח הכפילות של הייבוא.
         הטוען מסיר אותו בתצוגה. */
      await gql(
        `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
        {
          b: LESSON_BOARDS.gantt, n: `${name} · ${start}`,
          v: JSON.stringify({
            [G.start]: { date: start },
            [G.end]: { date: last },
            [G.type]: { label: type || "פעילות" },
          }),
        }
      );
      invalidate("lessons-gantt");
      return res.status(200).json({ ok: true });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין אירוע" });
      const events = await loadGantt();
      const cur = events.find((e) => e.id === id);
      if (!cur) return res.status(404).json({ error: "האירוע אינו נמצא" });

      const nextStart = start ?? cur.start;
      const nextEnd = end ?? (start ? start : cur.end);
      if (nextEnd < nextStart) return res.status(400).json({ error: "תאריך הסיום לפני ההתחלה" });

      const cols = {};
      if (start !== undefined) cols[G.start] = { date: nextStart };
      if (start !== undefined || end !== undefined) cols[G.end] = { date: nextEnd };
      if (type !== undefined) cols[G.type] = { label: type };
      if (Object.keys(cols).length) {
        await gql(
          `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
          { b: LESSON_BOARDS.gantt, i: id, v: JSON.stringify(cols) }
        );
      }
      if (name !== undefined) {
        if (!name) return res.status(400).json({ error: "שם ריק" });
        await gql(
          `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
          { i: id, b: LESSON_BOARDS.gantt, n: `${name} · ${nextStart}` }
        );
      }
      invalidate("lessons-gantt");
      return res.status(200).json({ ok: true, id });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[lessons-gantt]", e);
    res.status(502).json({ error: "פעולת הלו״ז נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
