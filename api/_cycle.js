/* ============================================================
   המחזור הפעיל — הפתרון לשאלה "על אילו לוחות אנחנו עובדים"
   ------------------------------------------------------------
   ⚠ כל מודול במערכת מייבא מזהי לוחות מ-shared/*-ids.js. אלה
     **אובייקטים** ולא מחרוזות, ולכן אפשר להחליף את התוכן שלהם
     בזמן ריצה בלי שאף מודול יידע.

     `Object.assign` על האובייקט הקיים ולא החלפה שלו: מודולים
     שכתבו `const A = EXTRA.alumni` מחזיקים הפניה לאובייקט
     הפנימי, והחלפה הייתה משאירה אותם על הישן.

   ⚠ **מחזור פעיל אחד בכל רגע, גלובלי.** לא לכל משתמש ולא לכל
     בקשה. זו החלטה: מכינה מריצה מחזור אחד, והמחזור הקודם
     נשאר לקריאה בלוחות monday עצמם.

     המשמעות: החלפת מחזור היא פעולה נדירה של ראש המכינה, ולא
     מצב שמשתנה בין בקשה לבקשה — ולכן אין מרוץ בין בקשות
     במופע אחד של השרת.

   ⚠ המפה נקראת מהלוח פעם ב-5 דקות, ו-`bumpCycle()` מאפס את
     המטמון מיד אחרי החלפה.
   ============================================================ */

import { gql } from "./_monday.js";
import { CYCLES_BOARD, CYCLES_COLS as C } from "../shared/cycles-ids.js";
import { CYCLE_STATUS, nestBoards, CYCLE_STEPS } from "../shared/cycles.js";
import { invalidate } from "./_cache.js";

import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";
import { PLACEMENT_BOARDS } from "../shared/placements-ids.js";
import { BUDGET_BOARDS } from "../shared/budget-ids.js";
import { FAULTS } from "../shared/faults-ids.js";
import { SAFETY } from "../shared/safety-ids.js";
import { EXTRA } from "../shared/extras-ids.js";
import { DUTY_BOARDS } from "../shared/duty-ids.js";
import { TEAM_BOARDS } from "../shared/team-ids.js";
import { PROJECT_BOARDS } from "../shared/projects-ids.js";
import { LEAD_BOARDS } from "../shared/lead-ids.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ⚠ צילום המצב ההתחלתי, פעם אחת בטעינת המודול. אליו חוזרים
   כשאין מחזור פעיל בלוח — כדי שתקלה בלוח המחזורים לא תשבית
   את המערכת כולה. */
const FALLBACK = JSON.parse(JSON.stringify({
  mechina: MECHINA_BOARDS, lessons: LESSON_BOARDS,
  placements: PLACEMENT_BOARDS, budget: BUDGET_BOARDS,
  faults: FAULTS, safety: SAFETY,
  extras: { hosting: EXTRA.hosting.board, loans: EXTRA.loans.board },
  /* ⚠ `handover` נמצא באובייקט אך **אינו** ב-CYCLE_BOARDS —
     הוא לא מוחלף בהחלפת מחזור, וזה מכוון. */
  duty: DUTY_BOARDS,
  /* ⚠ `vocab` נמצא באובייקט ואינו ב-CYCLE_BOARDS, בדיוק כמו
     `handover` למעלה — אוצר המילים של הצוותים הוא ידע מוסדי
     שהמכינה כיוונה פעם אחת, ואינו מוחלף בהחלפת מחזור. */
  team: TEAM_BOARDS,
  lead: LEAD_BOARDS,
}));

/** לאן כל מרחב שמות כותב */
const TARGETS = {
  mechina: MECHINA_BOARDS,
  lessons: LESSON_BOARDS,
  placements: PLACEMENT_BOARDS,
  budget: BUDGET_BOARDS,
  faults: FAULTS,
  safety: SAFETY,
  duty: DUTY_BOARDS,
  team: TEAM_BOARDS,
  /* ⚠ שלושת לוחות הפרויקטים. בלי השורה הזו מחזור חדש היה
     נוצר בלעדיהם, ותקלה כזו מתגלה רק בעוד שנה (4ל). */
  projects: PROJECT_BOARDS,
  /* ⚠ הצ׳ק ליסט והביצוע בלבד. בנק הפעילויות נשאר מחוץ למחזור
     במכוון — ראו ההערה ב-shared/cycles.js. */
  lead: LEAD_BOARDS,
};

/**
 * "mechina.roster = 123" בשורות → { "mechina.roster": "123" }
 * ⚠ פורמט קריא לאדם, כי הלוח הוא מסד הנתונים ומישהו יסתכל בו.
 */
export function parseBoards(text) {
  const out = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(\d+)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export const formatBoards = (flat) =>
  Object.entries(flat).filter(([, v]) => v)
    .map(([k, v]) => `${k} = ${v}`).join("\n");

/* ---------- קריאת הלוח ---------- */
export async function loadCycles() {
  const d = await gql(`{ boards(ids:[${CYCLES_BOARD}]){ items_page(limit:50){ items{
    id name column_values(ids:["${C.status}","${C.from}","${C.to}","${C.boards}","${C.done}","${C.by}","${C.note}"]){ id text } } } } }`);
  return (d.boards[0]?.items_page?.items || []).map((i) => ({
    id: String(i.id),
    name: String(i.name || "").trim(),
    status: val(i, C.status) || CYCLE_STATUS.building,
    from: val(i, C.from) || null,
    to: val(i, C.to) || null,
    boards: parseBoards(val(i, C.boards)),
    done: val(i, C.done).split(",").map((x) => x.trim()).filter(Boolean),
    by: val(i, C.by) || null,
    note: val(i, C.note) || null,
  })).filter((x) => x.name);
}

/* ============================================================
   ההחלה
   ⚠ מיזוג לתוך האובייקטים הקיימים, לא החלפה. ראו ההערה למעלה.
   ============================================================ */
export function applyBoards(flat) {
  const nested = nestBoards(flat);
  for (const [ns, target] of Object.entries(TARGETS)) {
    const from = { ...(FALLBACK[ns] || {}), ...(nested[ns] || {}) };
    Object.assign(target, from);
  }
  /* ⚠ extras מקונן אחרת — {hosting:{board,cols}} — ולכן ידנית. */
  const ex = nested.extras || {};
  if (EXTRA.hosting) EXTRA.hosting.board = ex.hosting || FALLBACK.extras.hosting;
  if (EXTRA.loans) EXTRA.loans.board = ex.loans || FALLBACK.extras.loans;
}

let cache = { at: 0, name: null, id: null };
const TTL = 5 * 60_000;

/** מאפס את המטמון — נקרא אחרי החלפה או עריכה */
export function bumpCycle() { cache = { at: 0, name: null, id: null }; }

/**
 * ⚠ נקרא מ-withAuth בכל בקשה, ולכן חייב להיות זול.
 *   ברוב הקריאות הוא לא עושה דבר.
 *
 * ⚠ כישלון אינו מפיל את הבקשה. המערכת ממשיכה על המזהים
 *   שנטענו — עדיף לעבוד על המחזור הקודם מאשר ליפול.
 */
export async function ensureCycle() {
  if (Date.now() - cache.at < TTL) return cache;
  try {
    const list = await loadCycles();
    const active = list.find((c) => c.status === CYCLE_STATUS.active);
    if (active && Object.keys(active.boards).length) {
      const changed = cache.id !== active.id;
      applyBoards(active.boards);
      cache = { at: Date.now(), name: active.name, id: active.id };
      /* ⚠ מחזור שהתחלף מנקה את כל המטמונים. בלי זה המסכים
         היו מציגים את נתוני המחזור הקודם עד שיפוג. */
      if (changed) invalidate();
    } else {
      cache = { at: Date.now(), name: cache.name, id: cache.id };
    }
  } catch (e) {
    console.error("[cycle]", e && e.message);
    /* ⚠ מסומן כנבדק כדי לא לנסות שוב בכל בקשה כשהלוח נפל. */
    cache = { ...cache, at: Date.now() };
  }
  return cache;
}

/** שם המחזור הפעיל, לתצוגה */
export const activeName = () => cache.name;

/* ============================================================
   בדיקת שלמות
   ⚠ מחזור שחסר בו לוח חובה אינו ניתן להפעלה. עדיף להיתקע
     בהקמה מאשר להפעיל מחזור שחצי מהמסכים בו נופלים.
   ============================================================ */
export function checkCycle(cycle) {
  const done = new Set(cycle.done || []);
  const steps = CYCLE_STEPS.map((s) => ({ ...s, done: done.has(s.key) }));
  const missing = steps.filter((s) => s.need && !s.done);
  return {
    steps,
    ready: missing.length === 0,
    missing: missing.map((s) => s.title),
    boardCount: Object.keys(cycle.boards || {}).length,
  };
}
