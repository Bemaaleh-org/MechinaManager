/* ============================================================
   /api/students?action=laundry    חדר הכביסה — תורים למכונות
   ------------------------------------------------------------
   חניך מזמין תור למכונת כביסה או למייבש: תאריך, שעת התחלה,
   משך, סוג כביסה והערה. כולם רואים את הלוח השבועי, כדי לדעת
   מתי פנוי לפני שמזמינים.

   ⚠ **ההרשאה בתוך ה-handler ולא בדגל של withAuth.** השער הוא
     `{ student: true }`, והשאלה האמיתית — "האם זה שלי" — היא
     השוואת מזהים (`String(session.itemId)`), לעולם לא שמות:
     שם משתנה, מזהה לא (4ס).

   ⚠ **אב הבית והצוות (`manage`) עורכים ומוחקים כל תור, ומזמינים
     בשם חניך.** חניך — את שלו בלבד, ורק תורים שטרם עברו. תור
     שעבר הוא כבר "כביסה שנעשתה" ונספר בספירה השנתית.

   ⚠ **חפיפה נדחית ב-409 שאומר מי תופס ומתי.** "המכונה תפוסה"
     לבד שולח את החניך לחפש בלוח; "תפוסה בשעה 08:00 על ידי נעם"
     אומר לו מיד אם לזוז חצי שעה או לדבר עם נעם.

   ⚠ **הספירה השנתית נגזרת ואינה נשמרת** (4כו): ספירת שורות
     לחניך פעיל. מונה שמור היה מתיישן ברגע שמישהו מוחק תור
     בלוח. וזו ספירה "בשביל הכיף" — מספר אחד לחניך, בלי מי
     כיבס מה ומתי ובלי דירוג (עיקרון 5). מי שירצה להוסיף לה
     עומק — לשאול קודם.

   ⚠ **הלוח הוא מקור האמת** — שורה שמישהו הוסיף או שינה ישירות
     ב-monday מופיעה כאן כמו כל תור אחר.
   ============================================================ */
import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { todayFor } from "./_attendance-data.js";
import { activeStudents, assignableStudents } from "./_student-rows.js";
import {
  LAUNDRY_BOARDS as B, LAUNDRY_COLS as C, MACHINES, KINDS, laundryReady,
} from "../shared/laundry-ids.js";

/* ---------- קבועים ---------- */

/** שעות הפעילות של החדר, וקפיצת הבורר בדקות. */
export const HOURS = { open: "07:00", close: "23:30", step: 30 };

/** משכי תור אפשריים, בדקות. */
export const DURATIONS = [30, 45, 60, 90, 120];

/* ⚠ **תחילת שנת המכינה, מקובעת.** הספירה השנתית סופרת שורות
   מהתאריך הזה ועד היום. הלוח שייך למחזור ומשוכפל ריק בכל שנה
   (shared/cycles.js), ולכן הקבוע הוא רשת ביטחון ולא המנגנון —
   אבל מי שיקים את המחזור הבא צריך לעדכן אותו, אחרת השנה
   הבאה תיספר מהראשון בספטמבר של השנה שעברה. עיקרון 1 היה
   רוצה אותו בלוח; עבור ספירה "בשביל הכיף" זה לא שווה עמודה. */
const YEAR_START = "2026-09-01";

/* ⚠ **שני תורים קדימה לחניך.** בלי תקרה, חניך אחד יכול לתפוס
   את המכונה לכל השבוע ביום ראשון בבוקר. שניים מספיקים למכונה
   ולמייבש של אותו יום. אב הבית והצוות אינם כפופים לתקרה —
   הם מזמינים בשם חניכים, ולפעמים בשם כמה. */
const MAX_FUTURE = 2;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};

/** "07:30" → 450 */
const minutesOf = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
/** 450 → "07:30" */
const hhmm = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** תאריך + ימים, בחשבון מחרוזות בלבד — בלי שעון השרת. */
const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const notReady = (res) =>
  res.status(503).json({
    error: "לוח הכביסה טרם הוקם",
    setupRequired: true,
    run: "npm run seed:laundry",
  });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ---------------- טעינה ---------------- */

export async function loadLaundry({ force = false } = {}) {
  if (!laundryReady()) return [];
  return cached("laundry", async () => {
    const items = await allItems(B.board);
    return items.map((i) => {
      const n = Number(val(i, C.minutes));
      return {
        id: String(i.id),
        student: val(i, C.student),
        studentName: val(i, C.studentName),
        date: val(i, C.date) || null,
        hour: val(i, C.hour),
        machine: status(i, C.machine),
        kind: status(i, C.kind) || null,
        /* ⚠ משך שמישהו מחק בלוח נשאר `null` ומוצג כך — ולא
           הופך בשקט לשעה (4ט). בבדיקת החפיפה הוא תופס קפיצה
           אחת, כדי שהשורה עדיין תחסום את השעה שלה. */
        minutes: Number.isFinite(n) && n > 0 ? n : null,
        note: val(i, C.note) || null,
        by: val(i, C.by) || null,
        byId: val(i, C.byId) || null,
      };
    }).filter((r) => r.student && r.date && TIME_RE.test(r.hour) && MACHINES.includes(r.machine));
  }, { force });
}

/* ---------------- כללים ---------------- */

const machineRank = (m) => MACHINES.indexOf(m);
const byWhen = (a, b) =>
  a.date.localeCompare(b.date)
  || machineRank(a.machine) - machineRank(b.machine)
  || minutesOf(a.hour) - minutesOf(b.hour);

/**
 * מי תופס את המכונה בטווח הזה. [שעה, שעה+משך) — שני תורים
 * שנוגעים בקצה (08:00–09:00 ו-09:00–10:00) אינם חופפים.
 * ⚠ התור חי בתוך התאריך שלו: כביסה שמתחילה ב-23:30 ונגמרת
 *   אחרי חצות אינה נבדקת מול הבוקר שאחריו — החדר נפתח ב-07:00
 *   וזה בסדר.
 */
function clash(rows, { date, machine, hour, minutes }, exceptId = null) {
  const start = minutesOf(hour);
  const end = start + minutes;
  return rows.find((r) => {
    if (r.id === exceptId || r.date !== date || r.machine !== machine) return false;
    const s = minutesOf(r.hour);
    const e = s + (r.minutes ?? HOURS.step);
    return start < e && s < end;
  }) || null;
}

/**
 * שדות התור → ערכים מאומתים, או הודעת שגיאה.
 * ⚠ אותה בדיקה ביצירה ובעריכה — אחרת אפשר להזמין תור תקין ואז
 *   לערוך אותו לשעה 03:00.
 */
function validate(b, { manage, today }) {
  const date = String(b.date || "").trim();
  if (!DATE_RE.test(date)) return { error: "תאריך בפורמט YYYY-MM-DD" };
  /* ⚠ הצוות רשאי לרשום בדיעבד — כביסה שנעשתה בלי תור עדיין
     נספרת. חניך — רק קדימה. */
  if (!manage && date < today) return { error: "אי אפשר להזמין תור לתאריך שעבר" };

  const hour = String(b.hour || "").trim();
  if (!TIME_RE.test(hour)) return { error: "שעה בפורמט HH:MM" };
  const h = minutesOf(hour);
  if (h < minutesOf(HOURS.open) || h > minutesOf(HOURS.close)) {
    return { error: `חדר הכביסה פתוח בין ${HOURS.open} ל-${HOURS.close}` };
  }

  const machine = String(b.machine || "").trim();
  if (!MACHINES.includes(machine)) {
    return { error: `"${machine}" אינה מכונה מוכרת. האפשרויות: ${MACHINES.join(" · ")}` };
  }
  const kind = String(b.kind || "").trim();
  if (!KINDS.includes(kind)) {
    return { error: `"${kind}" אינו סוג כביסה מוכר. האפשרויות: ${KINDS.join(" · ")}` };
  }
  const minutes = Number(b.minutes);
  if (!DURATIONS.includes(minutes)) {
    return { error: `משך התור: ${DURATIONS.join(" · ")} דקות` };
  }
  const note = String(b.note || "").trim().slice(0, 300);
  return { date, hour, machine, kind, minutes, note };
}

/** מי מכבס. ⚠ `studentId` נשמע רק ל-`manage`; חניך מזמין לעצמו. */
async function whoFor(body, session, manage) {
  const wanted = manage ? String(body?.studentId || "").trim() : "";
  if (!wanted) {
    /* ⚠ איש צוות שמזמין לעצמו: `session.name` אצל הצוות מוצהר
       ויכול להיות ריק, ושורה בשם " · 2026-09-08 07:00" אינה
       קריאה בלוח. */
    const name = String(session.name || "").trim() || (session.isStudent ? "" : "צוות");
    return { id: String(session.itemId || ""), name };
  }
  /* ⚠ מאומת מול רשימת החניכים ולא נלקח כמות שהוא — מזהה שרירותי
     היה יוצר תור לאיש שאינו קיים, ובלוח הוא היה נראה כמו תור. */
  const s = (await assignableStudents()).find((x) => x.id === wanted);
  if (!s) return { error: "החניך אינו ברשימת החניכים" };
  return { id: s.id, name: s.name };
}

const rowName = (name, date, hour) => `${name} · ${date} ${hour}`;

/* ---------------- הנתיב ---------------- */

async function handler(req, res, session) {
  if (!laundryReady()) return notReady(res);
  const today = todayFor(req);
  const me = String(session.itemId || "");
  const manage = Boolean(session.isHouse || session.isManager);

  try {
    if (req.method === "GET") {
      const q = req.query || {};
      const from = DATE_RE.test(String(q.from || "")) ? String(q.from) : today;
      let to = DATE_RE.test(String(q.to || "")) ? String(q.to) : addDays(from, 6);
      if (to < from) to = addDays(from, 6);

      const [rows, students] = await Promise.all([loadLaundry(), activeStudents()]);

      /* ---- הספירה השנתית ----
         ⚠ חניכים פעילים בלבד, ולכן חשבון הבדיקה אינו נספר (4לא).
         ⚠ רק מה שכבר קרה: תור להשבוע הבא אינו כביסה שנעשתה. */
      const counts = new Map();
      for (const r of rows) {
        if (r.date < YEAR_START || r.date > today) continue;
        counts.set(r.student, (counts.get(r.student) || 0) + 1);
      }
      const tally = students
        .map((s) => ({ id: s.id, name: s.name, n: counts.get(s.id) || 0 }))
        .filter((s) => s.n > 0)
        .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "he"));

      return res.status(200).json({
        ok: true,
        today, from, to,
        machines: MACHINES,
        kinds: KINDS,
        hours: HOURS,
        durations: DURATIONS,
        /* ⚠ מיפוי מפורש — `byId` של הרושם אינו יוצא; `mine` ו-`past`
           נגזרים בשרת, כדי שהמסך לא ישווה שמות ולא שעון. */
        bookings: rows
          .filter((r) => r.date >= from && r.date <= to)
          .sort(byWhen)
          .map((r) => ({
            id: r.id,
            student: r.student,
            studentName: r.studentName,
            date: r.date,
            hour: r.hour,
            machine: r.machine,
            kind: r.kind,
            minutes: r.minutes,
            note: r.note,
            mine: r.student === me,
            past: r.date < today,
          })),
        me: { id: me, manage },
        /* ⚠ רשימת הבחירה — ולכן `assignableStudents` (4ע) — ורק
           למי שרשאי להזמין בשם אחרים. חניך אינו מקבל אותה. */
        ...(manage
          ? { students: (await assignableStudents()).map((s) => ({ id: s.id, name: s.name })) }
          : {}),
        tally,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const v = validate(body, { manage, today });
      if (v.error) return res.status(400).json({ error: v.error });
      const who = await whoFor(body, session, manage);
      if (who.error) return res.status(400).json({ error: who.error });

      const rows = await loadLaundry();

      /* ⚠ התקרה לחניך שמזמין לעצמו. ראו MAX_FUTURE. */
      if (!manage) {
        const held = rows.filter((r) => r.student === me && r.date >= today).length;
        if (held >= MAX_FUTURE) {
          return res.status(409).json({
            error: `כבר יש לך ${MAX_FUTURE} תורים קדימה. אפשר להזמין עוד כשאחד מהם יעבור, או לבטל אחד.`,
          });
        }
      }

      const taken = clash(rows, v);
      if (taken) {
        return res.status(409).json({
          error: `המכונה תפוסה בשעה ${taken.hour} על ידי ${taken.studentName}`,
          clash: { id: taken.id, hour: taken.hour, studentName: taken.studentName },
        });
      }

      const id = await createItem(B.board, rowName(who.name, v.date, v.hour), {
        [C.student]: who.id,
        [C.studentName]: who.name,
        [C.date]: { date: v.date },
        [C.hour]: v.hour,
        [C.machine]: { label: v.machine },
        [C.kind]: { label: v.kind },
        [C.minutes]: String(v.minutes),
        [C.note]: v.note,
        [C.by]: String(session.name || "").slice(0, 120),
        [C.byId]: me,
      });
      invalidate("laundry");
      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין תור" });
    const rows = await loadLaundry();
    const row = rows.find((r) => r.id === id);
    /* ⚠ 404 ולא 403 על תור של מישהו אחר — 403 מאשר שהשורה
       קיימת (4מה). */
    if (!row || (!manage && row.student !== me)) {
      return res.status(404).json({ error: "התור אינו נמצא" });
    }
    if (!manage && row.date < today) {
      return res.status(400).json({
        error: "תור שעבר כבר נספר בכביסה השנתית ואינו ניתן לשינוי",
      });
    }

    if (req.method === "PUT") {
      /* ⚠ מה שלא נשלח נשאר כפי שהוא — ומה שנשלח עובר את אותה
         בדיקה כמו ביצירה. */
      const merged = {
        date: body.date ?? row.date,
        hour: body.hour ?? row.hour,
        machine: body.machine ?? row.machine,
        kind: body.kind ?? row.kind ?? KINDS[0],
        minutes: body.minutes ?? row.minutes ?? DURATIONS[2],
        note: body.note ?? row.note ?? "",
      };
      const v = validate(merged, { manage, today });
      if (v.error) return res.status(400).json({ error: v.error });

      /* ⚠ העברת התור לחניך אחר — `manage` בלבד, וגם אז מאומת. */
      let who = { id: row.student, name: row.studentName };
      if (manage && body.studentId !== undefined && String(body.studentId || "").trim()) {
        who = await whoFor(body, session, manage);
        if (who.error) return res.status(400).json({ error: who.error });
      }

      const taken = clash(rows, v, id);
      if (taken) {
        return res.status(409).json({
          error: `המכונה תפוסה בשעה ${taken.hour} על ידי ${taken.studentName}`,
          clash: { id: taken.id, hour: taken.hour, studentName: taken.studentName },
        });
      }

      await setColumns(B.board, id, {
        [C.student]: who.id,
        [C.studentName]: who.name,
        [C.date]: { date: v.date },
        [C.hour]: v.hour,
        [C.machine]: { label: v.machine },
        [C.kind]: { label: v.kind },
        [C.minutes]: String(v.minutes),
        [C.note]: v.note,
      });
      const name = rowName(who.name, v.date, v.hour);
      if (name !== rowName(row.studentName, row.date, row.hour)) {
        await renameItem(B.board, id, name);
      }
      invalidate("laundry");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      await deleteItem(id);
      invalidate("laundry");
      return res.status(200).json({ ok: true, id });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[laundry]", e);
    return res.status(502).json({ error: "פעולת חדר הכביסה נכשלה" });
  }
}

export default withAuth(handler, { student: true });
