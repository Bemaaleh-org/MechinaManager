/* ============================================================
   /api/container?action=buy   רשימת הקניות הכללית של המכינה

     GET                             הרשימה: פתוח + היסטוריה
     POST   { items:[{name,qty,detail}] }   הוספת שורות
     PUT    { id, status? , name?, qty?, detail? }
     DELETE { id }

   ------------------------------------------------------------
   מה שצריך לקנות ואינו מלאי מטבח ואינו ציוד מכולה: כיסאות,
   צבע, ציוד לטקס, מתנה לצוות. ראש המכינה מנהל.

   ⚠⚠ **כל הצוות מנהל — וזה עדכון מכוון של אותו יום.**
     הגרסה הראשונה נתנה את הניהול לראש המכינה בלבד, והסימון
     לכל הצוות. אחים ביקש (12.9.2026): *"הרשאות לכל מי שנחשב
     צוות — ראש המכינה, סגנית, מדריכים, אחים, בוגרים."*

     · **`isManager` ולא `!isStudent`.** כניסת התורנים המשותפת
       אינה חניך ואינה צוות, ו-`!isStudent` היה פותח לה רשימה
       שהיא לא אמורה לנהל.
     · **וצפייה בלבד רואה ואינו כותב** — `withAuth` חוסם כל
       כתיבה ממילא (4ע), ו-`canManage` אומר זאת מראש (4יד).

   ⚠ **לחניך אין כאן מסך** — גם לא לבעל תפקיד. אחראי המכולה
     ואב הבית רואים במסך הזה את חלק המכולה בלבד.

   ⚠ **שורה שנקנתה נשארת** ואינה נמחקת — אותו כלל של שתי
     הרשימות האחרות. "מה קנינו בחודש שעבר" היא שאלה שנשאלת.

   ⚠ **404 ולא 403** על שורה שאינה קיימת.
   ============================================================ */

import { BUY_CATEGORIES } from "../shared/buy-categories.js";
import { withAuth, actorName } from "./_session.js";
import { allItems, gql } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import {
  BUY_BOARDS as B, BUY_COLS as C, buyReady, BUY_STATUS, BUY_STATUSES,
} from "../shared/buy-ids.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const MAX = { name: 200, qty: 60, detail: 2000 };

/* ============================================================
   ⚠ **קטגוריה נבדקת מול הרשימה ואינה טקסט חופשי.**
     `create_labels_if_missing` הוא false בכל האפליקציה, ותווית
     שאינה קיימת גורמת ל-monday לדחות את **כל השורה** — בדיוק
     מה שקרה במגדר בייבוא המחזור (4לב). ריק מותר ומשמעותו
     "טרם סווג".
   ⚠ מוחזר "" לערך לא מוכר, והקורא מחליט — לא נכתב בשקט.
   ============================================================ */
const cat = (v) => {
  const t = String(v || "").trim();
  return BUY_CATEGORIES.includes(t) ? t : "";
};

/* ============================================================
   ⚠⚠ **שלושת בעלי התפקיד נכנסו לרשימה הכללית** (15.9.2026)

   הבקשה: *"רשימת קניות אחת פשוט עם הכול מאוחד — מכולה, אב
   בית, אחראי בטיחות, ציוד מטבח (לא אוכל או חד״פ) וכללי."*

   ⚠ **אין לוח רביעי.** אחראי המטבח שצריך מיקרוגל מוסיף שורה
     **לרשימה הכללית** עם קטגוריה "כלי מטבח" — הוא אינו צריך
     לוח משלו, ולוח כזה היה עוד מקור לתחזק ועוד רשימה
     שאפשר לפספס. לוח המטבח נשאר למה שהוא: אוכל וחד״פ, עם
     מפתח ומלאי מאחוריהם.

   ⚠ **והשאלה היא איחוד, ולכן היא בקוד ולא בדגל של `withAuth`**
     שדגליו AND — אותו דפוס של `mayArea` (4כב), `mayTeam` (4נ)
     ו-`mayChores` (5כז).

   ⚠ **`viewOnly` חוסם את שלושתם** כמו את הצוות: העמודה הזו
     אומרת "רואה ואינו משנה", והיא חלה על כל מסלול כתיבה (4ע).
   ============================================================ */
const roleHolder = (s) => Boolean(s && (s.isHouse || s.isSafety || s.isKitchen));

/** ⚠ מי מוסיף לרשימה — הצוות ושלושת בעלי התפקיד. */
export const mayManageBuy = (s) =>
  Boolean(s && (s.isManager || roleHolder(s)) && !s.viewOnly);
/** ⚠ מי מסמן "נקנה" — אותו קהל. מי שיוצא לקניות אינו בהכרח
    מי שכתב, ושרת שידרוש את הכותב דווקא בקופה יחזיר את
    הרשימה לוואטסאפ (5מ). */
export const mayMarkBuy = (s) =>
  Boolean(s && (s.isManager || roleHolder(s)) && !s.viewOnly);
/** ⚠ מי קורא את הרשימה. */
export const maySeeBuy = (s) => Boolean(s && (s.isManager || roleHolder(s)));

export async function loadBuy({ force = false } = {}) {
  if (!buyReady()) return [];
  return cached("buy", async () => {
    const items = await allItems(B.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        qty: val(i, C.qty),
        detail: val(i, C.detail),
        /* ⚠ ריק = "פתוח". שורה חדשה שנכתבה ביד בלוח אינה נושאת
           סטטוס, והיא בדיוק זו שצריך לקנות; ברירת מחדל אחרת
           הייתה מסתירה אותה (4ט, 5כו). */
        status: val(i, C.status) || BUY_STATUS.open,
        /* ⚠ **ריק אינו "אחר".** פריט שטרם סווג הוא מצב שלישי
           (`null`), והמסך מציג אותו כ"ללא קטגוריה" כדי שאפשר
           יהיה למצוא אותו ולסווג. ברירת מחדל שקטה ל"אחר"
           הייתה מסתירה בדיוק את זה (4ט). */
        category: (C.category ? val(i, C.category) : "") || null,
        by: val(i, C.by),
        date: val(i, C.date) || null,
      }))
      .filter((x) => x.name)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, { force });
}

export const invalidateBuy = () => invalidate("buy");

/* ============================================================
   ⚠ **רשימת הקטגוריות נקראת מהלוח ולא מהקוד** (עיקרון 1).
     `BUY_CATEGORIES` היא רשימת ההקמה; מרגע שהעמודה קיימת,
     מנהל המכינה מוסיף שם קטגוריה ב-monday והיא מופיעה בבורר
     בלי דיפלוי — אותו דפוס בדיוק של רשימת התפקידים
     (`availableRoles` ב-_student-role.js).

   ⚠ **תווית מושבתת יורדת מהבורר.** `update_status_column`
     דורס את כל הרשימה, ולכן הדרך היחידה להוריד תווית בלי
     לאבד את השורות שיושבות עליה היא להשבית — וקורא שמתעלם
     מ-`deactivated_labels` מציע בדיוק את מה שהורידו (5ז).
   ============================================================ */
export async function buyCategories({ force = false } = {}) {
  if (!buyReady() || !C.category) return BUY_CATEGORIES;
  return cached("buy-categories", async () => {
    const d = await gql(
      `{ boards(ids:[${B.board}]){ columns(ids:["${C.category}"]){ settings_str } } }`,
    );
    let st = {};
    try { st = JSON.parse(d.boards?.[0]?.columns?.[0]?.settings_str || "{}"); } catch { st = {}; }
    const off = new Set((st.deactivated_labels || []).map(String));
    const out = Object.entries(st.labels || {})
      .filter(([k, v]) => v && !off.has(String(k)))
      .map(([, v]) => String(v));
    /* ⚠ ריק נופל לרשימת ההקמה ולא מחזיר בורר ריק (עיקרון 6). */
    return out.length ? out : BUY_CATEGORIES;
  }, { force, ttl: 10 * 60_000 });
}

const setup = (res) => res.status(503).json({
  error: "לוח הקניות הכלליות טרם הוקם ב-monday. הריצו: npm run seed:buy",
  setupRequired: true,
});

async function handler(req, res, session) {
  if (!maySeeBuy(session)) {
    return res.status(403).json({ error: "רשימת הקניות הכללית פתוחה לצוות המכינה" });
  }

  try {
    if (req.method === "GET") {
      /* ⚠ **בלי הלוח: תשובה תקינה עם `ready:false` ולא 503.**
         המסך המאוחד קורא את שלוש הרשימות, וכשל של אחת מהן
         אינו אמור להפיל את שתי האחרות — זה עיקרון 6 בכיוון
         שקל לפספס (5כב). הכתיבה, לעומת זאת, נכשלת במפורש. */
      if (!buyReady()) {
        return res.status(200).json({
          ready: false, rows: [], canManage: false, canMark: false,
          setup: "npm run seed:buy",
        });
      }
      const rows = await loadBuy();
      return res.status(200).json({
        ready: true,
        rows,
        open: rows.filter((r) => r.status === BUY_STATUS.open).length,
        /* ⚠ מהשרת ולא נגזר במסך: כפתור שמופיע ומקבל 403 אחרי
           שהמשתמש הקליד הוא בדיוק מה ש-4יד אוסר. */
        canManage: mayManageBuy(session),
        canMark: mayMarkBuy(session),
      });
    }

    if (!buyReady()) return setup(res);
    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      if (!mayManageBuy(session)) {
        return res.status(403).json({ error: "הוספה לרשימה הכללית היא של צוות המכינה" });
      }
      const items = Array.isArray(body?.items) ? body.items : null;
      if (!items || !items.length) return res.status(400).json({ error: "לא נשלחו פריטים" });
      if (items.length > 60) return res.status(400).json({ error: "עד 60 פריטים בבת אחת" });

      const today = israelToday();
      const by = actorName(session).slice(0, 120);
      const created = [];
      for (const raw of items) {
        const name = clip(raw?.name, MAX.name);
        if (!name) continue;
        const id = await createItem(B.board, name, {
          [C.qty]: clip(raw?.qty, MAX.qty),
          [C.detail]: clip(raw?.detail, MAX.detail),
          [C.status]: { label: BUY_STATUS.open },
          /* ⚠ **`null` ולא `{label:""}`** לשורה בלי קטגוריה.
             מחרוזת ריקה בעמודת סטטוס כותבת `index 5` — כלומר
             **קובעת** את התווית שיושבת במשבצת הריקה במקום
             לנקות (5ז). */
          ...(C.category && cat(raw?.category) ? { [C.category]: { label: cat(raw.category) } } : {}),
          [C.by]: by,
          [C.date]: { date: today },
        });
        created.push(String(id));
      }
      if (!created.length) return res.status(400).json({ error: "לא נשלח שם פריט" });
      invalidateBuy();
      return res.status(200).json({ ok: true, created: created.length, ids: created });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });
      const row = (await loadBuy()).find((r) => r.id === id);
      if (!row) return res.status(404).json({ error: "השורה אינה נמצאת" });

      const patch = {};
      const changed = [];

      /* ---------- סימון "נקנה" — כל הצוות ---------- */
      if (body?.status !== undefined) {
        const status = String(body.status);
        if (!BUY_STATUSES.includes(status)) {
          return res.status(400).json({ error: "סטטוס לא מוכר" });
        }
        if (!mayMarkBuy(session)) {
          return res.status(403).json({ error: "סימון קנייה הוא של צוות המכינה" });
        }
        if (status !== row.status) { patch[C.status] = { label: status }; changed.push("סטטוס"); }
      }

      /* ---------- עריכת התוכן — ראש המכינה ----------
         ⚠ **403 מפורש ולא התעלמות שקטה.** שדה שנשלח ולא נכתב
           נראה בדיוק כאילו נשמר (5יט). */
      /* ---------- הקטגוריה ----------
         ⚠ **מי שמוסיף גם מסווג.** הסיווג אינו החלטה ניהולית —
           הוא מה שהופך את הרשימה לקריאה בקופה, ולכן הוא באותו
           קהל של ההוספה ולא מצומצם ממנו.
         ⚠ ומחרוזת ריקה **מנקה** — עם `null`, לא `{label:""}`
           שכותב index 5 (5ז). */
      if (body?.category !== undefined && C.category) {
        if (!mayManageBuy(session)) {
          return res.status(403).json({ error: "סיווג פריט הוא של צוות המכינה ובעלי התפקידים" });
        }
        const rawCat = String(body.category || "").trim();
        const c = cat(rawCat);
        if (rawCat && !c) {
          return res.status(400).json({ error: `קטגוריה לא מוכרת: ${rawCat}` });
        }
        if (c !== (row.category || "")) {
          patch[C.category] = c ? { label: c } : null;
          changed.push("קטגוריה");
        }
      }

      const wantsEdit = ["name", "qty", "detail"].some((k) => body?.[k] !== undefined);
      if (wantsEdit && !mayManageBuy(session)) {
        return res.status(403).json({ error: "עריכת הרשימה הכללית היא של צוות המכינה" });
      }
      if (body?.qty !== undefined) {
        const qty = clip(body.qty, MAX.qty);
        if (qty !== row.qty) { patch[C.qty] = qty; changed.push("כמה"); }
      }
      if (body?.detail !== undefined) {
        const detail = clip(body.detail, MAX.detail);
        if (detail !== row.detail) { patch[C.detail] = detail; changed.push("פירוט"); }
      }

      if (Object.keys(patch).length) await setColumns(B.board, id, patch);

      if (body?.name !== undefined) {
        const name = clip(body.name, MAX.name);
        if (!name) return res.status(400).json({ error: "שם הפריט אינו יכול להיות ריק" });
        /* ⚠ שלושה ארגומנטים — `renameItem(board, id, name)`. שניים
           השאירו `$n:String!` חסר וכל שינוי שם נפל ב-502 (4ס). */
        if (name !== row.name) { await renameItem(B.board, id, name); changed.push("שם"); }
      }

      invalidateBuy();
      /* ⚠ מה השתנה בפועל ולא "נשמר" (4ש). */
      return res.status(200).json({ ok: true, id, changed });
    }

    if (req.method === "DELETE") {
      if (!mayManageBuy(session)) {
        return res.status(403).json({ error: "מחיקה מהרשימה הכללית היא של צוות המכינה" });
      }
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });
      /* ⚠ המזהה מאומת מול **הלוח הזה** לפני deleteItem, שהיא
         שולחת delete_item בלי board_id (4ס). */
      const row = (await loadBuy()).find((r) => r.id === id);
      if (!row) return res.status(404).json({ error: "השורה אינה נמצאת" });
      await deleteItem(id);
      invalidateBuy();
      return res.status(200).json({ ok: true, id });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[buy]", e);
    res.status(502).json({ error: "פעולת רשימת הקניות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ============================================================
   ⚠⚠⚠ **`{ student: true }` הוא השער, וההכרעה ב-`maySeeBuy`.**

   עד כאן זה היה `withAuth(handler)` בלבד — שחוסם חניכים (4טו).
   ב-15.9 נוספו שלושת בעלי התפקיד ל-`mayManageBuy`,
   `mayMarkBuy` ו-`maySeeBuy` לבקשת אחים, **והשער לא נפתח**:
   אחראי המטבח, אב הבית ואחראי הבטיחות הם חניכים, וקיבלו 403
   על כל קריאה לנקודה הזו. הרשאה מלאה בקוד ואפס מסלול אליה —
   בדיוק התקלה של 5לא ו-5נ.

   הוכחה שזה לא היה מכוון: `api/_shop-all.js`, שקורא **את אותה
   רשימה**, כבר נושא `{ student: true }` ומסנן ב-`maySeeBuy`.
   שתי נקודות קצה לאותו לוח ענו תשובות סותרות.

   ⚠ **וההכרעה נשארת במודול ולא בדגל** — דגלי `withAuth` הם
     AND, והשאלה כאן איחוד (צוות **או** אחד משלושת בעלי
     התפקיד). אותו דפוס של `mayArea` (4כב), `mayTeam` (4נ)
     ו-`mayChores` (5כז). ⚠ ו-`viewOnly` חוסם ממילא כל כתיבה
     ב-`withAuth` (4ע).
   ============================================================ */
export default withAuth(handler, { student: true });
