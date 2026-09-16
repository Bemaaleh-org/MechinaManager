/* ============================================================
   /api/kitchen?action=staples   מצרכים קבועים לשבוע

     GET                                   הרשימה
     POST   { name, qty?, note? }          הוספה
     PUT    { id, name?, qty?, note?, active? }
     DELETE { id }

   ------------------------------------------------------------
   הבקשה: *"אני רוצה שיהיה לאחראי מטבח אופציה להוסיף ברשימה
   הזאת רשימה קבועה של מצרכים קבועים לשבוע לדוגמא 90 ביצים
   לשבוע הקרוב ואז בוחרים אותם ומוסיפים לרשימה."*

   ⚠ **"קבוע" כאן פירושו שהשורה נשמרת, ולא שהיא נוספת מעצמה.**
     אחראי המטבח בוחר בכל שבוע מה מתוך הרשימה באמת צריך —
     שבוע עם סמינר אינו שבוע עם סופ״ש בית. רשימה שנוספת
     אוטומטית לכל בנייה הייתה מייצרת שורות שאיש לא ביקש,
     ואז מפסיקים להסתכל על הרשימה כולה.

   ⚠ **כיבוי ולא מחיקה, ומחיקה קיימת בכל זאת.** מצרך שלא צריך
     החודש נכבה ויורד מהבורר בלי לאבד את הכמות שמישהו כיוון;
     מחיקה היא למה שנוסף בטעות. שני הדברים אינם אותו דבר,
     ושניהם נחוצים (4כא בהיפוך: כאן אין שורות שתלויות במזהה).

   ⚠ **קריאה לכל מי שרואה את התפריט, כתיבה ל-`mayEdit(kitchen)`**
     — ראש המכינה ואחראי המטבח, בדיוק כמו התפריט עצמו (5יז).
     הקריאה פתוחה כי הרשימה מופיעה במסך בניית הקניות, ומי
     שבונה אותה צריך לראות מה יש.

   ⚠ **404 ולא 403** על שורה שאינה קיימת.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { mayEdit, editHint } from "../shared/edit-rights.js";
import {
  STAPLE_BOARDS as B, STAPLE_COLS as C,
  staplesReady, STAPLE_ACTIVE,
} from "../shared/staples-ids.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const MAX = { name: 200, qty: 60, note: 300 };

/* ⚠⚠ `value === null` הוא המבחן לריק ולא `text === ""` — תא
   סטטוס בלי בחירה מחזיר את שם התווית שיושבת על מפתח 5 (5ז).
   כאן זה היה גורם לכל שורה חדשה להיקרא "כבוי" ולהיעלם. */
const statusOf = (i, col) => {
  const cell = (i.column_values || []).find((x) => x.id === col) || {};
  const empty = cell.value === null || cell.value === undefined || cell.value === "null";
  return empty ? "" : (cell.text || "");
};

export async function loadStaples({ force = false } = {}) {
  if (!staplesReady()) return [];
  return cached("staples", async () => {
    const items = await allItems(B.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        qty: val(i, C.qty),
        note: val(i, C.note),
        /* ⚠ ריק = פעיל. שורה שנכתבה ביד בלוח אינה נושאת סטטוס,
           והיא בדיוק זו שרוצים לראות; ברירת מחדל "כבוי" הייתה
           מסתירה אותה בלי שום סימן (4ט, 5כו). */
        active: statusOf(i, C.active) !== STAPLE_ACTIVE.off,
      }))
      .filter((x) => x.name)
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, { force });
}

export const invalidateStaples = () => invalidate("staples");

const setup = (res) => res.status(503).json({
  error: "לוח המצרכים הקבועים טרם הוקם ב-monday. הריצו: npm run seed:staples",
  setupRequired: true,
});

async function handler(req, res, session) {
  const canEdit = mayEdit(session, "kitchen");

  /* ⚠ הלוח אינו חוסם קריאה כשהוא חסר — רשימה ריקה והמסך אומר
     מה להריץ. אבל **כתיבה נכשלת במפורש** ב-503, כי כתיבה
     שנבלעת נראית בדיוק כמו כתיבה שנשמרה (4לו, עיקרון 6). */
  if (!staplesReady() && req.method !== "GET") return setup(res);

  if (req.method !== "GET" && !canEdit) {
    return res.status(403).json({ error: editHint("kitchen") });
  }

  try {
    if (req.method === "GET") {
      const rows = await loadStaples();
      return res.status(200).json({
        rows, ready: staplesReady(),
        setup: staplesReady() ? null : "npm run seed:staples",
        /* ⚠ מהשרת ולא נגזר במסך — כפתור שמופיע ומקבל 403 אחרי
           שהמשתמש הקליד הוא בדיוק מה שהכלל נועד למנוע (4יד). */
        canEdit,
        editHint: canEdit ? null : editHint("kitchen"),
      });
    }

    /* ⚠ `readJson` ולא `req.body ?? {}` — בסביבת הפיתוח הגוף
       אינו מפורסר מראש, וכל POST חוזר "חסר שם המצרך". */
    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = clip(body.name, MAX.name);
      if (!name) return res.status(400).json({ error: "חסר שם המצרך" });
      const rows = await loadStaples();
      /* ⚠ שם כפול נחסם — שתי שורות "ביצים" עם שתי כמויות הן
         בדיוק המקום שבו מוסיפים לרשימה את השורה הלא-נכונה. */
      if (rows.some((r) => r.name === name)) {
        return res.status(409).json({ error: `"${name}" כבר ברשימה` });
      }
      const id = await createItem(B.board, name, {
        ...(C.qty ? { [C.qty]: clip(body.qty, MAX.qty) } : {}),
        ...(C.note ? { [C.note]: clip(body.note, MAX.note) } : {}),
        ...(C.active ? { [C.active]: { label: STAPLE_ACTIVE.on } } : {}),
      });
      invalidateStaples();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body.id || "");
      const rows = await loadStaples();
      const row = rows.find((r) => r.id === id);
      if (!row) return res.status(404).json({ error: "המצרך אינו נמצא" });

      const cols = {};
      if (body.qty !== undefined && C.qty) cols[C.qty] = clip(body.qty, MAX.qty);
      if (body.note !== undefined && C.note) cols[C.note] = clip(body.note, MAX.note);
      if (body.active !== undefined && C.active) {
        cols[C.active] = { label: body.active ? STAPLE_ACTIVE.on : STAPLE_ACTIVE.off };
      }

      const name = body.name === undefined ? null : clip(body.name, MAX.name);
      if (name !== null && !name) return res.status(400).json({ error: "חסר שם המצרך" });
      if (name && name !== row.name && rows.some((r) => r.name === name)) {
        return res.status(409).json({ error: `"${name}" כבר ברשימה` });
      }

      if (Object.keys(cols).length) await setColumns(B.board, id, cols);
      /* ⚠ `renameItem(board, id, name)` — שלושה ארגומנטים. שניים
         משאירים את `$n:String!` חסר וכל שינוי שם נופל ב-502
         גנרי (4ס). */
      if (name && name !== row.name) await renameItem(B.board, id, name);
      invalidateStaples();
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = String(body.id || req.query?.id || "");
      /* ⚠⚠ המזהה מאומת מול **הלוח הזה** לפני `deleteItem`, שהיא
         שולחת `delete_item` בלי `board_id` — כלומר מזהה
         שרירותי היה מוחק כל שורה בכל לוח במערכת (4ס). */
      const rows = await loadStaples();
      if (!rows.some((r) => r.id === id)) {
        return res.status(404).json({ error: "המצרך אינו נמצא" });
      }
      await deleteItem(id);
      invalidateStaples();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "שיטה לא נתמכת" });
  } catch (e) {
    return res.status(502).json({ error: e.message || "פעולת המצרכים הקבועים נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` הוא השער — אחראי המטבח הוא חניך, ו-
   `withAuth(handler)` לבדו היה חוסם אותו (4טו). ההכרעה על
   הכתיבה נעשית בתוך ההנדלר לפי `mayEdit`. */
export default withAuth(handler, { student: true });
