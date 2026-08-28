/* ============================================================
   נתוני הצוותים — משימות ואוצר מילים. צד שרת בלבד.
   ------------------------------------------------------------
   ⚠ הפונקציות כאן **אינן** אוכפות הרשאה. `mayTeam` ב-shared
     היא האכיפה, והיא נקראת בכל נקודת קצה — כדי שהמסך יסתיר
     בדיוק את מה שהשרת חוסם (אותו דפוס כמו mayArea, 4כב).

   ⚠⚠ **זה אינו הלוח של api/_duty-tasks.js.** שם המשימות
     אישיות והצוות אינו רואה אותן (4מה); כאן הן משותפות ו"באחריות
     מי" נכתב בשם. שני הלוחות נראים דומים וההיפוך הוא הדבר
     השברירי כאן — ראו shared/team-ids.js ו-CLAUDE.md 4נ.
   ============================================================ */

import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { TEAM_BOARDS, TEAM_COLS } from "../shared/team-ids.js";
import { VOCAB_KIND, VOCAB_KINDS, isTeamCategory } from "../shared/team.js";
import { loadDefinitions, membersOf } from "./_placements.js";
import { activeStudents } from "./_student-rows.js";
import { israelToday } from "./_attendance-data.js";

export { setColumns, renameItem, createItem, deleteItem } from "./_items.js";

const T = TEAM_COLS.tasks;
const V = TEAM_COLS.vocab;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

export const teamsReady = () => Boolean(TEAM_BOARDS.tasks && TEAM_BOARDS.vocab);

export function invalidateTeams() {
  invalidate("team-tasks"); invalidate("team-vocab");
}

/* ============================================================
   אוצר המילים — סטטוסים ושלבים
   ------------------------------------------------------------
   ⚠ **`closes` הוא המקור היחיד ל"נחשב סגור".** אין רשימה
     בקוד, ולכן מנהל המכינה שיוסיף "ממתין לאישור" מחליט בעצמו
     אם הוא סוגר משימה — בלי דיפלוי (עיקרון 1).

   ⚠ **`archived` מסתיר מהבורר ואינו מוחק.** משימות ממשיכות
     לשאת סטטוס מארכב, והוא **עדיין נפתר לתצוגה**. מחיקה
     הייתה משאירה משימות עם מזהה שאינו אומר כלום.

   ⚠ **`kind` שאינו מוכר נספר ומדווח.** השמטה שקטה כאן היא
     בדיוק `CATEGORIES.includes` ב-_placements.js, ששם שורה
     עם קטגוריה לא-מוכרת אינה מופיעה בשום מסך ואינה יוצרת
     שום שגיאה (עיקרון 4ט).
   ============================================================ */
export async function loadVocab({ force = false } = {}) {
  if (!teamsReady()) return { statuses: [], stages: [], unknown: [] };
  return cached("team-vocab", async () => {
    const items = await allItems(TEAM_BOARDS.vocab);
    const rows = items.map((i) => ({
      id: String(i.id),
      name: String(i.name || "").trim(),
      kind: val(i, V.kind),
      order: Number(val(i, V.order) || 0),
      closes: val(i, V.closes) === "v",
      archived: val(i, V.archived) === "v",
    })).filter((r) => r.name);

    const bySort = (a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "he");
    return {
      statuses: rows.filter((r) => r.kind === VOCAB_KIND.status).sort(bySort),
      stages: rows.filter((r) => r.kind === VOCAB_KIND.stage).sort(bySort),
      /* מדווח, לא מושמט */
      unknown: rows.filter((r) => !VOCAB_KINDS.includes(r.kind))
        .map((r) => ({ id: r.id, name: r.name, kind: r.kind || "(ריק)" })),
    };
  }, { force });
}

/** מזהי הסטטוסים שנחשבים סגורים */
export const closingIds = (vocab) =>
  new Set(vocab.statuses.filter((s) => s.closes).map((s) => s.id));

/* ============================================================
   המשימות
   ------------------------------------------------------------
   ⚠ **הסינון הוא `title && team` בלבד, ולא `owner`.** משימה
     ללא אחראי היא מצב תקין ומכוון — יו״ר פותח רשימה ואז
     מחלק. סינון על owner היה מעלים בשקט בדיוק את המשימות
     שממתינות לשיבוץ, כלומר את מה שהמסך קיים בשבילו.

   ⚠ `done` ו-`late` **נגזרים בקריאה** ולא נשמרים. סטטוס
     שיסומן/יבוטל כסוגר בלוח משנה את כל המשימות מיד ולמפרע —
     אותו כלל כמו requestStage ו-`state` בהשאלות (4יז).
   ============================================================ */
export async function loadTeamTasks({ force = false } = {}) {
  if (!teamsReady()) return [];
  return cached("team-tasks", async () => {
    const items = await allItems(TEAM_BOARDS.tasks);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      team: val(i, T.team),
      teamName: val(i, T.teamName),
      owner: val(i, T.owner) || null,
      ownerName: val(i, T.ownerName) || null,
      status: val(i, T.status) || null,
      statusName: val(i, T.statusName) || null,
      stage: val(i, T.stage) || null,
      stageName: val(i, T.stageName) || null,
      due: val(i, T.due) || null,
      note: val(i, T.note) || null,
      link: val(i, T.link) || null,
      by: val(i, T.by) || null,
      byId: val(i, T.byId) || null,
      at: val(i, T.at) || null,
      upBy: val(i, T.upBy) || null,
      upAt: val(i, T.upAt) || null,
    })).filter((t) => t.title && t.team);
  }, { force });
}

/* ============================================================
   ההקשר של צוות אחד
   ------------------------------------------------------------
   ⚠ **המדריך המלווה יושב ב-`lead` והוא איש צוות**, לא חניך.
     `mayTeam` נותנת לו `manage` דרך `!isStudent` ולא דרך
     השם — התאמת שמות בין לוח ההרשאות ללוח ההגדרות הייתה
     נשברת ביום שמדריך משנה את שמו.
   ============================================================ */
export async function teamContext(placementId) {
  const defs = await loadDefinitions();
  const def = defs.find((d) => d.id === String(placementId));
  if (!def) return null;
  if (!isTeamCategory(def.category)) return { def, unsupported: true };

  const [members, active] = await Promise.all([
    membersOf(def.id), activeStudents(),
  ]);
  const live = new Map(active.map((s) => [s.id, s]));

  return {
    def,
    /* ⚠ **חניך שכובה נשאר ברשימה ומסומן**, ואינו נמחק ממנה.
       העלמה שקטה הייתה משאירה משימה משויכת לאדם שאינו מופיע
       בשום מקום — וזה נראה בדיוק כמו באג בתצוגה. */
    members: members.map((m) => ({
      id: m.id,
      name: (live.get(m.id) || {}).name || m.name,
      semesters: [...new Set(m.semesters)].filter(Boolean).sort(),
      active: live.has(m.id),
    })).sort((a, b) => a.name.localeCompare(b.name, "he")),
    memberIds: members.map((m) => m.id),
    chair: def.chair || null,
  };
}

/** הצוותים שחניך שייך אליהם — חבר או יו״ר. שער זול לפעמון. */
export async function teamsForStudent(studentId) {
  const id = String(studentId || "");
  if (!id) return [];
  const defs = await loadDefinitions();
  const teams = defs.filter((d) => isTeamCategory(d.category) && !d.archived);
  const out = [];
  for (const d of teams) {
    const ids = (await membersOf(d.id)).map((m) => m.id);
    if (d.chair === id || ids.includes(id)) {
      out.push({ id: d.id, name: d.name, category: d.category, isChair: d.chair === id });
    }
  }
  return out;
}

export { israelToday };
