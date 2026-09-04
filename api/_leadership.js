/* ============================================================
   /api/students?action=leadership — דף המובילויות

     GET                      המובילויות **שעברו** של החניך
     GET  ?all=1              כל השבועות שהיו (צוות בלבד)
     PUT  { weekId, feedback | summary }

   ------------------------------------------------------------
   ⚠⚠ **רק מובילות שכבר עברה, גם אם יש מובילות עתידית.**

   זו בקשה מפורשת של המכינה, והיא לא קישוט: דף שמראה לחניך את
   השבוע שהוא **עומד** להוביל הופך אותו מסיכום למטלה. כאן
   מסתכלים אחורה — מה היה, מה הצוות אמר, ומה עשינו באותו שבוע.

   **הגבול הוא `end < today`.** לא "התחיל", לא "בעיצומו" —
   נגמר. שבוע שעדיין רץ אינו סיכום.

   ------------------------------------------------------------
   ⚠ **המשוב הוא של השבוע ולא של החניך.** שבוע מובילים שניים
     ביחד, ומשוב אישי לכל אחד היה הופך את הדף לתיק אישי — וזה
     דבר אחר לגמרי ממה שהתבקש. שניהם רואים את אותו משוב.

   ⚠ **הצוות כותב את המשוב; החניך כותב את הסיכום.** שני שדות
     ולא אחד, כי אלה שני קולות. סיכום שהצוות יכול לערוך אינו
     סיכום של החניך, ומשוב שהחניך יכול לערוך אינו משוב.

   ⚠ **הנתונים על השבוע נגזרים ואינם נשמרים.** כמה ימים סומנו,
     כמה שיעורים דווחו, מי היה בתורנות — הכול נקרא מהלוחות
     בזמן השליפה. שדה שמור היה מתיישן ברגע שמישהו מתקן יום
     נוכחות בדיעבד (4כו).
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { gql } from "./_monday.js";
import { setColumns } from "./_items.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { loadLeaderWeeks } from "./_leader-weeks.js";
import {
  loadCalendar, loadMarked, loadAbsences, isSchoolDay, israelToday,
} from "./_attendance-data.js";
import { loadSheets, loadMeetings } from "./_lessons-data.js";
import { activeStudents } from "./_student-rows.js";
import { invalidate } from "./_cache.js";
import { PLANNED } from "../shared/lessons-boards.js";

const W = MECHINA_COLS.leaderWeeks;

/**
 * מה קרה בשבוע אחד.
 * ⚠ הכול נגזר מהלוחות ואינו נשמר — ראו ההערה בראש הקובץ.
 */
function weekFacts(week, { cal, marked, absences, meetings, sheetById }) {
  const days = cal.days.filter((d) => d.date >= week.start && d.date <= week.end);
  const school = days.filter(isSchoolDay);

  const markedDays = school.filter((d) => marked.has(d.date));
  /* ⚠ **"נוכחים" הוא סכום על הימים שסומנו בלבד.** חלוקה בכל
     ימי השבוע הייתה נותנת אחוז נמוך שמשמעותו "לא סימנו", ולא
     "לא הגיעו" — שני דברים שונים לגמרי (עיקרון 6). */
  let presentSum = 0;
  for (const d of markedDays) presentSum += (marked.get(d.date).present || new Set()).size;

  const inWeek = (iso) => iso >= week.start && iso <= week.end;
  const abs = absences.filter((a) => inWeek(a.date));
  const byType = {};
  for (const a of abs) byType[a.type] = (byType[a.type] || 0) + 1;

  const mtgs = meetings.filter((m) => m.date && inWeek(m.date) && m.planned !== PLANNED.no
    && (sheetById.get(m.sheetId) || {}).active);

  return {
    days: days.length,
    schoolDays: school.length,
    marked: markedDays.length,
    /* ⚠ **המספר שאומר כמה מהתמונה חסר.** ימים שלא סומנו הם
       בדיוק מה שמוביל שבוע רוצה לדעת עליו (4יח). */
    unmarked: school.length - markedDays.length,
    avgPresent: markedDays.length
      ? Math.round((presentSum / markedDays.length) * 10) / 10 : null,
    absences: abs.length,
    absencesByType: byType,
    lessons: mtgs.length,
    lessonsReported: mtgs.filter((m) => m.happened).length,
  };
}

async function handler(req, res, session) {
  try {
    const today = israelToday();
    /* ============================================================
       ⚠ **`force: true` — קריאה טרייה, ולא מהמטמון בן חמש הדקות.**

       זה מסך שנפתח מדי פעם ולא נטען ברקע, ולכן קריאת לוח אחת
       אינה עלות. מה שכן עולה: משוב שנכתב זה עתה ואינו מופיע,
       או שבוע שהסתיים אתמול ועדיין אינו נחשב "עבר" — שני מצבים
       שנראים בדיוק כמו תקלה, ושניהם נעלמים מעצמם אחרי חמש
       דקות, כלומר אי אפשר לשחזר אותם כדי להבין.

       ⚠ ובכתיבה זה קריטי: אימות מזהה מול מטמון ישן מחזיר
         "השבוע אינו נמצא" על שבוע שקיים.
       ============================================================ */
    const weeks = await loadLeaderWeeks({ force: true });

    if (req.method === "GET") {
      const wantAll = !session.isStudent && String(req.query?.all || "") === "1";

      /* ⚠⚠ **`end < today` — נגמר, ולא "התחיל".** שבוע שעדיין
         רץ אינו סיכום, ושבוע עתידי אינו מופיע כלל. */
      const past = weeks.filter((w) => w.end && w.end < today);

      const relevant = wantAll
        ? past
        : past.filter((w) => (w.leaderIds || []).map(String).includes(String(session.itemId)));

      /* ⚠ יציאה מוקדמת לפני שנטענים ארבעה לוחות. חניך שעוד לא
         הוביל הוא הרוב בתחילת שנה. */
      if (!relevant.length) {
        return res.status(200).json({
          weeks: [], canWrite: !session.isStudent, mine: !wantAll,
          /* ⚠ **"עוד לא הובלת" שונה מ"יש לך שבוע עתידי"** —
             המסך אומר את זה במילים ולא מציג דף ריק. */
          upcoming: session.isStudent
            ? weeks.filter((w) => w.end >= today
                && (w.leaderIds || []).map(String).includes(String(session.itemId)))
                .map((w) => ({ num: w.num, start: w.start, end: w.end }))
            : [],
        });
      }

      const [cal, marked, absences, sheets, meetings, students] = await Promise.all([
        loadCalendar(), loadMarked(), loadAbsences(), loadSheets(), loadMeetings(),
        activeStudents(),
      ]);
      const sheetById = new Map(sheets.map((s) => [s.id, s]));
      const nameOf = new Map(students.map((s) => [String(s.id), s.name]));

      const out = relevant
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((w, i) => ({
          id: w.id,
          num: w.num,
          name: w.name,
          start: w.start,
          end: w.end,
          /* ⚠ "המובילות הראשונה / השנייה" נספרת **מתוך שלו**,
             ולא ממספר השבוע בלוח — שבוע 7 יכול להיות המובילות
             הראשונה של מי שהצטרף מאוחר. */
          ordinal: wantAll ? null : i + 1,
          what: w.what,
          note: w.note,
          escort: w.escort,
          leaders: (w.leaderIds || []).map((id) => ({
            id: String(id), name: nameOf.get(String(id)) || null,
          })),
          feedback: w.feedback || null,
          feedbackBy: w.feedbackBy || null,
          feedbackAt: w.feedbackAt || null,
          summary: w.summary || null,
          facts: weekFacts(w, { cal, marked, absences, meetings, sheetById }),
        }))
        .reverse();

      return res.status(200).json({
        weeks: out,
        mine: !wantAll,
        /* ⚠ מוחזר מהשרת ולא נגזר במסך — כפתור שמופיע ומקבל
           403 הוא בדיוק מה ש-4יד אוסר. */
        canWrite: !session.isStudent,
        upcoming: [],
      });
    }

    if (req.method !== "PUT") {
      return res.status(405).json({ error: "רק GET ו-PUT נתמכים כאן" });
    }

    /* ---------------- כתיבה ---------------- */
    const body = req.body ?? (await readJson(req));
    const weekId = String(body?.weekId || "").trim();
    if (!weekId) return res.status(400).json({ error: "לא צוין שבוע" });

    const week = weeks.find((w) => w.id === weekId);
    if (!week) return res.status(404).json({ error: "השבוע אינו נמצא" });
    if (!week.end || week.end >= today) {
      return res.status(400).json({ error: "אפשר לכתוב רק על שבוע שכבר הסתיים" });
    }

    const cols = {};
    const mine = (week.leaderIds || []).map(String).includes(String(session.itemId));

    if (body.feedback !== undefined) {
      /* ⚠ **הצוות בלבד.** משוב שהחניך יכול לערוך אינו משוב. */
      if (session.isStudent) {
        return res.status(403).json({ error: "המשוב נכתב על ידי הצוות" });
      }
      cols[W.feedback] = String(body.feedback || "").slice(0, 4000);
      cols[W.feedbackBy] = actorName(session).slice(0, 120);
      cols[W.feedbackAt] = { date: today };
    }

    if (body.summary !== undefined) {
      /* ⚠ **המובילים בלבד.** סיכום שהצוות יכול לערוך אינו
         סיכום של החניך. ראש המכינה אינו חריג כאן, במכוון —
         זה הקול של מי שהוביל. */
      if (!mine) {
        return res.status(403).json({ error: "את סיכום המובילות כותבים מי שהובילו את השבוע" });
      }
      cols[W.summary] = String(body.summary || "").slice(0, 4000);
    }

    if (!Object.keys(cols).length) {
      return res.status(400).json({ error: "לא נשלח מה לעדכן" });
    }

    await setColumns(MECHINA_BOARDS.leaderWeeks, weekId, cols);
    invalidate("leader-weeks");
    return res.status(200).json({ ok: true, weekId });
  } catch (e) {
    console.error("[leadership]", e);
    res.status(502).json({ error: "פעולת המובילויות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` — זה המסך של החניך. ההפרדה בין הצוות
   לחניך נעשית בתוך ה-handler, לפי מה שנכתב (4טו). */
export default withAuth(handler, { student: true });
