/* ============================================================
   קוד נעילת התפקידים הקבועים
   ------------------------------------------------------------
   הבקשה: *"תנעל אותם ויהיה אפשר לפתוח אותם רק עם קוד
   שמכניסים, 890890, בלי זה אי אפשר לשנות את מי שיש לו
   הרשאה בתפקיד."*

   ⚠⚠ **האכיפה כאן ולא במסך.** מסך שמסתיר כפתור הוא הצעה;
     שער בשרת הוא הבטחה. מי שקורא ל-`?action=role` ישירות
     עוקף כל בדיקה שנעשית בדפדפן (עיקרון 3).

   ⚠⚠ **והשער נכשל סגור.** עמודה שלא הוקמה, שורה שנמחקה או
     קוד ריק בלוח → **הפעולה נחסמת** ואומרת מה להריץ, ולא
     נפתחת בשקט. נעילה שנפתחת מעצמה כשמשהו חסר אינה נעילה,
     וזו בדיוק התקלה שאיש לא יבחין בה (עיקרון 6).

   ⚠ **הקוד עצמו לעולם אינו יוצא מהשרת** — גם לא למנהל. אותו
     רף של קוד הכניסה (עיקרון 4). מה שיוצא הוא תשובה
     בוליאנית בלבד.

   ⚠ **הקוד נקרא מהלוח בכל פעם** (מטמון קצר), ולא מקובע
     בקוד — ראש המכינה משנה אותו ב-monday בלי דיפלוי.
   ============================================================ */

import { gql } from "./_monday.js";
import { cached } from "./_cache.js";
import {
  AUTH_BOARD, SETTINGS_ROW, SETTING_COLS, rolesLockReady,
} from "../shared/auth-board.js";

/** ⚠ קצר בכוונה: קוד שהוחלף בלוח אמור לתפוס מהר. */
const TTL = 60_000;

/**
 * הקוד שבלוח, או "" אם אינו מוגדר.
 * ⚠ **לשימוש פנימי בלבד.** אין להחזיר את הערך הזה לקורא.
 */
async function lockCode({ force = false } = {}) {
  if (!rolesLockReady()) return "";
  return cached("roles-lock", async () => {
    /* ⚠ נקרא לפי **שם השורה** ולא לפי מזהה: שורה שנמחקה
       בטעות חוזרת לחיים ביצירה מחדש עם אותו שם, בלי לתקן
       קוד (הדפוס של לוח הטקסטים ב-4צ). */
    const d = await gql(
      `query($b:[ID!],$c:[String!]){ boards(ids:$b){ items_page(limit:500){ items{ name column_values(ids:$c){ text } } } } }`,
      { b: [AUTH_BOARD], c: [SETTING_COLS.lockCode] },
    );
    const rows = d.boards?.[0]?.items_page?.items || [];
    const row = rows.find((r) => String(r.name).trim() === SETTINGS_ROW);
    return String(row?.column_values?.[0]?.text || "").trim();
  }, { force, ttl: TTL });
}

/**
 * בודק את הקוד שנשלח מול הלוח.
 *
 * מחזיר `{ ok: true }`, או `{ ok: false, status, error }` מוכן
 * לשליחה. ⚠ הקורא אמור להחזיר את זה כמות שהוא ולא לנסח מחדש.
 */
export async function checkRolesLock(sent) {
  if (!rolesLockReady()) {
    return {
      ok: false, status: 503, setupRequired: true,
      error: "נעילת התפקידים טרם הוקמה. יש להריץ: npm run seed:roles-lock",
    };
  }

  const want = await lockCode();
  if (!want) {
    /* ⚠ הלוח מוקם אבל הקוד ריק — נחסם, ונאמר איפה למלא. */
    return {
      ok: false, status: 503, setupRequired: true,
      error: `קוד הנעילה ריק בלוח ההרשאות. יש למלא אותו בשורת "${SETTINGS_ROW}"`,
    };
  }

  const got = String(sent || "").trim();
  if (!got) return { ok: false, status: 403, needCode: true, error: "נדרש קוד לשינוי תפקידים" };
  if (got !== want) {
    return { ok: false, status: 403, needCode: true, error: "קוד שגוי" };
  }
  return { ok: true };
}

/** האם הנעילה בכלל פעילה — למסך, כדי שידע להציג את השדה. */
export const rolesLockActive = () => rolesLockReady();
