/* ============================================================
   מי המדריך של כל חניך
   ------------------------------------------------------------
   הקישור עובר דרך שלושה לוחות, וכולו נתון — אין שם מקובע בקוד:

     שיבוצים   החניך משובץ ל"קבוצת נעם"
     הגדרות    לקבוצה יש עמודת "מוביל" ובה "נעם"
     משתמשים   למשתמש "נעם — מדריך" יש תפקיד "מדריך"

   ⚠ ההתאמה בין השם שבעמודת המוביל לשם המשתמש היא לפי החלק
     שלפני המקף: "נעם — מדריך" הוא "נעם". השמות בלוח המשתמשים
     נושאים תיאור תפקיד ("שירה — מדריכה"), והמכינה כותבת בעמודת
     המוביל את השם בלבד. נורמליזציה משני הצדדים מונעת את הצורך
     לתחזק את אותו מחרוזת בשני מקומות בדיוק זהה.

   ⚠ חניך בלי שיבוץ לקבוצה מחזיר null — ולא שגיאה. הבקשה שלו
     תגיע ישר לראש המכינה במקום להיתקע.
   ============================================================ */

import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { authRows } from "./_session.js";
import { AUTH_COLS, STAFF_ROLE } from "../shared/auth-board.js";
import {
  PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORY, placementsReady,
} from "../shared/placements.js";

const D = PLACEMENT_COLS.definitions;
const A = PLACEMENT_COLS.assignments;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/** "נעם — מדריך" → "נעם" · "שירה - מדריכה" → "שירה" */
const norm = (s) => String(s || "").split(/[—–-]/)[0].replace(/\s+/g, " ").trim();

/**
 * מפה: מזהה חניך → { userId, name, group }.
 * ⚠ נשמרת במטמון קצר יחד עם השיבוצים; שינוי שיבוץ במסך מנקה אותו.
 */
export async function guideMap() {
  return cached("mechina-guides", async () => {
    if (!placementsReady()) return new Map();

    const [defs, asg, users] = await Promise.all([
      allItems(PLACEMENT_BOARDS.definitions),
      allItems(PLACEMENT_BOARDS.assignments),
      authRows(),
    ]);

    /* מדריכים לפי שם מנורמל */
    const byName = new Map();
    for (const u of users) {
      if (!u.active) continue;
      if (u.role !== STAFF_ROLE.guide) continue;
      /* ⚠ short הוא השם להצגה. "נעם — מדריך" הוא שם שורה בלוח
         ההרשאות, לא איך שקוראים לה במכינה, וכרטיס בקשה צר מדי
         בשביל התוספת. */
      byName.set(norm(u.name), { userId: u.id, name: u.name, short: norm(u.name) });
    }

    /* קבוצה → מדריך */
    const groupGuide = new Map();
    for (const d of defs) {
      if (val(d, D.category) !== CATEGORY.group) continue;
      const g = byName.get(norm(val(d, D.lead)));
      if (g) groupGuide.set(String(d.id), { ...g, group: d.name });
    }

    /* חניך → מדריך */
    const out = new Map();
    for (const a of asg) {
      const g = groupGuide.get(val(a, A.placement));
      if (g) out.set(val(a, A.student), g);
    }
    return out;
  });
}

export const invalidateGuides = () => invalidate("mechina-guides");

/**
 * המדריכים הפעילים, לבחירה במסכים.
 * ⚠ נקרא מלוח המשתמשים לפי התפקיד, ולא מרשימה בקוד: מדריך
 *   חדש שיסומן בלוח יופיע בבורר מעצמו, בלי דיפלוי.
 */
export async function guideList() {
  const users = await authRows();
  return users
    .filter((u) => u.active && u.role === STAFF_ROLE.guide)
    .map((u) => ({ id: u.id, name: norm(u.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

/** האם המשתמש המחובר הוא המדריך של החניך הזה */
export const isGuideOf = (session, guide) =>
  Boolean(guide && session?.itemId && String(guide.userId) === String(session.itemId));
