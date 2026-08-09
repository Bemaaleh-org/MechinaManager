/* ============================================================
   GET /api/duty-week
   שיבוץ התורנויות של השבוע כולו — שבעה תאים לפי אינדקס היום.

   משמש את דוח המנהל, ייצוא האקסל ומסך התורנויות. שלושתם קוראים
   מכאן, כדי שלא יהיו שני מקורות שמראים דברים שונים.

   אין שורה לשבוע → שבעה תאים ריקים ו-found:false.

   ⚠ קריאה בלבד. עריכת השיבוץ נעשית בלוח ב-monday.
   ============================================================ */

import { withAuth } from "./_session.js";
import { parseTestDate } from "./_test-date.js";
import { dutyWeek } from "./_duty-today.js";


async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const testAt = parseTestDate(req.query?.date);
    const data = await dutyWeek(testAt || new Date());
    res.status(200).json(testAt ? { ...data, testMode: true } : data);
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[duty-week]", e);
    // כישלון שליפה לא שובר את המסך — פשוט אין שיבוץ להציג
    res.status(200).json({ week: null, days: [[], [], [], [], [], [], []], found: false });
  }
}

export default withAuth(handler);
