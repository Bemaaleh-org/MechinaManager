/* ============================================================
   /api/container?action=buy   רשימת הקניות הכללית של המכינה

     GET                             הרשימה: פתוח + היסטוריה
     POST   { items:[{name,qty,detail}] }   הוספת שורות
     PUT    { id, status? , name?, qty?, detail? }
     DELETE { id }

   ------------------------------------------------------------
   מה שצריך לקנות ואינו מלאי מטבח ואינו ציוד מכולה: כיסאות,
   צבע, ציוד לטקס, מתנה לצוות. ראש המכינה מנהל.

   ⚠⚠ **שתי הרשאות ולא אחת, וזה מכוון:**

     · **ניהול הרשימה — ראש המכינה** (`isHead`, כלומר גם
       הסגנית — תווית בלוח ולא זהות בקוד, 4מ). הוספה, עריכה
       ומחיקה. זו הבקשה: "הוא זה שמנהל את זה".

     · **סימון "נקנה" — כל הצוות.** מי שיוצא לקניות אינו
       בהכרח מי שכתב את הרשימה, ושרת שידרוש את ראש המכינה
       דווקא ברגע הזה יגרום למי שעומד בקופה לא לסמן כלום —
       ואז הרשימה מתיישנת וחוזרים לוואטסאפ. הסימון הפיך,
       ונושא את שם מי שסימן.

   ⚠ **קריאה: צוות.** לחניך אין כאן מסך — הרשימה הזו אינה
     מטלה של אף בעל תפקיד, וכל מה שכן שלו יושב ברשימת המטבח
     או המכולה.

   ⚠ **שורה שנקנתה נשארת** ואינה נמחקת — אותו כלל של שתי
     הרשימות האחרות. "מה קנינו בחודש שעבר" היא שאלה שנשאלת.

   ⚠ **404 ולא 403** על שורה שאינה קיימת.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import {
  BUY_BOARDS as B, BUY_COLS as C, buyReady, BUY_STATUS, BUY_STATUSES,
} from "../shared/buy-ids.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const MAX = { name: 200, qty: 60, detail: 2000 };

/** ⚠ מי מנהל את הרשימה — ראש המכינה בלבד. ראו ההערה בראש הקובץ. */
export const mayManageBuy = (s) => Boolean(s && s.isHead);
/** ⚠ מי מסמן "נקנה" — כל הצוות. */
export const mayMarkBuy = (s) => Boolean(s && !s.isStudent);
/** ⚠ מי קורא את הרשימה. */
export const maySeeBuy = (s) => Boolean(s && !s.isStudent);

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
        by: val(i, C.by),
        date: val(i, C.date) || null,
      }))
      .filter((x) => x.name)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, { force });
}

export const invalidateBuy = () => invalidate("buy");

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
        return res.status(403).json({ error: "הוספה לרשימה הכללית היא של ראש המכינה" });
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
      const wantsEdit = ["name", "qty", "detail"].some((k) => body?.[k] !== undefined);
      if (wantsEdit && !mayManageBuy(session)) {
        return res.status(403).json({ error: "עריכת הרשימה הכללית היא של ראש המכינה" });
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
        return res.status(403).json({ error: "מחיקה מהרשימה הכללית היא של ראש המכינה" });
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

/* ⚠ **בלי אף אפשרות — withAuth מרשה לכל מחובר פרט לחניכים**
   (4טו), וזה בדיוק הקהל כאן. `maySeeBuy` נשאר כשכבה שנייה
   ולמסך המאוחד, שקורא את הרשימה דרך מודול אחר. */
export default withAuth(handler);
