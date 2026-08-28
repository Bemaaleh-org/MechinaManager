/* ============================================================
   נתוני האחריות — משימות, הצפות ומסמכי חפיפה. צד שרת בלבד.
   ------------------------------------------------------------
   ⚠ הפונקציות כאן **אינן** אוכפות הרשאה. האכיפה יושבת בנקודות
     הקצה, וכל אחת מהן צרה אחרת: המשימות שייכות לחניך בלבד,
     ההצפות נשלחות על ידי הצוות ונקראות על ידי החניך, והחפיפה
     גלויה לכל מי שנושא את התפקיד.
   ============================================================ */

import { allItems, gql } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { DUTY_BOARDS, DUTY_COLS } from "../shared/duty-ids.js";
import { loadLeaderWeeks } from "./_leader-weeks.js";
import { chairMap } from "./_placements.js";
import { studentRows } from "./_student-rows.js";
import { dutiesOf, dutyKey } from "../shared/duties.js";

export { setColumns, renameItem, createItem, deleteItem } from "./_items.js";

const T = DUTY_COLS.tasks;
const N = DUTY_COLS.notes;
const H = DUTY_COLS.handover;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ============================================================
   האחריות של חניך — מאוחדת משלושה מקורות
   ------------------------------------------------------------
   ⚠ הפונקציה הזו היא התשובה היחידה לשאלה "מה החניך הזה
     אחראי עליו", וכל נקודת קצה שואלת אותה. שלוש תשובות
     מקבילות היו מתפצלות.
   ============================================================ */
export async function dutiesForStudent(studentId) {
  const id = String(studentId || "");
  if (!id) return [];
  const [rows, weeks, chairs] = await Promise.all([
    studentRows(), loadLeaderWeeks(), chairMap(),
  ]);
  const me = rows.find((r) => r.id === id);
  if (!me) return [];
  return dutiesOf({
    roles: me.roles || [],
    isLeader: weeks.some((w) => (w.leaderIds || []).includes(id)),
    chairOf: chairs.get(id) || [],
  });
}

/** מי נושא את האחריות הזו כרגע — מזהי חניכים */
export async function holdersOf(name, scope = null) {
  const [rows, weeks, chairs] = await Promise.all([
    studentRows(), loadLeaderWeeks(), chairMap(),
  ]);
  const out = new Set();
  for (const r of rows) {
    if (!r.active || r.demo) continue;
    const ds = dutiesOf({
      roles: r.roles || [],
      isLeader: weeks.some((w) => (w.leaderIds || []).includes(r.id)),
      chairOf: chairs.get(r.id) || [],
    });
    for (const d of ds) {
      if (d.name !== name) continue;
      if (scope && d.scope !== scope) continue;
      out.add(r.id);
    }
  }
  return [...out];
}

/* ============================================================
   משימות
   ============================================================ */
export async function loadTasks({ force = false } = {}) {
  if (!DUTY_BOARDS.tasks) return [];
  return cached("duty-tasks", async () => {
    const items = await allItems(DUTY_BOARDS.tasks);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        duty: val(i, T.duty),
        owner: val(i, T.owner),
        done: val(i, T.done) === "v",
        due: val(i, T.due) || null,
        note: val(i, T.note) || null,
        at: val(i, T.at) || null,
      }))
      .filter((x) => x.title && x.owner)
      /* פתוחות לפני שבוצעו, ובתוך כל קבוצה לפי היעד */
      .sort((a, b) =>
        Number(a.done) - Number(b.done)
        || (a.due || "9999").localeCompare(b.due || "9999")
        || (b.at || "").localeCompare(a.at || ""));
  }, { force });
}
export const invalidateTasks = () => invalidate("duty-tasks");

/* ============================================================
   הצפות מהצוות
   ============================================================ */
export async function loadNotes({ force = false } = {}) {
  if (!DUTY_BOARDS.notes) return [];
  return cached("duty-notes", async () => {
    const items = await allItems(DUTY_BOARDS.notes);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        duty: val(i, N.duty),
        by: val(i, N.by) || null,
        at: val(i, N.at) || null,
        body: val(i, N.body) || null,
        reply: val(i, N.reply) || null,
        replyAt: val(i, N.replyAt) || null,
      }))
      .filter((x) => x.title && x.duty)
      .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  }, { force });
}
export const invalidateNotes = () => invalidate("duty-notes");

/* ============================================================
   מסמכי חפיפה
   ------------------------------------------------------------
   ⚠ **פריט אחד לכל סוג תפקיד**, ולא לכל ועדה בנפרד. "יו״ר
     ועדה" הוא סוג אחד; אם אי פעם תידרש חפיפה ייעודית לוועדה
     מסוימת, שם הפריט יוכל לשאת את התחום בלי לשנות דבר אחר.
   ============================================================ */
export async function loadHandovers({ force = false } = {}) {
  if (!DUTY_BOARDS.handover) return [];
  return cached("duty-handover", async () => {
    const items = await allItems(DUTY_BOARDS.handover);
    return items
      .map((i) => ({
        id: String(i.id),
        duty: String(i.name || "").trim(),
        by: val(i, H.by) || null,
        phone: val(i, H.phone) || null,
        cycle: val(i, H.cycle) || null,
        doing: val(i, H.doing) || null,
        challenges: val(i, H.challenges) || null,
        keep: val(i, H.keep) || null,
        improve: val(i, H.improve) || null,
        extra: val(i, H.extra) || null,
        at: val(i, H.at) || null,
      }))
      .filter((x) => x.duty)
      /* ⚠ מסמך בלי תוכן אינו מסמך. הוא לא ייצור התראה ולא
         ייראה כמו משהו שממתין. */
      .filter((x) => x.doing || x.challenges || x.keep || x.improve || x.extra);
  }, { force });
}
export const invalidateHandovers = () => invalidate("duty-handover");

/** המסמך של האחריות הזו, או null */
export const handoverFor = (list, name) =>
  list.find((h) => h.duty === name) || null;

/**
 * מפתח האישור שנשמר על שורת החניך.
 * ⚠ כולל את תאריך העדכון: מסמך שנכתב מחדש מחזיר את ההתראה
 *   מעצמו, בלי שאיש יצטרך לאפס משהו.
 */
export const handoverStamp = (h) => `${h.duty}@${h.at || "—"}`;

export { dutyKey };
