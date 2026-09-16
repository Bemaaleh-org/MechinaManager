/* ============================================================
   קטגוריית "אוכל" ברשימת הקניות הכללית
   ------------------------------------------------------------
     npm run seed:buy-food

   הבקשה: *"הרשימה הזאת מצטרפת לרשימת קניות של הצוות אבל
   בקטגוריה נפרדת, אוכל, שזה כרטיסייה נפרדת תיהיה."*

   ⚠⚠ **אין לוח רביעי, ואין העברת שורות.** רשימת הקניות של
     התפריט השבועי יושבת ב**רשימה הכללית שכבר קיימת**, עם
     קטגוריה "אוכל". לוח נפרד היה מקור אמת חמישי לאותה שאלה,
     ומסך הקניות המאוחד כבר בנוי לקרוא מקורות ולא להעביר
     ביניהם שורות (api/_shop-all.js).

   ⚠⚠ **ואף תווית קיימת אינה נמחקת.** `update_status_column`
     **דורס את כל הרשימה**, ותווית שנעלמת ממנה מוחקת בשקט את
     הערך של כל שורה שיושבת עליה. מה שאינו ברשימה החדשה
     **מושבת** ולא נמחק (4כד, 5ו).

   ⚠ **התווית החדשה נכנסת בסוף הרשימה שבלוח** ולא במקומה
     ב-BUY_CATEGORIES. הזזת תווית קיימת היא שינוי `index`,
     ומונדיי דוחה שינוי בשלוש הראשונות — כשל שמפיל את כל
     הקריאה, כולל את מה שכן היה נכון (4כד). במסך הסדר הוא
     זה שבקוד ממילא (`categoryRank`).

   ⚠ **הרצה שנייה שקטה.** התווית כבר קיימת ושום צבע אינו משתנה.
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import COLOR_MAP from "./monday-colors.json" with { type: "json" };
import { BUY_BOARDS, BUY_COLS, buyReady } from "../shared/buy-ids.js";
import { BUY_CATEGORIES } from "../shared/buy-categories.js";

if (!buyReady() || !BUY_COLS.category) {
  console.error("\n✗ רשימת הקניות הכללית טרם הוקמה. הריצו קודם: npm run seed:buy\n");
  process.exit(1);
}
const board = BUY_BOARDS.board;

const POOL = ["dark_blue", "purple", "grass_green", "bright_blue", "dark_red",
  "sofia_pink", "egg_yolk", "blackish", "american_gray", "brown", "dark_orange",
  "saladish", "lipstick", "dark_purple", "berry", "navy", "teal", "indigo",
  "winter", "done-green", "bright_green", "working_orange", "stuck-red",
  "sunset", "peach", "orchid", "tan", "sky", "coffee", "royal", "aquamarine"];

const cols = async () =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ name columns{ id title type settings_str revision } } }`,
    { b: [board] })).boards[0];

const b0 = await cols();
console.log(`\nלוח: ${b0.name}\n`);

const col = b0.columns.find((c) => String(c.id) === String(BUY_COLS.category));
if (!col) {
  console.error("\n✗ עמודת הקטגוריה לא נמצאה. לא בוצע שינוי.\n");
  process.exit(1);
}

const parsed = JSON.parse(col.settings_str || "{}");
const old = parsed.labels || {};
const oldColors = parsed.labels_colors || {};
console.log("תוויות כיום: " + Object.values(old).filter(Boolean).join(" · "));

/* ⚠ מי יושב על מה — **לפני** שנוגעים ברשימה (5ו).
   ⚠⚠ `value === null` הוא המבחן לריק ולא `text === ""`: תא בלי
   בחירה מחזיר את שם התווית שיושבת על מפתח 5 (5ז). */
const used = new Set();
for (const i of await allItems(board)) {
  const cell = i.column_values.find((x) => x.id === BUY_COLS.category) || {};
  const empty = cell.value === null || cell.value === undefined || cell.value === "null";
  if (!empty && cell.text) used.add(cell.text);
}
console.log("בשימוש כרגע: " + ([...used].join(" · ") || "אף תווית"));

const taken = new Set();
/* ⚠ שם הצבע יושב ב-`var_name` ולא ב-`color` (שהוא ההקס), ו-`color`
   הוא שדה **חובה** ב-API: קריאה מהשדה הלא-נכון מחזירה undefined,
   השדה אינו נשלח, והקריאה כולה נופלת (5ז).
   ⚠ **נכשלים ברעש ולא מנחשים** (4כד). */
const colorOfExisting = (id) => {
  const varName = (oldColors[id] || {}).var_name || "";
  const enumName = COLOR_MAP[varName];
  if (!enumName) {
    throw new Error(`אין מיפוי לצבע "${varName}" (תווית ${id}). `
      + "להוסיף אותו ל-tools/monday-colors.json ולהריץ שוב.");
  }
  taken.add(enumName);
  return enumName;
};

const next = [];
const already = new Set();
for (const [id, text] of Object.entries(old)) {
  const label = String(text || "");
  if (!label) continue;
  const keep = BUY_CATEGORIES.includes(label);
  if (keep) already.add(label);
  next.push({ id: Number(id), label, index: next.length,
    color: colorOfExisting(id), is_deactivated: !keep });
}

const added = [];
for (const label of BUY_CATEGORIES) {
  if (already.has(label)) continue;
  const c = POOL.find((x) => !taken.has(x));
  if (!c) throw new Error("נגמרו הצבעים הפנויים — להרחיב את POOL.");
  taken.add(c);
  added.push(label);
  next.push({ label, index: next.length, color: c, is_deactivated: false });
}
console.log("נוספות: " + (added.join(" · ") || "אף אחת"));

if (added.length || next.some((l) => l.is_deactivated)) {
  await gql(
    `mutation($b:ID!,$c:String!,$s:UpdateStatusColumnSettingsInput!,$r:String!){
       update_status_column(board_id:$b,id:$c,settings:$s,revision:$r){ id } }`,
    { b: board, c: BUY_COLS.category, s: { labels: next }, r: String(col.revision) });
} else {
  console.log("אין מה לשנות ברשימה.");
}

/* ⚠ ווידוא **בקריאה חוזרת** — כתיבה שגויה מוחקת רשימה שלמה
   בשקט, וזה נראה בדיוק כמו הצלחה (4ס, 5ו). */
const after = (await cols()).columns.find((c) => String(c.id) === String(BUY_COLS.category));
const st2 = JSON.parse(after.settings_str || "{}");
const now = Object.values(st2.labels || {}).filter(Boolean);
console.log("תוויות עכשיו: " + now.join(" · "));

/* ⚠ **אבדן תווית שהייתה בשימוש הוא כישלון ולא הערה** (5לז). */
const lost = [...used].filter((u) => !now.includes(u));
if (lost.length) {
  console.error("\n✗ תוויות שהיו בשימוש נעלמו: " + lost.join(" · ") + "\n");
  process.exit(1);
}
if (!now.includes("אוכל")) {
  console.error('\n✗ התווית "אוכל" אינה ברשימה אחרי הכתיבה.\n');
  process.exit(1);
}
console.log('\n✓ "אוכל" קיימת בעמודת הקטגוריה.\n');
