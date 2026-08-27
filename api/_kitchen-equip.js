/* ============================================================
   /api/kitchen?action=equip[&area=אוכל|חד״פ]
     GET     הציוד של התחום + רשימת הקניות שלו
     POST    { name, qty, kind, par?, area?, price?, kgPer? }   פריט חדש
     PUT     { itemId, name?, qty?, delta?, kind?, par?, price?, kgPer? }
     DELETE  { itemId }                               מחיקה

   ⚠ צוות ותורנים. חניך נדחה — withAuth ללא דגלים חוסם סשן
     חניך, וזה בדיוק קהל המטבח מאז ומתמיד.

   ⚠ הסינון לפי תחום נעשה כאן ולא בדפדפן: מסך החד״פ לא אמור
     לקבל את 90 פריטי האוכל ולהסתיר אותם.
   ============================================================ */

import { withAuth } from "./_session.js";
import {
  KITCHEN_BOARDS, KITCHEN_COLS, KITCHEN_KIND,
  KITCHEN_AREA, KITCHEN_AREAS, boardsReady, missingFor,
} from "../shared/kitchen-boards.js";
import {
  loadKitchenEquipment, loadKitchenShopping, loadProduce, invalidateKitchen,
  setColumns, renameItem, createItem, deleteItem,
} from "./_kitchen-data.js";
import { qtyAdd, qtyNumber } from "../shared/par.js";
import { kgPerUnit, lineCost, buildTable } from "../shared/produce.js";

const E = KITCHEN_COLS.equipment;
const KINDS = [KITCHEN_KIND.consumable, KITCHEN_KIND.permanent];

/** התחום המבוקש. ברירת המחדל היא אוכל — הגדול מבין השניים. */
/* ⚠ שלוש תשובות ולא שתיים:
     שם תחום — התחום הזה
     ""       — ALL, כל התחומים יחד
     אחר      — null, תחום לא מוכר

   ⚠ ריק החזיר פעם "אוכל" בשקט, וזה נשאר נכון כל עוד המסך
     תמיד ביקש תחום מפורש. ברגע שנוסף המסך המאוחד, שקורא בלי
     area, ההתנהגות הזו הסתירה את כל 16 פריטי החד״פ — הם היו
     בלוח כל הזמן ופשוט לא הוחזרו.

   ⚠ ברירת מחדל שקטה על קלט ריק היא בדיוק הסוג של התנהגות
     שנראית נוחה ומתגלה כבאג כשמגיע קורא חדש. */
const ALL = Symbol("all");

function areaOf(raw) {
  const a = String(raw || "").trim();
  if (!a) return ALL;
  return KITCHEN_AREAS.includes(a) ? a : null;
}

async function handler(req, res, session) {
  /* ⚠ לוחות שלא הוקמו הם כשל הקמה, לא מטבח ריק. רשימה ריקה
     כאן הייתה נראית בדיוק כמו מטבח בלי ציוד — וזה הבאג שחי
     יומיים בייצור. */
  if (!boardsReady()) {
    return res.status(503).json({
      error: "לוחות המטבח טרם הוקמו ב-monday. הריצו: node --env-file=.env tools/seed-kitchen.mjs",
      setupRequired: true,
    });
  }

  try {
    if (req.method === "GET") {
      const area = areaOf(req.query?.area);
      if (!area) return res.status(400).json({ error: "תחום לא מוכר" });

      const [allEquip, allShop, produceRows] = await Promise.all([
        loadKitchenEquipment(), loadKitchenShopping(), loadProduce(),
      ]);
      /* ⚠ טבלת ההמרה נבנית פעם אחת לבקשה ומועברת פנימה, ולא
         נקראת מחדש לכל פריט. */
      const table = buildTable(produceRows);
      const mine = (x) => area === ALL || x.area === area;
      const equipment = allEquip.filter(mine).map((x) => enrich(x, table));
      const shopping = allShop.filter(mine).map((x) => withCost(x, allEquip));

      return res.status(200).json({
        /* ⚠ null ולא מחרוזת: המסך מבדיל בין "כל התחומים" לבין
           תחום מסוים, ומחרוזת ריקה הייתה נקראת כתחום. */
        area: area === ALL ? null : area,
        equipment, shopping,
        counts: {
          total: equipment.length,
          consumable: equipment.filter((x) => x.kind === KITCHEN_KIND.consumable).length,
          permanent: equipment.filter((x) => x.kind === KITCHEN_KIND.permanent).length,
          openShopping: shopping.filter((x) => x.status === "פתוח").length,
          /* כמה פריטים מתחת למפתח — המספר שמניע את רשימת החוסרים */
          missing: equipment.filter((x) => missingFor(x) > 0).length,
          withPar: equipment.filter((x) => x.par != null).length,
          withPrice: equipment.filter((x) => x.price != null).length,
        },
        /* ⚠ הסכום מחושב **בשרת** ולא בדפדפן, כדי שמסך האוכל,
           מסך החד״פ והמסך המאוחד יראו את אותו מספר. חישוב
           בצד הלקוח היה מתפצל ברגע שמסך אחד מסנן אחרת. */
        value: totalValue(equipment),
        /* ⚠ שווי הקנייה הפתוחה בנפרד משווי המלאי. אלה שתי
           שאלות שונות — "כמה שווה מה שיש" ו"כמה תעלה
           ההזמנה" — ומספר אחד לשתיהן היה מטעה בשתיהן. */
        openValue: totalValue(shopping.filter((x) => x.status === "פתוח")),
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = String(body?.name || "").trim();
      const qty = String(body?.qty || "").trim().slice(0, 60);
      const kind = String(body?.kind || KITCHEN_KIND.consumable);
      const area = areaOf(body?.area);
      if (!name) return res.status(400).json({ error: "לא הוזן שם פריט" });
      if (!KINDS.includes(kind)) return res.status(400).json({ error: "סוג לא מוכר" });
      if (!area) return res.status(400).json({ error: "תחום לא מוכר" });
      const par = numPatch(body?.par);
      if (par === false) return res.status(400).json({ error: "מפתח חייב להיות מספר" });
      const price = numPatch(body?.price);
      if (price === false) return res.status(400).json({ error: "מחיר חייב להיות מספר" });
      const kgPer = numPatch(body?.kgPer);
      if (kgPer === false) return res.status(400).json({ error: "ק״ג ליחידה חייב להיות מספר" });

      const equipment = await loadKitchenEquipment({ force: true });
      if (equipment.some((x) => x.name === name && x.area === area)) {
        return res.status(409).json({ error: "כבר קיים פריט בשם הזה" });
      }
      const id = await createItem(KITCHEN_BOARDS.equipment, name, {
        [E.qty]: qty, [E.kind]: { label: kind }, [E.area]: { label: area },
        ...(par === null ? {} : { [E.par]: par }),
        ...(price === null ? {} : { [E.price]: price }),
        ...(kgPer === null ? {} : { [E.kgPer]: kgPer }),
      });
      invalidateKitchen();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוין פריט" });
      const equipment = await loadKitchenEquipment();
      const item = equipment.find((x) => x.id === itemId);
      if (!item) return res.status(404).json({ error: "הפריט אינו נמצא" });

      const cols = {};
      if (body.qty !== undefined) cols[E.qty] = String(body.qty).trim().slice(0, 60);
      /* ---------- הוספה או הורדה ----------
         ⚠ delta ולא qty: השולח אומר "נוספו 12", לא "עכשיו יש
           52". שני אנשים שמכניסים סחורה באותה דקה — הראשון
           שולח 12 והשני 8, והתוצאה 20. אילו כל אחד היה שולח
           את הסך הכול, השני היה מוחק את הראשון.

         ⚠ הטקסט התיאורי נשמר. הכמות היא טקסט חופשי
           ("40 חבילות של 10"), ורק המספר הראשון זז. ראו
           qtyAdd ב-shared/par.js. */
      if (body.delta !== undefined) {
        const d = Number(body.delta);
        if (!Number.isFinite(d) || d === 0) {
          return res.status(400).json({ error: "שינוי כמות לא תקין" });
        }
        cols[E.qty] = qtyAdd(item.qty, d).slice(0, 60);
      }

      if (body.kind !== undefined) {
        if (!KINDS.includes(String(body.kind))) return res.status(400).json({ error: "סוג לא מוכר" });
        cols[E.kind] = { label: String(body.kind) };
      }
      /* ⚠ מחרוזת ריקה מנקה את העמודה — כך מבטלים ערך לפריט.
         זה מה שמאפשר להחזיר פריט למצב "לא יודעים", שהוא מצב
         שונה מ-0 ולא רק ערך אחר. */
      for (const [key, col, bad] of [
        ["par", E.par, "מפתח חייב להיות מספר"],
        ["price", E.price, "מחיר חייב להיות מספר"],
        ["kgPer", E.kgPer, "ק״ג ליחידה חייב להיות מספר"],
      ]) {
        if (body[key] === undefined) continue;
        const v = numPatch(body[key]);
        if (v === false) return res.status(400).json({ error: bad });
        cols[col] = v === null ? "" : v;
      }
      if (Object.keys(cols).length) await setColumns(KITCHEN_BOARDS.equipment, itemId, cols);
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return res.status(400).json({ error: "שם ריק" });
        await renameItem(KITCHEN_BOARDS.equipment, itemId, name);
      }
      invalidateKitchen();
      return res.status(200).json({ ok: true, id: itemId });
    }

    if (req.method === "DELETE") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוין פריט" });
      await deleteItem(itemId);
      invalidateKitchen();
      return res.status(200).json({ ok: true, id: itemId });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[kitchen-equip]", e);
    res.status(502).json({ error: "פעולת הציוד נכשלה" });
  }
}

/* ============================================================
   העשרה: מה שאפשר להסיק, מוסיפים כאן
   ------------------------------------------------------------
   ⚠ `kgPer` שבלוח **גובר** על טבלת ההמרה. הטבלה היא ברירת
     מחדל כדי שלא ימלאו 60 שורות ביד, ולא מקור אמת — עיקרון 1.

   ⚠ `kgSource` נשלח כדי שהמסך יוכל לומר "לפי הטבלה, בערך"
     מול "לפי מה שהוזן". מספר בלי מקור נראה מדויק גם כשאינו.
   ============================================================ */
function enrich(x, table) {
  const auto = kgPerUnit(x.name, table);
  const kg = x.kgPer != null && x.kgPer > 0 ? x.kgPer : auto;
  const units = qtyNumber(x.qty);
  return {
    ...x,
    kgEach: kg,
    kgSource: x.kgPer != null && x.kgPer > 0 ? "board" : (auto != null ? "table" : null),
    /* סך המשקל והעלות של מה שיש עכשיו במחסן, או null */
    kgTotal: kg != null && units ? Math.round(units * kg * 100) / 100 : null,
    cost: lineCost(x.price, units),
  };
}

/* ============================================================
   שורת קנייה → עלות מוערכת
   ------------------------------------------------------------
   ⚠ ההתאמה היא **לפי שם מדויק ובאותו תחום**. שורת הקנייה
     נוצרה מהפריט עצמו, ולכן השם זהה. התאמה חלקית הייתה
     מדביקה מחיר של פריט אחר על שורה שהוקלדה ביד, וזה בדיוק
     המקום שבו מספר שגוי נראה סביר.

   ⚠ הכמות ברשימת הקניות היא טקסט חופשי ("3 ארגזים"), ולכן
     נלקח ממנה המספר הראשון — אותו כלל כמו במלאי.

   ⚠ פריט בלי מחיר מקבל cost: null ולא 0, ונספר בנפרד.
   ============================================================ */
function withCost(row, allEquip) {
  const src = allEquip.find((e) => e.name === row.name && e.area === row.area);
  const price = src ? src.price : null;
  return { ...row, price, cost: lineCost(price, qtyNumber(row.qty)) };
}

/** סכום העלויות. ⚠ מדווח גם כמה פריטים **לא** נספרו. */
function totalValue(list) {
  let sum = 0, counted = 0;
  for (const x of list) if (x.cost != null) { sum += x.cost; counted++; }
  return {
    total: Math.round(sum * 100) / 100,
    counted,
    /* ⚠ בלי זה, "₪1,240" נקרא כשווי המחסן כשהוא שווי של
       שליש ממנו. המסך חייב להראות כמה פריטים חסרי מחיר. */
    unpriced: list.length - counted,
  };
}

/**
 * ערך מספרי שנשלח: null = ריק (לנקות), מספר = ערך,
 * false = ערך פסול. ⚠ שלושה מצבים ולא שניים, כי "לנקות"
 * ו"שגוי" אינם אותו דבר.
 */
function numPatch(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return false;
  return n;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ הקוד המשותף לתורנים נגנז, ואיתו הדרך שבה חניך הגיע לכאן.
   הגישה עוברת עכשיו דרך תפקיד "אחראי מטבח" בלוח החניכים —
   מנהל או בעל התפקיד, וההרשאה נסגרת כשמסירים אותו. */
export default withAuth(handler, { kitchen: true });
