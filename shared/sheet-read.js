/* ============================================================
   קריאת הגיליונות שהמכינה מנהלת ב-Google Sheets
   ------------------------------------------------------------
   ⚠ **המכינה כבר מנהלת את הנתונים האלה בשיטס.** הקבצים האלה
     הם כלי העבודה האמיתי — הם נערכים שם מדי שבוע. התפקיד של
     המערכת הוא **לקרוא מהם**, לא לייצר אותם מחדש.

   ⚠ **הפרסור משותף למסך ולשרת**, כמו `import-parse.js`. שתי
     גרסאות נפרדות היו נבדלות זו מזו בתיקון הראשון, והמנהל היה
     מאשר בתצוגה המקדימה דבר אחד ומקבל אחר.

   ⚠ **הקלט הוא `string[][]`** — בדיוק מה ש-`readRange` מחזיר.
     כך אפשר לבדוק את הפרסרים על קובץ שהומר, בלי לגעת בגוגל.

   ⚠ **שורה שלא נקראה מוחזרת עם הסיבה**, ולעולם לא נזרקת
     בשקט. שורה שנעלמת היא מפגש שלא קיים, ואיש לא יידע.
   ============================================================ */

const txt = (v) => String(v ?? "").trim();
const clean = (v) => txt(v).replace(/\s+/g, " ");

/* ⚠ הגיליונות כותבים תאריך כ-"07/09/2026" או כ-"6/9". גוגל
   מחזירה לפעמים מספר סידורי, ולפעמים ISO. כל הצורות כאן. */
export function readDate(raw, yearHint) {
  const s = txt(raw);
  if (!s) return null;

  /* ISO מלא */
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  /* dd/mm/yyyy או dd.mm.yyyy */
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }

  /* dd/mm בלבד — השנה מגיעה מההקשר.
     ⚠ שנת לימודים חוצה שנה אזרחית: 06/09 היא 2026 ו-28/01 היא
       2027. בלי הכלל הזה חצי מהשנה נופלת לשנה הלא נכונה. */
  m = s.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (m && yearHint) {
    const day = Number(m[1]), mon = Number(m[2]);
    const y = mon >= 8 ? yearHint : yearHint + 1;
    return `${y}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  /* מספר סידורי של אקסל */
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

/* ============================================================
   1 · גיליון נושא (לשונית אחת בחוברת הלו״ז)
   ------------------------------------------------------------
   שורה 1  כותרת "נושא — מרצה"
   שורה 4  כותרות: תאריך · יום · יתקיים? · סיבת ביטול · הערות ·
           התקיים בפועל? · הערות נוכחות
   שורה 5+ הנתונים
   ============================================================ */
const SUBJECT_COLS = [
  ["date", /^תארי/],
  ["day", /^יום/],
  ["planned", /יתקיים\??$/],
  ["reason", /סיב/],
  ["note", /^הער(ות)?$/],
  ["happened", /התקיים\s*בפועל/],
  ["attendNote", /הערות\s*נוכחות/],
];

/**
 * מוצא את שורת הכותרות ואת מיקום כל עמודה.
 * ⚠ **לפי הכותרת ולא לפי מיקום קבוע.** מי שיוסיף עמודה
 *   באמצע הגיליון לא אמור לשבור את הייבוא — וזה הדבר הראשון
 *   שקורה לגיליון חי.
 */
export function findHeader(rows, wanted, limit = 12) {
  for (let r = 0; r < Math.min(rows.length, limit); r++) {
    const cells = (rows[r] || []).map(clean);
    const map = {};
    for (const [key, re] of wanted) {
      const i = cells.findIndex((c) => c && re.test(c));
      if (i >= 0) map[key] = i;
    }
    /* לפחות תאריך ועוד אחת — אחרת זו שורת כותרת מקרית */
    if (map.date !== undefined && Object.keys(map).length >= 2) {
      return { row: r, cols: map };
    }
  }
  return null;
}

/** לשונית נושא → מפגשים */
/* ⚠ שורת הסיכום בתחתית כל לשונית אינה מפגש. היא נראית בדיוק
   כמו שורה שנפלה, וגרסה קודמת דיווחה עליה 19 פעמים — פעם לכל
   נושא — והטביעה בכך דיווח על שורה אמיתית שתיפול. */
const FOOTER_RE = /^(סיכום|סה"?כ|סה״כ|total)$/i;

export function parseSubjectTab(rows, { subject, yearHint } = {}) {
  const out = { subject: subject || null, lecturer: null, dayTime: null, meetings: [], bad: [] };

  /* ============================================================
     הכותרת בשורה 1: "נושא — מרצה — יום ושעה"
     ------------------------------------------------------------
     ⚠ **שלושה חלקים ולא שניים**, ו-"—" לבדו פירושו "אין מרצה":
       "כישורי חיים — — — שני 17:30". גרסה שלקחה את כל מה
       שאחרי המקף הראשון החזירה "חיים וייס — שני 10:00" כשם
       המרצה — שם שאינו קיים.
     ============================================================ */
  const first = clean((rows[0] || [])[0]);
  if (first) {
    const parts = first.split(/\s+[—–]\s+/).map(clean);
    out.subject = out.subject || parts[0];
    const lect = clean(parts[1] || "").replace(/^[—–-]+$/, "");
    out.lecturer = lect || null;
    const rest = parts.slice(2).filter(Boolean).join(" ");
    out.dayTime = rest || null;
  }

  const head = findHeader(rows, SUBJECT_COLS);
  if (!head) {
    out.bad.push({ line: 1, why: "לא נמצאה שורת כותרות עם עמודת תאריך" });
    return out;
  }
  const C = head.cols;
  const at = (row, key) => (C[key] === undefined ? "" : clean(row[C[key]]));

  for (let r = head.row + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    if (!row.some((c) => txt(c))) continue;          /* שורה ריקה */
    const raw = at(row, "date");
    /* ⚠ שורת סיכום או שורה שכולה נוסחאות — לא מפגש ולא שגיאה. */
    if (FOOTER_RE.test(raw)) continue;
    if (!raw && row.some((c) => txt(c).startsWith("="))) continue;

    const date = readDate(raw, yearHint);
    if (!date) {
      /* ⚠ שורה עם תוכן ובלי תאריך מדווחת ואינה נבלעת. */
      if (row.some((c) => txt(c))) {
        out.bad.push({ line: r + 1, why: raw ? `תאריך לא מזוהה: "${raw}"` : "אין תאריך", raw: clean(row.join(" · ")).slice(0, 60) });
      }
      continue;
    }
    const planned = at(row, "planned");
    const happened = at(row, "happened");
    out.meetings.push({
      date,
      day: at(row, "day") || null,
      /* ⚠ ריק נחשב "כן" — זו ברירת המחדל של הגיליון, ואותו
         כלל בדיוק כמו בלוח (עיקרון 4כה). */
      planned: planned === "לא" ? "לא" : "כן",
      reason: at(row, "reason") || null,
      note: at(row, "note") || null,
      /* ⚠ ריק הוא **טרם דווח** ולא "לא התקיים". מצב שלישי. */
      happened: happened === "כן" ? "כן" : happened === "לא" ? "לא" : null,
      attendNote: at(row, "attendNote") || null,
      line: r + 1,
    });
  }
  return out;
}

/* ============================================================
   2 · גיליון הנוכחות
   ------------------------------------------------------------
   שורה "סוג"    סוג היום לכל עמודה (סדרה / טיול / ריק=רגיל)
   שורה "תאריך"  06/09, 07/09, …
   שורה "יום"    א׳ ב׳ ג׳ …
   שורות חניכים  שם בעמודה A, ובכל תא קוד היעדרות או ריק
   ============================================================ */
export const ABSENCE_CODES = ["חופש", "מחלה", "מוצדקת"];

export function parseAttendanceTab(rows, { yearHint } = {}) {
  const out = { days: [], students: [], marks: [], bad: [] };

  const findRow = (re) => rows.findIndex((r) => re.test(clean((r || [])[0])));
  const iKind = findRow(/^סוג$/);
  const iDate = findRow(/^תאריך$/);
  const iDay = findRow(/^יום$/);
  if (iDate < 0) {
    out.bad.push({ line: 1, why: 'לא נמצאה שורת "תאריך"' });
    return out;
  }

  /* ---- העמודות = הימים ---- */
  const dateRow = rows[iDate] || [];
  const kindRow = iKind >= 0 ? rows[iKind] || [] : [];
  const dayRow = iDay >= 0 ? rows[iDay] || [] : [];
  const cols = [];
  for (let c = 1; c < dateRow.length; c++) {
    const date = readDate(dateRow[c], yearHint);
    if (!date) continue;
    cols.push({ c, date });
    out.days.push({
      date,
      /* ⚠ ריק = יום רגיל, לפי המקרא של הגיליון עצמו. */
      kind: clean(kindRow[c]) || "רגיל",
      day: clean(dayRow[c]) || null,
    });
  }
  if (!cols.length) {
    out.bad.push({ line: iDate + 1, why: "שורת התאריך אינה מכילה תאריכים מזוהים" });
    return out;
  }

  /* ---- השורות = החניכים ---- */
  const firstStudent = Math.max(iKind, iDate, iDay) + 1;
  for (let r = firstStudent; r < rows.length; r++) {
    const row = rows[r] || [];
    const name = clean(row[0]);
    if (!name) continue;
    out.students.push({ name, line: r + 1 });
    for (const { c, date } of cols) {
      const v = clean(row[c]);
      if (!v) continue;
      if (!ABSENCE_CODES.includes(v)) {
        /* ⚠ קוד שאינו במקרא מדווח ואינו מיובא. כתיב חופשי
           בתא אחד היה נכנס כסוג היעדרות שאינו קיים בלוח. */
        out.bad.push({ line: r + 1, why: `קוד לא מוכר: "${v}" (${date}, ${name})` });
        continue;
      }
      out.marks.push({ name, date, type: v, line: r + 1 });
    }
  }
  return out;
}

/* ============================================================
   3 · הגאנט — לוח שנה ויזואלי
   ------------------------------------------------------------
   ⚠ **זו אינה טבלה.** כל חודש הוא גוש שורות: שורת שמות ימים,
     שורת מספרי ימים לועזיים, שורת תאריך עברי, ואחריהן שורות
     שבהן כתובים האירועים בתאים.

   ⚠ **אירוע רב-יומי הוא תא ממוזג.** בלי טווחי המיזוג אי אפשר
     לדעת שהאירוע נמשך חמישה ימים — הוא היה נראה כאירוע של
     יום אחד. לכן `merges` הוא קלט חובה ולא רשות.

   ⚠ **שם החודש בעמודה A** הוא מה שקושר את גוש השורות לחודש.
   ============================================================ */
const MONTHS = {
  "ינואר": 1, "פברואר": 2, "מרץ": 3, "אפריל": 4, "מאי": 5, "יוני": 6,
  "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12,
};

/** "AI5:AI10" → {r1,c1,r2,c2} מאפס */
export function parseRange(a1) {
  const m = String(a1).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!m) return null;
  const col = (s) => s.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  return { r1: Number(m[2]) - 1, c1: col(m[1]), r2: Number(m[4]) - 1, c2: col(m[3]) };
}

export function parseGanttGrid(rows, merges, { yearHint } = {}) {
  const out = { events: [], bad: [] };
  /* ⚠ שתי צורות קלט: מחרוזות A1 (מקובץ מומר) ואובייקטים
     (מ-`readGrid`). הפרסר מקבל את שתיהן כדי שהבדיקה על קובץ
     אמיתי תבדוק בדיוק את מה שרץ מול גוגל. */
  const spans = (merges || [])
    .map((m) => (typeof m === "string" ? parseRange(m) : m))
    .filter((m) => m && Number.isFinite(m.r1));

  /* איזה חודש שייך לכל שורה: שם חודש בעמודה A פותח גוש */
  const monthAt = [];
  let cur = null, curYear = yearHint;
  for (let r = 0; r < rows.length; r++) {
    const a = clean((rows[r] || [])[0]);
    if (MONTHS[a]) {
      cur = MONTHS[a];
      /* ⚠ שנת הלימודים חוצה שנה אזרחית. אוגוסט–דצמבר הם
         yearHint, ינואר ואילך הם yearHint+1. */
      curYear = cur >= 8 ? yearHint : yearHint + 1;
    }
    monthAt[r] = cur ? { mon: cur, year: curYear } : null;
  }

  /* בכל גוש: שורת מספרי הימים היא זו שכולה מספרים 1–31 */
  const dayRowFor = [];
  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r] || [];
    const nums = cells.filter((c) => /^\d{1,2}(\.0)?$/.test(txt(c))).length;
    dayRowFor[r] = nums >= 5;
  }

  /* עמודה → יום בחודש, לפי שורת המספרים הקרובה מעל */
  const colDay = [];
  for (let r = 0; r < rows.length; r++) {
    if (dayRowFor[r]) {
      const map = {};
      (rows[r] || []).forEach((c, i) => {
        const n = Number(txt(c));
        if (Number.isFinite(n) && n >= 1 && n <= 31) map[i] = n;
      });
      colDay[r] = map;
    } else {
      colDay[r] = r > 0 ? colDay[r - 1] : {};
    }
  }

  const iso = (y, m, d) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const seen = new Set();
  for (let r = 0; r < rows.length; r++) {
    if (dayRowFor[r]) continue;
    const ctx = monthAt[r];
    if (!ctx) continue;
    const cells = rows[r] || [];
    for (let c = 1; c < cells.length; c++) {
      const name = clean(cells[c]);
      if (!name) continue;
      const day = (colDay[r] || {})[c];
      if (!day) continue;
      /* ⚠ תא עברי (י"ח, כ"ג) אינו אירוע. שורות התאריך העברי
         יושבות מתחת לשורת המספרים ונראות בדיוק כמו אירוע. */
      if (/^[א-ת]["'׳״]?[א-ת]?$/.test(name)) continue;

      /* טווח המיזוג קובע כמה ימים האירוע נמשך */
      const span = spans.find((s) => s.r1 <= r && r <= s.r2 && s.c1 <= c && c <= s.c2);
      let endDay = day;
      if (span && span.c2 > span.c1) {
        const d2 = (colDay[r] || {})[span.c2];
        if (d2 && d2 >= day) endDay = d2;
      }
      if (span && (span.r1 !== r || span.c1 !== c)) continue;   /* רק פינת המיזוג */

      const start = iso(ctx.year, ctx.mon, day);
      const end = iso(ctx.year, ctx.mon, endDay);
      const key = `${name}|${start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.events.push({ name, start, end, line: r + 1 });
    }
  }
  out.events.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name, "he"));
  return out;
}
