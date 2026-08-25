/* ============================================================
   אבחון לוחות המטבח
   ------------------------------------------------------------
     node --env-file=.env tools/check-kitchen.mjs

   בודק מה באמת קיים ב-monday מול מה שהקוד מצפה לו: הלוחות,
   העמודות, התוויות והפריטים. לא משנה כלום — קריאה בלבד.

   ⚠ התוויות הן החשוד המרכזי. הקוד שולח { label: "חד״פ" }
     עם create_labels_if_missing:false, ולכן תווית שנוצרה
     בשם שונה — ולו בגרש — מפילה כל יצירת פריט.
   ============================================================ */

import { KITCHEN_BOARDS, KITCHEN_COLS } from "../shared/kitchen-ids.js";
import { KITCHEN_AREAS, KITCHEN_KIND } from "../shared/kitchen-boards.js";

const TOKEN = process.env.MONDAY_TOKEN;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const step = (m) => console.log(`\n${m}`);

if (!TOKEN) { console.error("MONDAY_TOKEN לא מוגדר. הריצו עם --env-file=.env"); process.exit(1); }

async function gql(query) {
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30000),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

/* ---------- 1. המזהים בקוד ---------- */
step("1. shared/kitchen-ids.js");
if (!KITCHEN_BOARDS.equipment || !KITCHEN_BOARDS.shopping) {
  bad("המזהים ריקים — סקריפט ההקמה לא רץ, או שהוא נפל לפני שכתב אותם.");
  console.log("\n  הריצו:  node --env-file=.env tools/seed-kitchen.mjs\n");
  process.exit(1);
}
ok(`ציוד: ${KITCHEN_BOARDS.equipment} · קניות: ${KITCHEN_BOARDS.shopping}`);

/* ---------- 2. הלוחות ---------- */
step("2. הלוחות ב-monday");
const ids = [KITCHEN_BOARDS.equipment, KITCHEN_BOARDS.shopping].join(",");
const d = await gql(`{
  boards(ids:[${ids}]) {
    id name items_count
    columns { id title type settings_str }
  }
}`).catch((e) => { bad("הקריאה נכשלה: " + e.message); process.exit(1); });

const boards = Object.fromEntries((d.boards || []).map((b) => [String(b.id), b]));
const equip = boards[KITCHEN_BOARDS.equipment];
const shop = boards[KITCHEN_BOARDS.shopping];

if (!equip) { bad(`לוח הציוד ${KITCHEN_BOARDS.equipment} לא נמצא או שאין אליו גישה`); process.exit(1); }
ok(`${equip.name} — ${equip.items_count} פריטים`);
if (!shop) bad(`לוח הקניות ${KITCHEN_BOARDS.shopping} לא נמצא`);
else ok(`${shop.name} — ${shop.items_count} שורות`);

/* ---------- 3. העמודות ---------- */
step("3. העמודות בלוח הציוד");
const byId = Object.fromEntries(equip.columns.map((c) => [c.id, c]));
for (const [key, id] of Object.entries(KITCHEN_COLS.equipment)) {
  const c = byId[id];
  if (!c) bad(`${key}: העמודה ${id} אינה קיימת בלוח`);
  else ok(`${key}: "${c.title}" (${c.type})`);
}

/* ---------- 4. התוויות ---------- */
step("4. התוויות — החשוד המרכזי");
const labelsOf = (colId) => {
  const c = byId[colId];
  if (!c) return null;
  try {
    const s = JSON.parse(c.settings_str || "{}");
    return Object.values(s.labels || {}).filter(Boolean);
  } catch { return null; }
};

const checkLabels = (colId, want, what) => {
  const have = labelsOf(colId);
  if (!have) { bad(`${what}: לא הצלחנו לקרוא את התוויות`); return; }
  console.log(`  ${what} — בלוח: ${have.map((l) => `"${l}"`).join(", ") || "(ריק)"}`);
  for (const w of want) {
    if (have.includes(w)) ok(`  "${w}" קיימת`);
    else {
      bad(`  "${w}" חסרה — כל יצירת פריט עם התווית הזו תיכשל`);
      const close = have.find((h) => h.replace(/[״"׳']/g, "") === w.replace(/[״"׳']/g, ""));
      if (close) warn(`    יש "${close}" — הבדל בגרשיים בלבד`);
    }
  }
};

checkLabels(KITCHEN_COLS.equipment.area, KITCHEN_AREAS, "תחום");
checkLabels(KITCHEN_COLS.equipment.kind, [KITCHEN_KIND.consumable, KITCHEN_KIND.permanent], "סוג");

/* ---------- 5. הפריטים ---------- */
step("5. הפריטים בפועל");
const items = await gql(`{
  boards(ids:[${KITCHEN_BOARDS.equipment}]) {
    items_page(limit:500) {
      items { id name column_values(ids:["${KITCHEN_COLS.equipment.area}","${KITCHEN_COLS.equipment.qty}"]) { id text } }
    }
  }
}`);
const rows = items.boards[0].items_page.items;
const areaOf = (i) => (i.column_values.find((c) => c.id === KITCHEN_COLS.equipment.area) || {}).text || "(ריק)";
const tally = {};
for (const i of rows) tally[areaOf(i)] = (tally[areaOf(i)] || 0) + 1;

if (!rows.length) {
  bad("הלוח ריק — הזריעה לא יצרה אף פריט.");
} else {
  ok(`${rows.length} פריטים בלוח`);
  for (const [a, n] of Object.entries(tally)) {
    if (a === "(ריק)") warn(`${n} פריטים בלי תחום — הם לא יופיעו באף מסך`);
    else console.log(`     ${a}: ${n}`);
  }
  console.log(`\n  שלוש דוגמאות:`);
  rows.slice(0, 3).forEach((i) => {
    const qty = (i.column_values.find((c) => c.id === KITCHEN_COLS.equipment.qty) || {}).text || "";
    console.log(`     · ${i.name} — כמות "${qty}" — תחום "${areaOf(i)}"`);
  });
}

/* ---------- סיכום ---------- */
const expected = 105;
step("סיכום");
if (rows.length === 0) {
  console.log("  הלוחות קיימים אבל ריקים. הזריעה נפלה.");
  console.log("  שלחו את הפלט הזה — הוא מספיק כדי לדעת למה.\n");
} else if (rows.length < expected) {
  console.log(`  ${rows.length} מתוך ${expected} פריטים נזרעו. חלק נכשל.\n`);
} else {
  console.log("  הלוח מלא. אם המסך עדיין ריק — לאתחל את npm run dev.\n");
}
