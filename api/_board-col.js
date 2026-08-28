/* ============================================================
   עמודה שנמצאת לפי כותרת, ונוצרת אם חסרה
   ------------------------------------------------------------
   הדפוס הזה קיים כשהעמודה היא **מצב אישי של המשתמש על עצמו**
   ולא נתון של המכינה: "התראות נקראו", "חפיפות שנקראו". לעמודה
   כזו אין מקום בקובץ מזהים מחולל — היא נולדת בשימוש הראשון
   ואינה מצדיקה מחולל ודיפלוי.

   ⚠ **המטמון כאן אינו נוחות אלא תיקון.** `seenColumn`
     ב-api/_notify.js הריצה שאילתת `columns` ל-monday **בכל
     בקשת פעמון** — גם ב-GET וגם ב-POST, כל שלוש דקות לכל
     משתמש מחובר. עם 33 חניכים זו שאילתה מיותרת כל כמה שניות,
     ועמודה שנייה באותו דפוס הייתה מכפילה אותה.

   ⚠ **המטמון חי בזיכרון המופע.** Vercel מריצה כמה מופעים,
     ולכן זו הפחתה ולא ערובה — וזה בסדר: הפעולה אידמפוטנטית,
     ועמודה שכבר קיימת פשוט נמצאת.

   ⚠ **`create_column` אינו אטומי מול קריאה מקבילה.** שתי
     בקשות שלא מצאו את העמודה יכולות ליצור שתיים בשם זהה.
     בפועל זה נדיר (הקריאה הראשונה של המשתמש הראשון) והתיקון
     הוא מחיקה ידנית — אבל מי שיבנה על הדפוס הזה צריך לדעת.
   ============================================================ */

import { gql } from "./_monday.js";

/* לוח#כותרת → מזהה עמודה */
const found = new Map();

/**
 * מזהה העמודה בכותרת הזו. נוצרת אם אינה קיימת.
 * @returns {Promise<string|null>} null אם היצירה נכשלה
 */
export async function boardColumn(board, title, type = "text") {
  const key = `${board}#${title}`;
  if (found.has(key)) return found.get(key);

  try {
    const cols = (await gql(
      `query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`, { b: [board] }))
      .boards[0].columns;
    const hit = cols.find((c) => String(c.title).trim() === title);
    if (hit) { found.set(key, String(hit.id)); return String(hit.id); }

    const d = await gql(
      `mutation($b:ID!,$t:String!,$c:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
      { b: board, t: title, c: type });
    const id = String(d.create_column.id);
    found.set(key, id);
    return id;
  } catch (e) {
    /* ⚠ null ולא זריקה: עמודת מצב אישי שלא נוצרה אינה סיבה
       להפיל את המסך. הקורא מחליט מה לעשות בלעדיה. */
    console.error("[board-col]", title, e && e.message);
    return null;
  }
}

/** לבדיקות — מנקה את המטמון */
export const forgetColumns = () => found.clear();
