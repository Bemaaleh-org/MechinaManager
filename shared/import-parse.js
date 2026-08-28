/* ============================================================
   פרסור נתוני הקמה — משותף למסך ולשרת
   ------------------------------------------------------------
   ⚠ אותו קוד בשני הצדדים, כדי שהתצוגה המקדימה תהיה **בדיוק**
     מה שייכתב. שתי גרסאות של אותו פרסור היו נפרדות זו מזו
     בתיקון הראשון, והמנהל היה מאשר דבר אחד ומקבל אחר.

   ⚠ הקלט הוא **הדבקה מ-Excel או מוורד**, לא קובץ. זו ההחלטה:
     ראש מכינה מחזיק את הנתונים בגיליון, בוואטסאפ או במסמך,
     וההדבקה עובדת מכולם. העלאת קובץ דורשת ממנו לשמור, למצוא
     ולבחור — שלושה שלבים שבכל אחד אפשר להיתקע.

   ⚠ מפריד: טאב (מ-Excel), פסיק, או שני רווחים ומעלה. שורה
     שאי אפשר לפרסר **אינה נזרקת** — היא חוזרת עם הסיבה, כדי
     שהמנהל יראה בדיוק מה לא נקלט ולמה.
   ============================================================ */

import { CATEGORIES } from "./placements.js";

/** שורה → תאים */
export function cells(line) {
  const raw = String(line || "").replace(/‏|‎/g, "").trim();
  if (!raw) return [];
  if (raw.includes("\t")) return raw.split("\t").map((x) => x.trim());
  if (raw.includes(",")) return raw.split(",").map((x) => x.trim());
  return raw.split(/\s{2,}/).map((x) => x.trim());
}

const rows = (text) => String(text || "").split(/\r?\n/).filter((l) => l.trim());

/* ⚠ שורת כותרות של Excel נזרקת. מי שמעתיק טבלה מעתיק גם אותה,
   ובלי זה "שם" ו"תעודת זהות" היו הופכים לחניך. */
const HEADER = /^(שם|שם מלא|תלמיד|חניך|נושא|מקצוע|אירוע|תאריך|name|subject)$/i;
const isHeader = (c) => c.length > 0 && HEADER.test(c[0]);

/* ============================================================
   תאריכים
   ⚠ הפורמט שאנשים כותבים בו הוא dd/mm — לא mm/dd. שנה דו-ספרתית
     מתפרשת כ-20xx. תאריך שאינו ברור נדחה ולא מנוחש.
   ============================================================ */
export function parseDate(raw, yearHint) {
  const s = String(raw || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  let y = m[3] ? Number(m[3]) : Number(yearHint);
  if (!y) return null;
  if (y < 100) y += 2000;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/* ============================================================
   חניכים —  שם · תעודת זהות · מגדר?
   ============================================================ */
export function parseStudents(text) {
  const out = [], bad = [], seen = new Set();
  for (const [i, line] of rows(text).entries()) {
    const c = cells(line);
    if (!c.length || isHeader(c)) continue;

    /* ⚠ הת"ז מזוהה לפי הצורה ולא לפי המיקום. יש מי שכותב
       "ת.ז, שם" ויש מי שכותב "שם, ת.ז", ושתיהן נכונות. */
    const tzCell = c.find((x) => /^\d[\d\s-]{7,}\d$/.test(x.replace(/\s/g, "")));
    const tz = tzCell ? tzCell.replace(/\D/g, "").padStart(9, "0") : "";
    const name = c.filter((x) => x !== tzCell && /[א-תa-zA-Z]/.test(x))
      .sort((a, b) => b.length - a.length)[0] || "";

    if (!name) { bad.push({ line: i + 1, text: line, why: "לא נמצא שם" }); continue; }
    if (!tz) { bad.push({ line: i + 1, text: line, why: "לא נמצאה תעודת זהות" }); continue; }
    if (tz.length !== 9) { bad.push({ line: i + 1, text: line, why: "תעודת זהות אינה בת 9 ספרות" }); continue; }
    if (seen.has(tz)) { bad.push({ line: i + 1, text: line, why: "תעודת זהות כפולה בהדבקה" }); continue; }
    seen.add(tz);

    /* ⚠ התוויות בלוח הן "זכר" ו"נקבה" — לא "בן"/"בת". תווית
       שאינה קיימת גורמת ל-monday לדחות את **כל השורה**, ולכן
       מה שנכתב כאן חייב להיות זהה בתו למה שבעמודה.
       ראו CLAUDE.md, "התוויות בקוד חייבות להיות זהות בתו". */
    const g = c.find((x) => /^(זכר|נקבה|ז|נ|בן|בת)$/.test(x));
    out.push({
      name, tz,
      gender: g ? (/^(זכר|ז|בן)$/.test(g) ? "זכר" : "נקבה") : null,
    });
  }
  return { rows: out, bad };
}

/* ============================================================
   גאנט —  שם · מתאריך · עד תאריך? · סוג?
   ⚠ "עד" ריק פירושו יום אחד, ולא טווח פתוח.
   ============================================================ */
export const GANTT_TYPES = ["פעילות", "שבת", "חג ומועד"];

export function parseGantt(text, yearHint) {
  const out = [], bad = [];
  for (const [i, line] of rows(text).entries()) {
    const c = cells(line);
    if (!c.length || isHeader(c)) continue;

    const dates = [];
    const rest = [];
    for (const cell of c) {
      const d = parseDate(cell, yearHint);
      if (d && dates.length < 2) dates.push(d); else rest.push(cell);
    }
    const type = rest.find((x) => GANTT_TYPES.includes(x)) || null;
    const name = rest.filter((x) => x !== type && /[א-תa-zA-Z]/.test(x))
      .sort((a, b) => b.length - a.length)[0] || "";

    if (!name) { bad.push({ line: i + 1, text: line, why: "לא נמצא שם לאירוע" }); continue; }
    if (!dates.length) { bad.push({ line: i + 1, text: line, why: "לא נמצא תאריך" }); continue; }
    const [start, end = start] = dates;
    if (end < start) { bad.push({ line: i + 1, text: line, why: "תאריך הסיום לפני ההתחלה" }); continue; }

    out.push({ name, start, end, type: type || "פעילות" });
  }
  return { rows: out, bad };
}

/* ============================================================
   גיליונות מרצים —  נושא · מרצה? · יום ושעה?
   ============================================================ */
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function parseSheets(text) {
  const out = [], bad = [], seen = new Set();
  for (const [i, line] of rows(text).entries()) {
    const c = cells(line);
    if (!c.length || isHeader(c)) continue;

    /* "שני 10:00" — התא שמתחיל בשם יום */
    const dt = c.find((x) => DAYS.some((d) => x.startsWith(d)));
    /* ⚠ "אורח" הוא סימון ולא שם מרצה. בלי ההוצאה הזו הוא
       נכנס לעמודת המרצה, ואז הגיליון אומר שהמרצה קוראים לו
       "אורח". */
    const guestCell = c.find((x) => /^אורח/.test(x));
    const rest = c.filter((x) => x !== dt && x !== guestCell);
    const subject = rest[0] || "";
    if (!subject) { bad.push({ line: i + 1, text: line, why: "לא נמצא נושא" }); continue; }
    if (seen.has(subject)) { bad.push({ line: i + 1, text: line, why: "נושא כפול בהדבקה" }); continue; }
    seen.add(subject);

    out.push({
      subject,
      lecturer: rest[1] || null,
      dayTime: dt || null,
      /* ⚠ "אורח" מסומן במילה בשורה, כי זו הדרך שבה זה נכתב
         בגיליון של המכינה ממילא. */
      guest: Boolean(guestCell),
    });
  }
  return { rows: out, bad };
}

/* ============================================================
   ענפים, ועדות וסדרות —  שם · קטגוריה · מכסה? · מוביל?
   ============================================================ */
/* ⚠ נגזר מ-CATEGORIES ואינו רשימה שנייה. כאן ישבו ארבע
   מחרוזות **בסדר אחר** מזה שב-shared/placements.js, וקטגוריה
   חדשה לא הייתה מתקבלת בייבוא בלי שום שגיאה — השורה פשוט
   הייתה נדחית כ"קטגוריה לא מוכרת". */
export const GROUP_CATEGORIES = CATEGORIES;

export function parseGroups(text) {
  const out = [], bad = [], seen = new Set();
  for (const [i, line] of rows(text).entries()) {
    const c = cells(line);
    if (!c.length || isHeader(c)) continue;

    const cat = c.find((x) => GROUP_CATEGORIES.includes(x));
    const capCell = c.find((x) => /^\d{1,3}$/.test(x));
    const rest = c.filter((x) => x !== cat && x !== capCell);
    const name = rest[0] || "";

    if (!name) { bad.push({ line: i + 1, text: line, why: "לא נמצא שם" }); continue; }
    if (!cat) { bad.push({ line: i + 1, text: line, why: `לא צוינה קטגוריה (${GROUP_CATEGORIES.join(" / ")})` }); continue; }
    const key = `${cat}|${name}`;
    if (seen.has(key)) { bad.push({ line: i + 1, text: line, why: "כפילות בהדבקה" }); continue; }
    seen.add(key);

    out.push({
      name, category: cat,
      cap: capCell ? Number(capCell) : null,
      leader: rest[1] || null,
    });
  }
  return { rows: out, bad };
}

/** כל הפרסרים במקום אחד — המסך והשרת בוחרים לפי שם השלב */
export const PARSERS = {
  students: { fn: parseStudents, title: "חניכים",
    hint: "שם ותעודת זהות בכל שורה. אפשר להדביק ישירות מ-Excel.",
    sample: "ישראל ישראלי\t312345678\nדנה כהן\t323456789" },
  gantt: { fn: parseGantt, title: "אירועי הגאנט",
    hint: "שם האירוע ותאריך. תאריך שני = סוף הטווח. סוג: פעילות / שבת / חג ומועד.",
    sample: "מסע פתיחה\t01/09/2027\t03/09/2027\nשבת ניצבים\t05/09/2027\tשבת" },
  sheets: { fn: parseSheets, title: "גיליונות המרצים",
    hint: "נושא, מרצה, ויום ושעה. המפגשים ייווצרו מהם בהמשך.",
    sample: "ציונות\tאלירן אוחיון\tרביעי 9:00\nמליאה\t\tשני 20:00" },
  groups: { fn: parseGroups, title: "ענפים, ועדות וסדרות",
    hint: "שם, קטגוריה, ומכסה אם יש. קטגוריה: ענף / ועדה / סדרה / קבוצה.",
    sample: "נוי\tענף\t6\nועדת תרבות\tועדה\t8" },
};
