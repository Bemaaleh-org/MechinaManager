/* ============================================================
   GET /api/students?action=year[&student=<id>]

   הלוח השנתי של חניך אחד: כל ימי השנה עם מצבו בכל אחד, והסיכום.

   ⚠ חניך רואה את עצמו בלבד. הפרמטר student מותר למנהל בלבד,
     והבדיקה בשרת — לא בתצוגה. בלעדיה כל חניך שישנה מספר
     בכתובת יראה את תיק ההיעדרויות של חבר לכיתה.

   ⚠ יום מקבל אחד משלושה מצבים ולא שניים:
       absent  — יש שורת היעדרות
       present — היום סומן ואין שורה
       unmarked— היום לא סומן כלל
     ההפרדה בין השניים האחרונים היא כל הסיבה שלוח "ימי סימון"
     קיים. בלעדיה יום שאיש לא נגע בו נראה כיום נוכחות מלאה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { studentRows, toPublic } from "./_student-rows.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, todayFor, isSchoolDay,
} from "./_attendance-data.js";

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const asked = req.query?.student ? String(req.query.student) : null;

    if (asked && asked !== session.itemId && !session.isManager) {
      return res.status(403).json({ error: "אפשר לצפות בנוכחות שלך בלבד" });
    }

    const studentId = asked || session.itemId;
    if (!studentId) return res.status(400).json({ error: "לא צוין חניך" });

    const [rows, cal, absences, marked] = await Promise.all([
      studentRows(), loadCalendar(), loadAbsences(), loadMarked(),
    ]);

    const student = rows.find((r) => r.id === studentId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });

    const mine = new Map(
      absences.filter((a) => a.studentId === studentId).map((a) => [a.date, a])
    );
    const today = todayFor(req);

    const days = cal.days.map((d) => {
      const hit = mine.get(d.date);
      let state;
      if (hit) state = "absent";
      else if (!isSchoolDay(d)) state = "off";
      else if (d.date > today) state = "future";
      else state = marked.has(d.date) ? "present" : "unmarked";

      return {
        date: d.date,
        kind: d.kind,
        half: d.half,
        state,
        type: hit ? hit.type : null,
        detail: hit ? hit.detail || null : null,
      };
    });

    res.status(200).json({
      student: toPublic(student),
      days,
      summary: summarize(studentId, { absences, marked, byDate: cal.byDate }),
      today,
    });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[student-year]", e);
    res.status(502).json({ error: "שליפת הנוכחות נכשלה" });
  }
}

/* student:true — נקודת הקצה נועדה לחניך. מנהל נכנס אליה גם הוא,
   ורק הוא רשאי להעביר ?student=. */
export default withAuth(handler, { student: true });
