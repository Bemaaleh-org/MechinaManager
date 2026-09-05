/* ============================================================
   GET /api/students?action=list      מנהל בלבד

   רשימת החניכים עם סיכום ההיעדרויות של כל אחד, ומצבו היום.

   ⚠ כל חניך נבנה דרך toPublic ולא מהשורה הגולמית. לוח החניכים
     הוא לוח קיים של המכינה ובו מידע רפואי, הגדרה דתית ופרטי
     הורים — ראו האזהרה ב-api/_student-rows.js.

   ⚠ מנהל בלבד. זו תמונת ההיעדרויות של כל המחזור, ואין סיבה
     שחניך יראה כמה ימי מחלה יש לחבריו.
   ============================================================ */

import { withAuth } from "./_session.js";
import { activeStudents, toPublic } from "./_student-rows.js";
import { loadCalendar, loadAbsences, loadMarked, summarize, israelToday } from "./_attendance-data.js";
import { availableRoles } from "./_student-role.js";
import { trainingByStudent, EMPTY_TRAINING } from "./_training-summary.js";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const [students, cal, absences, marked, roles, training] = await Promise.all([
      activeStudents(), loadCalendar(), loadAbsences(), loadMarked(), availableRoles(),
      trainingByStudent(),
    ]);

    const today = israelToday();
    const todayDay = cal.byDate.get(today) || null;
    const todayMarked = marked.has(today);
    const absentToday = new Map(
      absences.filter((a) => a.date === today).map((a) => [a.studentId, a])
    );

    const list = students.map((s) => {
      const hit = absentToday.get(s.id);
      return {
        ...toPublic(s),
        summary: summarize(s.id, { absences, marked, byDate: cal.byDate }, today),
        /* ⚠ נפרד מ-summary בכוונה: נוכחות אימון ונוכחות יומית
           הן שתי אמיתות שונות ואין לערבב ביניהן. */
        training: training.get(s.id) || EMPTY_TRAINING,
        today: hit ? { absent: true, type: hit.type, detail: hit.detail || null } : { absent: false },
      };
    });

    res.status(200).json({
      students: list,
      count: list.length,
      /* ⚠ נקראת מהגדרות העמודה בלוח ולא מרשימה בקוד — תפקיד חדש
         שיתווסף ב-monday יופיע במסך בלי דיפלוי. */
      roles,
      today: {
        date: today,
        kind: todayDay ? todayDay.kind : null,
        half: todayDay ? todayDay.half : null,
        /* ⚠ "טרם סומן" אינו "כולם נכחו". המסך חייב להבדיל. */
        marked: todayMarked,
        markedBy: todayMarked ? marked.get(today).by : null,
        absent: absentToday.size,
        /* נוכחים מפורשים בלבד — לא "כל מי שלא נעדר" */
        present: todayMarked ? (marked.get(today).present || new Set()).size : null,
      },
    });
  } catch (e) {
    console.error("[students-list]", e);
    res.status(502).json({ error: "שליפת החניכים נכשלה" });
  }
}

export default withAuth(handler, { manager: true });
