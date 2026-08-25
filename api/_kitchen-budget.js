/* ============================================================
   /api/kitchen?action=budget — תקציב המטבח
     GET    ?month=YYYY-MM   חודש אחד: ימים, סכומים והזמנות
     PUT    { date, type?, cost?, note? }   כפיית סוג ליום
     POST   { name, amount, kind, startMonth|date, note? }  קנייה
     DELETE { orderId }                     מחיקת קנייה
     PUT    { headcount, mode, from? }       מצבת הסועדים
     PUT    { typeId, catering?, fixedHeads?, purchases? }  תקציב סוג יום

   ⚠ מנהל בלבד. עלויות אינן נתון של תורן (עיקרון 4).

   ⚠ סוג היום נגזר מהגאנט ומלוח השנה, ורק חריגה נשמרת בלוח.
     ראו ההסבר ב-shared/budget-boards.js.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { loadCalendar, israelToday } from "./_attendance-data.js";
import { loadGantt } from "./_lessons-gantt.js";
import {
  BUDGET_BOARDS as B, BUDGET_COLS as C, budgetReady,
  DEFAULT_HEADCOUNT, SETTING_HEADCOUNT,
  dayCost, perPersonOf, sortTypes, orderShareFor, monthsOf,
  headcountAt, ORDER_KIND, ORDER_KINDS,
} from "../shared/budget-boards.js";

const dow = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
const isFriday = (iso) => dow(iso) === 5;
const isSaturday = (iso) => dow(iso) === 6;

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };

/* ---------- טעינה ---------- */
async function loadDayTypes({ force = false } = {}) {
  return cached("budget-daytypes", async () => {
    const items = await allItems(B.dayTypes);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        catering: num(i, C.dayTypes.catering) || 0,
        fixedHeads: num(i, C.dayTypes.fixedHeads) || 0,
        purchases: num(i, C.dayTypes.purchases) || 0,
      }))
      .filter((x) => x.name);
  }, { force });
}

/** רק הימים שנכפו ידנית */
async function loadOverrides({ force = false } = {}) {
  return cached("budget-days", async () => {
    const items = await allItems(B.days);
    return items
      .map((i) => ({
        id: String(i.id),
        date: val(i, C.days.date),
        type: val(i, C.days.type) || null,
        cost: num(i, C.days.cost),
        note: val(i, C.days.note) || null,
      }))
      .filter((x) => x.date);
  }, { force });
}

async function loadOrders({ force = false } = {}) {
  return cached("budget-orders", async () => {
    const items = await allItems(B.orders);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        amount: num(i, C.orders.amount) || 0,
        startMonth: val(i, C.orders.startMonth),
        date: val(i, C.orders.date) || null,
        note: val(i, C.orders.note) || null,
        kind: val(i, C.orders.kind) || ORDER_KIND.quarterly,
      }))
      .filter((x) => x.name && (x.startMonth || x.date));
  }, { force });
}

/**
 * מצבת הסועדים — שורה לכל שינוי, עם תאריך תחילה.
 * ⚠ שורה בלי תאריך היא הבסיס: היא תקפה מתחילת הזמן.
 */
async function loadHeadcount({ force = false } = {}) {
  return cached("budget-settings", async () => {
    const items = await allItems(B.settings);
    const rows = items
      .filter((i) => String(i.name || "").trim() === SETTING_HEADCOUNT)
      .map((i) => ({
        id: String(i.id),
        value: num(i, C.settings.value) ?? DEFAULT_HEADCOUNT,
        from: val(i, C.settings.from) || "",
      }))
      .sort((a, b) => String(a.from).localeCompare(String(b.from)));
    return rows;
  }, { force });
}

const invalidateBudget = () => {
  invalidate("budget-daytypes"); invalidate("budget-days");
  invalidate("budget-orders"); invalidate("budget-settings");
};

/* ------------------------------------------------------------
   גזירת סוג היום מהלו״ז.
   ⚠ הסדר הוא הכרעה: כלל מוקדם גובר על מאוחר.
   ------------------------------------------------------------ */
const T = {
  routine: "שגרה",
  series: "סדרה",
  home: "בית",
  community: "עשייה קהילתית",
  friMechina: "שישי מכינה",
  satMechina: "שבת מכינה",
  backFromHome: "חזרה מהבית",
  other: "אחר",
};

/* ------------------------------------------------------------
   ⚠ הכול נגזר מהגאנט, ולא מלוח השנה של הנוכחות.

     שני הלוחות נשאו את אותה עובדה — מתי סדרה, מתי סופ״ש בית —
     ולוח השנה יובא פעם אחת מקובץ ולא זז מאז. כשמזיזים שבת או
     סדרה בגאנט, לוח השנה נשאר מאחור והתקציב היה מציג מספר
     שאיש לא הזין אבל גם לא נכון.

     מהיום הגאנט הוא המקור: שינוי בו משתקף בתקציב בשליפה הבאה.
     לוח השנה נשאר מה שהוא — הנוכחות — ומשמש כאן רק כרשת ביטחון
     לימים שאין עליהם אירוע.
   ------------------------------------------------------------ */

const HOME_RE = /סופ״ש בית|סופ"ש בית|^בית$|יום בית/;
const SERIES_RE = /סדרה|סדרת|מסע/;

/** תאריך → אירועי הגאנט שחלים עליו */
function eventsByDate(gantt) {
  const map = new Map();
  for (const e of gantt) {
    const from = e.start, to = e.end || e.start;
    if (!from) continue;
    for (let d = new Date(from + "T12:00:00Z"); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      (map.get(iso) || map.set(iso, []).get(iso)).push(e);
    }
  }
  return map;
}

const prevDay = (iso) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const anyMatch = (events, re) => (events || []).some((e) => re.test(e.name || ""));

/**
 * סוג היום, בלי החריגות.
 * ⚠ סדר הכללים הוא ההכרעה: בית גובר על הכול, סדרה גוברת על
 *   סוף שבוע רגיל (סדרה שנמשכת לשבת עדיין סדרה), וסוף שבוע
 *   גובר על שגרה.
 */
function derivedType(iso, byDate, evByDate) {
  const events = evByDate.get(iso) || [];
  const friday = isSaturday(iso) ? prevDay(iso) : iso;
  const weekendEvents = isSaturday(iso) ? (evByDate.get(friday) || []) : [];

  /* ⚠ סוף שבוע בבית הוא פשוט "בית" — אין טעם בסוג נפרד
     לשישי ולשבת כשכולם עולים אפס. */
  const atHome = anyMatch(events, HOME_RE) || anyMatch(weekendEvents, HOME_RE);
  if (atHome) return T.home;

  /* היום שאחרי סופ״ש בית — חוזרים, וזו ארוחה אחת בלבד */
  if (!isFriday(iso) && !isSaturday(iso) && anyMatch(evByDate.get(prevDay(iso)), HOME_RE)) {
    return T.backFromHome;
  }

  if (anyMatch(events, SERIES_RE)) return T.series;

  if (isFriday(iso)) return T.friMechina;
  if (isSaturday(iso)) return T.satMechina;

  /* ⚠ שלישי הוא יום העשייה הקהילתית, אלא אם הוא נבלע בבית,
     בסדרה או בסוף שבוע — ולכן הבדיקה כאן ולא למעלה. */
  if (dow(iso) === 2) return T.community;

  /* רשת ביטחון: יום בלי אירוע בגאנט — לפי לוח השנה */
  const day = byDate.get(iso);
  if (day && (day.kind === "סדרה" || day.kind === "טיול")) return T.series;
  if (day && day.kind === "חופשה") return T.home;

  return T.routine;
}

/** כל ימי החודש, גם אלה שמחוץ ללוח השנה — מסע עלייה למשל */
function datesOfMonth(month) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= last; d++) {
    out.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

/* ---------- חישוב חודש ---------- */
function buildMonth(month, { types, overrides, calendar, gantt, heads }) {
  const byName = new Map(types.map((t) => [t.name, t]));
  const byDate = calendar.byDate;
  const evByDate = eventsByDate(gantt);
  const ovByDate = new Map(overrides.map((o) => [o.date, o]));

  const days = datesOfMonth(month).map((date) => {
    const ov = ovByDate.get(date) || null;
    const typeName = (ov && ov.type) || derivedType(date, byDate, evByDate);
    const type = byName.get(typeName) || null;
    const over = ov && ov.cost != null ? ov.cost : null;
    /* ⚠ המצבה נלקחת לפי היום עצמו ולא לפי היום: שינוי במצבה
       אינו רטרואקטיבי, ולכן ספטמבר ממשיך להיות מחושב במצבה
       שהייתה בספטמבר. */
    const head = headcountAt(heads, date);
    const cost = dayCost(type, head, over);
    return {
      date,
      kind: (byDate.get(date) || {}).kind || null,
      type: typeName,
      headcount: head,
      perPerson: over != null ? over : perPersonOf(type),
      catering: cost.catering,
      purchases: cost.purchases,
      total: cost.total,
      overridden: Boolean(ov),
      note: ov ? ov.note : null,
      events: (evByDate.get(date) || []).map((e) => e.name),
    };
  });

  return {
    days,
    catering: days.reduce((a, d) => a + d.catering, 0),
    purchases: days.reduce((a, d) => a + d.purchases, 0),
    foodTotal: days.reduce((a, d) => a + d.total, 0),
  };
}

/* ---------- נקודת הקצה ---------- */
async function handler(req, res, session) {
  if (!budgetReady()) {
    return res.status(503).json({
      error: "לוחות התקציב טרם הוקמו. הריצו: node --env-file=.env tools/seed-budget.mjs",
      setupRequired: true,
    });
  }
  /* ⚠ מנהל או אחראי המטבח. אחראי המטבח הוא חניך, ומי שיסיר
     ממנו את התפקיד בלוח סוגר לו את הגישה בבקשה הבאה. */
  if (!session.isManager && !session.isKitchen) {
    return res.status(403).json({ error: "התקציב מוצג למנהל ולאחראי המטבח" });
  }

  try {
    if (req.method === "GET") {
      const [types, overrides, orders, settings, calendar, gantt] = await Promise.all([
        loadDayTypes(), loadOverrides(), loadOrders(), loadHeadcount(),
        loadCalendar(), loadGantt(),
      ]);

      const months = [...new Set(calendar.days.map((d) => d.date.slice(0, 7)))].sort();

      /* ---------- סיכום שנתי ----------
         חודש-חודש, ובסוף הסך הכול. אותו חישוב בדיוק כמו במסך
         החודשי — נקרא מאותה פונקציה ולא משוכפל. */
      if (String(req.query?.view || "") === "year") {
        const rows = months.map((m) => {
          const b = buildMonth(m, { types, overrides, calendar, gantt, heads: settings });
          const spent = orders.reduce((a, o) => a + orderShareFor(o, m), 0);
          return {
            month: m, days: b.days.length,
            catering: b.catering, purchases: b.purchases, total: b.foodTotal,
            spent, left: b.purchases - spent,
          };
        });
        const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
        return res.status(200).json({
          view: "year", months, rows,
          types: sortTypes(types),
          headcount: headcountAt(settings, months[months.length - 1] + "-28"),
          headcounts: settings,
          catering: sum("catering"),
          purchases: sum("purchases"),
          total: sum("total"),
          spent: sum("spent"),
          left: sum("purchases") - sum("spent"),
          orders: orders.map((o) => ({ ...o, months: monthsOf(o) })),
        });
      }

      const month = String(req.query?.month || "") || months[0];
      if (!months.includes(month)) {
        return res.status(400).json({ error: "החודש אינו בשנת הלימודים", months });
      }

      const b = buildMonth(month, { types, overrides, calendar, gantt, heads: settings });

      /* ⚠ הקניות אינן מוסיפות לתקציב אלא יורדות ממנו: התקציב
         נקבע מסוגי הימים, והקניות הן ההוצאה מולו. ההפרש הוא
         שאומר אם חרגנו. */
      const monthOrders = orders
        .map((o) => ({ ...o, months: monthsOf(o), share: orderShareFor(o, month) }))
        .filter((o) => o.share > 0);
      const spent = monthOrders.reduce((a, o) => a + o.share, 0);

      /* פירוט לפי סוג — מה מושך את התקציב */
      const byType = {};
      for (const d of b.days) {
        const e = byType[d.type]
          || (byType[d.type] = { type: d.type, days: 0, catering: 0, purchases: 0, total: 0 });
        e.days++; e.catering += d.catering; e.purchases += d.purchases; e.total += d.total;
      }

      return res.status(200).json({
        month, months, days: b.days, types: sortTypes(types),
        /* המצבה שתקפה בסוף החודש — היא שמוצגת ככותרת */
        headcount: headcountAt(settings, b.days[b.days.length - 1].date),
        headcounts: settings,
        catering: b.catering,
        purchases: b.purchases,
        total: b.foodTotal,
        spent,
        left: b.purchases - spent,
        byType: Object.values(byType).sort((a, b2) => b2.total - a.total),
        orders: orders.map((o) => ({ ...o, months: monthsOf(o), share: orderShareFor(o, month) })),
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "PUT") {
      /* מחיר של סוג יום — ⚠ משנה את כל השנה, לא חודש אחד.
         שגרה שמתייקרת מ-40 ל-45 מזיזה כל יום שגרה בכל חודש,
         וזו הכוונה: זה מחיר ולא חריגה. חריגה ליום בודד נשמרת
         בלוח הימים ולא כאן. */
      if (body.typeId !== undefined) {
        const typeId = String(body.typeId || "").trim();
        if (!typeId) return res.status(400).json({ error: "לא צוין סוג יום" });
        const types = await loadDayTypes();
        const hit = types.find((t) => t.id === typeId);
        if (!hit) return res.status(404).json({ error: "סוג היום אינו נמצא" });

        /* ⚠ שדה שלא נשלח אינו משתנה: המסך שולח רכיב אחד בכל
           פעם, ושליחת השאר כאפס הייתה מאפסת אותם בשקט. */
        const cols = {};
        for (const [key, col] of [
          ["catering", C.dayTypes.catering],
          ["fixedHeads", C.dayTypes.fixedHeads],
          ["purchases", C.dayTypes.purchases],
        ]) {
          if (body[key] === undefined) continue;
          const n = Number(body[key]);
          if (!Number.isFinite(n) || n < 0 || n > 100000) {
            return res.status(400).json({ error: "סכום לא תקין" });
          }
          cols[col] = String(n);
        }
        if (!Object.keys(cols).length) {
          return res.status(400).json({ error: "לא נשלח מה לעדכן" });
        }
        await setCols(B.dayTypes, typeId, cols);
        invalidateBudget();
        return res.status(200).json({ ok: true, typeId, name: hit.name });
      }

      /* ---------- מצבת הסועדים ----------
         ⚠ ברירת המחדל היא קדימה בלבד: חניך שעזב בינואר אינו
           מוזיל את ספטמבר, שכבר נאכל ושולם. מי שרוצה לתקן את
           כל השנה — למשל כי המספר הוזן שגוי מלכתחילה — בוחר
           "retro" במפורש, וזה מוחק את ההיסטוריה. */
      if (body.headcount !== undefined) {
        const n = Number(body.headcount);
        if (!Number.isFinite(n) || n < 1 || n > 500) {
          return res.status(400).json({ error: "מספר סועדים לא הגיוני" });
        }
        const mode = String(body.mode || "forward");
        if (!["forward", "retro"].includes(mode)) {
          return res.status(400).json({ error: "אופן עדכון לא מוכר" });
        }

        const rows = await loadHeadcount({ force: true });

        if (mode === "retro") {
          /* מספר אחד לכל השנה — שאר השורות מיותרות */
          const keep = rows[0];
          for (const r of rows.slice(1)) {
            await gql(`mutation{ delete_item(item_id:${Number(r.id)}){ id } }`);
          }
          if (keep) {
            await setCols(B.settings, keep.id, {
              [C.settings.value]: String(n), [C.settings.from]: {},
            });
          } else {
            await createItem(B.settings, SETTING_HEADCOUNT, { [C.settings.value]: String(n) });
          }
          invalidateBudget();
          return res.status(200).json({ ok: true, headcount: n, mode });
        }

        const from = String(body.from || "").trim() || israelToday();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
          return res.status(400).json({ error: "תאריך לא תקין" });
        }
        /* שינוי חוזר לאותו תאריך מעדכן ולא מוסיף שורה */
        const same = rows.find((r) => r.from === from);
        if (same) await setCols(B.settings, same.id, { [C.settings.value]: String(n) });
        else {
          await createItem(B.settings, SETTING_HEADCOUNT, {
            [C.settings.value]: String(n), [C.settings.from]: { date: from },
          });
        }
        invalidateBudget();
        return res.status(200).json({ ok: true, headcount: n, mode, from });
      }

      /* כפיית סוג או מחיר ליום */
      const date = String(body?.date || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "תאריך לא תקין" });

      const types = await loadDayTypes();
      if (body.type !== undefined && body.type !== null && !types.some((t) => t.name === body.type)) {
        return res.status(400).json({ error: "סוג יום לא מוכר" });
      }
      let cost = null;
      if (body.cost !== undefined && String(body.cost).trim() !== "") {
        cost = Number(body.cost);
        if (!Number.isFinite(cost) || cost < 0) return res.status(400).json({ error: "מחיר לא תקין" });
      }

      const overrides = await loadOverrides({ force: true });
      const hit = overrides.find((o) => o.date === date);

      /* ריקון מלא = חזרה לגזירה מהלו״ז, כלומר מחיקת החריגה */
      const empty = (body.type === null || body.type === undefined || body.type === "")
        && cost === null && !String(body.note || "").trim();
      if (empty) {
        if (hit) { await gql(`mutation{ delete_item(item_id:${Number(hit.id)}){ id } }`); }
        invalidateBudget();
        return res.status(200).json({ ok: true, date, cleared: true });
      }

      const cols = {
        [C.days.date]: { date },
        ...(body.type ? { [C.days.type]: { label: String(body.type) } } : {}),
        [C.days.cost]: cost === null ? "" : String(cost),
        [C.days.note]: String(body.note || "").slice(0, 200),
      };
      if (hit) await setCols(B.days, hit.id, cols);
      else await createItem(B.days, date, cols);
      invalidateBudget();
      return res.status(200).json({ ok: true, date });
    }

    if (req.method === "POST") {
      const name = String(body?.name || "").trim().slice(0, 200);
      const amount = Number(body?.amount);
      const kind = String(body?.kind || ORDER_KIND.quarterly);
      if (!name) return res.status(400).json({ error: "לא הוזן שם הקנייה" });
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "סכום לא תקין" });
      if (!ORDER_KINDS.includes(kind)) return res.status(400).json({ error: "סוג קנייה לא מוכר" });

      const cols = {
        [C.orders.amount]: String(amount),
        [C.orders.kind]: { label: kind },
        [C.orders.note]: String(body.note || "").slice(0, 200),
      };

      if (kind === ORDER_KIND.weekly) {
        /* ⚠ שבועית נזקפת כולה לחודש שבו נעשתה — התאריך הוא
           מה שקובע, ולכן הוא חובה. */
        const date = String(body?.date || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "תאריך הקנייה לא תקין" });
        cols[C.orders.date] = { date };
        cols[C.orders.startMonth] = date.slice(0, 7);
      } else {
        const startMonth = String(body?.startMonth || "").trim();
        if (!/^\d{4}-\d{2}$/.test(startMonth)) return res.status(400).json({ error: "חודש פתיחה לא תקין" });
        cols[C.orders.startMonth] = startMonth;
        if (body.date) cols[C.orders.date] = { date: String(body.date) };
      }

      await createItem(B.orders, name, cols);
      invalidateBudget();
      return res.status(200).json({
        ok: true, kind,
        months: monthsOf({ kind, startMonth: cols[C.orders.startMonth], date: body.date }),
      });
    }

    if (req.method === "DELETE") {
      const orderId = String(body?.orderId || "").trim();
      if (!orderId) return res.status(400).json({ error: "לא צוינה הזמנה" });
      await gql(`mutation{ delete_item(item_id:${Number(orderId)}){ id } }`);
      invalidateBudget();
      return res.status(200).json({ ok: true, orderId });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[kitchen-budget]", e);
    res.status(502).json({ error: "פעולת התקציב נכשלה" });
  }
}

const setCols = (board, id, v) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
  { b: board, i: String(id), v: JSON.stringify(v) });

const createItem = (board, name, v) => gql(
  `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
  { b: board, n: name, v: JSON.stringify(v) });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { kitchen: true });
