/* ============================================================
   שבועות שחופפים — "שבוע 3-4", ולא 4 ואז 3
   ------------------------------------------------------------
   ⚠⚠⚠ **הבקשה, ומה באמת קרה** (ראש המכינה, 22.9.2026):

     *"שבוע שלישי הוא לא באמת שבוע ואיחדת את שבוע שלוש
      וארבע לשבוע ארבע (ובצדק) — אבל אתה למעשה מדלג על
      שלוש ומבלבל בין התאריכים... יש משהו עם זה ששבוע שלוש
      בא אחרי ארבע והכל פה מעט מוזר."*

   **האפליקציה לא איחדה כלום.** זה מה שיושב בלוח מובילי
   השבוע: לשבוע 4 טווח של שבועיים (22.9–5.10) שבולע את שבוע
   3 (27.9–1.10) כולו. המיון לפי תאריך התחלה מציב לכן את 4
   לפני 3, וזה נראה כמו באג באפליקציה.

   ⚠ **וזה לא המקרה היחיד.** באותו לוח יש עוד שלושה זוגות
     חופפים (6/7, 32/33, 42/43), וברובם החפיפה היא יום־יומיים
     — כנראה טעות הקלדה ולא איחוד מכוון.

   ------------------------------------------------------------
   ⚠⚠ **כלל אחד ולא שניים: שורות שחופפות הן שבוע אחד בתצוגה.**

   לא "הכלה מלאה = איחוד, וחפיפה חלקית = טעות". שתי שורות
   שחולקות יום אינן יכולות **שתיהן** להיות "השבוע" של אותו
   יום — לא לתורנות, לא לסימון נוכחות ולא להרשאה. הצגתן
   כשתיים היא בדיוק מה שהמשתמש תיאר כ"מבלבל בין התאריכים".

   ⚠ **והחפיפה מדווחת ואינה נבלעת** (4ט). `warnings` אומר
     בדיוק אילו שורות חופפות ובכמה ימים, כדי שראש המכינה
     יתקן **בלוח** — ואז התווית חוזרת מעצמה ל"שבוע 6", בלי
     דיפלוי (עיקרון 1).

   ⚠⚠ **ואיננו נוגעים בנתון.** לא ממזגים שורות, לא מוחקים
     ולא כותבים תאריכים — שורה שנמחקת בקוד היא נתון שאי אפשר
     להשיב, וההחלטה מה באמת השבוע היא של ראש המכינה.

   ⚠ **המזהים נשארים כשהיו.** שיבוץ תורנות, שיבוץ מוביל
     והרשאת סימון מצביעים על שורה מסוימת, והאיחוד הוא
     **תווית וטווח להצגה** בלבד. `spanKey` נועד לאיחוד
     ברשימות (dedupe), ולא להחלפת המזהה.
   ============================================================ */

/** האם שני טווחים חולקים ולו יום אחד. */
const overlaps = (a, b) => a.start <= b.end && b.start <= a.end;

/** כמה ימים חופפים. ⚠ ספירה בימים שלמים ולא בשעות. */
function overlapDays(a, b) {
  const from = a.start > b.start ? a.start : b.start;
  const to = a.end < b.end ? a.end : b.end;
  if (from > to) return 0;
  const d = (x) => Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10));
  return Math.round((d(to) - d(from)) / 86400000) + 1;
}

/**
 * התווית של אשכול שבועות.
 *   [4]       → "שבוע 4"
 *   [3,4]     → "שבוע 3-4"
 *   [3,4,5]   → "שבוע 3-5"   (רצף)
 *   [3,7]     → "שבוע 3, 7"  (לא רצף — מונים במפורש)
 *
 * ⚠ **שבוע בלי מספר אינו נעלם מהתווית** — הוא מקבל את שמו
 *   בלוח, ואם גם הוא ריק, את התאריכים. שורה שאין לה שם
 *   בשום מסך היא שורה שאי אפשר לדבר עליה.
 */
export function spanLabel(nums, fallback = "") {
  const list = [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))]
    .sort((a, b) => a - b);
  if (!list.length) return fallback || "שבוע";
  if (list.length === 1) return `שבוע ${list[0]}`;
  const run = list[list.length - 1] - list[0] === list.length - 1;
  return run
    ? `שבוע ${list[0]}-${list[list.length - 1]}`
    : `שבוע ${list.join(", ")}`;
}

/**
 * מקבץ שבועות לפי חפיפת תאריכים.
 *
 * מחזיר `{ spans, byId, warnings }`:
 *   spans    — אשכול לכל קבוצה, ממוין כרונולוגית
 *   byId     — מזהה שבוע → האשכול שלו
 *   warnings — שורות שחופפות, בשמן ובמספר הימים
 *
 * ⚠ הקלט אינו משתנה, והפלט אינו מחזיק הפניה לשורות המקור
 *   פרט ל-`weeks` שבתוך האשכול.
 */
export function weekSpans(weeks) {
  const rows = (weeks || [])
    .filter((w) => w && w.start && w.end)
    .slice()
    /* ⚠ מיון כרונולוגי מלא — התחלה, ואז סוף, ואז מספר.
       בלי הסוף, שתי שורות שמתחילות באותו יום מתחלפות
       בין טעינות. */
    .sort((a, b) => a.start.localeCompare(b.start)
      || a.end.localeCompare(b.end)
      || (a.num || 0) - (b.num || 0));

  const spans = [];
  const warnings = [];
  for (const w of rows) {
    /* ⚠ מול **האשכול כולו** ולא מול השורה האחרונה: שבוע
       ארוך בולע שורה קצרה שמתחילה אחריו, והבאה אחריה עשויה
       לחפוף את הארוך ולא את הקצרה. */
    const cur = spans[spans.length - 1];
    if (cur && overlaps({ start: cur.start, end: cur.end }, w)) {
      for (const prev of cur.weeks) {
        const days = overlapDays(prev, w);
        if (days > 0) {
          warnings.push({
            a: prev.num || prev.name || prev.id,
            b: w.num || w.name || w.id,
            days,
            text: `${labelOne(prev)} (${prev.start}–${prev.end}) ו${labelOne(w)}`
              + ` (${w.start}–${w.end}) חופפים ב-${days === 1 ? "יום אחד" : days + " ימים"}`,
          });
        }
      }
      cur.weeks.push(w);
      if (w.end > cur.end) cur.end = w.end;
      continue;
    }
    spans.push({ start: w.start, end: w.end, weeks: [w] });
  }

  for (const s of spans) {
    s.nums = s.weeks.map((w) => w.num).filter((n) => Number.isFinite(n) && n > 0);
    s.ids = s.weeks.map((w) => String(w.id));
    /* ⚠ מפתח האיחוד הוא **המזהה הראשון באשכול**, והוא יציב
       כל עוד הלוח לא משתנה. הוא נועד ל-dedupe ברשימות ולא
       להחליף את המזהה של השורה (ראו ההערה בראש הקובץ). */
    s.key = s.ids[0];
    s.merged = s.weeks.length > 1;
    s.label = spanLabel(s.nums, s.weeks[0].name);
  }

  const byId = new Map();
  for (const s of spans) for (const id of s.ids) byId.set(id, s);
  return { spans, byId, warnings };
}

const labelOne = (w) => (w.num ? `שבוע ${w.num}` : (w.name || String(w.id)));

/**
 * מטביע על כל שבוע את התווית והטווח של האשכול שלו.
 * ⚠ **שדות נוספים ולא דריסה של `num`/`start`/`end`** — הנתון
 *   של השורה נשאר בדיוק כפי שהוא בלוח, וההרשאות והשיבוצים
 *   ממשיכים להישען עליו.
 */
export function withSpans(weeks) {
  const { byId, warnings } = weekSpans(weeks);
  const out = (weeks || []).map((w) => {
    const s = byId.get(String(w.id));
    if (!s) return { ...w, spanKey: String(w.id), spanLabel: labelOne(w), spanMerged: false };
    return {
      ...w,
      spanKey: s.key,
      spanLabel: s.label,
      spanStart: s.start,
      spanEnd: s.end,
      spanNums: s.nums,
      spanMerged: s.merged,
    };
  });
  /* ⚠ אותו מיון כרונולוגי כמו ב-`weekSpans` — אחרת הרשימה
     שמוצגת אינה הרשימה שקובצה. */
  out.sort((a, b) => String(a.start).localeCompare(String(b.start))
    || String(a.end).localeCompare(String(b.end))
    || (a.num || 0) - (b.num || 0));
  return { weeks: out, warnings };
}

/* ============================================================
   על איזה שבוע נפתח מסך
   ------------------------------------------------------------
   ⚠⚠⚠ הבקשה (ראש המכינה, 22.9.2026): *"השבוע שאני אפתח בכל
     אחד מהתפריטים... יפתח בשבוע/התאריך הנוכחי... שלא נבלה
     המון זמן בדפדוף ומציאת השבוע הנכון."*

   ⚠ **והנפילה לאחור היא "הבא" ולא "הראשון".** בין שבוע לשבוע
     יש פערים בלוח (חופשות, חגים), ובימים האלה "השבוע הנוכחי"
     אינו קיים. נפילה ל-0 מחזירה את המשתמש לספטמבר — וזה
     בדיוק הדפדוף שהבקשה באה למנוע.

   הסדר: בתוך שבוע · השבוע הבא שטרם נגמר · האחרון שהיה.
   ============================================================ */
export function weekIndexFor(weeks, today) {
  const list = weeks || [];
  if (!list.length || !today) return -1;
  const inside = list.findIndex((w) => w.start <= today && today <= w.end);
  if (inside >= 0) return inside;
  const ahead = list.findIndex((w) => w.end >= today);
  if (ahead >= 0) return ahead;
  return list.length - 1;
}

/**
 * כל מזהי השורות שבאותו אשכול עם `weekId`.
 *
 * ⚠⚠ **הקריאה והכתיבה חייבות לראות את אותו היקף.** מסך
 *   התורנויות מציג שיבוצים מכל שורות האשכול (שתי שורות
 *   חופפות הן שבוע אחד), ואם הכתיבה תסתכל על שורה אחת בלבד
 *   ייווצר שיבוץ שמוצג ואי אפשר להסיר — שורה שאין לה מסך
 *   לא תימחק לעולם (4צ).
 *
 * ⚠ נופל למזהה עצמו כשאין לו אשכול, ולכן בטוח גם על לוח
 *   שאין בו שום חפיפה.
 */
export function spanIdsOf(weeks, weekId) {
  const id = String(weekId || "");
  if (!id) return [];
  const hit = (weeks || []).find((w) => String(w.id) === id);
  const key = hit && (hit.spanKey || hit.id);
  if (!key) return [id];
  const ids = (weeks || [])
    .filter((w) => String(w.spanKey || w.id) === String(key))
    .map((w) => String(w.id));
  return ids.length ? ids : [id];
}
