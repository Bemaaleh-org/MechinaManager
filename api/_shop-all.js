/* ============================================================
   /api/container?action=allshop   GET   כל הקניות במסך אחד

   הבקשה שהוליד את המסך: *"אני כן רוצה שהרשימה במכולה תתחבר
   לרשימה הזאת בדרך כזו או אחרת, שאם מבצעים קניות לא נפספס אף
   דבר שצריך לקנות."*

   ------------------------------------------------------------
   ⚠⚠⚠ **המסך קורא את שלוש הרשימות ואינו מעביר שורות ביניהן.**

     ההשלמה המתבקשת — להעתיק שורה מרשימת המכולה לרשימה הכללית
     — נדחתה: אותו פריט היה יושב בשני לוחות, ואז מי שסימן
     "נקנה" באחד מהם משאיר את השני פתוח. שני מקורות אמת
     לשאלה אחת הם בדיוק מה שכל הכללים על "דלת אחת" נועדו
     למנוע, והתוצאה הפוכה מהבקשה: **דווקא ככה מפספסים.**

     לכן: כל שורה נשארת בלוח שלה, נערכת בנקודת הקצה שלה,
     ונקראת כאן לצד האחרות.

   ⚠⚠⚠ **כל מקור אוכף את ההרשאה של עצמו, ואין סינון אחד
     בסוף.** זו אותה נקודה שברירה של החיפוש הרוחבי (5יג):
     מסך שנוגע בכל הנתונים בבת אחת נשבר ברגע שמקור אחד שוכח
     לשאול "למי זה". לכן `SOURCES` מחזיק לכל רשימה גם
     `mayRead` וגם `mayMark`, והרשימה נבנית מהם — ולא ממסנן
     שמישהו יוסיף לו מקור וישכח.

   ⚠ **התחום נלקח מהשורה ולא מהבקשה** (4כב): לציוד הניקיון
     אב הבית ולמכולה אחראי המכולה, והם שורות באותו לוח.

   ⚠ **פתוחות בלבד.** "מה קנינו" היא שאלה של הרשימה עצמה;
     כאן השאלה היא מה עוד צריך לקנות.

   ⚠ **ומקור שנפל אינו מפיל את המסך** — הוא מדווח ב-`failed`
     ומוצג. מי שיצא לקניות עם רשימה שחסר בה שליש בשקט הוא
     בדיוק מה שהמסך נועד למנוע (עיקרון 6, ואותו דפוס של
     הפעמון ב-4כו).
   ============================================================ */

import { withAuth } from "./_session.js";
import { SHOP_STATUS, AREA, mayArea } from "../shared/container-boards.js";
import { BUY_STATUS, buyReady } from "../shared/buy-ids.js";
import { loadShopping } from "./_container-data.js";
import { loadBuy, maySeeBuy, mayMarkBuy, buyCategories } from "./_buy.js";
import { BUY_CATEGORIES, NO_CATEGORY, categoryRank } from "../shared/buy-categories.js";

/* ============================================================
   שלוש הרשימות
   ------------------------------------------------------------
   ⚠ **`source` הוא החוזה, ולא כתובת.** השרת אינו מחזיר נתיב
     ל-endpoint — `src/api.js` הוא היחיד שמכיר כתובות, וזו
     הדלת היחידה (עיקרון 7). שורה נושאת את שם המקור שלה,
     ו-`api.markShopRow` יודעת לאן לפנות איתו.

   ⚠ `mayMark` נגזר **לכל שורה** ולא לרשימה, כי בציוד המכינה
     הוא תלוי בתחום של השורה.
   ============================================================ */
const SOURCES = [
  /* ⚠⚠ **המטבח יצא מהמסך (12.9.2026, בקשת אחים):** "אך ורק
     קניות מכולה וקניות כלליות שהצוות מוסיף". לקניות המטבח יש
     אחראי, מסך ותקציב משלהם, ושורות מזון בין כיסאות וצבע היו
     רעש במסך שנועד לנסיעה אחרת. מקור שיחזור — שורה כאן. */
  {
    key: "container",
    title: "ציוד המכינה",
    ready: () => true,
    setup: null,
    /* ⚠ מי שרשאי לקרוא **תחום אחד** רשאי לקרוא את הרשימה,
       והשורות מסוננות לפי התחום שלהן בהמשך. */
    /* ⚠ `isManager` ולא `!isStudent` — כניסת התורנים אינה צוות. */
    mayRead: (s) => Boolean(s.isManager || s.isContainer || s.isHouse),
    mayMark: (s, row) => mayArea(s, row.area),
    markHint: (row) => (row.area === AREA.cleaning ? "אב הבית" : "אחראי המכולה"),
    rowRead: (s, row) => mayArea(s, row.area),
    /* ⚠ התחום **הוא** הקטגוריה כאן, והוא כבר על השורה (4כב). */
    categoryOf: (row) => (row.area === AREA.cleaning ? "ניקיון" : "מכולה"),
    load: async () => (await loadShopping())
      .filter((r) => r.status === SHOP_STATUS.open),
  },
  {
    key: "buy",
    title: "רשימה כללית",
    ready: () => buyReady(),
    setup: "npm run seed:buy",
    mayRead: (s) => maySeeBuy(s),
    mayMark: (s) => mayMarkBuy(s),
    markHint: () => "צוות המכינה",
    load: async () => (await loadBuy())
      .filter((r) => r.status === BUY_STATUS.open),
  },
  /* ⚠⚠ **הוועדות יצאו מכאן (15.9.2026, בקשת אחים).**
     "רשימת קניות אחת עם הכול מאוחד — מכולה, אב בית, אחראי
     בטיחות, ציוד מטבח וכללי." הוועדות אינן ברשימה הזו: להן
     מנגנון הגשה משלהן ומועד משלהן, והן מקבלות מסך נפרד.
     ⚠ השורות עצמן לא נגעו — הן נשארות בלוח הוועדה, ומה
     שהשתנה הוא מי קורא אותן. */
];

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "מתודה לא נתמכת" });

  const all = [];
  const failed = [];
  const missing = [];

  for (const src of SOURCES) {
    if (!src.mayRead(session)) continue;
    if (!src.ready()) {
      /* ⚠ "טרם הוקם" נאמר ואינו נבלע: רשימה חסרה בלי מילה
         נראית בדיוק כמו רשימה ריקה (עיקרון 6). */
      missing.push({ key: src.key, title: src.title, setup: src.setup });
      continue;
    }
    try {
      const raw = await src.load();
      const rows = raw
        .filter((r) => (src.rowRead ? src.rowRead(session, r) : true))
        .map((r) => ({
          id: r.id,
          name: r.name,
          qty: r.qty || "",
          detail: r.detail || "",
          area: r.area || null,
          /* ⚠ **הקטגוריה היא מה שמקבץ עכשיו.** לרשימה הכללית
             היא עמודה בלוח; לציוד המכינה היא נגזרת מהתחום —
             שם "מכולה" ו"ניקיון" הם בדיוק מה שהפריט הוא,
             ואין טעם לבקש מאחראי המכולה לסווג פעמיים. */
          category: r.category || (src.categoryOf ? src.categoryOf(r) : null),
          by: r.by || "",
          date: r.date || null,
          group: r.group || null,
          source: src.key,
          sourceTitle: src.title,
          canMark: Boolean(src.mayMark(session, r)),
          /* ============================================================
             ⚠⚠ **עריכה ומחיקה נגזרות בשרת, כמו כל השאר.**

             ברירת המחדל היא `mayMark`: מי שרשאי לסמן
             שורה כ"נקנתה" רשאי גם לתקן בה הקלדה — זו
             אותה רשימה ואותו אחראי. בציוד המכינה זה
             לפי **התחום שעל השורה** ולא לפי דגל (4כב).

             ⚠ **ומקור שאינו ניתן לעריכה מצהיר זאת במפורש**
               (`mayEdit: () => false`). שורת קנייה של המטבח,
               למשל, נוצרת מהפריט עצמו והשם הוא מה
               שמתאים אותה למחיר (4לז) — שינוי שם שם
               היה מנתק את השורה מהפריט בשקט.
             ============================================================ */
          canEdit: Boolean(src.mayEdit
            ? src.mayEdit(session, r) : src.mayMark(session, r)),
          editHint: src.editHint ? src.editHint(r)
            : (src.markHint ? src.markHint(r) : ""),
          markHint: src.markHint ? src.markHint(r) : "",
        }));
      all.push(...rows);
    } catch (e) {
      console.error("[shop-all]", src.key, e);
      failed.push({ key: src.key, title: src.title });
    }
  }

  /* ============================================================
     ⚠⚠ **הקיבוץ הוא לפי קטגוריה של הפריט ולא לפי מקור.**

     זה השינוי שנתבקש: *"רשימת קניות אחת פשוט עם הכול מאוחד…
     שיהיה מקוטלג לפי קטגוריה של הדבר."* מי שיוצא לקניות קונה
     לפי חנות, לא לפי בעל תפקיד — כיסא שאב הבית ביקש וכיסא
     שראש המכינה ביקש נקנים באותה נסיעה ובאותו מקום, ורשימה
     שמפרידה ביניהם מייצרת שתי נסיעות.

     ⚠ **המקור נשאר על כל שורה** (`source`, `sourceTitle`) —
       הוא מה ש-`api.markShopRow` צריך כדי לדעת לאן לפנות
       (5מ), והוא גם התשובה ל"את מי לשאול על השורה הזו".

     ⚠ **"ללא קטגוריה" הוא קבוצה אמיתית ואחרונה**, ולא השמטה:
       פריט שטרם סווג חייב להיות נראה כדי שיסווגו אותו (4ט).

     ⚠ **וסדר לא-מוכר יורד לסוף** (`categoryRank`) — `indexOf`
       על מערך סגור מחזיר -1 לקטגוריה שנוספה בלוח, והיא הייתה
       קופצת לראש המיון בלי שום שגיאה (4ס).
     ============================================================ */
  const byCat = new Map();
  for (const r of all) {
    const key = r.category || NO_CATEGORY;
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key).push(r);
  }
  const groups = [...byCat]
    .map(([title, rows]) => ({ key: title, title, rows }))
    .sort((a, b) => {
      /* ⚠ "ללא קטגוריה" תמיד אחרון, גם מול ערך לא-מוכר. */
      const ra = a.title === NO_CATEGORY ? 1e6 : categoryRank(a.title);
      const rb = b.title === NO_CATEGORY ? 1e6 : categoryRank(b.title);
      return ra - rb || a.title.localeCompare(b.title, "he");
    });

  const open = groups.reduce((n, g) => n + g.rows.length, 0);
  res.status(200).json({
    groups,
    open,
    /* ⚠⚠ **האם בכלל להציג את לשונית "רשימה כללית" — מהשרת.**
       אחראי המטבח ואב הבית מגיעים למסך הזה (הם קוראים את
       הרשימות שלהם), והרשימה הכללית אינה שלהם. לשונית שתיפתח
       ל-403 היא בדיוק מה ש-4יד אוסר, ודגל שייגזר בדפדפן היה
       הגדרה שנייה של אותו כלל (4מד). */
    canGeneral: maySeeBuy(session),
    /* ⚠ **רשימת הקטגוריות מהלוח ולא מהקוד** — המכינה מוסיפה
       קטגוריה ב-monday בלי דיפלוי, והבורר במסך נבנה ממה
       שהוחזר כאן (עיקרון 1). ⚠ נפילה מחזירה את רשימת ההקמה
       ולא רשימה ריקה: בורר ריק נראה כמו מסך שבור. */
    categories: await buyCategories().catch(() => BUY_CATEGORIES),
    /* ⚠ כמה מהשורות אני בכלל יכול לסמן. מסך שמציג ארבעים
       שורות ואף כפתור אינו נראה כמו תקלה. */
    markable: groups.reduce((n, g) => n + g.rows.filter((r) => r.canMark).length, 0),
    failed,
    missing,
  });
}

export default withAuth(handler, { student: true });
