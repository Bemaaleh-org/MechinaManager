/* ============================================================
   גיליון "מזרח תיכון" — מהקובץ שאחים שלח (12.9.2026)
   ------------------------------------------------------------
     node --env-file=.env tools/add-sheet-mideast.mjs          הרצה יבשה
     node --env-file=.env tools/add-sheet-mideast.mjs --go     ביצוע

   ⚠⚠ **דרך נקודות הקצה ולא ישר ל-monday.** יצירת גיליון ומפגש
     עוברת את אותן בדיקות של המסך — סיבת ביטול חובה ל"לא",
     מפגש כפול באותו תאריך נחסם, ויומן השינויים של אחראי הלו״ז
     נחתם. כלי שכותב ישר ללוח היה מסלול שני שעוקף את כל אלה.

   ⚠ **אינו מכפיל** — גיליון בשם הזה עוצר את הכלי (409 מהשרת).
   ⚠ **מחיר למפגש לא הוזן**: הוא אינו בקובץ, וריק אינו אפס — הגיליון
     יופיע בדוח התשלום תחת "שיעורים בלי מחיר" עד שיוזן (5ד).
   ⚠ דורש את שרת הפיתוח (localhost:5173) ורישום זמני של ראש המכינה.
   ============================================================ */
import { gql } from "../api/_monday.js";
import { tempRegister } from "./tests/_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../shared/auth-board.js";

const GO = process.argv.includes("--go");
const B = "http://localhost:5173";

const SHEET = { subject: "מזרח תיכון", lecturer: "נעה בן ארי", dayTime: "רביעי 16:30" };

/* תאריך · יתקיים? · סיבת ביטול — כלשונו מהקובץ */
const ROWS = [
  ["2026-09-09", "לא", "שבוע קליטה"],
  ["2026-09-16", "כן", ""],
  ["2026-09-23", "לא", "יום שיא הכנה לצה״ל"],
  ["2026-09-30", "לא", "חוה״מ סוכות"],
  ["2026-10-07", "כן", ""],
  ["2026-10-14", "כן", ""],
  ["2026-10-21", "כן", ""],
  ["2026-10-28", "לא", "טיול"],
  ["2026-11-04", "לא", "סדרת ניווטים"],
  ["2026-11-11", "לא", "יום מיון"],
  ["2026-11-18", "לא", "יום מיון"],
  ["2026-11-25", "כן", ""],
  ["2026-12-02", "כן", ""],
  ["2026-12-09", "לא", "חנוכה"],
  ["2026-12-16", "כן", ""],
  ["2026-12-23", "כן", ""],
  ["2026-12-30", "לא", "סדרת איו\"ש"],
  ["2027-01-06", "כן", ""],
  ["2027-01-13", "לא", "טיול"],
  ["2027-01-20", "כן", ""],
  ["2027-01-27", "כן", ""],
  ["2027-02-03", "לא", "שבוע אמצע"],
  ["2027-02-10", "כן", ""],
  ["2027-02-17", "כן", ""],
  ["2027-02-24", "כן", ""],
  ["2027-03-03", "לא", "סדרת שטח"],
  ["2027-03-10", "כן", ""],
  ["2027-03-17", "לא", "סמינר ציונות"],
  ["2027-03-24", "לא", "שושן פורים"],
  ["2027-03-31", "כן", ""],
  ["2027-04-07", "לא", "סדרת חינוך"],
  ["2027-04-14", "כן", ""],
  ["2027-04-21", "לא", "פסח"],
  ["2027-04-28", "לא", "שביעי של פסח"],
  ["2027-05-05", "כן", ""],
  ["2027-05-12", "לא", "יום העצמאות"],
  ["2027-05-19", "לא", "סדרת חתול בשק"],
  ["2027-05-26", "כן", ""],
  ["2027-06-02", "כן", ""],
  ["2027-06-09", "כן", ""],
  ["2027-06-16", "כן", ""],
  ["2027-06-23", "לא", "סדרה מסכמת"],
  ["2027-06-30", "לא", "סיום מכינה"],
];

const yes = ROWS.filter((r) => r[1] === "כן").length;
console.log(`\n${SHEET.subject} — ${SHEET.lecturer} — ${SHEET.dayTime}`);
console.log(`${ROWS.length} מפגשים · יתקיים ${yes} · בוטל ${ROWS.length - yes}`);
/* ⚠ אותם מספרים של שורת הסיכום בקובץ (43 · 22 · 21) — אחרת משהו
   בהעתקה לא נכון, ועוצרים לפני שכותבים. */
if (ROWS.length !== 43 || yes !== 22) { console.error("✗ הספירה אינה תואמת את הקובץ"); process.exit(1); }
if (!GO) { console.log("\nהרצה יבשה. להוספה: --go\n"); process.exit(0); }

const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 200) }; }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const dani = users.find((x) => x.name.includes("דני לויט"));
const reg = await tempRegister("דני לויט");
let bad = 0;
try {
  const H = jar();
  let r = await call(H, "POST", "/api/auth?action=login", { code: cv(dani, AUTH_COLS.code) });
  if (r.s !== 200) throw new Error("כניסת ראש המכינה נכשלה: " + JSON.stringify(r.b));

  r = await call(H, "POST", "/api/lessons?action=sheet", SHEET);
  if (r.s !== 200) throw new Error(`יצירת הגיליון נכשלה: ${r.s} ${r.b.error || ""}`);
  const sheetId = r.b.id;
  console.log(`\n✓ נוצר גיליון ${sheetId}`);

  for (const [date, planned, reason] of ROWS) {
    r = await call(H, "POST", "/api/lessons?action=meeting", { sheetId, date, planned, reason });
    if (r.s !== 200) { bad++; console.log(`  ✗ ${date}: ${r.s} ${r.b.error || ""}`); }
  }
  console.log(`✓ נוספו ${ROWS.length - bad} מתוך ${ROWS.length} מפגשים`);
} finally {
  await reg.restore();
}
process.exit(bad ? 1 : 0);
