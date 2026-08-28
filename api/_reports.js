/* ============================================================
   חוברות מעוצבות ל-Google Sheets
   ------------------------------------------------------------
   שלוש חוברות, כל אחת עומדת בפני עצמה:

     lessons     דאשבורד + גיליון לכל נושא
     gantt       לוח השנה השנתי
     attendance  נוכחות החניכים

   ⚠ **הגאנט והשיעורים אינם קשורים זה לזה.** הם שתי חוברות
     נפרדות שאינן מצטלבות בשום נקודה — לא בנתונים, לא בנוסחאות
     ולא בהצגה. היה כאן קשר, הוא היה שגוי, והוא הוסר.

   ⚠ **המבנה הועתק מהחוברת שהמכינה בנתה ביד**, עד רמת הצבע
     והרוחב. המטרה אינה "יפה" אלא **מוכר** — מי שפותח את הקובץ
     צריך למצוא את מה שהוא כבר יודע איפה נמצא.

   ⚠ **הדאשבורד מחשב ואינו מעתיק.** כל תא בו הוא `COUNTIF`
     שמצביע על גיליון הנושא, בדיוק כמו במקור. מספר מועתק היה
     מתיישן ברגע שמישהו עורך שורה ביד, והחוברת כולה נועדה
     להיות ערוכה ביד.
   ============================================================ */

import { sheetBuilder, emit, S, C, zebra, ref, colLetter } from "./_sheet-format.js";
import { loadSheets, loadMeetings } from "./_lessons-data.js";
import { loadGantt } from "./_lessons-gantt.js";
import { activeStudents } from "./_student-rows.js";
import { loadCalendar, loadAbsences, loadMarked, summarize, isSchoolDay } from "./_attendance-data.js";

const he = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

/* ⚠ שם גיליון ב-Google מוגבל ל-100 תווים ואינו יכול להכיל
   : \ / ? * [ ] — שם נושא שיכיל אותם היה מפיל את כל הבקשה. */
const tabName = (raw, used) => {
  let base = String(raw || "גיליון").replace(/[:\\/?*[\]]/g, "-").slice(0, 90).trim() || "גיליון";
  let name = base, n = 2;
  while (used.has(name)) { name = `${base} (${n++})`; }
  used.add(name);
  return name;
};

/* ============================================================
   1 · השיעורים
   ============================================================ */
export async function lessonsWorkbook() {
  const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
  const live = sheets.filter((s) => s.active);
  const bySheet = new Map(live.map((s) => [s.id, []]));
  for (const m of meetings) {
    const arr = bySheet.get(m.sheetId);
    if (arr) arr.push(m);
  }

  const used = new Set(["דאשבורד"]);
  const subjects = live.map((s) => ({
    ...s,
    tab: tabName(s.subject, used),
    rows: (bySheet.get(s.id) || []).sort((a, b) => a.date.localeCompare(b.date)),
  }));

  const out = [];

  /* ---------- גיליון לכל נושא ---------- */
  subjects.forEach((sub, i) => {
    const b = sheetBuilder(sub.tab, i + 1);
    const HEAD = ["תאריך", "יום", "יתקיים?", "סיבת ביטול", "הערות", "התקיים בפועל?", "הערות נוכחות"];
    [110, 80, 95, 220, 170, 130, 200].forEach((px, c) => b.width(c, px));

    b.merge(0, 0, 0, 6).height(0, 37)
      .set(0, 0, sub.lecturer ? `${sub.subject} — ${sub.lecturer}` : sub.subject, S.band);

    /* ⚠ שורת הסיכום היא נוסחה ולא מספר, כדי שתמשיך להיות
       נכונה אחרי עריכה ידנית בגיליון. */
    const last = 4 + Math.max(sub.rows.length, 1);
    b.merge(1, 0, 1, 6).height(1, 29).set(1, 0,
      `="סה״כ: "&COUNTA(C5:C${last}&"")&"   ·   יתקיימו: "&COUNTIF(C5:C${last},"כן")`
      + `&"   ·   בוטלו: "&COUNTIF(C5:C${last},"לא")`
      + `&"   ·   דווח שהתקיים: "&COUNTIF(F5:F${last},"כן")`, S.lead);

    b.height(2, 10);   /* רווח, כמו במקור */

    /* ⚠ ארבע העמודות הראשונות כחולות (תכנון), השתיים
       האחרונות כתומות (בפועל) — ההבחנה מהחוברת המקורית. */
    b.row(3, HEAD, (c) => (c >= 5 ? S.thDone : S.th)).height(3, 28).freeze(4);

    sub.rows.forEach((m, r) => {
      const row = 4 + r;
      const odd = r % 2 === 1;
      b.set(row, 0, he(m.date), zebra({ ...S.cell, textFormat: { bold: true }, horizontalAlignment: "CENTER" }, odd));
      b.set(row, 1, m.day || "", zebra(S.cellNum, odd));
      b.set(row, 2, m.planned || "כן", zebra(S.cellBold, odd));
      b.set(row, 3, m.reason || "", zebra(S.reason, odd));
      b.set(row, 4, m.note || "", zebra(S.cell, odd));
      b.set(row, 5, m.happened || "", zebra(S.cellBold, odd));
      b.set(row, 6, m.opinion ? "יש חוות דעת" : "", zebra(S.cell, odd));
    });

    if (sub.rows.length) {
      const endRow = 3 + sub.rows.length;
      b.dropdown(4, 2, endRow, 2, ["כן", "לא"]);
      b.dropdown(4, 5, endRow, 5, ["כן", "לא"]);
      /* ⚠ עיצוב מותנה ולא צבע קבוע: מי שישנה "לא" ל"כן"
         בגיליון יראה את הצבע מתעדכן מיד. */
      b.whenEquals(4, 2, endRow, 2, "כן", C.goodBg);
      b.whenEquals(4, 2, endRow, 2, "לא", C.badBg);
      b.whenEquals(4, 5, endRow, 5, "כן", C.goodBg);
      b.whenEquals(4, 5, endRow, 5, "לא", C.badBg);
    }
    out.push(b);
  });

  /* ---------- הדאשבורד ---------- */
  const d = sheetBuilder("דאשבורד", 0);
  /* ⚠ שמונה עמודות ולא שבע. ארבעת כרטיסי המספר תופסים שתיים
     כל אחד, ולכן טבלה של שבע הייתה מותירה עמודה יתומה מימין
     לכרטיסים — פגם שנראה בדיוק כמו טעות. */
  [230, 150, 130, 85, 85, 85, 120, 90].forEach((px, c) => d.width(c, px));

  d.merge(0, 0, 0, 7).height(0, 46)
    .set(0, 0, "דאשבורד ניהולי — שיעורי המכינה", S.title);

  /* ⚠ הנוסחאות סוכמות את גיליונות הנושא ואינן מכילות מספר
     אחד משלהן. עריכה בגיליון נושא משנה את הדאשבורד מיד. */
  const sumOver = (col, cond) => {
    if (!subjects.length) return "=0";
    const parts = subjects.map((s) => {
      const rows = Math.max(s.rows.length, 1);
      const rng = `${ref(s.tab)}!${col}5:${col}${4 + rows}`;
      return cond ? `COUNTIF(${rng},"${cond}")` : `COUNTA(${rng})`;
    });
    return "=" + parts.join("+");
  };

  const kpis = [
    ["סה״כ מפגשים", sumOver("C", null), C.blue],
    ["יתקיימו", sumOver("C", "כן"), C.green],
    ["בוטלו", sumOver("C", "לא"), C.red],
    ["דווח שהתקיים", sumOver("F", "כן"), C.green],
  ];
  kpis.forEach(([label, formula, color], i) => {
    const c = i * 2;
    d.merge(2, c, 2, c + 1).set(2, c, label, S.kpiLabel(color));
    d.merge(3, c, 3, c + 1).set(3, c, formula, S.kpiValue(color));
  });
  d.height(2, 26).height(3, 46);

  d.merge(5, 0, 5, 7).height(5, 28).set(5, 0, "פילוח לפי שיעור", S.band);

  const TH = ["שיעור", "מרצה", "יום ושעה", "סה״כ", "יתקיימו", "בוטלו", "התקיים בפועל", "טרם דווח"];
  /* ⚠ עמודות התכנון כחולות ועמודות הביצוע כתומות, כמו
     בגיליונות הנושא — אותה הבחנה בשני המקומות. */
  d.row(6, TH, (c) => (c >= 6 ? S.thDone : S.th)).height(6, 26).freeze(7);

  subjects.forEach((s, i) => {
    const r = 7 + i;
    const odd = i % 2 === 1;
    const rows = Math.max(s.rows.length, 1);
    const R = (col) => `${ref(s.tab)}!${col}5:${col}${4 + rows}`;
    d.set(r, 0, s.subject, zebra(S.cell, odd));
    d.set(r, 1, s.lecturer || "—", zebra(S.cell, odd));
    d.set(r, 2, s.dayTime || "—", zebra(S.cell, odd));
    d.set(r, 3, `=COUNTA(${R("C")})`, zebra(S.cellBold, odd));
    d.set(r, 4, `=COUNTIF(${R("C")},"כן")`, { ...S.good });
    d.set(r, 5, `=COUNTIF(${R("C")},"לא")`, { ...S.bad });
    d.set(r, 6, `=COUNTIF(${R("F")},"כן")`, { ...S.good });
    /* ⚠ "טרם דווח" = מתוכננים פחות מה שדווח, לשני הכיוונים.
       זה המספר שאומר כמה עבודה נשארה, והוא לא היה כאן. */
    d.set(r, 7, `=MAX(0,COUNTIF(${R("C")},"כן")-COUNTA(${R("F")}))`, zebra(S.cellBold, odd));
  });

  /* ⚠ שורת מקור ותאריך. קובץ שמסתובב בלי לומר ממתי הוא —
     מישהו יחליט לפיו בעוד חודשיים. */
  const foot = 8 + subjects.length;
  d.merge(foot, 0, foot, 7).set(foot, 0,
    `הופק ממערכת ניהול מכינת ניר עוז · ${subjects.length} שיעורים פעילים`, S.note);

  return { sheets: [d, ...out], stamp: foot };
}

/* ============================================================
   2 · הגאנט
   ------------------------------------------------------------
   ⚠ חוברת עצמאית לחלוטין. אין בה שום הפניה לשיעורים.
   ============================================================ */
export async function ganttWorkbook() {
  const events = await loadGantt();

  const b = sheetBuilder("גאנט שנתי", 0);
  [230, 110, 110, 80, 150].forEach((px, c) => b.width(c, px));

  b.merge(0, 0, 0, 4).height(0, 46).set(0, 0, "גאנט שנתי — מכינת ניר עוז", S.title);
  b.merge(1, 0, 1, 4).height(1, 29).set(1, 0,
    `="סה״כ: "&COUNTA(A4:A${3 + Math.max(events.length, 1)})&" אירועים"`, S.lead);
  b.height(2, 10);

  b.row(3, ["אירוע", "התחלה", "סיום", "ימים", "סוג"], S.th).height(3, 28).freeze(4);

  events.forEach((e, i) => {
    const r = 4 + i;
    const odd = i % 2 === 1;
    b.set(r, 0, e.name, zebra({ ...S.cell, textFormat: { bold: true } }, odd));
    b.set(r, 1, he(e.start), zebra(S.cellNum, odd));
    b.set(r, 2, he(e.end), zebra(S.cellNum, odd));
    /* ⚠ מספר ולא נוסחה: התאריכים נכתבים כטקסט בפורמט ישראלי,
       ו-DATEDIF עליהם היה תלוי בהגדרת האזור של מי שפותח. */
    const days = Math.round(
      (new Date(e.end) - new Date(e.start)) / 86400000) + 1;
    b.set(r, 3, Number.isFinite(days) && days > 0 ? days : 1, zebra(S.cellNum, odd));
    b.set(r, 4, e.type, zebra(S.cellNum, odd));
  });

  /* ⚠ הצבע לפי סוג האירוע, כעיצוב מותנה — כך הוא נשמר גם
     כשמישהו ממיין את הטבלה או מוסיף שורה. */
  if (events.length) {
    const last = 3 + events.length;
    const kinds = [...new Set(events.map((e) => e.type))];
    const tones = [C.bandBg, C.goodBg, C.badBg, "#FFF2CC", "#E2EFDA", "#FCE4D6", "#EDEDED"];
    kinds.forEach((k, i) => b.whenEquals(4, 4, last, 4, k, tones[i % tones.length]));
  }

  const foot = 5 + events.length;
  b.merge(foot, 0, foot, 4).set(foot, 0,
    "הופק ממערכת ניהול מכינת ניר עוז", S.note);

  return { sheets: [b], stamp: foot };
}

/* ============================================================
   3 · נוכחות
   ============================================================ */
export async function attendanceWorkbook() {
  const [students, calendar, absences, marked] = await Promise.all([
    activeStudents(), loadCalendar(), loadAbsences(), loadMarked(),
  ]);
  /* ⚠ `loadCalendar` מחזירה `{ days, byDate }` ולא מערך.
     המפה כבר בנויה שם, ואין סיבה לבנות אותה מחדש. */
  const byDate = calendar.byDate;
  /* ⚠ **שני מספרים שונים, ואסור לבלבל ביניהם.** בלוח השנה יש
     ימי לימוד רבים, אבל `summarize` סופר רק את הימים שבהם
     **סומנה נוכחות בפועל**. גרסה קודמת הציגה בכותרת את הראשון
     ובעמודה את השני — "298 ימי לימוד" מעל עמודה שכתוב בה 1. */
  const inYear = calendar.days.filter(isSchoolDay).length;
  const markedDays = marked.size;

  const b = sheetBuilder("נוכחות", 0);
  [200, 100, 100, 100, 100, 110, 130].forEach((px, c) => b.width(c, px));

  b.merge(0, 0, 0, 6).height(0, 46).set(0, 0, "נוכחות חניכים — סיכום שנתי", S.title);
  b.merge(1, 0, 1, 6).height(1, 29).set(1, 0,
    `="${students.length} חניכים   ·   נוכחות סומנה ב-${markedDays} ימים "`
    + `&"מתוך ${inYear} ימי לימוד בלוח השנה"`, S.lead);
  b.height(2, 10);

  b.row(3, ["חניך", "נכח", "נעדר", "ימים שסומנו", "אחוז נוכחות", "ימי חופש שנותרו", "מחלה"], S.th)
    .height(3, 28).freeze(4);

  const rows = students.map((st) => {
    const s = summarize(st.id, { absences, marked, byDate });
    return { name: st.name, s };
  }).sort((a, b2) => a.name.localeCompare(b2.name, "he"));

  rows.forEach((x, i) => {
    const r = 4 + i;
    const odd = i % 2 === 1;
    const q = (x.s.quota || []).reduce((a, k) => a + k.left, 0);
    b.set(r, 0, x.name, zebra({ ...S.cell, textFormat: { bold: true } }, odd));
    b.set(r, 1, x.s.present, zebra(S.cellNum, odd));
    b.set(r, 2, x.s.absent, zebra(S.cellNum, odd));
    b.set(r, 3, x.s.schoolDays, zebra(S.cellNum, odd));
    /* ⚠ אחוז רק מחמישה ימים ומעלה — אותו סף כמו במסכים
       (עיקרון 4ג). בתחילת שנה "0%" הוא מספר נכון חשבונית
       ושקרי במשמעותו, והוא הדבר הראשון שרואים על החניך.
       ⚠ ו-IFERROR גם כך: המכנה יכול להיות אפס. */
    b.set(r, 4, `=IF(D${r + 1}<5,"—",IFERROR(B${r + 1}/D${r + 1},"—"))`,
      zebra({ ...S.cellNum, numberFormat: { type: "PERCENT", pattern: "0%" } }, odd));
    b.set(r, 5, q, zebra(S.cellNum, odd));
    b.set(r, 6, x.s.sick ?? 0, zebra(S.cellNum, odd));
  });

  /* ⚠ עיצוב מותנה על האחוז: מתחת ל-85% נצבע. הסף מוצג
     בשורת המקור, כדי שאיש לא ינחש למה שורה אדומה. */
  if (rows.length) {
    const last = 3 + rows.length;
    b.whenFormula(4, 4, last, 4, `=AND($E5<>"",$E5<0.85)`, C.badBg);
  }

  const foot = 5 + rows.length;
  b.merge(foot, 0, foot, 6).set(foot, 0,
    "הופק ממערכת ניהול מכינת ניר עוז · נוכחות מתחת ל-85% מסומנת · "
    + "אחוז מוצג מחמישה ימים מסומנים ומעלה", S.note);

  return { sheets: [b], stamp: foot };
}

export const WORKBOOKS = {
  lessons: { title: "שיעורי המכינה", build: lessonsWorkbook },
  gantt: { title: "גאנט שנתי", build: ganttWorkbook },
  attendance: { title: "נוכחות חניכים", build: attendanceWorkbook },
};

export { emit };
