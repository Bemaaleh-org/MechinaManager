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
    const ids = JSON.stringify([C.tz, C.active, C.leader, C.gender]);
    const d = await gql(
      `{ boards(ids:[${MECHINA_BOARDS.roster}]){ items_page(limit:500){ items {
           id name column_values(ids:${ids}){ id text } } } } }`
    );
    const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
    return d.boards[0].items_page.items.map((i) => ({
      id: String(i.id),
      name: String(i.name || "").trim(),
      tz: normalizeTz(val(i, C.tz)),
      gender: val(i, C.gender) || null,
      active: val(i, C.active) === "v",
      leader: val(i, C.leader) === "v",
    }));
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
});

/** החניכים הפעילים בלבד, ממוינים לפי א״ב */
export async function activeStudents() {
  const rows = await studentRows();
  return rows
    .filter((r) => r.active)
    .sort((a, b) => a.name.localeCompare(b.name, "he", { numeric: true }));
}
