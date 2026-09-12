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
import { mayEdit } from "../shared/edit-rights.js";
import {
  KITCHEN_SHOP_STATUS, boardsReady as kitchenReady,
} from "../shared/kitchen-boards.js";
import { SHOP_STATUS, AREA, mayArea } from "../shared/container-boards.js";
import { BUY_STATUS, buyReady } from "../shared/buy-ids.js";
import { loadKitchenShopping } from "./_kitchen-data.js";
import { loadShopping } from "./_container-data.js";
import { loadBuy, maySeeBuy, mayMarkBuy } from "./_buy.js";

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
  {
    key: "kitchen",
    title: "מטבח",
    ready: () => kitchenReady(),
    setup: "node --env-file=.env tools/seed-kitchen.mjs",
    /* ⚠ אותו קהל של `{kitchen:true}` — צוות או אחראי המטבח. */
    mayRead: (s) => Boolean(!s.isStudent || s.isKitchen),
    /* ⚠ והכתיבה `mayEdit(…,"kitchen")` — ראש המכינה ואחראי
       המטבח, ולא כל כניסת צוות (5יז). */
    mayMark: (s) => mayEdit(s, "kitchen"),
    /* ⚠ **מי שאינו רשאי צריך לדעת למי לפנות** ולא "אין
       הרשאה" — אותו כלל של editHint ושל mayArea (4כב, 5יז). */
    markHint: () => "ראש המכינה או אחראי המטבח",
    load: async () => (await loadKitchenShopping())
      .filter((r) => r.status === KITCHEN_SHOP_STATUS.open),
  },
  {
    key: "container",
    title: "ציוד המכינה",
    ready: () => true,
    setup: null,
    /* ⚠ מי שרשאי לקרוא **תחום אחד** רשאי לקרוא את הרשימה,
       והשורות מסוננות לפי התחום שלהן בהמשך. */
    mayRead: (s) => Boolean(!s.isStudent || s.isContainer || s.isHouse),
    mayMark: (s, row) => mayArea(s, row.area),
    markHint: (row) => (row.area === AREA.cleaning ? "אב הבית" : "אחראי המכולה"),
    rowRead: (s, row) => mayArea(s, row.area),
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
];

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "מתודה לא נתמכת" });

  const groups = [];
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
          by: r.by || "",
          date: r.date || null,
          source: src.key,
          sourceTitle: src.title,
          canMark: Boolean(src.mayMark(session, r)),
          markHint: src.markHint ? src.markHint(r) : "",
        }));
      groups.push({ key: src.key, title: src.title, rows });
    } catch (e) {
      console.error("[shop-all]", src.key, e);
      failed.push({ key: src.key, title: src.title });
    }
  }

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
    /* ⚠ כמה מהשורות אני בכלל יכול לסמן. מסך שמציג ארבעים
       שורות ואף כפתור אינו נראה כמו תקלה. */
    markable: groups.reduce((n, g) => n + g.rows.filter((r) => r.canMark).length, 0),
    failed,
    missing,
  });
}

export default withAuth(handler, { student: true });
