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
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { activeStudents } from "./_student-rows.js";
import {
  loadCalendar, loadAbsences, todayFor, isSchoolDay, vacationRule,
  createAbsence, deleteAbsence, stampMarked, invalidateAttendance,
} from "./_attendance-data.js";
import { ABSENCE, ABSENCE_SOURCE } from "../shared/mechina-boards.js";

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

    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: "תאריך לא תקין. הפורמט: YYYY-MM-DD" });
    }
    if (!wanted) return res.status(400).json({ error: "לא נשלחה רשימת היעדרויות" });

    const today = todayFor(req);
    if (!session.isManager && date !== today) {
      return res.status(403).json({ error: "מוביל שבוע מסמן את היום הנוכחי בלבד" });
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
    await stampMarked(date, actorName(session), presentClean);
    invalidateAttendance();

    res.status(200).json({
      ok: true, date,
      absent: clean.length,
      present: presentClean.length,
      unmarked: students.length - clean.length - presentClean.length,
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
