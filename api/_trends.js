/* ============================================================
   /api/students?action=trends   מגמות לצוות
   ------------------------------------------------------------
   ⚠⚠⚠ **אין כאן שום מספר שמתייחס לחניך מסוים, ולא יהיה.**

   זו אינה החמרה מיותרת: ברגע שמסך מגמות מציג "מי הכי נעדר",
   הוא הופך מכלי ניהול לכלי מעקב, ואז כל חניך שיודע שהוא קיים
   מתנהג אחרת. זו אותה הבטחה שבגללה אין שדה "מי ביצע תורנות"
   (עיקרון 5), ואותה סיבה שמשימות מרכז התפקיד סגורות בפני
   הצוות (4מה).

   **מה שמותר: מספרים על המכינה. מה שאסור: מספרים על אנשים.**

   ⚠ מה שכן קיים ולא כאן: מסך החניכים מראה נוכחות אישית, וזה
     נכון — הוא מסך של מדריך שמלווה חניך, ולא לוח מחוונים.
     ההבחנה היא בין "לפתוח את התיק של פלוני" לבין "לראות מי
     בולט בטבלה", והשנייה היא זו שמשנה התנהגות.

   ------------------------------------------------------------
   ⚠⚠ **מגמה דורשת מספיק נקודות, ואחרת נאמר שאין.**

   שני שבועות אינם מגמה. `enough` מוחזר לכל סדרה, והמסך אומר
   "עוד אין מספיק נתונים" במקום לצייר גרף של שתי נקודות
   שנראה כמו מסקנה. אותו כלל של אחוז נוכחות מחמישה ימים (4ג)
   ושל טבלת התורנויות בתחילת שנה (4צ).

   ⚠ **ושבוע חלקי אינו נקודה.** השבוע הנוכחי טרם נגמר, וכל
     מדד בו נמוך מטבעו — הכללתו הייתה מייצרת "ירידה" מדומה
     בכל שבוע, בדיוק בקצה שאליו מסתכלים.
   ============================================================ */
import { withAuth } from "./_session.js";
import { israelToday, todayFor } from "./_attendance-data.js";

const WEEKS = 8;
const MIN_POINTS = 3;

const shift = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ⚠ שבוע ראשון–שבת בשעון ישראל, כמו בכל המערכת (shared/week.js). */
function weekStart(iso) {
  const d = new Date(iso + "T12:00:00Z");
  return shift(iso, -d.getUTCDay());
}

/** שמונת השבועות שהסתיימו, מהישן לחדש. השבוע הנוכחי אינו בהם. */
function pastWeeks(today) {
  const cur = weekStart(today);
  const out = [];
  for (let i = WEEKS; i >= 1; i--) {
    const start = shift(cur, -7 * i);
    out.push({ start, end: shift(start, 6) });
  }
  return out;
}

/**
 * סדרה אחת.
 * ⚠ `enough` נגזר ממספר הנקודות **שיש בהן נתון**, ולא ממספר
 *   השבועות: שמונה שבועות שבשלושה מהם לא סומן דבר אינם שמונה
 *   נקודות.
 */
function series(title, unit, points, note) {
  const real = points.filter((p) => p.value != null);
  return {
    title, unit, points, note: note || null,
    enough: real.length >= MIN_POINTS,
    /* ⚠ הכיוון נגזר מהראשונה מול האחרונה **שיש בהן נתון**,
       ולא מהאיברים בקצוות (שעשויים להיות null). */
    change: real.length >= 2
      ? Math.round((real[real.length - 1].value - real[0].value) * 10) / 10
      : null,
  };
}

async function handler(req, res, session) {
  /* ⚠ **צוות בלבד.** לחניך אין מה לעשות עם מגמות של המכינה,
     ומסך שמראה לו אותן מזמין השוואה עצמית. */
  if (session.isStudent) {
    return res.status(403).json({ error: "המסך הזה מיועד לצוות" });
  }

  const today = todayFor(req) || israelToday();
  const weeks = pastWeeks(today);
  const out = [];
  const failed = [];

  const add = async (fn) => {
    try {
      const s = await fn();
      if (s) out.push(s);
    } catch (e) {
      console.error("[trends]", e && e.message);
      failed.push(String(e && e.message).slice(0, 80));
    }
  };

  /* ---------- נוכחות ---------- */
  await add(async () => {
    const { loadMarked, loadCalendar, isSchoolDay } =
      await import("./_attendance-data.js");
    const { activeStudents } = await import("./_student-rows.js");
    const [marked, cal, students] = await Promise.all([
      loadMarked(), loadCalendar(), activeStudents(),
    ]);
    const n = students.length || 1;

    const points = weeks.map((w) => {
      const days = (cal.days || []).filter((d) =>
        d.date >= w.start && d.date <= w.end && isSchoolDay(d));
      const seen = days.filter((d) => marked.has(d.date));
      if (!seen.length) return { label: w.start, value: null };
      /* ⚠ **המכנה הוא ימים שסומנו**, לא ימי לימוד: יום שאיש לא
         סימן אינו יום שכולם נעדרו ממנו (4ז). */
      const total = seen.reduce((a, d) => a + (marked.get(d.date).present.size || 0), 0);
      return {
        label: w.start,
        value: Math.round((total / (seen.length * n)) * 1000) / 10,
      };
    });
    return series("נוכחות שבועית", "%", points,
      "מחושב מהימים שסומנו בפועל — יום שלא סומן אינו נספר");
  });

  /* ---------- היעדרויות לפי סוג ---------- */
  await add(async () => {
    const { loadAbsences } = await import("./_attendance-data.js");
    const abs = await loadAbsences();
    const points = weeks.map((w) => ({
      label: w.start,
      value: abs.filter((a) => a.date >= w.start && a.date <= w.end).length,
    }));
    return series("היעדרויות מאושרות", "", points,
      "כל הסוגים יחד — מחלה, מוצדקת ויום חופש");
  });

  /* ---------- דיווח שיעורים ---------- */
  await add(async () => {
    const { loadMeetings } = await import("./_lessons-data.js");
    const meetings = await loadMeetings();
    const points = weeks.map((w) => {
      const inWeek = meetings.filter((m) => m.date >= w.start && m.date <= w.end);
      if (!inWeek.length) return { label: w.start, value: null };
      /* ⚠ **"טרם דווח" הוא מצב שלישי** ואינו "לא התקיים" (4ח).
         כאן נמדד **אחוז הדיווח**, כלומר עבודת אחראי הלו״ז —
         ולא אחוז הקיום. */
      const done = inWeek.filter((m) => m.happened !== null).length;
      return { label: w.start, value: Math.round((done / inWeek.length) * 1000) / 10 };
    });
    return series("מפגשים שדווחו", "%", points,
      "כמה מהמפגשים בשבוע קיבלו דיווח — התקיים או לא");
  });

  /* ---------- תקלות ---------- */
  await add(async () => {
    const { loadFaults } = await import("./_faults.js");
    const { FAULT_STATUS } = await import("../shared/faults-board.js");
    const faults = await loadFaults();
    const points = weeks.map((w) => ({
      label: w.start,
      value: faults.filter((f) => f.date >= w.start && f.date <= w.end).length,
    }));
    const open = faults.filter((f) => f.status !== FAULT_STATUS.done).length;
    return series("תקלות שדווחו", "", points,
      `פתוחות כרגע: ${open}`);
  });

  /* ---------- בקשות יציאה ---------- */
  await add(async () => {
    const { loadRequests } = await import("./_requests.js");
    const reqs = await loadRequests();
    const points = weeks.map((w) => ({
      label: w.start,
      /* ⚠ תאריך היציאה המבוקש ולא תאריך ההגשה — הוא מה שיש
         בלוח, וזו גם השאלה המעניינת ("כמה יוצאים באותו שבוע"). */
      value: reqs.filter((r) => r.date >= w.start && r.date <= w.end).length,
    }));
    return series("בקשות יציאה", "", points,
      "לפי תאריך היציאה המבוקש, לא לפי מתי הוגשה");
  });

  /* ---------- לוח המודעות ---------- */
  await add(async () => {
    const { boardReady } = await import("../shared/board-ids.js");
    if (!boardReady()) return null;
    const { loadNotices } = await import("./_board.js");
    const notices = await loadNotices();
    const points = weeks.map((w) => ({
      label: w.start,
      value: notices.filter((n) => n.date >= w.start && n.date <= w.end).length,
    }));
    return series("מודעות שפורסמו", "", points,
      "מדד לכמה הלוח בשימוש — לא לאיכות מה שנכתב");
  });

  res.status(200).json({
    ok: true,
    today,
    from: weeks[0] && weeks[0].start,
    to: weeks[weeks.length - 1] && weeks[weeks.length - 1].end,
    minPoints: MIN_POINTS,
    series: out,
    /* ⚠ מוחזר מה נכשל — רשימה חלקית שנראית מלאה היא עיקרון 6. */
    ...(failed.length ? { failed: failed.length } : {}),
    /* ⚠⚠ **ההצהרה נשלחת עם הנתונים ואינה רק בקוד.** מי שפותח
       את המסך צריך לדעת מה הוא לא יראה בו, ולמה. */
    promise: "כל המספרים כאן הם על המכינה ולא על אנשים. אין כאן דירוג "
      + "חניכים ולא יהיה — זו אותה הבטחה שבגללה אין שדה שמזהה מי ביצע "
      + "איזו תורנות.",
  });
}

export default withAuth(handler);
