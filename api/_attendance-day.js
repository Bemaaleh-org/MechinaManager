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
import { loadSheets, loadMeetings } from "./_lessons-data.js";
import { kitchenDutyOn } from "./_chores-data.js";
import { weeksOfStudent } from "./_leader-weeks.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const today = todayFor(req);

    /* ⚠ ריק לאיש צוות — הוא אינו מוביל שבוע, וההרשאה שלו
       רחבה ממילא. */
    const myWeeks = session.isStudent ? await weeksOfStudent(session.itemId) : [];
    const asked = req.query?.date ? String(req.query.date) : today;

    if (!DATE_RE.test(asked)) {
      return res.status(400).json({ error: "תאריך לא תקין. הפורמט: YYYY-MM-DD" });
    }
    /* ============================================================
       ⚠ **שער הקריאה מתיישר עם שער הכתיבה.**

       כאן ישבה בדיקה שנייה, "היום בלבד", והיא הייתה חוסמת את
       הדפדוף עוד לפני שהכתיבה נבדקת — כלומר מוביל שבוע לא היה
       יכול אפילו **לראות** את יום המחר שלו. שני שערים שאומרים
       דברים שונים על אותה שאלה הם בדיוק המקום שבו תכונה נראית
       שבורה בלי סיבה נראית לעין.
       ============================================================ */
    if (!session.isManager
        && asked !== today
        && !myWeeks.some((w) => w.start <= asked && asked <= w.end)) {
      return res.status(403).json({
        error: myWeeks.length
          ? "אפשר לפתוח את הימים שבשבועות שאתם מובילים, ואת היום הנוכחי"
          : "מוביל שבוע פותח את הימים שבאחריותו",
      });
    }

    const [students, cal, absences, marked, sheets, meetings] = await Promise.all([
      activeStudents(), loadCalendar(), loadAbsences(), loadMarked(),
      loadSheets(), loadMeetings(),
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
          /* ⚠ נוכח רק אם סומן במפורש. לא נוכח ולא נעדר = לא סומן. */
          present: Boolean(stamp && stamp.present && stamp.present.has(s.id)),
          type: hit ? hit.type : null,
          detail: hit ? hit.detail || null : null,
          source: hit ? hit.source : null,
        };
      }),
      counts: {
        total: students.length,
        absent: onDate.size,
        present: stamp && stamp.present ? stamp.present.size : null,
        unmarked: stamp && stamp.present
          ? Math.max(0, students.length - stamp.present.size - onDate.size) : null,
      },
      /* ============================================================
         ⚠ **מוביל שבוע מסמן כל יום שבאחריותו, ולא רק היום.**
           אותו כלל בדיוק שהשרת אוכף ב-_attendance-mark.js —
           כפתור שמופיע ומקבל 403 הוא בדיוק מה ש-4יד אוסר.

         ⚠ הסימון הידני בלוח החניכים נשאר "היום בלבד": הוא
           עוקף חירום בלי טווח.
         ============================================================ */
      canMark: session.isManager
        || myWeeks.some((w) => w.start <= asked && asked <= w.end)
        || (session.isLeader && asked === today),

      /* ⚠ הטווחים נשלחים למסך כדי שידע **לאילו ימים** לתת
         לדפדף, ויסמן את מה שמחוץ להם ולא יסתיר אותו: חניך
         שלא יראה את היום שלו יחשוב שנשכח (4צ). */
      myWeeks,

      /* ⚠ תיקון שורה שמקורה בבקשה מאושרת — מנהל בלבד.
         מוביל שבוע רואה אותה נעולה. ראו api/_attendance-mark.js. */
      canOverride: session.isManager,

      /* ============================================================
         ⚠ **מי בתורנות המטבח היום — נגזר מהתורניות ואינו מוקלד.**

         תורן מטבח אינו נעדר מהאימון: המכינה שלחה אותו למטבח,
         ולספור אותו כנעדר זה להעניש אותו על תורנות (4ז). עד
         עכשיו המסמן היה צריך לזכור מי בתורנות בכל אימון מחדש,
         והמידע כבר יושב בלוח התורניות.

         ⚠ **מסומן ואינו נכפה.** המסך מסמן אותם מראש **רק כשעוד
           לא דווח דבר** על האימון — אחרי שדווח, זו הכרעה של אדם
           ואין לדרוס אותה. תורן שבכל זאת הגיע לאימון הוא מצב
           אמיתי, והמסמן הוא שיודע.
         ============================================================ */
      kitchenDuty: await kitchenDutyOn(asked),

      /* מפגשי היום משיעורים שסומנו "מוצג בסימון נוכחות" (אימונים).
         הדיווח עליהם נעשה מכאן, באותה נקודת קצה של השיעורים. */
      trainings: (() => {
        const daily = new Set(sheets.filter((s) => s.inDaily).map((s) => s.id));
        return meetings
          .filter((m) => m.date === asked && daily.has(m.sheetId) && m.planned === "כן")
          .map((m) => ({
            id: m.id,
            subject: (sheets.find((s) => s.id === m.sheetId) || {}).subject || "",
            happened: m.happened, // ⚠ null = טרם דווח
            /* נוכחות פרטנית באימון — עצמאית מהנוכחות היומית */
            present: m.tPresent || [],
            absent: m.tAbsent || [],
            kitchen: m.tKitchen || [],
          }));
      })(),

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
