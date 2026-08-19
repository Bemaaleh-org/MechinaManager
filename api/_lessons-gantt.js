/* ============================================================
   GET /api/lessons?action=gantt

   הגאנט השנתי — כל אירועי השנה, מקובצים לפי חודש.

   ⚠ קריאה בלבד. עריכת הגאנט נעשית בלוח ב-monday: שינוי תאריך
     של סדרה או הוספת אירוע הם בדיוק סוג ההחלטות שהמכינה מעדכנת
     בלי דיפלוי. תפוגת המטמון — עשר דקות, כמו לוח השנה.

   ⚠ צוות או אחראי לו״ז — אותה הרשאה כמו שאר מסך השיעורים.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached } from "./_cache.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";

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

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const events = await loadGantt();
    res.status(200).json({ events, count: events.length });
  } catch (e) {
    console.error("[lessons-gantt]", e);
    res.status(502).json({ error: "שליפת הגאנט נכשלה" });
  }
}

export default withAuth(handler, { scheduler: true });
