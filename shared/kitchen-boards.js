/* ============================================================
   ציוד המטבח — תחומים, תוויות וחישובים
   ------------------------------------------------------------
   תחום נפרד: לא ציוד מכינה, לא נוכחות ולא שיעורים. שני
   תחומים — ציוד אוכל וציוד חד״פ — חולקים לוח אחד ונבדלים
   בעמודת "תחום", בדיוק כמו מכולה וניקיון. הם זהים במבנה
   ונבדלים רק בתוכן, ולכן לוח שני היה מכפיל את כל הקוד בשביל
   אותה טבלה. הסינון לפי תחום נעשה בשרת.

   ⚠ הכמות היא עמודת טקסט ולא מספר, בכוונה. ברשימת המקור של
     המטבח יש כמויות כמו "2 חבילות קילו כמעט מלאות" ו-"40
     חבילות של 10". עמודת מספר הייתה מוחקת את התיאור או נכשלת
     עליו. חישוב החוסרים קורא את המספר שבתחילת הטקסט — ראו
     qtyNumber למטה.

   ⚠ המזהים עצמם יושבים ב-shared/kitchen-ids.js, שנוצר על ידי
     סקריפט ההקמה. ההפרדה מאפשרת לסקריפט לכתוב את הקובץ הזה
     מחדש בלי לגעת בלוגיקה שכאן.
   ============================================================ */

import { KITCHEN_BOARDS, KITCHEN_COLS } from "./kitchen-ids.js";

export { KITCHEN_BOARDS, KITCHEN_COLS };

/** האם הלוחות כבר הוקמו. בלי זה אין טעם לפנות ל-monday. */
export const boardsReady = () =>
  Boolean(KITCHEN_BOARDS.equipment && KITCHEN_BOARDS.shopping);

export const KITCHEN_KIND = { consumable: "מתכלה", permanent: "תמידי" };
export const KITCHEN_SHOP_STATUS = { open: "פתוח", bought: "נקנה" };

/** התחומים. אוכל הוא ברירת המחדל — הוא הגדול מבין השניים. */
export const KITCHEN_AREA = { food: "אוכל", disposable: "חד״פ" };
export const KITCHEN_AREAS = [KITCHEN_AREA.food, KITCHEN_AREA.disposable];

/**
 * הכמות כמספר, מתוך טקסט חופשי:
 *   "40 חבילות של 10"  → 40
 *   "2 קופסאות קילו"   → 2
 *   "שק 1"             → 1
 *   ""                 → null
 * ⚠ המספר הראשון בלבד — הוא הכמות, ומה שאחריו הוא תיאור
 *   האריזה. "40 חבילות של 10" הן ארבעים חבילות, לא עשר.
 */
export function qtyNumber(text) {
  const m = String(text ?? "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/**
 * כמה חסר לפריט ביחס למפתח שלו.
 * null = אין מה לחשב (אין מפתח, או שהכמות אינה מספר).
 * 0    = יש מספיק.
 */
export function missingFor(item) {
  if (item?.par == null) return null;
  const have = qtyNumber(item.qty);
  if (have == null) return null;
  return Math.max(0, item.par - have);
}
