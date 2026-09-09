/* ============================================================
   /api/kitchen?action=weekmenu   התפריט השבועי

     GET                       הטבלה המלאה — 7 ימים × 3 ארוחות
     PUT    { day, meal, ... } כתיבת תא אחד
     DELETE { day, meal }      ניקוי תא

   ------------------------------------------------------------
   ⚠ **קריאה לכל המכינה, כתיבה לאחראי המטבח.** "מה אוכלים
     היום" היא שאלה של כל חניך — ובמיוחד של מי שיש לו אלרגיה.
     העריכה היא עבודה של אחראי המטבח, ו-`mayEdit(…, "kitchen")`
     הוא הכלל: ראש המכינה ובעל התחום, ולא כל כניסת צוות.

     ⚠ זה **לא** `isManager`. הדגל הזה הוא כל איש צוות, כלומר
       מדריך ורואה חשבון יכלו לערוך את התפריט — בדיוק התקלה
       שנסגרה בשלוש נקודות הקצה של המטבח ב-5יז.

   ⚠ **התפריט חוזר על עצמו ואינו תלוי בתאריך** — ראו ההסבר
     ב-shared/weekmenu.js, ולמה זה לוח נפרד מלוח `menus`.

   ⚠ **מחובר למנות.** תא יכול להצביע על מנות מלוח המנות, ואז
     המצרכים מחושבים לכמות הסועדים במקום להיות מוקלדים. השרת
     מחזיר את השמות ואת הרשימה המחושבת — המסך אינו מחשב בעצמו,
     כדי ששני מסכים לא יראו שני מספרים (4לג).
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem } from "./_items.js";
import { mayEdit, editHint } from "../shared/edit-rights.js";
import {
  WEEKMENU_BOARDS as B, WEEKMENU_COLS as C,
  weekMenuReady, DAYS, MEALS, buildGrid, cellFilled,
} from "../shared/weekmenu.js";
import { parseItems, scaleItems, mergeItems, DEFAULT_BASE } from "../shared/dishes.js";
import { loadDishesForSearch } from "./_menu.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const MAX = { text: 2000, short: 300 };

async function loadCells({ force = false } = {}) {
  return cached("weekmenu", async () => {
    const items = await allItems(B.board);
    return items
      .map((i) => ({
        id: String(i.id),
        day: val(i, C.day),
        meal: val(i, C.meal),
        main: val(i, C.main),
        gf: val(i, C.gf),
        side: val(i, C.side),
        protein: val(i, C.protein),
        items: val(i, C.items),
        dishes: String(val(i, C.dishes) || "").split(",").map((x) => x.trim()).filter(Boolean),
        note: val(i, C.note),
      }))
      /* ⚠ שורה עם יום או ארוחה שאינם מוכרים **מדווחת** ואינה
         מושמטת בשקט — היא קיימת בלוח ולא תופיע בשום מסך (4ט). */
      .filter((r) => r.day && r.meal);
  }, { force });
}

const invalidateWeekMenu = () => invalidate("weekmenu");

async function handler(req, res, session) {
  if (!weekMenuReady()) {
    return res.status(503).json({
      error: "לוח התפריט השבועי טרם הוקם. הריצו: npm run setup:boards  (או רק: npm run seed:weekmenu)",
      setupRequired: true,
    });
  }
  const canEdit = mayEdit(session, "kitchen");
  if (req.method !== "GET" && !canEdit) {
    return res.status(403).json({ error: editHint("kitchen") });
  }

  try {
    if (req.method === "GET") {
      const [rows, dishes] = await Promise.all([loadCells(), loadDishesForSearch()]);
      const byId = new Map(dishes.map((d) => [d.id, d]));
      const heads = Number(req.query?.heads) > 0
        ? Math.round(Number(req.query.heads)) : DEFAULT_BASE;

      /* ⚠ שורה שמצביעה על מנה שנמחקה — המזהה נשמר ומדווח, ולא
         נעלם. חלק מהמסך לא יסתדר, ומי שמסתכל צריך לדעת למה. */
      const missing = [];
      const enrich = (r) => {
        const linked = r.dishes.map((id) => {
          const d = byId.get(id);
          if (!d) { missing.push(id); return null; }
          return d;
        }).filter(Boolean);
        const computed = linked.length
          ? mergeItems(linked.map((d) =>
            scaleItems(parseItems(d.items), d.baseHeads, heads)))
          : [];
        return {
          ...r,
          dishNames: linked.map((d) => ({ id: d.id, name: d.name })),
          /* ⚠ **מחושב ואינו נשמר.** מנה שתשתנה משנה גם כאן,
             ואילו היה נשמר הוא היה מתיישן בשקט. */
          computed,
          filled: cellFilled(r),
        };
      };

      const grid = buildGrid(rows.map(enrich));
      return res.status(200).json({
        grid, days: DAYS, meals: MEALS, heads,
        dishes: dishes.map((d) => ({ id: d.id, name: d.name, baseHeads: d.baseHeads })),
        counts: {
          filled: rows.filter(cellFilled).length,
          total: DAYS.length * MEALS.length,
        },
        /* ⚠ מהשרת, ולא נגזר במסך — כפתור שמופיע ומקבל 403 אחרי
           שהמשתמש הקליד הוא בדיוק מה שהכלל נועד למנוע (4יד). */
        canEdit,
        editHint: canEdit ? null : editHint("kitchen"),
        missingDishes: [...new Set(missing)],
      });
    }

    const body = req.body ?? (await readJson(req));
    const day = clip(body?.day, 20);
    const meal = clip(body?.meal, 30);
    if (!DAYS.includes(day)) {
      return res.status(400).json({ error: `יום לא מוכר. האפשרויות: ${DAYS.join(" · ")}` });
    }
    if (!MEALS.includes(meal)) {
      return res.status(400).json({ error: `ארוחה לא מוכרת. האפשרויות: ${MEALS.join(" · ")}` });
    }

    const rows = await loadCells({ force: true });
    const hit = rows.find((r) => r.day === day && r.meal === meal);

    if (req.method === "DELETE") {
      if (!hit) return res.status(404).json({ error: "התא ריק ממילא" });
      await deleteItem(hit.id);
      invalidateWeekMenu();
      return res.status(200).json({ ok: true, day, meal, cleared: true });
    }

    if (req.method !== "PUT") return res.status(405).json({ error: "שיטה לא נתמכת" });

    /* ⚠ המנות מאומתות מול הלוח, ולא נשמרות כמזהה שרירותי:
       מזהה שאינו קיים היה נראה בטבלה כמנה שנעלמה. */
    const wanted = Array.isArray(body?.dishes)
      ? [...new Set(body.dishes.map(String).map((x) => x.trim()).filter(Boolean))] : [];
    if (wanted.length) {
      const known = new Set((await loadDishesForSearch()).map((d) => d.id));
      const bad = wanted.filter((x) => !known.has(x));
      if (bad.length) return res.status(400).json({ error: "מנה שאינה קיימת ברשימה" });
    }

    const cols = {
      [C.day]: { label: day },
      [C.meal]: { label: meal },
      [C.main]: clip(body?.main, MAX.text),
      [C.gf]: clip(body?.gf, MAX.short),
      [C.side]: clip(body?.side, MAX.text),
      [C.protein]: clip(body?.protein, MAX.short),
      [C.items]: clip(body?.items, MAX.text),
      [C.dishes]: wanted.join(","),
      [C.note]: clip(body?.note, MAX.short),
    };

    if (hit) await setColumns(B.board, hit.id, cols);
    else await createItem(B.board, `${day} · ${meal}`, cols);
    invalidateWeekMenu();
    return res.status(200).json({ ok: true, day, meal });
  } catch (e) {
    console.error("[weekmenu]", e);
    res.status(502).json({ error: "פעולת התפריט נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ student:true — בלי זה withAuth חוסם חניכים כברירת מחדל,
   וזו בדיוק הקבוצה שהתפריט נועד לה (4טו). */
export default withAuth(handler, { student: true });
