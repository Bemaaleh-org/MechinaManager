/* ============================================================
   /api/kitchen?action=budget — תקציב המטבח
     GET    ?month=YYYY-MM   חודש אחד: ימים, סכומים והזמנות
     PUT    { date, type?, type2?, cost?, flat?, note? }  כפיית סוג ליום
     POST   { name, amount, kind, startMonth|date, note? }  קנייה
     DELETE { orderId }                     מחיקת קנייה
     PUT    { headcount, mode, from? }       מצבת הסועדים
     PUT    { typeId, catering?, fixedHeads?, purchases? }  תקציב סוג יום

   ⚠ מנהל בלבד. עלויות אינן נתון של תורן (עיקרון 4).

   ⚠ סוג היום נגזר מהגאנט ומלוח השנה, ורק חריגה נשמרת בלוח.
     ראו ההסבר ב-shared/budget-boards.js.
   ============================================================ */

import { mayEdit } from "../shared/edit-rights.js";
import { withAuth } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { loadCalendar, israelToday } from "./_attendance-data.js";
import { loadGantt } from "./_lessons-gantt.js";
import {
  BUDGET_BOARDS as B, BUDGET_COLS as C, budgetReady,
  DEFAULT_HEADCOUNT, SETTING_HEADCOUNT,
  SETTING_DINING_RATE, SETTING_DINING_BUDGET, SETTING_DINING_MOVED, DEFAULT_DINING_RATE,
  diningHeadsReady, DAY_COMMUNITY,
  dayCost, perPersonOf, sortTypes, orderShareFor, monthsOf,
  headcountAt, ORDER_KIND, ORDER_KINDS,
} from "../shared/budget-boards.js";
import {
  eventsByDate, prevDay, dow, isFriday, isSaturday, HOME_RE, SERIES_RE,
} from "../shared/gantt-days.js";

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
        dining: num(i, C.dayTypes.dining) || 0,
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
        type2: val(i, C.days.type2) || null,
        cost: num(i, C.days.cost),
        flat: num(i, C.days.flat),
        /* ⚠ ריק = לא נספר (null), ולא אפס. ראו shared/budget-boards.js. */
        diningHeads: C.days.diningHeads ? num(i, C.days.diningHeads) : null,
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
        /* ⚠ רשימה מפורשת של חודשים; ריק נופל לשלושה רצופים
           מחודש הפתיחה. ראו orderMonths ב-shared/budget-boards.js. */
        months: val(i, C.orders.months) || "",
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

/**
 * שורת הגדרה יחידה לפי שם, כמספר.
 * ⚠ מחזירה `null` כשהשורה אינה קיימת או ריקה — ולא ברירת מחדל
 *   שקטה. מי שקורא מחליט מה לעשות עם "לא הוגדר" (4ט).
 */
/* ============================================================
   ⚠⚠ **שורת הגדרה כפולה — הראשונה מנצחת, וזה מדווח.**

   נמצאו בלוח **שתי** שורות "מספר סועדים" (37 ו-33), ו-`find`
   לוקח את הראשונה. מי שיערוך את השנייה ב-monday לא יראה שום
   שינוי במסך, ולא תהיה שום שגיאה — בדיוק סוג התקלה שאין לה
   סימן (4ט).

   ⚠ **ההתנהגות לא שונתה בכוונה**: הראשונה ממשיכה לנצח. שינוי
     של מי מנצח היה מזיז מספרי כסף של חודשים שכבר חושבו, בלי
     שאיש ביקש. מה שנוסף הוא **דיווח** — ללוג, וב-`warnings`
     לתשובה, כדי שהמסך יוכל לומר "יש שתי שורות בשם הזה".
   ============================================================ */
const settingDupes = new Set();

async function loadSettingNum(name, { force = false } = {}) {
  const items = await cached("budget-settings-raw", () => allItems(B.settings), { force });
  const all = items.filter((i) => String(i.name || "").trim() === name);
  if (all.length > 1 && !settingDupes.has(name)) {
    settingDupes.add(name);
    console.warn(`[budget] ${all.length} שורות בשם "${name}" בלוח ההגדרות — הראשונה נקראת`);
  }
  const hit = all[0];
  if (!hit) return null;
  const n = num(hit, C.settings.value);
  return Number.isFinite(n) ? n : null;
}

/** שמות הגדרות שיש להן יותר משורה אחת בלוח. ⚠ נאסף בקריאה. */
export async function duplicateSettings({ force = false } = {}) {
  const items = await cached("budget-settings-raw", () => allItems(B.settings), { force });
  const seen = new Map();
  for (const i of items) {
    const nm = String(i.name || "").trim();
    if (nm) seen.set(nm, (seen.get(nm) || 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([nm, n]) => ({ name: nm, count: n }));
}

/** ⚠ תקציב החד״א **לחודש** — שורה בלוח ההגדרות לכל חודש שנקבע לו
    תקציב ידני. חודש בלי שורה מקבל את התקציב הנגזר (13.9.2026). */
const diningBudgetKey = (month) => `${SETTING_DINING_BUDGET} ${month}`;
/* ⚠ שורה לחודש — ראו shared/budget-boards.js. */
const diningMovedKey = (month) => `${SETTING_DINING_MOVED} ${month}`;

const invalidateBudget = () => {
  invalidate("budget-daytypes"); invalidate("budget-days");
  invalidate("budget-orders"); invalidate("budget-settings");
  invalidate("budget-settings-raw");
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

/* ⚠ הכללים עברו ל-shared/gantt-days.js. תקציב המטבח ולוח
   השיעורים שואלים את אותה שאלה — "מה יש בגאנט ביום הזה" —
   ושני עותקים של הכללים כבר גרמו לכך שהשיעורים לא ידעו על
   חגים שהתקציב כן ידע עליהם. */
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

/** סוג היום כפי שהוא יהיה: החריגה אם יש, אחרת הנגזר מהלו״ז */
async function typeOn(date, ov) {
  const [calendar, gantt] = await Promise.all([loadCalendar(), loadGantt()]);
  return {
    type: (ov && ov.type) || derivedType(date, calendar.byDate, eventsByDate(gantt)),
    type2: (ov && ov.type2) || null,
  };
}

/* ⚠ ספירת סועדים בחד״א — **רק ביום עשייה קהילתית** (בקשת אחים,
   13.9.2026). סוג ראשי או נוסף — יום שגרה שהייתה בו גם עשייה
   קהילתית נספר. */
const isCommunity = (type, type2) => type === T.community || type2 === T.community;

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
function buildMonth(month, { types, overrides, calendar, gantt, heads, diningRate }) {
  const byName = new Map(types.map((t) => [t.name, t]));
  const byDate = calendar.byDate;
  const evByDate = eventsByDate(gantt);
  const ovByDate = new Map(overrides.map((o) => [o.date, o]));

  const days = datesOfMonth(month).map((date) => {
    const ov = ovByDate.get(date) || null;
    const typeName = (ov && ov.type) || derivedType(date, byDate, evByDate);
    const type = byName.get(typeName) || null;
    const over = ov && ov.cost != null ? ov.cost : null;
    /* ⚠ הסוג הנוסף הוא חריגה בלבד — הוא לא נגזר מהגאנט. */
    const extra = ov && ov.type2 ? byName.get(ov.type2) || null : null;
    /* ⚠ המצבה נלקחת לפי היום עצמו ולא לפי היום: שינוי במצבה
       אינו רטרואקטיבי, ולכן ספטמבר ממשיך להיות מחושב במצבה
       שהייתה בספטמבר. */
    const head = headcountAt(heads, date);
    /* ⚠ **מספר שנספר גובר על התעריף** — כולל 0, שפירושו "אף
       אחד לא אכל". `null` פירושו "לא נספר" ומשאיר את התעריף. */
    const dHeads = ov && Number.isFinite(ov.diningHeads) ? ov.diningHeads : null;
    const dOver = dHeads == null ? null : dHeads * diningRate;
    const cost = dayCost(type, head, over, extra,
      ov && ov.flat != null ? ov.flat : null, dOver);
    /* ⚠ התעריף **בלי** הספירה — ממנו נגזר תקציב החד״א של החודש:
       750 ₪ לכל יום עשייה קהילתית, כפי שהוגדר בסוגי הימים. */
    const plain = dayCost(type, head, over, extra,
      ov && ov.flat != null ? ov.flat : null, null);
    return {
      date,
      diningHeads: dHeads,
      community: isCommunity(typeName, ov ? ov.type2 : null),
      diningTariff: plain.dining,
      kind: (byDate.get(date) || {}).kind || null,
      type: typeName,
      type2: ov ? ov.type2 : null,
      headcount: head,
      perPerson: over != null ? over : perPersonOf(type),
      catering: cost.catering,
      dining: cost.dining,
      purchases: cost.purchases,
      total: cost.total,
      /* ⚠ שורה שכל מה שיש בה הוא ספירת חד״א אינה "יום שנכפה" —
         הסוג שלו עדיין נגזר מהלו״ז (13.9.2026). */
      overridden: Boolean(ov && (ov.type || ov.type2 || ov.cost != null
        || ov.flat != null || ov.note)),
      note: ov ? ov.note : null,
      events: (evByDate.get(date) || []).map((e) => e.name),
    };
  });

  return {
    days,
    catering: days.reduce((a, d) => a + d.catering, 0),
    dining: days.reduce((a, d) => a + d.dining, 0),
    /* ⚠ סכום הראשים שנספרו, ו**כמה ימים בכלל נספרו** — מספר
       בלי לדעת מכמה ימים הוא נראה כמו התמונה המלאה (4יח). */
    diningHeads: days.reduce((a, d) => a + (d.diningHeads || 0), 0),
    diningDays: days.filter((d) => d.diningHeads != null).length,
    /* ⚠⚠ **מה נוצל = מה שנספר בלבד** (סועדים × מחיר). יום שלא
       נספר אינו "נוצל" — הוא עדיין ממתין לספירה. אחרת 5 סועדים
       היו נראים כמו 750 ₪ שנוצלו. */
    diningUsed: days.reduce((a, d) => a + (d.diningHeads != null ? d.diningHeads * diningRate : 0), 0),
    diningPlan: days.reduce((a, d) => a + (d.diningTariff || 0), 0),
    communityDays: days.filter((d) => d.community).length,
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
      const [types, overrides, orders, settings, calendar, gantt,
        rateSet] = await Promise.all([
        loadDayTypes(), loadOverrides(), loadOrders(), loadHeadcount(),
        loadCalendar(), loadGantt(),
        loadSettingNum(SETTING_DINING_RATE),
      ]);
      /* ⚠ המחיר לראש מהלוח; הקבוע בקוד הוא נפילה לאחור לשורה
         שטרם נוצרה, ולא מקור אמת (עיקרון 1). */
      const diningRate = rateSet != null && rateSet > 0 ? rateSet : DEFAULT_DINING_RATE;

      const months = [...new Set(calendar.days.map((d) => d.date.slice(0, 7)))].sort();

      /* ---------- סיכום שנתי ----------
         חודש-חודש, ובסוף הסך הכול. אותו חישוב בדיוק כמו במסך
         החודשי — נקרא מאותה פונקציה ולא משוכפל. */
      if (String(req.query?.view || "") === "year") {
        const rows = months.map((m) => {
          const b = buildMonth(m, { types, overrides, calendar, gantt, heads: settings, diningRate });
          const spent = orders.reduce((a, o) => a + orderShareFor(o, m), 0);
          return {
            month: m, days: b.days.length,
            catering: b.catering, dining: b.dining, purchases: b.purchases, total: b.foodTotal,
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
          dining: sum("dining"),
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

      const b = buildMonth(month, { types, overrides, calendar, gantt, heads: settings, diningRate });
      /* ⚠⚠ **תקציב החד״א נגזר, וניתן לשינוי לחודש אחד** (13.9.2026):
         ברירת המחדל היא התעריף של ימי העשייה הקהילתית בחודש — שני
         ימים הם 1,500 ₪, ארבעה הם 3,000. שורה בלוח ההגדרות לחודש
         מסוים גוברת עליו, ורק עליו. */
      const monthSet = await loadSettingNum(diningBudgetKey(month));
      const diningBudget = monthSet != null ? monthSet : b.diningPlan;

      /* ============================================================
         ⚠⚠ **היתרה עוברת רק כשאין עוד מה לחכות לו.**

         שני תנאים נפרדים, ושניהם נחוצים:
           · כל ימי העשייה הקהילתית בחודש **עברו**
           · וכולם **נספרו**

         ⚠ יום שעבר ולא נספר אינו "לא נוצל" — הוא **לא
           ידוע** (4ט), והעברת היתרה שלו היא העברת כסף
           שכבר הוצא. זה בדיוק המצב שאי אפשר לשחזר
           בסוף השנה.

         ⚠ והסיבה מוחזרת במילים: כפתור מושבת בלי הסבר
           שולח לנחש (4כב).
         ============================================================ */
      /* ⚠ שעון ישראל ולא שעון השרת — Vercel רצה ב-UTC,
         והגבול "היום עבר" היה זז במוצאי שבת. */
      const todayIso = israelToday();
      const moved = await loadSettingNum(diningMovedKey(month));
      const diningMoved = moved || 0;
      const pastCommunity = b.days.filter((d) => d.community && d.date < todayIso);
      const uncounted = pastCommunity.filter((d) => d.diningHeads == null).length;
      const future = b.days.filter((d) => d.community && d.date >= todayIso).length;
      const surplus = Math.max(0, Math.round((diningBudget - b.diningUsed - diningMoved) * 100) / 100);
      let diningMoveReason = null;
      if (!b.communityDays) diningMoveReason = "אין ימי עשייה קהילתית בחודש הזה";
      else if (future) diningMoveReason = `נותרו ${future} ימי עשייה קהילתית שטרם הגיעו`;
      else if (uncounted) diningMoveReason = `${uncounted} ימי עשייה קהילתית עברו וטרם נספרו`;
      else if (!surplus) diningMoveReason = "לא נותרה יתרה להעביר";
      const diningMovable = diningMoveReason ? 0 : surplus;

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
          || (byType[d.type] = { type: d.type, days: 0, catering: 0, dining: 0, purchases: 0, total: 0 });
        e.days++; e.catering += d.catering; e.dining += d.dining;
        e.purchases += d.purchases; e.total += d.total;
      }

      return res.status(200).json({
        month, months, days: b.days, types: sortTypes(types),
        /* ⚠ **היום האמיתי בשעון ישראל**, ולא היום הראשון של החודש
           המוצג. טופס "קנייה חדשה" נפל ל-`days[0].date`, כלומר
           פתיחתו באמצע ספטמבר הציעה 1.9 — תאריך סביר לגמרי,
           ולכן טעות שנשמרת בלי שאיש שם לב. `?date=` נשמר. */
        today: israelToday(),
        /* המצבה שתקפה בסוף החודש — היא שמוצגת ככותרת */
        headcount: headcountAt(settings, b.days[b.days.length - 1].date),
        headcounts: settings,
        catering: b.catering,
        dining: b.dining,
        /* ============================================================
           ⚠ **החד״א כשלושה מספרים ולא אחד**: מה נוצל, כמה נספרו,
             וכמה נשאר. `diningBudget === null` פירושו שלא הוגדר
             תקציב — והמסך אומר זאת במילים ולא מציג 0, שנראה כמו
             נתון (עיקרון 6).
           ⚠ ו-`diningDays` הוא כמה ימים בכלל נספרו: "1,240 ₪"
             לבדו נקרא כחשבון החודש כשהוא חשבון של שלושה ימים
             מתוך שלושים (4יח).
           ⚠ **וההגדרה עצמה נדרשת פעם אחת**: בלי עמודת
             "אכלו בחד״א" בלוח אין מה לספור, ו-`diningReady`
             אומר למסך להציע להריץ ולא להציג שדה מת.
           ============================================================ */
        diningRate,
        diningHeads: b.diningHeads,
        diningDays: b.diningDays,
        diningUsed: b.diningUsed,
        diningPlan: b.diningPlan,
        diningBudgetSet: monthSet,
        communityDays: b.communityDays,
        diningBudget,
        /* ⚠ מה הקורא רשאי בדף החד״א — מהשרת ולא נגזר במסך (4יד):
           ספירה — ראש המכינה ואחראי המטבח; תקציב ומחיר — ראש המכינה. */
        canEditDining: mayEdit(session, "kitchen"),
        canSetDining: Boolean(session.isHead),
        /* ⚠ **התעריף ליום עשייה קהילתית, ומי רשאי לשנותו.**
           הוא יושב על סוג היום בלוח (עיקרון 1) והוא כבר ניתן
           לעריכה דרך `PUT { typeId, dining }` — מה שחסר היה
           רק לומר למסך מה הערך ומי רשאי, כדי שהכפתור לא
           יופיע למי שיקבל 403 אחרי הלחיצה (4יד). */
        diningDayRate: (types.find((t) => t.name === DAY_COMMUNITY) || {}).dining ?? null,
        diningDayTypeId: (types.find((t) => t.name === DAY_COMMUNITY) || {}).id || null,
        /* ⚠⚠ **`mayEdit(kitchen)` ולא `isHead`** — כי זה מה
           שהשרת באמת אוכף על `PUT { typeId, dining }`: השער
           הוא `edit:"kitchen"` של הנתב, ו-`isHead` שמור שם
           לשינוי **שם** סוג היום בלבד.

           ⚠ דגל מחמיר מהשרת אינו "בטוח יותר" — הוא מסתיר
             כפתור ממי שכן רשאי, ואז אחראי המטבח מדווח שהמסך
             שבור בזמן שהשרת היה מקבל את הבקשה. זה 4יד מהכיוון
             ההפוך, ואותה מלכודת של שתי הגדרות לאותו כלל (4מד). */
        canSetDayRate: mayEdit(session, "kitchen"),
        /* ⚠ שורת הגדרה כפולה נאמרת ואינה נבלעת — ראו
           loadSettingNum. מי שערך את השורה השנייה ולא ראה
           שינוי צריך לדעת למה. */
        settingDupes: await duplicateSettings().catch(() => []),
        diningLeft: diningBudget - b.diningUsed,
        /* ============================================================
           ⚠⚠ **העברת היתרה לתקציב הקניות — מוצעת, ולא
           קורית מעצמה.** השרת מחשב מתי זה אפשרי ומה
           הסכום, והאדם מכריע — אותו דפוס של המלצת
           התורניות (4צ). ראו shared/budget-boards.js.

           ⚠ `canMoveDining` אומר אם **מותר לו**, ו-`diningMovable`
             אם **יש מה להעביר**. שני דברים שונים, ודגל
             אחד לשניהם היה מסתיר את הסכום ממי שאינו רשאי
             להעביר — והוא צריך לדעת שיש כאן משהו.
           ============================================================ */
        diningMoved,
        diningMovable,
        diningMoveReason,
        canMoveDining: Boolean(session.isHead),
        diningReady: diningHeadsReady(),
        /* ============================================================
           ⚠⚠ **תקציב הקניות כולל את מה שהועבר מהחד״א.**
           אחרת ההעברה הייתה רשומה בלוח ולא משנה אף
           מספר על המסך — כלומר כפתור שמדווח הצלחה ולא
           עושה דבר, וזה גרוע מכפתור שנכשל (עיקרון 6).

           ⚠ ו-`purchasesBase` נשלח לצידו כדי שהמסך יוכל
             לומר **מאיפה המספר** — סכום שגדל בלי הסבר
             נראה כמו טעות (4לג: מספר בלי מקור).
           ============================================================ */
        purchasesBase: b.purchases,
        purchases: b.purchases + diningMoved,
        total: b.foodTotal,
        spent,
        left: b.purchases + diningMoved - spent,
        /* ============================================================
           ⚠⚠ **"כמה מהחודש כבר נסגר" — ולא "ניצול מתוך הסך הכול".**

           הבקשה הייתה "מתוך התקציב 25 אלף כמה נשאר החודש,
           16,000/25,000". ⚠ אבל 4ו קובע במפורש שהניצול נמדד
           מול **הקניות** ולא מול הסך הכול, והנימוק נכון:
           הקייטרינג הוא חוזה — הוא אינו "מנוצל", הוא פשוט
           עולה, ואחוז שמודד אותו כאילו הוא ניתן לחיסכון
           מייפה את התמונה בדיוק ברגע שמסתכלים עליה כדי
           להחליט.

           הפתרון הוא שני מספרים מפורשים ולא אחוז אחד:

             `committed` — קייטרינג + חד״א שנאכל + קניות שכבר
               בוצעו. זה מה שכבר סגור, ואין עליו שיקול דעת.
             `left`      — מה שנשאר **בתקציב הקניות**, וזה
               היחיד שיש מולו החלטה.

           ⚠ ולכן המסך אומר "נסגר" ו"לשיקול דעת" ולא "נוצל"
             ו"נותר": שתי מילים שונות לשני דברים שונים, כדי
             שלא ייקראו כמו אותו מספר (4יח).
           ============================================================ */
        committed: b.catering + b.dining + spent,
        byType: Object.values(byType).sort((a, b2) => b2.total - a.total),
        orders: orders.map((o) => ({ ...o, months: monthsOf(o), share: orderShareFor(o, month) })),
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "PUT") {
      /* ============================================================
         ⚠⚠ תקציב החד״א החודשי — נקבע מהמסך (12.9.2026)
         ------------------------------------------------------------
         השורה "תקציב חד״א חודשי" קיימת בלוח ההגדרות וריקה — בכוונה:
         איש לא מסר מספר, ומספר מומצא היה נראה כמו נתון (5ל). מה
         שחסר היה **דרך להזין אותו** בלי לפתוח את monday (עיקרון 1).

         ⚠ **ראש המכינה בלבד** — זה סכום כסף שקובע את "הנשאר" של
           החודש, כמו מחיר סוג יום (5כה).
         ⚠ **ריק מנקה ואינו אפס** — 0 הוא "אין תקציב לחד״א", וריק
           הוא "טרם נקבע". שלושה מצבים (4ט).
         ⚠ **מעדכן את השורה הקיימת לפי השם** ויוצר אותה רק אם אינה —
           שתי שורות באותו שם היו נותנות לקורא לבחור אחת בשקט.
         ============================================================ */
      /* ============================================================
         ⚠⚠ **העברת יתרת החד״א לתקציב הקניות.**

         ⚠ **ראש המכינה בלבד** — זו העברה בין סעיפי תקציב,
           והיא באותה רמה של קביעת התקציב עצמו.

         ⚠⚠ **הסכום נגזר בשרת ואינו מתקבל מהמסך.** מסך
           ששולח סכום הוא מסך שיכול לשלוח כל סכום, והתנאי
           היה הופך להצעה. המסך מבקש "להעביר", והשרת
           מחשב כמה — אותו כלל של מחיר הבקשה (4ר) ושל
           התקרה בחיוב ימי החופש (5כד).

         ⚠ **וההעברה מצטברת ואינה דורסת**: אם נספר עוד יום
           אחרי העברה ראשונה, ההעברה הבאה מעבירה את
           ההפרש בלבד — `surplus` מחסר את מה שכבר הועבר.

         ⚠ **והתשובה מחזירה את ההצהרה כטקסט**, כפי שהתבקשה
           — והמסך אינו מנסח אותה מחדש (4מד).
         ============================================================ */
      if (body.diningMove !== undefined) {
        if (!session.isHead) {
          return res.status(403).json({ error: "העברת יתרת החד״א נעשית על ידי ראש המכינה" });
        }
        const month = String(body.month || "").trim();
        if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "לא צוין חודש" });

        /* ⚠ **נבנה מחדש באותה `buildMonth` של ה-GET**, ולא
           בחישוב שני — שתי הגדרות ל"כמה נותר" היו
           מתפצלות בתיקון הראשון, והמסך היה מציג סכום
           אחד והשרת מעביר אחר (4מד). */
        const [types2, ov2, heads2, cal2, gantt2, rate2] = await Promise.all([
          loadDayTypes({ force: true }), loadOverrides({ force: true }), loadHeadcount(),
          loadCalendar(), loadGantt(), loadSettingNum(SETTING_DINING_RATE, { force: true }),
        ]);
        const bb = buildMonth(month, {
          types: types2, overrides: ov2, calendar: cal2, gantt: gantt2, heads: heads2,
          diningRate: rate2 != null && rate2 > 0 ? rate2 : DEFAULT_DINING_RATE,
        });
        const set2 = await loadSettingNum(diningBudgetKey(month));
        const budget2 = set2 != null ? set2 : bb.diningPlan;
        const already = (await loadSettingNum(diningMovedKey(month))) || 0;
        const todayIso2 = israelToday();
        const future2 = bb.days.filter((d) => d.community && d.date >= todayIso2).length;
        const uncounted2 = bb.days
          .filter((d) => d.community && d.date < todayIso2 && d.diningHeads == null).length;
        const amount = Math.round((budget2 - bb.diningUsed - already) * 100) / 100;

        /* ⚠ ההודעה אומרת **למה** ולא "לא ניתן" (4כב). */
        if (!bb.communityDays) return res.status(400).json({ error: "אין ימי עשייה קהילתית בחודש הזה" });
        if (future2) {
          return res.status(400).json({
            error: `נותרו ${future2} ימי עשייה קהילתית שטרם הגיעו — היתרה עודיין עשויה להידרש` });
        }
        if (uncounted2) {
          return res.status(400).json({
            error: `${uncounted2} ימי עשייה קהילתית עברו וטרם נספרו — יש לספור אותם קודם` });
        }
        if (amount <= 0) return res.status(400).json({ error: "לא נותרה יתרה להעביר" });

        const key = diningMovedKey(month);
        const items = await allItems(B.settings);
        const hit = items.find((i) => String(i.name || "").trim() === key);
        const total = Math.round((already + amount) * 100) / 100;
        if (hit) await setCols(B.settings, hit.id, { [C.settings.value]: String(total) });
        else await createItem(B.settings, key, { [C.settings.value]: String(total) });
        invalidateBudget();

        const nis = (n) => n.toLocaleString("he-IL", { maximumFractionDigits: 2 });
        return res.status(200).json({
          ok: true, month, moved: amount, totalMoved: total,
          /* ⚠ הנוסח שראש המכינה ביקש, מהשרת ולא מהמסך. */
          note: `הוספתי ${nis(amount)} שקלים לתקציב הקניות, וירד מתקציב החד״א`,
        });
      }

      if (body.diningBudget !== undefined) {
        if (!session.isHead) {
          return res.status(403).json({ error: "תקציב החד״א החודשי נקבע על ידי ראש המכינה" });
        }
        const raw = String(body.diningBudget ?? "").trim();
        let n = null;
        if (raw !== "") {
          n = Number(raw);
          if (!Number.isFinite(n) || n < 0 || n > 1000000) {
            return res.status(400).json({ error: "סכום לא תקין — מספר בין 0 ל-1,000,000" });
          }
        }
        /* ⚠ **לחודש אחד** (13.9.2026) — התקציב נגזר מימי העשייה
           הקהילתית, וזה שינוי נקודתי כשצריך. ריק מוחק את השורה
           והחודש חוזר לתקציב הנגזר. */
        const month = String(body.month || "").trim();
        if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "לא צוין חודש" });
        const key = diningBudgetKey(month);
        const items = await allItems(B.settings);
        const hit = items.find((i) => String(i.name || "").trim() === key);
        if (n == null) {
          if (hit) await gql(`mutation{ delete_item(item_id:${Number(hit.id)}){ id } }`);
        } else if (hit) {
          await setCols(B.settings, hit.id, { [C.settings.value]: String(n) });
        } else {
          await createItem(B.settings, key, { [C.settings.value]: String(n) });
        }
        invalidateBudget();
        return res.status(200).json({ ok: true, month, diningBudget: n });
      }

      /* ============================================================
         מחיר חד״א לסועד — ראש המכינה (13.9.2026)
         ------------------------------------------------------------
         השורה "מחיר חד״א לסועד" (45) כבר בלוח ההגדרות; עכשיו היא
         נקבעת מדף החד״א ולא מ-monday (עיקרון 1). ⚠ ראש המכינה
         בלבד — היא מכפילה כל יום שנספר בחודש.
         ============================================================ */
      if (body.diningRate !== undefined) {
        if (!session.isHead) {
          return res.status(403).json({ error: "מחיר החד״א לסועד נקבע על ידי ראש המכינה" });
        }
        const n = Number(String(body.diningRate ?? "").trim());
        if (!Number.isFinite(n) || n <= 0 || n > 1000) {
          return res.status(400).json({ error: "מחיר לסועד — מספר בין 1 ל-1,000" });
        }
        const items = await allItems(B.settings);
        const hit = items.find((i) => String(i.name || "").trim() === SETTING_DINING_RATE);
        const cols = { [C.settings.value]: String(n) };
        if (hit) await setCols(B.settings, hit.id, cols);
        else await createItem(B.settings, SETTING_DINING_RATE, cols);
        invalidateBudget();
        return res.status(200).json({ ok: true, diningRate: n });
      }

      /* ============================================================
         ⚠⚠ כמה אכלו בחד״א ביום אחד — **השדה הזה בלבד**
         ------------------------------------------------------------
         דף החד״א שומר ספירה ליום בלי לגעת בשום דבר אחר. עדכון
         היום הרגיל (למטה) כותב את כל העמודות — כולל סוג נוסף,
         מחיר, סכום והערה — ולכן שליחה של ספירה לבדה דרכו הייתה
         **מוחקת** את מה שהוגדר ליום. מסלול נפרד, ולא דגל שם.

         · אין שורה ליום → נוצרת שורה עם התאריך והספירה בלבד;
           שורה בלי סוג נופלת לסוג שנגזר מהלו״ז, כמו תמיד.
         · ריק מנקה את הספירה; ואם זה כל מה שהיה בשורה — השורה
           נמחקת, כדי שהיום יחזור להיות "לא נכפה".
         · ⚠ ההרשאה: `edit:"kitchen"` של הנתב — ראש המכינה ואחראי
           המטבח — כמו עריכת יום.
         ============================================================ */
      if (body.diningDate !== undefined) {
        const date = String(body.diningDate || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "תאריך לא תקין" });
        if (!diningHeadsReady()) {
          return res.status(503).json({
            error: 'עמודת "אכלו בחד״א" טרם הוקמה. הריצו: npm run seed:dining',
            setupRequired: true,
          });
        }
        const raw = String(body.heads ?? "").trim();
        let h = null;
        if (raw !== "") {
          h = Number(raw);
          if (!Number.isInteger(h) || h < 0 || h > 2000) {
            return res.status(400).json({ error: "מספר הסועדים בחד״א הוא מספר שלם, או ריק" });
          }
        }
        const overrides = await loadOverrides({ force: true });
        const hit = overrides.find((o) => o.date === date);
        const onlyHeads = hit && !hit.type && !hit.type2 && hit.cost == null
          && hit.flat == null && !hit.note;
        /* ⚠ רק ביום עשייה קהילתית. ניקוי מותר תמיד — ספירה ישנה
           ביום אחר צריכה דרך לרדת. */
        if (h !== null) {
          const t = await typeOn(date, hit);
          if (!isCommunity(t.type, t.type2)) {
            return res.status(400).json({
              error: `ספירת סועדים נרשמת רק בימי עשייה קהילתית — ${date.slice(8, 10)}/${date.slice(5, 7)} הוא יום ${t.type}`,
            });
          }
        }
        if (h === null) {
          if (hit && onlyHeads) await gql(`mutation{ delete_item(item_id:${Number(hit.id)}){ id } }`);
          else if (hit) await setColsOpen(B.days, hit.id, { [C.days.diningHeads]: "" });
        } else if (hit) {
          await setColsOpen(B.days, hit.id, { [C.days.diningHeads]: String(h) });
        } else {
          await createItemOpen(B.days, date, { [C.days.date]: { date }, [C.days.diningHeads]: String(h) });
        }
        invalidateBudget();
        return res.status(200).json({ ok: true, date, diningHeads: h });
      }

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
        /* ⚠ חד"א ניתן לעריכה כמו כל תעריף אחר */
        for (const [key, col] of [
          ["catering", C.dayTypes.catering],
          ["fixedHeads", C.dayTypes.fixedHeads],
          ["purchases", C.dayTypes.purchases],
          ["dining", C.dayTypes.dining],
        ]) {
          if (body[key] === undefined) continue;
          const n = Number(body[key]);
          if (!Number.isFinite(n) || n < 0 || n > 100000) {
            return res.status(400).json({ error: "סכום לא תקין" });
          }
          cols[col] = String(n);
        }
        /* ============================================================
           ⚠⚠ **שינוי שם — ראש המכינה בלבד, ומדווח מה נשאר מאחור.**

           השם הוא מה שנכתב בעמודת הסטטוס של לוח הימים, ולכן
           ימים שכבר סומנו בשם הישן **ממשיכים לשאת אותו** —
           monday אינה מעדכנת תוויות למפרע. ההודעה אומרת כמה
           ימים אלה, כי שינוי שקט היה מפצל את התקציב לשני סוגים
           שנראים כמו אחד.
           ============================================================ */
        let renamed = null;
        if (body.name !== undefined) {
          if (!session.isHead) {
            return res.status(403).json({ error: "שינוי שם סוג יום מותר לראש המכינה בלבד" });
          }
          const nm = String(body.name).trim().slice(0, 120);
          if (!nm) return res.status(400).json({ error: "שם ריק" });
          if (types.some((t) => t.name === nm && t.id !== typeId)) {
            return res.status(400).json({ error: `"${nm}" כבר קיים ברשימת סוגי היום` });
          }
          if (nm !== hit.name) {
            await renameItem(B.dayTypes, typeId, nm);
            const days = await loadOverrides();
            renamed = {
              from: hit.name, to: nm,
              /* ⚠ גם `type` וגם `type2` — ליום יכולים להיות שני
                 סוגים, והשני נשכח בקלות (4ה). */
              days: days.filter((d) => d.type === hit.name || d.type2 === hit.name).length,
            };
          }
        }

        if (!Object.keys(cols).length && !renamed) {
          return res.status(400).json({ error: "לא נשלח מה לעדכן" });
        }
        if (Object.keys(cols).length) await setCols(B.dayTypes, typeId, cols);
        invalidateBudget();
        return res.status(200).json({
          ok: true, typeId, name: renamed ? renamed.to : hit.name, renamed,
        });
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
      const known = (v) => v === undefined || v === null || v === "" || types.some((t) => t.name === v);
      if (!known(body.type)) return res.status(400).json({ error: "סוג יום לא מוכר" });
      if (!known(body.type2)) return res.status(400).json({ error: "הסוג הנוסף אינו מוכר" });
      /* ⚠ אותו סוג פעמיים הוא הכפלה שקטה של אותו יום. */
      if (body.type && body.type2 && body.type === body.type2) {
        return res.status(400).json({ error: "הסוג הנוסף זהה לסוג היום" });
      }
      let cost = null;
      if (body.cost !== undefined && String(body.cost).trim() !== "") {
        cost = Number(body.cost);
        if (!Number.isFinite(cost) || cost < 0) return res.status(400).json({ error: "מחיר לא תקין" });
      }
      /* ⚠ flat הוא סכום היום, לא סכום לאדם, והוא מתווסף ואינו
         דורס. cost דורס. שניהם יכולים לחיות יחד: "כל אדם 20 ₪
         ועוד 300 ₪ להסעה". */
      let flat = null;
      if (body.flat !== undefined && String(body.flat).trim() !== "") {
        flat = Number(body.flat);
        if (!Number.isFinite(flat) || flat < 0) {
          return res.status(400).json({ error: "סכום מדויק לא תקין" });
        }
      }

      /* ⚠ **כמה אכלו בחד״א.** מחרוזת ריקה = "לא נספר" ומנקה את
         השדה; 0 הוא ערך אמיתי ומאפס את היום. שלושה מצבים (4ט). */
      let dHeads = null;
      let dTouched = false;
      if (body.diningHeads !== undefined) {
        dTouched = true;
        if (String(body.diningHeads).trim() !== "") {
          dHeads = Number(body.diningHeads);
          if (!Number.isFinite(dHeads) || dHeads < 0 || dHeads !== Math.floor(dHeads)) {
            return res.status(400).json({ error: "מספר הסועדים בחד״א הוא מספר שלם, או ריק" });
          }
        }
        if (!diningHeadsReady()) {
          return res.status(503).json({
            error: 'עמודת "אכלו בחד״א" טרם הוקמה. הריצו: npm run setup:boards  (או רק: npm run seed:dining)',
            setupRequired: true,
          });
        }
      }

      const overrides = await loadOverrides({ force: true });
      const hit = overrides.find((o) => o.date === date);

      /* ⚠ ספירת חד״א רק ביום עשייה קהילתית — לפי הסוג שיהיה ליום
         **אחרי** השמירה: סוג שלא נשלח נשאר כפי שהוא בשורה. */
      if (dTouched && dHeads !== null) {
        const t = await typeOn(date, hit);
        const type = body.type ? String(body.type) : t.type;
        const type2 = body.type2 ? String(body.type2) : null;
        if (!isCommunity(type, type2)) {
          return res.status(400).json({
            error: "ספירת סועדים בחד״א נרשמת רק ביום עשייה קהילתית — נקו את השדה, או בחרו את הסוג הזה ליום",
          });
        }
      }

      /* ריקון מלא = חזרה לגזירה מהלו״ז, כלומר מחיקת החריגה */
      const empty = (body.type === null || body.type === undefined || body.type === "")
        && (body.type2 === null || body.type2 === undefined || body.type2 === "")
        && cost === null && flat === null && !String(body.note || "").trim()
        /* ⚠ יום שכל מה שיש בו הוא ספירת חד״א אינו "ריק" — מחיקת
           השורה הייתה מוחקת את המספר שמישהו ספר. ⚠ וכשהספירה לא
           נשלחה כלל, מה שקובע הוא מה שכבר בשורה — שמירה שאינה
           נוגעת בחד״א לא תמחק ספירה קיימת (13.9.2026). */
        && (dTouched ? dHeads === null : !(hit && Number.isFinite(hit.diningHeads)));
      if (empty) {
        if (hit) { await gql(`mutation{ delete_item(item_id:${Number(hit.id)}){ id } }`); }
        invalidateBudget();
        return res.status(200).json({ ok: true, date, cleared: true });
      }

      const cols = {
        [C.days.date]: { date },
        ...(body.type ? { [C.days.type]: { label: String(body.type) } } : {}),
        /* ריק מנקה את הסוג הנוסף ומשאיר את הראשי */
        /* ⚠ **`null` ולא `{label:""}`** — ראו 5ז: מחרוזת ריקה
           כותבת index 5 ומדביקה ליום את התווית שיושבת שם,
           כלומר סוג יום שני שאיש לא בחר, ועלות שנוספת. */
        [C.days.type2]: body.type2 ? { label: String(body.type2) } : null,
        [C.days.cost]: cost === null ? "" : String(cost),
        [C.days.flat]: flat === null ? "" : String(flat),
        [C.days.note]: String(body.note || "").slice(0, 200),
        ...(dTouched && C.days.diningHeads
          ? { [C.days.diningHeads]: dHeads === null ? "" : String(dHeads) }
          : {}),
      };
      if (hit) await setColsOpen(B.days, hit.id, cols);
      else await createItemOpen(B.days, date, cols);
      invalidateBudget();
      return res.status(200).json({ ok: true, date });
    }

    /* ============================================================
       ⚠⚠ סוג יום חדש — ראש המכינה, מהמסך
       ------------------------------------------------------------
       "בישול לשבת", "יום סיור", "אירוח" — כל אלה הם סוגי יום
       שלא היו כשהלוח נבנה, וכל אחד מהם דרש עד היום לפתוח את
       monday ולהוסיף שורה ביד. זה עיקרון 1: מה שאפשר להגדיר
       בלוח מוגדר בלוח, ומה שמנהל המכינה צריך לשנות — הוא
       משנה בעצמו, בלי דיפלוי.

       ⚠ **ראש המכינה בלבד**, ולא כל מי ש-`edit:"kitchen"` פותח
         לו. סוג יום משנה את חישוב הכסף של **כל השנה**, וזו
         החלטה תקציבית ולא תפעול יומיומי.

       ⚠ **שם כפול נחסם.** שני סוגים באותו שם הם שני תעריפים
         שונים שנראים אותו דבר בבורר, ואי אפשר לדעת איזה מהם
         נבחר על יום מסוים.

       ⚠ **התווית בעמודת הסטטוס נוצרת בשימוש הראשון** ולא כאן —
         `createItemOpen`/`setColsOpen` הם החריג המתועד עם
         `create_labels_if_missing:true`, והערך נבדק מול לוח
         סוגי היום לפני הכתיבה. אין כאן סכנת זבל.
       ============================================================ */
    if (req.method === "POST" && body?.dayType !== undefined) {
      if (!session.isHead) {
        return res.status(403).json({ error: "הוספת סוג יום מותרת לראש המכינה בלבד" });
      }
      const name = String(body?.name || "").trim().slice(0, 120);
      if (!name) return res.status(400).json({ error: "לא הוזן שם סוג היום" });

      const types = await loadDayTypes();
      if (types.some((t) => t.name === name)) {
        return res.status(400).json({ error: `"${name}" כבר קיים ברשימת סוגי היום` });
      }

      const cols = {};
      for (const [key, col] of [
        ["catering", C.dayTypes.catering],
        ["fixedHeads", C.dayTypes.fixedHeads],
        ["purchases", C.dayTypes.purchases],
        ["dining", C.dayTypes.dining],
      ]) {
        const n = Number(body[key] ?? 0);
        if (!Number.isFinite(n) || n < 0 || n > 100000) {
          return res.status(400).json({ error: "סכום לא תקין" });
        }
        cols[col] = String(n);
      }
      const id = await createItem(B.dayTypes, name, cols);
      invalidateBudget();
      return res.status(200).json({ ok: true, typeId: String(id), name });
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
        /* ============================================================
           ⚠ **החודשים נבחרים במפורש ואינם נגזרים מחודש פתיחה.**

           עד עכשיו כל קנייה רבעונית נפרשה על שלושה חודשים
           **רצופים** מחודש הפתיחה. זו הנחה שאינה תמיד נכונה —
           קנייה יכולה לכסות ספטמבר ונובמבר ולדלג על חודש שאין
           בו פעילות, והחלוקה השווה לשלושה רצופים זקפה סכום
           לחודש שלא נגע בו.

           ⚠ **חודש פתיחה עדיין נשמר**, כי הוא מה שמסדר את
             הרשימה ומה ששורות ישנות נשענות עליו.

           ⚠ **וקנייה חייבת לפחות חודש אחד.** רשימה ריקה הייתה
             נופלת לאחור לשלושה רצופים ומייצרת בשקט חלוקה
             שהמשתמש לא ביקש.
           ============================================================ */
        const raw = Array.isArray(body?.months) ? body.months : [];
        const months = [...new Set(raw.map((x) => String(x).trim()))]
          .filter((x) => /^\d{4}-(0[1-9]|1[0-2])$/.test(x)).sort();

        if (!months.length) {
          return res.status(400).json({ error: "יש לבחור לפחות חודש אחד שהקנייה מתחלקת עליו" });
        }
        if (months.length > 12) {
          return res.status(400).json({ error: "אי אפשר לפרוס קנייה על יותר מ-12 חודשים" });
        }

        cols[C.orders.months] = months.join(",");
        cols[C.orders.startMonth] = months[0];
        if (body.date) cols[C.orders.date] = { date: String(body.date) };
      }

      await createItem(B.orders, name, cols);
      invalidateBudget();
      return res.status(200).json({
        ok: true, kind,
        months: monthsOf({
          kind,
          startMonth: cols[C.orders.startMonth],
          months: cols[C.orders.months] || "",
          date: body.date,
        }),
      });
    }

    /* ⚠⚠ **מחיקת סוג יום נחסמת כשהוא בשימוש**, ואינה "מוחקת
       ומשאירה". יום שסומן בסוג שנמחק נשאר עם תווית שאין לה
       תעריף — כלומר הוא יוצא מחישוב הכסף בשקט, וזה בדיוק סוג
       הטעות שמתגלה בסוף השנה. ההודעה אומרת כמה ימים (4ק). */
    if (req.method === "DELETE" && body?.typeId !== undefined) {
      if (!session.isHead) {
        return res.status(403).json({ error: "מחיקת סוג יום מותרת לראש המכינה בלבד" });
      }
      const typeId = String(body.typeId || "").trim();
      if (!typeId) return res.status(400).json({ error: "לא צוין סוג יום" });
      const types = await loadDayTypes();
      const hit = types.find((t) => t.id === typeId);
      if (!hit) return res.status(404).json({ error: "סוג היום אינו נמצא" });

      const days = await loadOverrides();
      const used = days.filter((d) => d.type === hit.name || d.type2 === hit.name).length;
      if (used) {
        return res.status(409).json({
          error: `"${hit.name}" מסומן על ${used} ימים. שינוי שם עדיף על מחיקה — יום שיישאר בלי תעריף ייצא מחישוב התקציב בשקט.`,
          days: used,
        });
      }
      await gql(`mutation{ delete_item(item_id:${Number(typeId)}){ id } }`);
      invalidateBudget();
      return res.status(200).json({ ok: true, typeId, name: hit.name });
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
    /* ⚠ "פעולת התקציב נכשלה" לא אמר למשתמש כלום, והוא ניסה
       שוב ושוב. תקלת תווית היא המקרה השכיח, ויש לה שם. */
    if (/missingLabel|status label doesn't exist/i.test(String(e && e.message))) {
      return res.status(502).json({
        error: "סוג היום לא נשמר — עמודת הסוג בלוח אינה מכירה את השם הזה",
      });
    }
    res.status(502).json({ error: "פעולת התקציב נכשלה" });
  }
}

const setCols = (board, id, v) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
  { b: board, i: String(id), v: JSON.stringify(v) });

const renameItem = (board, id, name) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
  { b: board, i: String(id), v: JSON.stringify({ name }) });

const createItem = (board, name, v) => gql(
  `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
  { b: board, n: name, v: JSON.stringify(v) });

/* ------------------------------------------------------------
   ⚠ שני הכותבים האלה — ורק הם — מרשים יצירת תווית חדשה.

   העיקרון במערכת הוא create_labels_if_missing:false, כדי
   שתווית חסרה תיפול ברעש במקום שייווצרו כפילויות בשקט. הוא
   נכון כשהתוויות הן נתון של הקוד.

   כאן הן נתון של המכינה: סוגי היום חיים בלוח "סוגי יום",
   והמכינה מוסיפה שם סוג חדש בלי דיפלוי. עמודת הסטטוס בלוח
   הימים היא רשימה שנייה של אותם שמות, ואין שום דבר שמסנכרן
   ביניהן — כך נוצר המצב שבו העמודה נשארה עם Working on it /
   Done / Stuck, וכל ניסיון לכפות סוג יום נכשל ב-502.

   ⚠ אין כאן סכנת זבל: הערך נבדק מול לוח סוגי היום לפני
     הכתיבה (ראו "סוג יום לא מוכר"), ולכן היחיד שיכול להיווצר
     הוא שם של סוג שקיים באמת.
   ------------------------------------------------------------ */
const setColsOpen = (board, id, v) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:true){ id } }`,
  { b: board, i: String(id), v: JSON.stringify(v) });

const createItemOpen = (board, name, v) => gql(
  `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:true){ id } }`,
  { b: board, n: name, v: JSON.stringify(v) });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { kitchen: true, edit: "kitchen" });
