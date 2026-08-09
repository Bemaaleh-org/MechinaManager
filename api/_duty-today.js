/* ============================================================
   GET /api/duty-today
   תורני היום הנוכחי, מתוך שורת השבוע הנוכחי.

   שלושה מצבים, ולכולם אותה תשובה מבחינת המסך:
     יש שיבוץ      → { names: ["...", "..."] }
     התא ריק       → { names: [] }
     אין שורת שבוע → { names: [] }

   האפליקציה לא מציגה את שורת התורן כשהרשימה ריקה — בלי הודעה
   ובלי מציין מקום. השיבוץ הוא מידע נוסף, לא תנאי לתפקוד:
   המשימות והדיווחים אינם תלויים בו.

   ⚠ קריאה בלבד. אין כאן נתיב כתיבה.
   ============================================================ */

import { gql } from "./_monday.js";
import { withAuth } from "./_session.js";
import { parseTestDate } from "./_test-date.js";
import { cached } from "./_cache.js";
import { DUTY_BOARD, DUTY_DAY_COLS } from "../shared/duty-board.js";
import { weekId } from "../shared/week.js";

/* אותו מטמון של 30 שניות שמשמש את שכבת האימות */
async function dutyRows() {
  return cached("duty-rows", async () => {
    const cols = JSON.stringify(DUTY_DAY_COLS);
    const d = await gql(
      `{ boards(ids:[${DUTY_BOARD}]){ items_page(limit:200){ items {
           name column_values(ids:${cols}){ id text } } } } }`
    );
    return d.boards[0].items_page.items;
  });
}

/** אינדקס היום בישראל: 0=ראשון … 6=שבת */
function israelDayIndex(at) {
  const wd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", weekday: "short" })
    .format(at);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
}

/** מפרק תא לשמות. פסיקים כמפריד, רווחים מיותרים נזרקים. */
const parseNames = (raw) =>
  (raw || "").split(",").map((s) => s.trim()).filter(Boolean);

/**
 * שיבוץ השבוע כולו — שבעה תאים לפי אינדקס היום.
 * משמש את דוח המנהל, ייצוא האקסל ומסך התורנויות, כדי שכולם
 * יקראו מאותו מקום ולא יציגו דברים שונים.
 */
export async function dutyWeek(at = new Date()) {
  const week = weekId(at);
  const rows = await dutyRows();
  const row = rows.find((r) => r.name.trim() === week);

  if (!row) return { week, days: DUTY_DAY_COLS.map(() => []), found: false };

  return {
    week,
    days: DUTY_DAY_COLS.map((c) =>
      parseNames((row.column_values.find((x) => x.id === c) || {}).text)),
    found: true,
  };
}

export async function dutyToday(at = new Date()) {
  const week = weekId(at);
  const dayIdx = israelDayIndex(at);
  const colId = DUTY_DAY_COLS[dayIdx];

  const rows = await dutyRows();
  const row = rows.find((r) => r.name.trim() === week);

  if (!row) return { week, names: [], reason: "אין שורה לשבוע הזה" };

  const raw = (row.column_values.find((c) => c.id === colId) || {}).text || "";
  const names = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return { week, names, reason: names.length ? null : "התא ריק" };
}

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const testAt = parseTestDate(req.query?.date);
    const data = await dutyToday(testAt || new Date());
    res.status(200).json(testAt ? { ...data, testMode: true } : data);
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[duty-today]", e);
    // כישלון בשליפה אינו שובר את המסך — פשוט אין שיבוץ להציג
    res.status(200).json({ names: [], reason: "שליפת השיבוץ נכשלה" });
  }
}

export default withAuth(handler);
