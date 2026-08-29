/* ============================================================
   בניית החוברות המעוצבות

   ⚠ הבדיקה בונה מנתונים אמיתיים ו**אינה כותבת לשום מקום** —
     לא ל-monday ולא לגוגל. היא בודקת את מבנה הבקשות.

   ⚠ מה שאינו נבדק כאן: קבלה בפועל מול Google. זה דורש חשבון
     שירות וגיליון משותף, ומוצהר בסוף.
   ============================================================ */
import { writeFileSync } from "node:fs";
import { WORKBOOKS, emit } from "../../api/_reports.js";
import { sheetBuilder, S, C, zebra, ref, colLetter } from "../../api/_sheet-format.js";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };

/* ============ 1 · עזרי הבנייה ============ */
console.log("=== עזרי הבנייה ===");
ok("colLetter", colLetter(0) === "A" && colLetter(25) === "Z" && colLetter(26) === "AA",
  `${colLetter(0)} ${colLetter(25)} ${colLetter(26)}`);
/* ⚠ גרש בשם גיליון שובר נוסחה אם אינו מוכפל. */
ok("גרש בשם גיליון מוכפל", ref("דני'ס") === "'דני''ס'", ref("דני'ס"));
ok("שם רגיל עטוף במרכאות יחידות", ref("מליאה") === "'מליאה'", ref("מליאה"));
/* ⚠ zebra אינו משנה את הסגנון המקורי — הוא נעשה בפריסה. */
const base = { textFormat: { bold: true } };
const z = zebra(base, true);
ok("zebra אינו משנה את המקור", base.backgroundColor === undefined && z.backgroundColor !== undefined);
ok("ושומר על מה שהיה", z.textFormat.bold === true);
ok("ושורה זוגית נשארת כמות שהיא", zebra(base, false) === base);

/* ---- ערכים ---- */
const b = sheetBuilder("בדיקה", 7);
b.set(0, 0, "טקסט", S.cell).set(0, 1, 42, S.cellNum).set(0, 2, "=SUM(A1:B1)", S.cellBold);
b.set(0, 3, "", S.cell).set(0, 4, null, S.cell);
b.merge(0, 0, 0, 4).width(0, 120).height(0, 30).freeze(1);
b.dropdown(1, 2, 5, 2, ["כן", "לא"]);
b.whenEquals(1, 2, 5, 2, "כן", C.goodBg);
const reqs = emit([b]);
const cellReq = reqs.filter((r) => r.updateCells && r.updateCells.rows);
const vals = cellReq[0].updateCells.rows[0].values;
ok("טקסט נכתב כמחרוזת", vals[0].userEnteredValue.stringValue === "טקסט");
ok("מספר נכתב כמספר", vals[1].userEnteredValue.numberValue === 42);
/* ⚠ העיקר: נוסחה חיה ולא מחרוזת. אחרת הדאשבורד מת. */
ok("נוסחה נכתבת כנוסחה", vals[2].userEnteredValue.formulaValue === "=SUM(A1:B1)",
  JSON.stringify(vals[2].userEnteredValue));
ok("ריק ו-null אינם ערך", !vals[3].userEnteredValue.stringValue && !vals[4].userEnteredValue.stringValue);

const kinds = (rs) => rs.map((r) => Object.keys(r)[0]);
const k = kinds(reqs);
/* ⚠ הסדר קובע: ניקוי → מאפיינים → רוחב → מיזוג → תאים. */
ok("ניקוי ראשון", k[0] === "updateCells" && !reqs[0].updateCells.rows);
ok("מאפייני גיליון אחריו", k[1] === "updateSheetProperties");
ok("RTL נדלק", reqs[1].updateSheetProperties.properties.rightToLeft === true);
ok("והקפאה נשמרת", reqs[1].updateSheetProperties.properties.gridProperties.frozenRowCount === 1);
ok("מיזוג לפני התאים", k.indexOf("mergeCells") < k.lastIndexOf("updateCells"));
ok("תפריט נפתח נוצר", k.includes("setDataValidation"));
ok("ועיצוב מותנה", k.includes("addConditionalFormatRule"));

/* ⚠ עיצוב מותנה לפי נוסחה — שדה אחר לגמרי ב-API. */
const b2 = sheetBuilder("ב", 1);
b2.set(0, 0, "x", S.cell).whenFormula(0, 0, 3, 0, '=AND($A1<>"",$A1<0.85)', C.badBg);
const cf = emit([b2]).find((r) => r.addConditionalFormatRule);
ok("נוסחה מותנית היא CUSTOM_FORMULA",
  cf.addConditionalFormatRule.rule.booleanRule.condition.type === "CUSTOM_FORMULA",
  cf.addConditionalFormatRule.rule.booleanRule.condition.type);

/* ============ 2 · החוברות מנתונים אמיתיים ============ */
const dump = {};
for (const [kind, spec] of Object.entries(WORKBOOKS)) {
  console.log(`=== ${kind} · ${spec.title} ===`);
  const wb = await spec.build();
  const titles = wb.sheets.map((s) => s.title);
  ok("נבנתה", wb.sheets.length > 0, `${wb.sheets.length} לשוניות`);
  /* ⚠ שם לשונית כפול = בקשה שנדחית כולה. */
  ok("שמות הלשוניות ייחודיים", new Set(titles).size === titles.length);
  ok("ואין שם ארוך מדי או עם תו אסור",
    titles.every((t) => t.length <= 100 && !/[:\\/?*[\]]/.test(t)),
    titles.find((t) => t.length > 100 || /[:\\/?*[\]]/.test(t)) || "תקין");

  const rs = emit(wb.sheets);
  ok("נוצרו בקשות", rs.length > 0, `${rs.length} בקשות`);
  /* ⚠ כל בקשה חייבת מזהה גיליון — undefined נדחה על ידי גוגל
     בשגיאה שאינה מסבירה איפה. */
  const bad = rs.filter((r) => {
    const body = Object.values(r)[0];
    const id = body?.range?.sheetId ?? body?.start?.sheetId
      ?? body?.properties?.sheetId ?? body?.rule?.ranges?.[0]?.sheetId;
    return id === undefined || id === null;
  });
  ok("לכל בקשה יש sheetId", bad.length === 0, bad.length ? Object.keys(bad[0])[0] : "");

  const every = rs.every((r) => Object.keys(r).length === 1);
  ok("כל בקשה היא פעולה אחת", every);

  /* ⚠ RTL בכל לשונית. עברית ב-LTR קריאה אבל הסדר מתהפך. */
  const rtl = rs.filter((r) => r.updateSheetProperties);
  ok("כל לשונית ב-RTL", rtl.length === wb.sheets.length
    && rtl.every((r) => r.updateSheetProperties.properties.rightToLeft), `${rtl.length}`);

  dump[kind] = {
    title: spec.title,
    sheets: wb.sheets.map((s) => ({
      title: s.title,
      size: s.size,
      frozen: s._frozen,
      widths: s._widths,
      heights: s._heights,
      merges: s._merges,
      rules: s._rules,
      validations: s._validations,
      cells: [...s._cells.entries()].map(([k2, v]) => {
        const [r, c] = k2.split(",").map(Number);
        return { r, c, v: v.v, style: v.style };
      }),
    })),
  };
}

/* ---- בדיקות תוכן על חוברת השיעורים ---- */
console.log("=== תוכן חוברת השיעורים ===");
const L = dump.lessons;
ok("הדאשבורד ראשון", L.sheets[0].title === "דאשבורד", L.sheets[0].title);
const dash = L.sheets[0];
const formulas = dash.cells.filter((c) => typeof c.v === "string" && c.v.startsWith("="));
/* ⚠ הטענה המרכזית: הדאשבורד **מחשב** ואינו מעתיק מספרים. */
ok("הדאשבורד בנוי מנוסחאות", formulas.length >= 8, `${formulas.length} נוסחאות`);
ok("והן מפנות ללשוניות הנושא",
  formulas.some((f) => f.v.includes("COUNTIF") && f.v.includes("'")),
  formulas.find((f) => f.v.includes("COUNTIF"))?.v.slice(0, 60));
/* ⚠ כל הפניה חייבת להצביע על לשונית שקיימת בחוברת. */
const tabs = new Set(L.sheets.map((s) => s.title));
const refd = new Set();
for (const f of formulas) {
  for (const m of String(f.v).matchAll(/'([^']+)'!/g)) refd.add(m[1]);
}
const missing = [...refd].filter((t) => !tabs.has(t));
ok("כל הפניה מצביעה על לשונית קיימת", missing.length === 0, missing.join(", "));
ok("ויש לשונית לכל נושא", L.sheets.length > 5, `${L.sheets.length - 1} נושאים`);

const one = L.sheets[1];
ok("לגיליון נושא יש כותרות", one.cells.some((c) => c.r === 3 && c.v === "תאריך"));
/* ⚠ כתום מול כחול — ההבחנה בין תכנון לביצוע. */
const th = one.cells.filter((c) => c.r === 3);
const blues = th.filter((c) => c.style?.backgroundColor?.red < 0.5).length;
const oranges = th.filter((c) => c.style?.backgroundColor?.red > 0.8).length;
ok("כותרות תכנון בכחול וביצוע בכתום", blues === 5 && oranges === 2, `${blues} כחול · ${oranges} כתום`);
ok("ויש תפריטים נפתחים", one.validations.length >= 1, `${one.validations.length}`);

writeFileSync("scratchpad/workbooks.json", JSON.stringify(dump, null, 1));
console.log(`\n(נכתב scratchpad/workbooks.json — ${Object.keys(dump).length} חוברות)`);

console.log(`\n${pass} עברו, ${fail} נכשלו`);
console.log("⚠ לא נבדק כאן: קבלה בפועל מול Google (דורש חשבון שירות וגיליון משותף).");
process.exit(fail ? 1 : 0);
