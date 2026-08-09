/* ============================================================
   שכבת האחסון
   ------------------------------------------------------------
   קריאה:  המוצרים, התנועות והרשימות מגיעים מ-monday.
   כתיבה:  טיוטת הספירה בלבד נשמרת מקומית.

   App.jsx לא יודע דבר מכל זה — החוזה נשאר get/set.

   ⚠ כל הקריאות עוברות דרך src/api.js ולא דרך fetch ישיר.
     בעבר ישבו כאן ארבע כתובות מקובעות, והן לא עודכנו כשנקודות
     הקצה אוחדו — הקטלוג חזר ריק בייצור וזה נראה כמו "אין מלאי".
     מקום אחד שמכיר כתובות הוא מה שמונע חזרה של זה.
   ============================================================ */

import { api } from "./api.js";

/** מצב ריק שלם, למקרה שאין עדיין שום דבר שמור מקומית */
const emptyShell = () => ({
  v: 1,
  products: [],
  moves: [],
  lists: [],
  countDraft: null,
  lastCountAt: null,
});

const readLocal = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storage = {
  async get(key) {
    const local = readLocal(key);

    let products, moves, lists;
    try {
      // קודם מוודאים שהרשימות החיות מעודכנות לפי החוסרים הנוכחיים.
      // אידמפוטנטי, ולכן בטוח להריץ בכל טעינה. אם הוא נכשל — ממשיכים
      // לטעון בכל זאת, ומציגים את הרשימות כפי שהן.
      try {
        await api.syncLists();
      } catch (e) {
        console.error("[storage] סנכרון הרשימות נכשל:", e.message);
      }

      // שאר השליפות במקביל — הטלפון לא מחכה לאחת ואז לשנייה
      const [cat, mov, lst] = await Promise.all([
        api.getCatalog(),
        api.getMoves(),
        api.getLists(),
      ]);
      products = cat.products;
      moves = mov.moves;
      lists = lst.lists;

      if (![products, moves, lists].every(Array.isArray)) {
        throw new Error("תשובה לא צפויה מהשרת");
      }
    } catch (e) {
      console.error("[storage] שליפת הנתונים נכשלה:", e.message);

      /* ⚠ כשל טעינה חייב להיראות אחרת מ"אין נתונים".
         בלי הדגל הזה מסך ריק נראה בדיוק כמו מטבח ריק — וזה מה
         שהסתיר את הבאג שבו הקטלוג חזר ריק בייצור. */
      const base = local || emptyShell();
      return { value: JSON.stringify({ ...base, loadFailed: e.message || true }) };
    }

    // "נספר השבוע" נגזר מהתנועות עצמן ולא נשמר בנפרד — כך גם הוא
    // רב-משתמשי: תורן שסופר בטלפון שלו, החבר רואה שזה בוצע.
    const lastCountAt = moves
      .filter((m) => m.type === "count" && !m.cancelled && m.ts)
      .reduce((max, m) => (m.ts > max ? m.ts : max), 0) || null;

    // monday היא מקור האמת. נשארת מקומית רק טיוטת הספירה.
    const merged = {
      ...(local || emptyShell()),
      products, moves, lists, lastCountAt,
      loadFailed: false,
    };
    return { value: JSON.stringify(merged) };
  },

  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // כשל שמירה לא אמור להפיל את המסך שהתורן עובד מולו
    }
  },
};
