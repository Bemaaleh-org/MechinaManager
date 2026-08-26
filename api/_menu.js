/* ============================================================
   /api/kitchen?action=menu   מנות, תפריטים, ובדיקה מול המלאי

     GET                          המנות והתפריטים
     GET  &plan=<ids>&heads=<n>   מה צריך לקנות בשביל אלה
     POST { dish }                מנה חדשה
     PUT  { dishId, ... }         עריכת מנה
     DELETE { dishId }            מחיקה
     POST { menu }                שמירת תפריט ליום

   ⚠ מנהל או אחראי מטבח.

   ⚠ המצרכים נשמרים לכמות אנשים אחת ("מצרכים עבור 35"), וכל
     בקשה אחרת היא הכפלה. אחסון של כל וריאציה היה מייצר עותקים
     שמתיישנים בנפרד.

   ⚠ הבדיקה מול המלאי היא **התראה, לא חסימה**. שם מצרך אינו
     תמיד שם הפריט בלוח, וההתאמה חלקית — לכן "חסר" כאן פירושו
     "בדקו", ולא "אין".
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { loadKitchenEquipment } from "./_kitchen-data.js";
import { qtyNumber } from "../shared/par.js";
import {
  parseItems, scaleItems, mergeItems, matchStock, DEFAULT_BASE,
} from "../shared/dishes.js";
import { EXTRA } from "../shared/extras-ids.js";

const D = EXTRA.dishes, M = EXTRA.menus;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };
const KINDS = ["עיקרית", "תוספת", "סלט", "מרק", "קינוח", "ארוחת בוקר", "אחר"];
const MEALS = ["בוקר", "צהריים", "ערב"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadDishes({ force = false } = {}) {
  return cached("dishes", async () => {
    const items = await allItems(D.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        baseHeads: num(i, D.cols.baseHeads) || DEFAULT_BASE,
        kind: val(i, D.cols.kind) || null,
        items: val(i, D.cols.items) || "",
        how: val(i, D.cols.how) || "",
        active: val(i, D.cols.active) === "v",
      }))
      .filter((x) => x.name)
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, { force });
}

async function loadMenus({ force = false } = {}) {
  return cached("menus", async () => {
    const items = await allItems(M.board);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        date: val(i, M.cols.date) || null,
        meal: val(i, M.cols.meal) || null,
        heads: num(i, M.cols.heads),
        dishes: String(val(i, M.cols.dishes) || "").split(",").map((x) => x.trim()).filter(Boolean),
        note: val(i, M.cols.note) || null,
      }))
      .filter((x) => x.date)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, { force });
}

const invalidateMenu = () => { invalidate("dishes"); invalidate("menus"); };

async function handler(req, res, session) {
  if (!D || !D.board) {
    return res.status(503).json({ error: "לוח המנות טרם הוקם", setupRequired: true });
  }
  if (!session.isManager && !session.isKitchen) {
    return res.status(403).json({ error: "התפריט מנוהל על ידי אחראי המטבח" });
  }

  try {
    if (req.method === "GET") {
      const [dishes, menus] = await Promise.all([loadDishes(), loadMenus()]);

      /* ---------- תכנון: מה צריך לקנות ---------- */
      const plan = String(req.query?.plan || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (plan.length) {
        const heads = Number(req.query?.heads) || DEFAULT_BASE;
        const chosen = plan.map((id) => dishes.find((d) => d.id === id)).filter(Boolean);
        if (!chosen.length) return res.status(400).json({ error: "לא נמצאו מנות" });

        const lists = chosen.map((d) => scaleItems(parseItems(d.items), d.baseHeads, heads));
        const needed = mergeItems(lists);

        const equipment = await loadKitchenEquipment();
        const rows = needed.map((it) => {
          const stock = matchStock(it.name, equipment);
          const have = stock ? qtyNumber(stock.qty) : null;
          /* ⚠ have === null: אין פריט תואם, או שכמותו אינה
             מספר. שני המצבים אינם "חסר" אלא "לא ידוע". */
          const short = it.qty != null && have != null && have < it.qty
            ? Math.round((it.qty - have) * 100) / 100
            : 0;
          return {
            ...it,
            stockId: stock ? stock.id : null,
            stockName: stock ? stock.name : null,
            have,
            short,
            /* known=false → המסך אומר "לא נמצא במלאי", לא "חסר" */
            known: have != null,
          };
        });

        return res.status(200).json({
          heads,
          dishes: chosen.map((d) => ({ id: d.id, name: d.name, baseHeads: d.baseHeads })),
          items: rows,
          counts: {
            items: rows.length,
            short: rows.filter((r) => r.short > 0).length,
            unknown: rows.filter((r) => !r.known).length,
          },
        });
      }

      return res.status(200).json({
        dishes, menus,
        counts: { dishes: dishes.length, active: dishes.filter((d) => d.active).length },
        kinds: KINDS, meals: MEALS, defaultBase: DEFAULT_BASE,
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ---------- מנה ---------- */
    if (req.method === "POST" && body.menu === undefined) {
      const name = String(body?.name || "").trim().slice(0, 120);
      if (!name) return res.status(400).json({ error: "לא הוזן שם למנה" });
      const cols = dishCols(body, res);
      if (!cols) return;
      if (!cols[D.cols.baseHeads]) cols[D.cols.baseHeads] = String(DEFAULT_BASE);
      cols[D.cols.active] = { checked: "true" };
      const id = await createItem(D.board, name, cols);
      invalidateMenu();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.dishId || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה מנה" });
      const cols = dishCols(body, res);
      if (!cols) return;
      if (body.active !== undefined) cols[D.cols.active] = { checked: body.active ? "true" : "false" };
      if (Object.keys(cols).length) await setColumns(D.board, id, cols);
      if (body.name !== undefined) {
        const n = String(body.name).trim();
        if (!n) return res.status(400).json({ error: "שם ריק" });
        await renameItem(D.board, id, n);
      }
      invalidateMenu();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const id = String(body?.dishId || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה מנה" });
      await deleteItem(id);
      invalidateMenu();
      return res.status(200).json({ ok: true, id });
    }

    /* ---------- תפריט ליום ---------- */
    if (req.method === "POST" && body.menu !== undefined) {
      const date = String(body?.date || "").trim();
      if (!DATE_RE.test(date)) return res.status(400).json({ error: "תאריך לא תקין" });
      const meal = String(body?.meal || "");
      if (!MEALS.includes(meal)) return res.status(400).json({ error: "ארוחה לא מוכרת" });
      const ids = Array.isArray(body?.dishIds) ? body.dishIds.map(String) : [];
      if (!ids.length) return res.status(400).json({ error: "לא נבחרו מנות" });

      const dishes = await loadDishes();
      const known = new Set(dishes.map((d) => d.id));
      const clean = [...new Set(ids)].filter((x) => known.has(x));
      if (clean.length !== new Set(ids).size) {
        return res.status(400).json({ error: "מנה לא מוכרת ברשימה" });
      }
      const heads = Number(body?.heads) || DEFAULT_BASE;

      const cols = {
        [M.cols.date]: { date },
        [M.cols.meal]: { label: meal },
        [M.cols.heads]: String(heads),
        [M.cols.dishes]: clean.join(","),
        [M.cols.note]: String(body?.note || "").slice(0, 200),
      };
      /* שורה אחת לכל תאריך+ארוחה — עדכון ולא הוספה */
      const menus = await loadMenus({ force: true });
      const hit = menus.find((x) => x.date === date && x.meal === meal);
      if (hit) await setColumns(M.board, hit.id, cols);
      else await createItem(M.board, `${meal} · ${date}`, cols);
      invalidateMenu();
      return res.status(200).json({ ok: true, date, meal, dishes: clean.length });
    }

    return res.status(405).json({ error: "שיטה לא נתמכת" });
  } catch (e) {
    console.error("[menu]", e);
    res.status(502).json({ error: "פעולת התפריט נכשלה" });
  }
}

function dishCols(body, res) {
  const cols = {};
  for (const [k, c, max] of [
    ["items", D.cols.items, 4000], ["how", D.cols.how, 4000],
  ]) {
    if (body[k] !== undefined) cols[c] = String(body[k] || "").trim().slice(0, max);
  }
  if (body.kind !== undefined && body.kind !== "") {
    if (!KINDS.includes(String(body.kind))) { res.status(400).json({ error: "סוג מנה לא מוכר" }); return null; }
    cols[D.cols.kind] = { label: String(body.kind) };
  }
  if (body.baseHeads !== undefined) {
    const n = Number(body.baseHeads);
    if (!Number.isFinite(n) || n < 1 || n > 1000) {
      res.status(400).json({ error: "מספר אנשים לא תקין" }); return null;
    }
    cols[D.cols.baseHeads] = String(Math.round(n));
  }
  return cols;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { kitchen: true });
