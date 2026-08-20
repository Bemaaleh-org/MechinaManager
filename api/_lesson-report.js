/* ============================================================
   GET /api/lessons?action=report[&month=YYYY-MM]

   נתוני הדוח החודשי: לכל גיליון — המפגשים שהתקיימו בפועל
   ותאריכיהם. בלי month — כל השנה.

   ⚠ השרת מחזיר נתונים בלבד; קובץ האקסל נבנה בדפדפן. כך אין
     תלות בספריות בשרת ואין קובץ שעובר ברשת פעמיים.
   ============================================================ */

import { withAuth } from "./_session.js";
import { HAPPENED } from "../shared/lessons-boards.js";
import { loadSheets, loadMeetings } from "./_lessons-data.js";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const month = req.query?.month ? String(req.query.month) : null;
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "חודש לא תקין. הפורמט: YYYY-MM" });
    }

    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
    const inMonth = (d) => !month || d.startsWith(month);

    const rows = sheets.map((s) => {
      const mine = meetings.filter((m) => m.sheetId === s.id && inMonth(m.date));
      const happened = mine.filter((m) => m.happened === HAPPENED.yes);
      return {
        subject: s.subject,
        lecturer: s.lecturer || "",
        dayTime: s.dayTime || "",
        planned: mine.filter((m) => m.planned === "כן").length,
        happened: happened.length,
        missed: mine.filter((m) => m.happened === HAPPENED.no).length,
        pending: mine.filter((m) => m.planned === "כן" && !m.happened).length,
        dates: happened.map((m) => m.date).sort(),
        /* בשיעורי מרצה אורח — גם מי העביר כל מפגש */
        lecturers: s.guestLecturer
          ? happened.map((m) => ({ date: m.date, lecturer: m.lecturer || "" }))
          : null,
      };
    }).filter((r) => r.planned || r.happened || r.missed);

    /* החודשים שיש בהם מפגשים — לבורר שבמסך */
    const months = [...new Set(meetings.map((m) => m.date.slice(0, 7)))].sort();

    res.status(200).json({ rows, months, month });
  } catch (e) {
    console.error("[lesson-report]", e);
    res.status(502).json({ error: "הפקת הדוח נכשלה" });
  }
}

export default withAuth(handler, { scheduler: true });
