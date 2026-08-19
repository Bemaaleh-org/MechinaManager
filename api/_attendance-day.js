/* ============================================================
   GET /api/attendance?action=day[&date=YYYY-MM-DD]

   מסך הסימון: כל החניכים הפעילים ומצבם ביום מסוים.

   ⚠ מוביל שבוע רואה את היום הנוכחי בלבד. ההגבלה כאן ולא בתצוגה:
     בדיקה בדפדפן נעקפת בקריאה ישירה לכתובת, ומוביל שבוע שיחליף
     תאריך היה מקבל גישה לכל השנה. המנהל אינו מוגבל.

   ⚠ התאריך "היום" נקבע בשעון ישראל ולא בשעון השרת. Vercel רצה
     ב-UTC, ובלי ההמרה מוביל שבוע שמסמן בערב היה נחסם.
   ============================================================ */

import { withAuth } from "./_session.js";
import { activeStudents, toPublic } from "./_student-rows.js";
import {
  loadCalendar, loadAbsences, loadMarked, todayFor, isSchoolDay, vacationRule,
} from "./_attendance-data.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const today = todayFor(req);
    const asked = req.query?.date ? String(req.query.date) : today;

    if (!DATE_RE.test(asked)) {
      return res.status(400).json({ error: "תאריך לא תקין. הפורמט: YYYY-MM-DD" });
    }
    if (!session.isManager && asked !== today) {
      return res.status(403).json({ error: "מוביל שבוע מסמן את היום הנוכחי בלבד" });
    }

    const [students, cal, absences, marked] = await Promise.all([
      activeStudents(), loadCalendar(), loadAbsences(), loadMarked(),
    ]);

    const range = cal.days.length
      ? { from: cal.days[0].date, to: cal.days[cal.days.length - 1].date }
      : null;

    const day = cal.byDate.get(asked) || null;

    /* ⚠ תאריך שאינו בלוח אינו שגיאה אלא תשובה.
       לפני 06/09 "היום" נופל מחוץ לשנה, וזה המצב הרגיל ברוב
       הקיץ. תשובת 404 גררה במסך באנר אדום של "לא הצלחנו לטעון"
       ושלחה את המנהל לחפש תקלה שאינה קיימת — ובלי גבולות השנה
       גם בורר התאריך נשאר בלי תיחום. */
    if (!day) {
      return res.status(200).json({
        day: null,
        outOfYear: true,
        range,
        asked,
        students: [],
        marked: null,
        counts: null,
        canMark: false,
      });
    }

    const onDate = new Map(absences.filter((a) => a.date === asked).map((a) => [a.studentId, a]));
    const stamp = marked.get(asked) || null;

    res.status(200).json({
      day: {
        date: asked,
        kind: day.kind,
        half: day.half,
        isSchoolDay: isSchoolDay(day),
        vacationAllowed: vacationRule(day).allowed,
        isToday: asked === today,
      },
      /* ⚠ null אינו 0. "טרם סומן" הוא מצב שלישי, והמסך מציג אותו
         אחרת מ"כולם נכחו". */
      marked: stamp ? { by: stamp.by, at: stamp.at } : null,
      students: students.map((s) => {
        const hit = onDate.get(s.id);
        return {
          ...toPublic(s),
          absent: Boolean(hit),
          type: hit ? hit.type : null,
          detail: hit ? hit.detail || null : null,
          source: hit ? hit.source : null,
        };
      }),
      counts: {
        total: students.length,
        absent: onDate.size,
        present: stamp ? students.length - onDate.size : null,
      },
      canMark: session.isManager || (session.isLeader && asked === today),

      /* ⚠ תיקון שורה שמקורה בבקשה מאושרת — מנהל בלבד.
         מוביל שבוע רואה אותה נעולה. ראו api/_attendance-mark.js. */
      canOverride: session.isManager,

      /* גבולות שנת הלימודים — מתחמים את לוח השנה שבמסך, כדי
         שלא ייבחר תאריך שממילא אינו בלוח. */
      range,
      outOfYear: false,
    });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[attendance-day]", e);
    res.status(502).json({ error: "שליפת יום הנוכחות נכשלה" });
  }
}

export default withAuth(handler, { marker: true });
