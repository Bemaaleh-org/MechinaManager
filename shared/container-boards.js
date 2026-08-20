/* ============================================================
   ציוד המכינה — מזהי לוחות ותוויות.
   ------------------------------------------------------------
   תחום נפרד: לא מטבח, לא נוכחות ולא שיעורים. הדף פתוח למנהל
   ולאחראי המכולה בלבד.

   ⚠ שני התחומים — מכולה וניקיון — חולקים לוח אחד ונבדלים
     בעמודת "תחום". הם זהים במבנה (פריט, כמות, סוג, מפתח)
     ונבדלים רק במי מטפל בהם, ולכן לוח שני היה מכפיל את כל
     הקוד בשביל אותה טבלה בדיוק. סינון לפי תחום נעשה בשרת.

   ⚠ הכמות היא עמודת טקסט ולא מספר, בכוונה: ברשימת המקור יש
     כמויות כמו "16 ליטר" ו-"12 חבילות של 3". עמודת מספר הייתה
     מוחקת את היחידות או נכשלת עליהן. חישוב החוסרים קורא את
     המספר שבתחילת הטקסט — ראו missingFor למטה.
   ============================================================ */

export const CONTAINER_BOARDS = {
  equipment: "5102549640", // מכינה ב׳ – ציוד מכולה
  shopping: "5102549642", // מכינה ב׳ – קניות מכולה
};

export const CONTAINER_COLS = {
  /* שם הפריט הוא שם הציוד */
  equipment: {
    qty: "text_mm6c87je",
    kind: "color_mm6c1s0q", // מתכלה · תמידי
    area: "color_mm6dfsnj", // מכולה · ניקיון
    /* המפתח: כמה צריך להיות במלאי. ריק = אין מפתח לפריט. */
    par: "numeric_mm6d8zgy",
  },
  /* שם הפריט הוא שם המוצר לקנייה */
  shopping: {
    qty: "text_mm6cbdww",
    date: "date_mm6c60xs",
    status: "color_mm6cf0qs", // פתוח · נקנה
    by: "text_mm6cdymy",
    area: "color_mm6dgxs9", // מכולה · ניקיון
  },
};

export const EQUIP_KIND = { consumable: "מתכלה", permanent: "תמידי" };
export const SHOP_STATUS = { open: "פתוח", bought: "נקנה" };

/** התחומים. מכולה היא ברירת המחדל — היא הייתה כאן ראשונה. */
export const AREA = { container: "מכולה", cleaning: "ניקיון" };
export const AREAS = [AREA.container, AREA.cleaning];

/**
 * הכמות כמספר, מתוך טקסט חופשי: "12 חבילות של 3" → 12,
 * "16 ליטר" → 16, "" → null. ⚠ המספר הראשון בלבד, כי הוא
 * הכמות; מה שאחריו הוא תיאור האריזה.
 */
export function qtyNumber(text) {
  const m = String(text ?? "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/**
 * כמה חסר לפריט ביחס למפתח שלו.
 * null = אין מה לחשב (אין מפתח, או שהכמות אינה מספר).
 * 0 = יש מספיק.
 */
export function missingFor(item) {
  if (item?.par == null) return null;
  const have = qtyNumber(item.qty);
  if (have == null) return null;
  return Math.max(0, item.par - have);
}
