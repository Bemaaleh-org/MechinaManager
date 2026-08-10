/* ============================================================
   GET /api/tasks?action=day&day=<אות היום>
   פירוט משימות של יום אחד בשבוע הנוכחי, למנהל.

   ⚠ פרטיות — לא לשנות בלי כוונה מפורשת:
     השאילתה מושכת חמש עמודות בלבד — שבוע, יום, מוקד, בוצע,
     סדר תצוגה — ואת שם המשימה.

     לא נמשכים: תאריך סימון, מזהה משימה בתבנית, ומזהה הפריט.
     תאריך הסימון אינו מזהה אדם, אבל הוא מגלה מתי בוצעה כל
     משימה — וזה מעקב שלא התכוונו אליו.

   קריאה בלבד. אין כאן שום נתיב כתיבה.
   ============================================================ */

import { gql } from "./_monday.js";
import { withAuth } from "./_session.js";
import { parseTestDate } from "./_test-date.js";
import { TASK_BOARDS, TASK_COLS, DONE, DAYS } from "../shared/tasks-boards.js";
import { weekId } from "../shared/week.js";

const E = TASK_COLS.execution;

export async function dayDetail(dayLetter, at = new Date()) {
  const week = weekId(at);

  if (!DAYS.includes(dayLetter)) {
    return { week, day: dayLetter, tasks: [], total: 0, doneCount: 0, unknownDay: true };
  }

  const cols = JSON.stringify([E.week, E.day, E.focus, E.done, E.order]);

  const rows = [];
  let cursor = null;
  do {
    const page = cursor
      ? `next_items_page(limit:500, cursor:${JSON.stringify(cursor)}){ cursor items {
           name column_values(ids:${cols}){ id text } } }`
      : `boards(ids:[${TASK_BOARDS.execution}]){ items_page(limit:500){ cursor items {
           name column_values(ids:${cols}){ id text } } } }`;
    const data = await gql(`{ ${page} }`);
    const p = cursor ? data.next_items_page : data.boards[0].items_page;
    rows.push(...p.items);
    cursor = p.cursor;
  } while (cursor);

  const val = (r, id) => (r.column_values.find((c) => c.id === id) || {}).text || "";

  const tasks = rows
    .filter((r) => val(r, E.week) === week && val(r, E.day) === dayLetter)
    .map((r) => ({
      name: r.name,
      focus: val(r, E.focus),
      done: val(r, E.done) === DONE.yes,
      order: Number(val(r, E.order)) || 0,
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "he"));

  return {
    week,
    day: dayLetter,
    tasks,
    total: tasks.length,
    doneCount: tasks.filter((t) => t.done).length,
  };
}

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const testAt = parseTestDate(req.query?.date);
    const day = String(req.query?.day || "");
    if (!day) return res.status(400).json({ error: "לא צוין יום" });

    const data = await dayDetail(day, testAt || new Date());
    res.status(200).json(testAt ? { ...data, testMode: true } : data);
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[tasks-day]", e);
    res.status(502).json({ error: "שליפת פירוט היום נכשלה" });
  }
}

export default withAuth(handler, { manager: true });
