/* ============================================================
   בניית גיליון מעוצב ב-Google Sheets
   ------------------------------------------------------------
   שכבה דקה מעל `batchUpdate`. ה-API של גוגל מבקש מערך בקשות
   מפורט ומילולי מאוד; כאן בונים **רשת** של תאים ופולטים אותה.

   ⚠ **הפלטה אינה המצאה שלנו.** היא נלקחה מדד לדד מהחוברת
     שהמכינה בנתה ביד — אותו כחול, אותו כתום, אותם ירוק ואדום
     של תאים. המטרה היא שהקובץ שהמערכת מייצרת ייראה כמו המשך
     של מה שכבר קיים, ולא כמו קובץ של תוכנה אחרת.

   ⚠ **כתום מול כחול הוא הבחנה ולא קישוט.** בחוברת המקורית
     עמודות התכנון כחולות ועמודות ה"בפועל" כתומות. זה מה
     שמאפשר לקרוא שורה במבט אחד, וזה נשמר.

   ⚠ **`userEnteredValue` ולא `formattedValue`.** נוסחה נכתבת
     כנוסחה חיה ולא כמחרוזת, וכך הדאשבורד ממשיך להתעדכן גם
     אחרי שמישהו עורך ידנית גיליון נושא.

   ⚠ צד שרת בלבד.
   ============================================================ */

/* ---------- הפלטה, כפי שהיא בחוברת המקורית ---------- */
export const C = {
  blue: "#4472C4",      // כותרות ראשיות ועמודות תכנון
  orange: "#ED7D31",    // עמודות "בפועל"
  green: "#70AD47",     // מספר חיובי בדאשבורד
  red: "#FF0000",       // מספר שלילי בדאשבורד
  bandBg: "#D6E4F0",    // רצועת כותרת רכה
  zebra: "#F2F2F2",     // פס מתחלף
  goodBg: "#C6EFCE",    // תא "כן / התקיים"
  badBg: "#FFC7CE",     // תא "לא / בוטל"
  redText: "#CC0000",   // סיבת ביטול
  white: "#FFFFFF",
  ink: "#1F2937",
  line: "#BFBFBF",
};

const rgb = (hex) => {
  const h = hex.replace("#", "");
  return {
    red: parseInt(h.slice(0, 2), 16) / 255,
    green: parseInt(h.slice(2, 4), 16) / 255,
    blue: parseInt(h.slice(4, 6), 16) / 255,
  };
};

const border = (color = C.line) => ({ style: "SOLID", color: rgb(color) });
const allBorders = (color) => ({
  top: border(color), bottom: border(color), left: border(color), right: border(color),
});

/* ============================================================
   סגנונות מוכנים
   ------------------------------------------------------------
   ⚠ שמות לפי **תפקיד** ולא לפי מראה. `th` ולא "כחול" — ביום
     שבו הפלטה תשתנה, המשמעות תישאר.
   ============================================================ */
export const S = {
  /** כותרת ראשית של חוברת */
  title: {
    backgroundColor: rgb(C.blue),
    textFormat: { bold: true, fontSize: 18, foregroundColor: rgb(C.white) },
    horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
  },
  /** כותרת גיליון נושא — רצועה רכה */
  band: {
    backgroundColor: rgb(C.bandBg),
    textFormat: { bold: true, fontSize: 14 },
    horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
  },
  /** שורת סיכום עם נוסחה */
  lead: {
    textFormat: { bold: true, foregroundColor: rgb(C.blue) },
    horizontalAlignment: "CENTER",
  },
  /** כותרת טבלה — תכנון */
  th: {
    backgroundColor: rgb(C.blue),
    textFormat: { bold: true, fontSize: 12, foregroundColor: rgb(C.white) },
    horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
    borders: allBorders(),
  },
  /** כותרת טבלה — בפועל */
  thDone: {
    backgroundColor: rgb(C.orange),
    textFormat: { bold: true, fontSize: 12, foregroundColor: rgb(C.white) },
    horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
    borders: allBorders(),
  },
  /** תא רגיל */
  cell: { borders: allBorders(), verticalAlignment: "MIDDLE" },
  cellNum: { borders: allBorders(), horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE" },
  cellBold: { borders: allBorders(), textFormat: { bold: true }, horizontalAlignment: "CENTER" },
  /** סיבת ביטול */
  reason: { borders: allBorders(), textFormat: { foregroundColor: rgb(C.redText) } },
  good: { borders: allBorders(), backgroundColor: rgb(C.goodBg), textFormat: { bold: true }, horizontalAlignment: "CENTER" },
  bad: { borders: allBorders(), backgroundColor: rgb(C.badBg), textFormat: { bold: true }, horizontalAlignment: "CENTER" },
  /** כרטיס מספר בדאשבורד */
  kpiLabel: (color) => ({
    backgroundColor: rgb(color),
    textFormat: { bold: true, foregroundColor: rgb(C.white) },
    horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
  }),
  kpiValue: (color) => ({
    textFormat: { bold: true, fontSize: 24, foregroundColor: rgb(color) },
    horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
  }),
  note: { textFormat: { fontSize: 10, italic: true, foregroundColor: rgb("#6B7280") } },
};

/** מוסיף רקע פס מתחלף לסגנון קיים, בלי לשנות אותו */
export const zebra = (style, isOdd) =>
  (isOdd ? { ...style, backgroundColor: rgb(C.zebra) } : style);

/* ============================================================
   בונה הגיליון
   ============================================================ */

/** ערך תא → `userEnteredValue` של גוגל */
function toValue(v) {
  if (v === null || v === undefined || v === "") return {};
  if (typeof v === "number") return { numberValue: v };
  if (typeof v === "boolean") return { boolValue: v };
  const s = String(v);
  /* ⚠ נוסחה נכתבת כנוסחה. מחרוזת שמתחילה ב-= והועברה כטקסט
     הייתה מוצגת כטקסט, והדאשבורד היה מת. */
  return s.startsWith("=") ? { formulaValue: s } : { stringValue: s };
}

/**
 * גיליון אחד בתוך החוברת.
 * ⚠ הרשת דלילה בכוונה: תא שלא נכתב אינו נשלח, ולכן חוברת עם
 *   עשרים גיליונות אינה מייצרת מאה אלף תאים ריקים.
 */
export function sheetBuilder(title, sheetId) {
  const cells = new Map();          // "r,c" → { v, style }
  const merges = [];
  const widths = [];
  const heights = [];
  const rules = [];                 // עיצוב מותנה
  const validations = [];
  let frozenRows = 0;
  let maxR = 0, maxC = 0;

  const put = (r, c, v, style) => {
    cells.set(`${r},${c}`, { v, style });
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  };

  const api = {
    title, sheetId,
    /** תא בודד (שורה ועמודה מאפס) */
    set: (r, c, v, style) => { put(r, c, v, style); return api; },
    /** שורה שלמה מעמודה 0, או מ-from */
    row: (r, values, style, from = 0) => {
      values.forEach((v, i) => {
        const st = typeof style === "function" ? style(i) : style;
        put(r, from + i, v, st);
      });
      return api;
    },
    merge: (r1, c1, r2, c2) => { merges.push({ r1, c1, r2, c2 }); return api; },
    width: (c, px) => { widths.push({ c, px }); return api; },
    height: (r, px) => { heights.push({ r, px }); return api; },
    freeze: (n) => { frozenRows = n; return api; },
    /** תפריט נפתח על טווח */
    dropdown: (r1, c1, r2, c2, options) => {
      validations.push({ r1, c1, r2, c2, options });
      return api;
    },
    /** עיצוב מותנה: תא ששווה לערך מקבל רקע */
    whenEquals: (r1, c1, r2, c2, text, bg) => {
      rules.push({ r1, c1, r2, c2, text, bg });
      return api;
    },
    /**
     * עיצוב מותנה לפי נוסחה.
     * ⚠ הנוסחה נכתבת ביחס ל**תא הראשון בטווח**, וגוגל מזיזה
     *   אותה לשאר התאים. נוסחה שנכתבה ביחס לשורה אחרת תצבע
     *   את השורות הלא נכונות.
     */
    whenFormula: (r1, c1, r2, c2, formula, bg) => {
      rules.push({ r1, c1, r2, c2, formula, bg });
      return api;
    },
    get size() { return { rows: maxR + 1, cols: maxC + 1 }; },
    _cells: cells, _merges: merges, _widths: widths, _heights: heights,
    _rules: rules, _validations: validations,
    get _frozen() { return frozenRows; },
  };
  return api;
}

/* ============================================================
   פליטה ל-batchUpdate
   ------------------------------------------------------------
   ⚠ הסדר קובע. גוגל מבצעת את הבקשות לפי סדרן, ולכן:
     ניקוי → מאפייני גיליון → רוחבים → מיזוגים → תאים →
     עיצוב מותנה. מיזוג אחרי כתיבה היה מוחק את מה שנכתב
     בתאים שנבלעו.
   ============================================================ */
export function emit(sheets) {
  const req = [];

  for (const s of sheets) {
    const id = s.sheetId;
    const { rows, cols } = s.size;

    /* ⚠ ניקוי מלא לפני כתיבה. בלעדיו, הרצה שנייה על גיליון
       שהתקצר משאירה שורות ישנות מתחת לחדשות — והן נראות
       כמו נתונים אמיתיים. */
    req.push({ updateCells: { range: { sheetId: id }, fields: "*" } });

    req.push({
      updateSheetProperties: {
        properties: {
          sheetId: id,
          rightToLeft: true,
          gridProperties: { frozenRowCount: s._frozen },
        },
        fields: "rightToLeft,gridProperties.frozenRowCount",
      },
    });

    for (const { c, px } of s._widths) {
      req.push({
        updateDimensionProperties: {
          range: { sheetId: id, dimension: "COLUMNS", startIndex: c, endIndex: c + 1 },
          properties: { pixelSize: px }, fields: "pixelSize",
        },
      });
    }
    for (const { r, px } of s._heights) {
      req.push({
        updateDimensionProperties: {
          range: { sheetId: id, dimension: "ROWS", startIndex: r, endIndex: r + 1 },
          properties: { pixelSize: px }, fields: "pixelSize",
        },
      });
    }
    for (const m of s._merges) {
      req.push({
        mergeCells: {
          range: { sheetId: id, startRowIndex: m.r1, endRowIndex: m.r2 + 1,
            startColumnIndex: m.c1, endColumnIndex: m.c2 + 1 },
          mergeType: "MERGE_ALL",
        },
      });
    }

    /* ---------- התאים ----------
       ⚠ נשלחים שורה-שורה, ורק שורות שיש בהן משהו. */
    for (let r = 0; r < rows; r++) {
      const values = [];
      let any = false;
      for (let c = 0; c < cols; c++) {
        const cell = s._cells.get(`${r},${c}`);
        if (!cell) { values.push({}); continue; }
        any = true;
        values.push({
          userEnteredValue: toValue(cell.v),
          ...(cell.style ? { userEnteredFormat: cell.style } : {}),
        });
      }
      if (!any) continue;
      req.push({
        updateCells: {
          rows: [{ values }],
          fields: "userEnteredValue,userEnteredFormat",
          start: { sheetId: id, rowIndex: r, columnIndex: 0 },
        },
      });
    }

    for (const v of s._validations) {
      req.push({
        setDataValidation: {
          range: { sheetId: id, startRowIndex: v.r1, endRowIndex: v.r2 + 1,
            startColumnIndex: v.c1, endColumnIndex: v.c2 + 1 },
          rule: {
            condition: { type: "ONE_OF_LIST", values: v.options.map((o) => ({ userEnteredValue: o })) },
            showCustomUi: true, strict: false,
          },
        },
      });
    }
    for (const g of s._rules) {
      const condition = g.formula
        ? { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: g.formula }] }
        : { type: "TEXT_EQ", values: [{ userEnteredValue: g.text }] };
      req.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId: id, startRowIndex: g.r1, endRowIndex: g.r2 + 1,
              startColumnIndex: g.c1, endColumnIndex: g.c2 + 1 }],
            booleanRule: { condition, format: { backgroundColor: rgb(g.bg) } },
          },
          index: 0,
        },
      });
    }
  }
  return req;
}

/** אות עמודה לפי אינדקס — לבניית נוסחאות */
export function colLetter(i) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

/**
 * שם גיליון בתוך נוסחה.
 * ⚠ גרש בשם שובר את הנוסחה, ולכן הוא מוכפל — בדיוק כמו
 *   ב-Excel. שם עם רווח או מקף חייב מרכאות יחידות.
 */
export const ref = (sheetName) => `'${String(sheetName).replace(/'/g, "''")}'`;
