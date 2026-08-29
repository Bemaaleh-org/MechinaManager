/* ============================================================
   נתוני התורניות. צד שרת בלבד.
   ------------------------------------------------------------
   ⚠ הפונקציות כאן **אינן** אוכפות הרשאה. `mayChores` ב-shared
     היא האכיפה, והיא נקראת בכל נקודת קצה.

   ⚠ **המונים נגזרים בכל קריאה ואינם נשמרים.** מספר שמור היה
     מתיישן ברגע שמישהו מוחק שורת שיבוץ ב-monday, ואז המסך
     היה מציג טענה על העבר שאין לה כיסוי. אותו כלל כמו
     `requestStage`, כמו מצב ההשאלה (4יז) וכמו `done` במשימות.
   ============================================================ */

import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { CHORE_BOARDS, CHORE_COLS } from "../shared/chores-ids.js";
import { KIND, KINDS } from "../shared/chores.js";
import { activeStudents } from "./_student-rows.js";
import { loadLeaderWeeks } from "./_leader-weeks.js";

export { setColumns, renameItem, createItem, deleteItem } from "./_items.js";

const S = CHORE_COLS.sectors;
const R = CHORE_COLS.roster;
const A = CHORE_COLS.adjust;
const C = CHORE_COLS.checklist;
const D = CHORE_COLS.done;
const T = CHORE_COLS.texts;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

export const choresReady = () =>
  Boolean(CHORE_BOARDS.sectors && CHORE_BOARDS.roster);

export function invalidateChores() {
  for (const k of ["chore-sectors", "chore-roster", "chore-adjust",
    "chore-checklist", "chore-done", "chore-texts"]) invalidate(k);
}

/* ============================================================
   הגזרות
   ------------------------------------------------------------
   ⚠ **סוג לא-מוכר נספר ומדווח ולא מושמט.** גזרה עם סוג ריק או
     שגוי לא תופיע בשום מסך ולא תיצור שום שגיאה — בדיוק המלכודת
     של `CATEGORIES.includes` (4ט). כאן היא חוזרת ב-`unknown`.
   ============================================================ */
export async function loadSectors({ force = false } = {}) {
  if (!choresReady()) return { list: [], unknown: [] };
  return cached("chore-sectors", async () => {
    const items = await allItems(CHORE_BOARDS.sectors);
    const rows = items.map((i) => {
      const cap = val(i, S.cap);
      return {
        id: String(i.id),
        name: String(i.name || "").trim(),
        kind: val(i, S.kind),
        /* ⚠ ריק = בלי הגבלה, ולא אפס. Number.isFinite ולא != null:
           תוכן לא-מספרי נותן NaN, וכל השוואה מולו false — כלומר
           האכיפה מתבטלת בשקט (אותו באג כמו במכסת השיבוצים). */
        cap: cap === "" || !Number.isFinite(Number(cap)) ? null : Number(cap),
        detail: val(i, S.detail) || null,
        order: Number(val(i, S.order) || 0),
        archived: val(i, S.archived) === "v",
      };
    }).filter((r) => r.name);

    const bySort = (a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "he");
    return {
      list: rows.filter((r) => KINDS.includes(r.kind)).sort(bySort),
      unknown: rows.filter((r) => !KINDS.includes(r.kind))
        .map((r) => ({ id: r.id, name: r.name, kind: r.kind || "(ריק)" })),
    };
  }, { force });
}

export const eveningSectors = (s) => s.list.filter((x) => x.kind === KIND.evening);
export const dailySector = (s) => s.list.find((x) => x.kind === KIND.daily) || null;

/* ============================================================
   השיבוצים
   ------------------------------------------------------------
   ⚠ **שורה חייבת שבוע או תאריך, ולא את שניהם.** גזרת סוף-יום
     שבועית וגזרה יומית יומית; שורה שנושאת את שניהם או אף אחד
     היא שורה שאף מסך לא יציג. היא **מדווחת ואינה מושמטת**.
   ============================================================ */
export async function loadRoster({ force = false } = {}) {
  if (!choresReady()) return { list: [], broken: [] };
  return cached("chore-roster", async () => {
    const items = await allItems(CHORE_BOARDS.roster);
    const rows = items.map((i) => ({
      id: String(i.id),
      student: val(i, R.student),
      studentName: val(i, R.studentName),
      sector: val(i, R.sector),
      sectorName: val(i, R.sectorName),
      week: val(i, R.week) || null,
      weekName: val(i, R.weekName) || null,
      date: val(i, R.date) || null,
      by: val(i, R.by) || null,
      at: val(i, R.at) || null,
    })).filter((r) => r.student && r.sector);

    const ok = (r) => Boolean(r.week) !== Boolean(r.date);
    return { list: rows.filter(ok), broken: rows.filter((r) => !ok(r)) };
  }, { force });
}

/** ההתאמות הידניות */
export async function loadAdjusts({ force = false } = {}) {
  if (!CHORE_BOARDS.adjust) return [];
  return cached("chore-adjust", async () => {
    const items = await allItems(CHORE_BOARDS.adjust);
    return items.map((i) => ({
      id: String(i.id),
      student: val(i, A.student),
      studentName: val(i, A.studentName),
      sector: val(i, A.sector),
      sectorName: val(i, A.sectorName),
      /* ⚠ 0 הוא ערך חוקי אך חסר משמעות — הוא מסונן, אחרת שורה
         ריקה בלוח נראית כמו התאמה שנעשתה. */
      delta: Number(val(i, A.delta) || 0),
      reason: val(i, A.reason) || null,
      by: val(i, A.by) || null,
      at: val(i, A.at) || null,
    })).filter((r) => r.student && r.sector && r.delta);
  }, { force });
}

/* ============================================================
   הצ׳ק ליסט
   ============================================================ */
export async function loadChecklist({ force = false } = {}) {
  if (!CHORE_BOARDS.checklist) return [];
  return cached("chore-checklist", async () => {
    const items = await allItems(CHORE_BOARDS.checklist);
    return items.map((i) => ({
      id: String(i.id),
      task: String(i.name || "").trim(),
      day: val(i, C.day),
      area: val(i, C.area) || null,
      order: Number(val(i, C.order) || 0),
      archived: val(i, C.archived) === "v",
    })).filter((r) => r.task && r.day)
      .sort((a, b) => (a.order - b.order) || a.task.localeCompare(b.task, "he"));
  }, { force });
}

/** מה בוצע. ⚠ קיום שורה = בוצע; אין עמודת "בוצע". */
export async function loadDone({ force = false } = {}) {
  if (!CHORE_BOARDS.done) return [];
  return cached("chore-done", async () => {
    const items = await allItems(CHORE_BOARDS.done);
    return items.map((i) => ({
      id: String(i.id),
      date: val(i, D.date),
      item: val(i, D.item),
      by: val(i, D.by) || null,
      byId: val(i, D.byId) || null,
      at: val(i, D.at) || null,
    })).filter((r) => r.date && r.item);
  }, { force });
}

/* ============================================================
   הטקסטים הנערכים
   ------------------------------------------------------------
   ⚠ **המפתח הוא שם הפריט.** שורה שנמחקה בטעות משוחזרת ביצירה
     מחדש עם אותו שם, ולא דורשת לתקן מזהה בקוד.

   ⚠ **בלוק שאינו קיים אינו שגיאה** — המסך פשוט לא מציג אותו.
     טקסט הסבר שנעלם אינו סיבה להפיל מסך.
   ============================================================ */
export async function loadTexts({ force = false } = {}) {
  if (!CHORE_BOARDS.texts) return new Map();
  return cached("chore-texts", async () => {
    const items = await allItems(CHORE_BOARDS.texts);
    const out = new Map();
    for (const i of items) {
      const key = String(i.name || "").trim();
      if (!key) continue;
      out.set(key, {
        id: String(i.id),
        key,
        title: val(i, T.title) || key,
        body: val(i, T.body) || "",
        by: val(i, T.by) || null,
        at: val(i, T.at) || null,
      });
    }
    return out;
  }, { force });
}

/* ============================================================
   מי נספר, ומי מוביל
   ------------------------------------------------------------
   ⚠ **`activeStudents` ולא `assignableStudents`.** חשבון הבדיקה
     אינו נספר בממוצע ואינו מקבל תורנות — הוא היה מוריד את
     הממוצע של כולם ומעוות את הצבעים.
   ============================================================ */
export async function choreStudents() {
  return (await activeStudents()).map((s) => ({ id: s.id, name: s.name }));
}

/**
 * מי מוביל בשבוע נתון — הם פטורים מתורנות באותו שבוע.
 * ⚠ מוחזר כ-Set של מזהים, כי השאלה נשאלת פעם לכל חניך במסך.
 */
export async function leadersOfWeek(weekId) {
  const weeks = await loadLeaderWeeks();
  const w = weeks.find((x) => x.id === String(weekId));
  return new Set(w ? w.leaderIds.map(String) : []);
}

/** השבוע שתאריך נופל בו */
export async function weekOfDate(iso) {
  const weeks = await loadLeaderWeeks();
  return weeks.find((w) => w.start <= iso && iso <= w.end) || null;
}

export { loadLeaderWeeks };
