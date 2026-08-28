/* ============================================================
   שורות החניכים — צד שרת בלבד
   ------------------------------------------------------------
   נפרד מ-authRows שב-_session.js במכוון: זה לוח אחר, מטמון אחר,
   ותחום אחר. שכבת הקודים של המטבח לא מושפעת ממה שקורה כאן.

   ⚠ הלוח הזה אינו לוח של האפליקציה. הוא לוח קיים של המכינה ובו
     הרבה מעבר למה שצריך: בעיות רפואיות, אלרגיות, הגדרה דתית,
     פרטי הורים וצילומי תעודת זהות.

     לכן השליפה מבקשת ids מפורשים ולא column_values ריק. עמודה
     חדשה שתתווסף ללוח לא תיכנס לזיכרון של השרת מלכתחילה, ולא
     תוכל לדלוף גם אם מישהו ישכח לסנן בהמשך.

   ⚠ תעודת הזהות היא סוד הכניסה. היא לא יוצאת מהמודול הזה —
     toPublic מסירה אותה, וכל נקודת קצה מחזירה דרכה בלבד.
   ============================================================ */

import { gql } from "./_monday.js";
import { cached } from "./_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { ROLES_COL, ROLE_SCHEDULE } from "../shared/lessons-boards.js";

const C = MECHINA_COLS.roster;

/** מנקה ת"ז לספרות בלבד, ומשלים ל-9 — כך "0123..." ו-123... זהים */
export const normalizeTz = (v) =>
  String(v ?? "").replace(/\D/g, "").padStart(9, "0");

/**
 * כל שורות החניכים, עם השדות המותרים בלבד.
 * ⚠ tz נשאר כאן לצורך אימות כניסה ואינו יוצא ללקוח.
 */
export async function studentRows({ force = false } = {}) {
  return cached("student-rows", async () => {
    const ids = JSON.stringify([
      C.tz, C.active, C.demo, C.leader, C.gender, C.dob, ROLES_COL,
      C.army, C.tryouts, C.talk1, C.talk2, C.talk3,
    ]);
    const d = await gql(
      `{ boards(ids:[${MECHINA_BOARDS.roster}]){ items_page(limit:500){ items {
           id name column_values(ids:${ids}){ id text } } } } }`
    );
    const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
    return d.boards[0].items_page.items.map((i) => {
      /* עמודת dropdown מחזירה תוויות מופרדות בפסיק. הרשימה אינה
         סגורה — תפקיד שיתווסף בלוח יגיע לכאן בלי שינוי בקוד. */
      const roles = val(i, ROLES_COL)
        .split(",").map((s) => s.trim()).filter(Boolean);
      return {
        id: String(i.id),
        name: String(i.name || "").trim(),
        tz: normalizeTz(val(i, C.tz)),
        gender: val(i, C.gender) || null,
        /* ⚠ אינו ב-toPublic. יוצא רק דרך נקודת הקצה של הפרופיל,
           ורק לצוות — כמו תעודת הזהות. */
        dob: val(i, C.dob) || null,
        active: val(i, C.active) === "v",
        /* ⚠ חשבון בדיקה. נכנס למערכת ככל חניך ואינו נספר בשום
           מקום — הסינון ב-activeStudents למטה. */
        demo: val(i, C.demo) === "v",
        leader: val(i, C.leader) === "v",
        roles,
        /* ⚠ התפקיד היחיד שקשורה אליו הרשאה. ראו shared/lessons-boards.js */
        isScheduler: roles.includes(ROLE_SCHEDULE),
        /* ---- פרופיל ----
           ⚠ לא נכנס ל-toPublic. יוצא רק דרך נקודת הקצה של
           הפרופיל, שאוכפת מי רואה מה. */
        profile: {
          army: val(i, C.army) || "",
          tryouts: val(i, C.tryouts) || "",
          talks: [val(i, C.talk1) || null, val(i, C.talk2) || null, val(i, C.talk3) || null],
        },
      };
    });
  }, { force });
}

/**
 * הצורה היחידה שבה חניך יוצא מהשרת.
 * ⚠ מיפוי מפורש ולא השמטה — ראו shared/mechina-boards.js.
 */
export const toPublic = (r) => ({
  id: r.id,
  name: r.name,
  gender: r.gender,
  active: r.active,
  leader: r.leader,
  roles: r.roles || [],
  isScheduler: Boolean(r.isScheduler),
});

/* ============================================================
   החניכים הפעילים, ממוינים לפי א״ב
   ------------------------------------------------------------
   ⚠ **חשבון בדיקה יוצא כאן, פעם אחת.** כל מסך שמונה חניכים —
     נוכחות, שיבוצים, מובילי שבוע, רשימת החניכים, אימונים —
     עובר דרך הפונקציה הזו, ולכן די בשורה אחת כדי שהוא לא
     ייספר בשום מקום.

     כיוון הכשל הנכון: מסך חדש שייכתב ויקרא activeStudents
     יסנן אותו מעצמו. מי שירצה דווקא לכלול אותו יצטרך לקרוא
     ל-studentRows במפורש, ולכתוב למה.

   ⚠ הכניסה עצמה עוברת ב-studentRows ולא כאן — ולכן הוא כן
     יכול להיכנס. זו כל התכלית שלו.
   ============================================================ */
export async function activeStudents() {
  const rows = await studentRows();
  return rows
    .filter((r) => r.active && !r.demo)
    .sort((a, b) => a.name.localeCompare(b.name, "he", { numeric: true }));
}
