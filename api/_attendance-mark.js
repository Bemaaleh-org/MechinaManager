/* ============================================================
   POST /api/attendance?action=mark
   { date, absences: [{ studentId, type, detail }], present: [id] }

   שומר את סימון היום. הגוף נושא את המצב המלא הרצוי — מי נוכח,
   מי חסר ומאיזו סיבה — ולא "הוסף" או "הסר".

   ⚠ נוכחות היא סימון מפורש. חניך שאינו ברשימת present ואין לו
     היעדרות נשאר "לא סומן" — בהחלטת המכינה, נוכחות אינה הנחה.

   ⚠ מצב מלא ולא פעולות, בכוונה. שני מסמנים שפותחים את המסך
     כמעט יחד שולחים את אותה כוונה ומקבלים אותה תוצאה. בקשות
     מצטברות היו גורמות לשנייה לבטל את הראשונה. זה אותו שיקול
     שמאחורי _task-toggle.js במטבח.

   ⚠ שורת היעדרות שמקורה בבקשה מאושרת — מנהל בלבד רשאי לשנות.

     חניך שאושר לו יום חופש ובסוף הגיע, או שיצא למחלה במקום,
     הוא מצב שכיח: המציאות משתנה אחרי ההחלטה. מנהל צריך לתקן
     את הרישום כדי שיישאר נכון.

     מוביל שבוע אינו רשאי. הוא רואה את השורה נעולה, כי מחיקה
     שלו הייתה מבטלת החלטה של מנהל בלי שאיש יראה. ההפרדה הזו
     היא כל ההבדל בין תיקון לבין דריסה.

     הבקשה עצמה נשארת "מאושר" — היא תיעוד של ההחלטה שהתקבלה,
     ולא של מה שקרה בפועל. שורת ההיעדרות המתוקנת מסומנת
     "סימון ידני", כך שרואים בלוח שאדם נגע בה אחרי האישור.

   ⚠ מוביל שבוע — היום הנוכחי בלבד, נאכף כאן ולא בתצוגה.

   ⚠⚠⚠ **מכסת ימי החופש אינה נאכפת כאן יותר** (החלטת אחים,
     12.9.2026), וזה היפוך מכוון של מה שהיה כתוב כאן.

     קודם היא כן נאכפה, והנימוק היה נכון **בעולם שבו סימון
     ידני צורך מכסה**: מי שסימן "חופש" ביד עקף שתי בדיקות
     שהבקשה עוברת, והמסך הציג "3/3 נותרו" בזמן שנוצל יום
     רביעי.

     מאז, `summarize` גוזרת את המכסה **מבקשות מאושרות בלבד**
     (ראו api/_attendance-data.js). כלומר אין עוד מה לעקוף —
     וחסימה שנשארה כאן הייתה חוסמת **תיאור של יום** על סמך
     תקציב שהוא אינו נוגע בו. זו בדיוק הסתירה שההערה בבדיקה
     מזהירה ממנה: "אם המסך אומר נותרו והשרת חוסם — אחד מהם
     משקר".

     **המכסה נאכפת במסלול אחד: הבקשה.** בהגשה
     (api/_requests.js) ובאישור (api/_request-decide.js), ושם
     המכריע גם בוחר במפורש כמה לגבות (5כד, 5לה).

     ⚠ **ומה שכן נשאר כאן: `vacationRule`** — האם ביום הזה
       בכלל אפשר לנצל יום חופש. זו שאלה על היום ולא על התקציב.

     ⚠ **וסימון ידני מדווח ואינו נעלם**: `summarize` מחזירה
       `manual` לצד `used`, והמסך אומר "ועוד יום שסומן ידנית
       ואינו יורד מהמכסה" (4יח).
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { activeStudents } from "./_student-rows.js";
import {
  loadCalendar, loadAbsences, todayFor, isSchoolDay, vacationRule,
  createAbsence, deleteAbsence, stampMarked, invalidateAttendance,
} from "./_attendance-data.js";
import { leadsOn, weeksOfStudent, canMarkDate, markUntil } from "./_leader-weeks.js";
import {
  /* ⚠ HALF ו-VACATION_PER_HALF הוסרו עם חסימת המכסה
     (12.9.2026) — ראו ההערה בראש הקובץ. */
  ABSENCE, ABSENCE_SOURCE, halfDayReady,
} from "../shared/mechina-boards.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = [ABSENCE.vacation, ABSENCE.sick, ABSENCE.justified];

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const date = String(body?.date || "").trim();
    const wanted = Array.isArray(body?.absences) ? body.absences : null;
    const presentIds = Array.isArray(body?.present) ? body.present.map(String) : [];
    /* ============================================================
       ⚠⚠ **חצי יום — מצב רביעי** (בקשת ראש המכינה, 10.9.2026):
       *"אם מישהו הגיע באמצע היום לאחר חופש — לסמן נוכחות בחצי
       השני של היום."*

       חניך כזה נושא **גם** שורת היעדרות (הוא באמת לא היה חצי
       יום) **וגם** את הסימון הזה, ו-`summarize` סופרת 0.5 לכל
       צד. בלי זה היו רק שתי אפשרויות, ושתיהן שקריות עליו.

       ⚠ **ואינו נוגע במכסת החופש.** כמה נגבה נקבע בהכרעה
         ומתוקן ב-`?action=recost` — שתי שאלות (5כד).
       ============================================================ */
    const halfIds = Array.isArray(body?.half) ? body.half.map(String) : [];

    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: "תאריך לא תקין. הפורמט: YYYY-MM-DD" });
    }
    if (!wanted) return res.status(400).json({ error: "לא נשלחה רשימת היעדרויות" });

    /* ============================================================
       ⚠ **מוביל שבוע מסמן כל יום שהוא באחריותו — ולא רק היום.**

       "היום בלבד" הכריח אותו לזכור לסמן בכל ערב, ותיקון של
       אתמול חייב לעבור דרך המנהל. הטווח נגזר מהשבוע שבלוח
       מובילי השבוע, ולכן הוא **מתחלף מעצמו**: כשהשבוע נגמר,
       החניך מפסיק לסמן ימים חדשים בלי שאיש יעשה דבר, וממשיך
       לתקן את הימים שלו **עוד חמישה ימים** אחרי שהשבוע נגמר —
       ולא יותר (12.9.2026, ראו `canMarkDate` ב-_leader-weeks.js).

       ⚠⚠ **הסימון הידני בלוח החניכים נשאר "היום בלבד".** הוא
         עוקף חירום ואין לו טווח, ולכן חניך שסומן פעם אחת היה
         מקבל אחרת הרשאה על **כל** ימי השנה, לנצח. שתי הרשאות
         שנראות זהות ואינן: אחת נגזרת מטווח, השנייה מתיבה.

       ⚠ **וזה השער האמיתי — הכתיבה.** מסך שיציג תאריך אינו
         הרשאה; זו הבדיקה שאי אפשר לעקוף (עיקרון 3).
       ============================================================ */
    const today = todayFor(req);
    if (!session.isManager) {
      const mine = await weeksOfStudent(session.itemId);
      const allowed = canMarkDate(mine, date, today);
      const emergencyToday = date === today && session.isLeader;
      /* ⚠ שבוע שלו שהחלון שלו נסגר — ההודעה אומרת **מתי נסגר ולמי
         לפנות**, ולא "אינו בשבועות שלכם", שהיא פשוט לא נכונה. */
      const closed = !allowed && mine.find((w) => w.start <= date && date <= w.end);
      if (closed && !emergencyToday) {
        const until = markUntil(closed);
        return res.status(403).json({
          error: `הסימון של שבוע ${closed.num || ""} נסגר ב-${until.slice(8)}.${until.slice(5, 7)}`
            + " — חמישה ימים אחרי סוף השבוע. תיקון נעשה דרך הצוות",
        });
      }
      if (!allowed && !emergencyToday) {
        return res.status(403).json({
          error: mine.length
            ? `${date} אינו באחד השבועות שאתם מובילים `
              + `(${mine.map((w) => `${w.start}–${w.end}`).join(" · ")})`
            : "סימון נוכחות נעשה על ידי מובילי השבוע, בימים שבאחריותם",
        });
      }
    }

    const [students, cal] = await Promise.all([activeStudents(), loadCalendar()]);
    const day = cal.byDate.get(date);
    if (!day) return res.status(404).json({ error: "התאריך אינו בלוח השנה של המכינה" });
    if (!isSchoolDay(day)) {
      return res.status(400).json({ error: `יום ${day.kind} — אין בו סימון נוכחות` });
    }

    /* ---------- אימות הרשימה ---------- */
    const known = new Map(students.map((s) => [s.id, s]));
    const seen = new Set();
    const clean = [];

    for (const raw of wanted) {
      const studentId = String(raw?.studentId || "");
      const type = String(raw?.type || "");
      const student = known.get(studentId);

      if (!student) return res.status(400).json({ error: "חניך לא מוכר ברשימה" });
      if (seen.has(studentId)) {
        return res.status(400).json({ error: `${student.name} מופיע פעמיים ברשימה` });
      }
      if (!TYPES.includes(type)) {
        return res.status(400).json({ error: `סוג היעדרות לא מוכר: ${type}` });
      }
      if (type === ABSENCE.vacation) {
        const rule = vacationRule(day);
        if (!rule.allowed) return res.status(400).json({ error: rule.reason });
      }
      const detail = String(raw?.detail || "").trim().slice(0, 2000);
      /* ⚠ מוצדקת בלי פירוט אינה ניתנת לביקורת אחר כך — חובה */
      if (type === ABSENCE.justified && !detail) {
        return res.status(400).json({ error: `${student.name}: היעדרות מוצדקת מחייבת פירוט` });
      }
      seen.add(studentId);
      clean.push({ studentId, type, name: student.name, detail });
    }

    /* ---------- השוואה מול המצב בפועל ----------
       קריאה טרייה ולא מהמטמון: הפער בין מה שהמסך ראה לבין מה
       שקיים עכשיו הוא בדיוק מה שצריך להצטמצם כאן. */
    const absences = await loadAbsences({ force: true });
    const onDate = absences.filter((a) => a.date === date);
    const byStudent = new Map(onDate.map((a) => [a.studentId, a]));

    /* ============================================================
       ⚠⚠⚠ **אין כאן חסימת מכסה, ובכוונה** — ראו ההערה המפורטת
         בראש הקובץ.

       הסימון היומי מתאר **מה היה באותו יום**. הוא נעשה בערב
       על 33 חניכים, ואי-דיוק בו הוא מצב רגיל; מאז 12.9.2026
       הוא אינו יורד מהמכסה, ולכן אין שום סיבה שהוא ייחסם
       על ידה.

       ⚠ **מה שכן נבדק על יום חופש נשאר למעלה**: `vacationRule`
         — האם ביום הזה בכלל אפשר לנצל יום חופש (סופ״ש בית,
         חג וכו׳). זו שאלה על היום, לא על התקציב.

       ⚠ **ומי שמוסיף כאן חסימת מכסה מחדש** — לקרוא קודם את
         ההערה בראש הקובץ ואת `summarize`. שתי הגדרות של
         "כמה נוצל" הן בדיוק מה שיוצר מסך שאומר "נותרו 3"
         ושרת שחוסם.
       ============================================================ */

    /* ⚠ ההרשאה לתקן שורה שמקורה בבקשה מאושרת. מנהל בלבד. */
    const canOverride = session.isManager;
    const locked = [], created = [], removed = [], changed = [];

    for (const w of clean) {
      const cur = byStudent.get(w.studentId);
      if (!cur) {
        await createAbsence({
          studentId: w.studentId, studentName: w.name, date,
          type: w.type, detail: w.detail, source: ABSENCE_SOURCE.manual,
        });
        created.push(w.name);
        continue;
      }
      if (cur.source === ABSENCE_SOURCE.request && !canOverride) { locked.push(w.name); continue; }
      if (cur.type !== w.type || (cur.detail || "") !== w.detail) {
        await deleteAbsence(cur.id);
        await createAbsence({
          studentId: w.studentId, studentName: w.name, date,
          type: w.type, detail: w.detail, source: ABSENCE_SOURCE.manual,
        });
        changed.push(w.name);
      }
    }

    for (const cur of onDate) {
      if (seen.has(cur.studentId)) continue;
      /* ⚠ בקשה מאושרת — מנהל רשאי לבטל, מוביל שבוע לא.
         ראו ההערה בראש הקובץ. */
      if (cur.source === ABSENCE_SOURCE.request && !canOverride) {
        locked.push((known.get(cur.studentId) || {}).name || cur.studentId);
        continue;
      }
      await deleteAbsence(cur.id);
      removed.push((known.get(cur.studentId) || {}).name || cur.studentId);
    }

    /* ⚠ החותמת אחרונה. עד שהיא נרשמת היום נחשב "טרם סומן",
       וכך כשל באמצע לא מציג יום חלקי כיום מלא. */
    /* חניך לא יכול להיות גם נוכח וגם נעדר */
    const presentClean = presentIds.filter((id) => known.has(id) && !seen.has(id));
    /* ⚠ **"נוכח" ו"חצי יום" נדחים ברעש כשהם על אותו חניך.**
       שתי טענות סותרות על אותו יום אינן מצב שמכריעים בו בשקט
       (4ט), ושתיקה כאן הייתה משאירה את המסמן בטוח שנשמר מה
       שהוא בחר. */
    /* ⚠ **מול `presentIds` הגולמי ולא מול `presentClean`.**
       `presentClean` כבר מסנן את מי שיש לו היעדרות — וחניך
       בחצי יום **כן** נושא היעדרות. השוואה מולו הייתה בולעת
       בדיוק את ההתנגשות שמעניינת. */
    const clash = halfIds.filter((id) => presentIds.includes(id));
    if (clash.length) {
      const names = clash.map((id) => (known.get(id) || {}).name || id).join(", ");
      return res.status(400).json({
        error: `${names} — אי אפשר לסמן גם "נוכח" וגם "חצי יום" באותו יום`,
      });
    }
    /* ⚠ בלי העמודה הסימון היה נבלע — נכשלים ברעש ואומרים מה
       להריץ, ולא מחזירים "נשמר" על משהו שאבד (עיקרון 6). */
    if (halfIds.length && !halfDayReady()) {
      return res.status(503).json({
        error: "עמודת \"חצי יום\" טרם הוקמה. הריצו: npm run setup:boards",
        setupRequired: true,
      });
    }
    const halfClean = halfIds.filter((id) => known.has(id));
    await stampMarked(date, actorName(session), presentClean, halfClean);
    invalidateAttendance();

    res.status(200).json({
      ok: true, date,
      absent: clean.length,
      present: presentClean.length,
      half: halfClean.length,
      unmarked: Math.max(0, students.length - clean.length - presentClean.length - halfClean.length),
      created: created.length,
      removed: removed.length,
      changed: changed.length,
      /* שורות שמקורן בבקשה מאושרת ולא נגענו בהן — המסך מסביר */
      locked: [...new Set(locked)],
    });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[attendance-mark]", e);
    res.status(502).json({ error: "שמירת הסימון נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { marker: true });
