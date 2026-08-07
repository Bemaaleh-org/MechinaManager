/* ============================================================
   בדיקת שכבת התרגום מול הנתונים האמיתיים ב-monday.
   קריאה בלבד — לא כותבת דבר.

   הרצה:  node --env-file=.env shared/mapper.test.mjs
   ============================================================ */

import { BOARDS, COLS, LABELS } from "./boards.js";
import { toProduct, toMove, toList, toRow, productColumns, moveColumns } from "./mapper.js";

async function gql(query) {
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { Authorization: process.env.MONDAY_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const items = async (boardId, extra = "") =>
  (
    await gql(`{ boards(ids:[${boardId}]){ items_page(limit:100){ items {
        id name ${extra} column_values { id text value
          ... on BoardRelationValue { linked_item_ids } } } } } }`)
  ).boards[0].items_page.items;

let failures = 0;
const check = (cond, msg) => {
  if (!cond) { failures++; console.log("   ✗ " + msg); }
};

/* ---------- 1. התוויות בקוד קיימות באמת בלוחות ---------- */
console.log("1. אימות תוויות מול עמודות הסטטוס ב-monday");
const boardCols = async (id) =>
  (await gql(`{ boards(ids:[${id}]){ columns { id type settings_str } } }`)).boards[0].columns;

const LABEL_CHECKS = [
  [BOARDS.catalog, COLS.catalog.cat, LABELS.cat, "קטגוריה"],
  [BOARDS.catalog, COLS.catalog.unit, LABELS.unit, "יחידת מדידה"],
  [BOARDS.catalog, COLS.catalog.tracking, LABELS.tracking, "סוג מעקב"],
  [BOARDS.catalog, COLS.catalog.sup, LABELS.sup, "ספק (קטלוג)"],
  [BOARDS.catalog, COLS.catalog.stockStatus, LABELS.stockStatus, "סטטוס מלאי"],
  [BOARDS.catalog, COLS.catalog.expiryFlag, LABELS.expiryFlag, "סימון תוקף"],
  [BOARDS.moves, COLS.moves.type, LABELS.moveType, "סוג תנועה"],
  [BOARDS.lists, COLS.lists.status, LABELS.listStatus, "סטטוס רשימה"],
  [BOARDS.lists, COLS.lists.sup, LABELS.sup, "ספק (רשימות)"],
  [BOARDS.rows, COLS.rows.source, LABELS.rowSource, "מקור שורה"],
];

for (const [board, colId, map, title] of LABEL_CHECKS) {
  const col = (await boardCols(board)).find((c) => c.id === colId);
  check(col, `${title}: העמודה ${colId} לא נמצאה`);
  if (!col) continue;
  const live = new Set(Object.values(JSON.parse(col.settings_str).labels));
  const missing = Object.values(map).filter((v) => !live.has(v));
  check(missing.length === 0, `${title}: תוויות שאין ב-monday → ${missing.join(" | ")}`);
  if (!missing.length) console.log(`   ✓ ${title} — ${Object.keys(map).length} תוויות`);
}

/* ---------- 2. תרגום כל המוצרים ---------- */
console.log("\n2. תרגום כל המוצרים בקטלוג");
const prods = (await items(BOARDS.catalog)).map(toProduct);
console.log(`   ${prods.length} מוצרים תורגמו`);
for (const p of prods) {
  for (const f of ["cat", "unit", "tracking", "sup"])
    check(p[f] !== null, `${p.name}: השדה ${f} לא תורגם (תווית לא מוכרת)`);
  check(p.stock >= 0 && p.min >= 0, `${p.name}: כמויות שליליות`);
}
const sample = prods.find((p) => p.name === "חזה עוף");
check(sample, "המוצר חזה עוף לא נמצא");
if (sample) {
  console.log("   דוגמה:", JSON.stringify(sample));
  check(sample.unit === "kg", `חזה עוף: היחידה תורגמה ל-${sample.unit} במקום kg`);
  check(sample.sup === "wholesale", `חזה עוף: הספק תורגם ל-${sample.sup}`);
  check(sample.tracking === "daily", `חזה עוף: המעקב תורגם ל-${sample.tracking}`);
}

/* ---------- 3. הלוך ושוב: מוצר → עמודות → תוויות תקפות ---------- */
console.log("\n3. הלוך ושוב — כתיבה חזרה");
const cols = productColumns(sample);
console.log("   עמודות לכתיבה:", JSON.stringify(cols).slice(0, 160) + "…");
check(cols[COLS.catalog.unit]?.label === 'ק"ג', "היחידה לא תורגמה חזרה נכון");
check(cols[COLS.catalog.stockStatus]?.label === "תקין", "סטטוס המלאי לא נגזר נכון");

/* ---------- 4. תנועות ורשימות ---------- */
console.log("\n4. תנועות ורשימות");
const moves = (await items(BOARDS.moves)).map(toMove);
console.log(`   ${moves.length} תנועות תורגמו`);
for (const m of moves) check(m.type !== null, `תנועה ${m.id}: סוג לא מוכר`);
console.log("   דוגמה:", JSON.stringify(moves[0]));

const lists = (await items(BOARDS.lists, "created_at")).map(toList);
console.log(`   ${lists.length} רשימות תורגמו`);
for (const l of lists) {
  check(l.status !== null, `רשימה ${l.id}: סטטוס לא מוכר`);
  check(l.sup !== null, `רשימה ${l.id}: ספק לא מוכר`);
}
console.log("   דוגמה:", JSON.stringify(lists[0]));

const rows = (await items(BOARDS.rows)).map(toRow);
console.log(`   ${rows.length} שורות רשימה תורגמו`);

/* ---------- סיכום ---------- */
console.log("\n" + "=".repeat(50));
console.log(failures === 0 ? "✅ כל הבדיקות עברו" : `❌ ${failures} כשלים`);
process.exit(failures === 0 ? 0 : 1);
