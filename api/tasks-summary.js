/* ============================================================
   GET /api/tasks-summary
   סיכום ביצוע משימות הניקיון לשבוע הנוכחי, למנהל.

   ⚠ פרטיות — לא לשנות בלי כוונה מפורשת:
     השאילתה מושכת שלוש עמודות בלבד — שבוע, יום, בוצע.
     לא נמשכים שמות פריטים, לא תאריכי סימון, ולא שום שדה
     שממנו אפשר להסיק מי סימן מה.

     בלוח הביצוע ממילא אין עמודת אדם, אבל הצמצום כאן מכוון:
     האחריות היומית משותפת לכל תורני היום, והסיכום למנהל הוא
     ברמת היום — לא ברמת אדם ולא ברמת משימה בודדת.

   קריאה בלבד. אין כאן שום נתיב כתיבה.
   ============================================================ */

import { gql } from "./_monday.js";
import { withAuth } from "./_session.js";
import { TASK_BOARDS, TASK_COLS, DONE, DAYS } from "../shared/tasks-boards.js";
import { weekId } from "../shared/week.js";

const E = TASK_COLS.execution;

export async function weekSummary(at = new Date()) {
  const week = weekId(at);

  // שלוש עמודות בלבד. אין name, אין תאריך סימון, אין מזהה תבנית.
  const cols = JSON.stringify([E.week, E.day, E.done]);

  const rows = [];
  let cursor = null;
  do {
    const page = cursor
      ? `next_items_page(limit:500, cursor:${JSON.stringify(cursor)}){ cursor items { column_values(ids:${cols}){ id text } } }`
      : `boards(ids:[${TASK_BOARDS.execution}]){ items_page(limit:500){ cursor items { column_values(ids:${cols}){ id text } } } }`;
    const data = await gql(`{ ${page} }`);
    const p = cursor ? data.next_items_page : data.boards[0].items_page;
    rows.push(...p.items);
    cursor = p.cursor;
  } while (cursor);

  const val = (r, id) => (r.column_values.find((c) => c.id === id) || {}).text || "";
  const mine = rows.filter((r) => val(r, E.week) === week);

  const days = DAYS.map((d) => {
    const of = mine.filter((r) => val(r, E.day) === d);
    return { day: d, total: of.length, done: of.filter((r) => val(r, E.done) === DONE.yes).length };
  })
    // ימים בלי משימות אינם מוצגים כלל
    .filter((d) => d.total > 0);

  return {
    week,
    days,
    total: days.reduce((a, d) => a + d.total, 0),
    done: days.reduce((a, d) => a + d.done, 0),
  };
}

/* אותו אימות תאריך שקיים ב-tasks-today: פורמט מדויק, ודחייה של
   תאריך שאינו קיים (31 בפברואר) במקום גלגול שקט ליום אחר. */
function parseTestDate(raw) {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("תאריך בדיקה לא תקין. הפורמט: YYYY-MM-DD");
  const at = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) throw new Error("תאריך בדיקה לא תקין");
  if (at.toISOString().slice(0, 10) !== raw) throw new Error("תאריך בדיקה לא תקין — היום הזה לא קיים");
  return at;
}

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const testAt = parseTestDate(req.query?.date);
    const data = await weekSummary(testAt || new Date());
    res.status(200).json(testAt ? { ...data, testMode: true } : data);
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[tasks-summary]", e);
    res.status(502).json({ error: "שליפת סיכום המשימות נכשלה" });
  }
}

export default withAuth(handler, { manager: true });
