/* ============================================================
   מאגר המרצים — קטגוריה, ותוספת לרשימת הסטטוסים
   ------------------------------------------------------------
     npm run seed:lecturers

   שני שינויים על לוח שכבר עומד, ושניהם ניתנים להרצה חוזרת:

   1. **עמודת "קטגוריה"** — מדעי המדינה · כישורי חיים · אחר.
      ⚠ מדלגת על מפתח 5, המשבצת הריקה של monday (5ז).

   2. **"נשלחה הודעה" נוספת לרשימת הסטטוסים.**
      ⚠⚠ **ואף תווית קיימת אינה נמחקת — מה שאינו ברשימה
        החדשה מושבת.** `update_status_column` **דורס את כל
        הרשימה**, ותווית שנעלמת ממנה מוחקת **בשקט** את הערך
        של כל שורה שיושבת עליה. השבתה מורידה אותה מהבורר,
        שומרת על הנתון, והיא הפיכה בקליק בלוח (5ו, 4כד).
      ⚠ בפועל כאן אין מה להשבית: כל חמש התוויות הישנות נשארות
        ברשימה החדשה, והשישית מתווספת. הקוד עדיין בנוי לזה,
        כי מי שיסיר תווית מ-LECT_STATUS מחר צריך שההסרה תהיה
        השבתה ולא מחיקה.

   ⚠ **התווית החדשה נכנסת בסוף הרשימה שבלוח**, ולא במקום
     שבו היא יושבת ב-LECT_STATUS. הזזת תווית קיימת פירושה
     שינוי ה-index שלה, ו-monday דוחה שינוי בשלוש הראשונות
     (4כד) — כשל שמפיל את **כל** הקריאה, כולל את מה שכן היה
     נכון. במסך הסדר הוא זה שבקוד ממילא.

   ⚠ **הרצה שנייה שקטה.** התווית כבר קיימת, העמודה כבר קיימת,
     ושום צבע אינו משתנה.

   ⚠ **וכותב את מזהה העמודה לתוך LECT_COLS** — בדיוק כפי
     ש-seed-plenary כותב אותו. שני מחוללים לאותו אובייקט הם
     המוקש של 4מו, ולכן העמודה מוגדרת **בשניהם**.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql, allItems } from "../api/_monday.js";
import COLOR_MAP from "./monday-colors.json" with { type: "json" };
import {
  LECT_BOARDS, LECT_COLS, LECT_STATUSES, LECT_CATEGORIES,
} from "../shared/lecturers-ids.js";

const PATH = "shared/lecturers-ids.js";
const board = LECT_BOARDS.board;

if (!board) {
  console.error("\n✗ מאגר המרצים טרם הוקם. הריצו קודם: npm run seed:plenary\n");
  process.exit(1);
}

/* ⚠ 1,2,3,4,6,7… — מפתח 5 מדולג (5ז). */
const labelKeys = (n) => {
  const out = [];
  for (let k = 1; out.length < n; k++) if (k !== 5) out.push(k);
  return out;
};

const POOL = ["dark_blue", "purple", "grass_green", "bright_blue", "dark_red",
  "sofia_pink", "egg_yolk", "blackish", "american_gray", "brown", "dark_orange",
  "saladish", "lipstick", "dark_purple", "berry", "navy", "teal", "indigo"];

const cols = async () =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ name columns{ id title type settings_str revision } } }`,
    { b: [board] })).boards[0];

const b0 = await cols();
console.log(`\nלוח: ${b0.name}\n`);

/* ============================================================
   1 · עמודת הקטגוריה
   ============================================================ */
let categoryId = "";
{
  const have = b0.columns.find((c) => String(c.title).trim() === "קטגוריה");
  if (have) {
    categoryId = String(have.id);
    console.log(`  קיימת: קטגוריה → ${categoryId}`);
  } else {
    const keys = labelKeys(LECT_CATEGORIES.length);
    const d = await gql(
      `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
         create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
      { b: board, t: "קטגוריה", c: "status",
        s: JSON.stringify({ labels: Object.fromEntries(LECT_CATEGORIES.map((l, i) => [keys[i], l])) }) });
    categoryId = String(d.create_column.id);
    console.log(`  נוצרה: קטגוריה → ${categoryId}  (${LECT_CATEGORIES.join(" · ")})`);
  }
}

/* ============================================================
   2 · רשימת הסטטוסים
   ============================================================ */
{
  const col = b0.columns.find((c) => String(c.id) === String(LECT_COLS.status));
  if (!col) {
    console.error("\n✗ עמודת הסטטוס של מאגר המרצים לא נמצאה. לא בוצע שינוי.\n");
    process.exit(1);
  }
  const parsed = JSON.parse(col.settings_str || "{}");
  const old = parsed.labels || {};
  const oldColors = parsed.labels_colors || {};
  console.log("\nתוויות כיום: " + Object.values(old).filter(Boolean).join(" · "));

  /* ⚠ מי יושב על מה — **לפני** שנוגעים ברשימה (5ו). */
  const used = new Set();
  for (const i of await allItems(board)) {
    const cell = i.column_values.find((x) => x.id === LECT_COLS.status) || {};
    /* ⚠⚠ `value === null` הוא המבחן לריק ולא `text === ""` —
       תא בלי בחירה מחזיר את שם התווית שיושבת על מפתח 5 (5ז). */
    const empty = cell.value === null || cell.value === undefined || cell.value === "null";
    if (!empty && cell.text) used.add(cell.text);
  }
  console.log("בשימוש כרגע: " + ([...used].join(" · ") || "אף תווית"));

  const taken = new Set();
  /* ⚠ שם הצבע יושב ב-`var_name` ולא ב-`color` (שהוא ההקס), ו-
     `color` הוא שדה **חובה** ב-API: קריאה מהשדה הלא-נכון מחזירה
     undefined, השדה אינו נשלח, והקריאה כולה נופלת (5ז). */
  const colorOfExisting = (id) => {
    const varName = (oldColors[id] || {}).var_name || "";
    const enumName = COLOR_MAP[varName];
    /* ⚠ **נכשלים ברעש ולא מנחשים** — צבע שגוי על אחת משלוש
       התוויות הראשונות מפיל את כל הקריאה (4כד). */
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
    const keep = LECT_STATUSES.includes(label);
    if (keep) already.add(label);
    /* ⚠ אותו id, אותו טקסט, **אותו צבע** — אין כאן שינוי
       שמונדיי יכולה לדחות. מי שאינה ברשימה מושבתת ולא נמחקת. */
    next.push({ id: Number(id), label, index: next.length,
      color: colorOfExisting(id), is_deactivated: !keep });
  }

  const added = [];
  for (const label of LECT_STATUSES) {
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
      { b: board, c: LECT_COLS.status, s: { labels: next }, r: String(col.revision) });
  } else {
    console.log("אין מה לשנות ברשימה.");
  }

  /* ⚠ ווידוא **בקריאה חוזרת** — כתיבה שגויה מוחקת רשימה שלמה
     בשקט, וזה נראה בדיוק כמו הצלחה (4ס, 5ו). */
  const after = (await cols()).columns.find((c) => String(c.id) === String(LECT_COLS.status));
  const st2 = JSON.parse(after.settings_str || "{}");
  const now = Object.values(st2.labels || {}).filter(Boolean);
  console.log("תוויות עכשיו: " + now.join(" · "));
  const off = (st2.deactivated_labels || []).map((k) => st2.labels[String(k)]).filter(Boolean);
  console.log("מושבתות: " + (off.join(" · ") || "—"));

  /* ⚠ **אבדן תווית שהייתה בשימוש הוא כישלון ולא הערה.** */
  const lost = [...used].filter((u) => !now.includes(u));
  if (lost.length) {
    console.error("\n✗✗ אבדו תוויות שהיו בשימוש: " + lost.join(" · ") + "\n");
    process.exit(1);
  }
  const missing = LECT_STATUSES.filter((s) => !now.includes(s));
  if (missing.length) {
    console.error("\n✗ לא נוצרו: " + missing.join(" · ") + "\n");
    process.exit(1);
  }
}

/* ============================================================
   3 · כתיבת מזהה העמודה
   ------------------------------------------------------------
   ⚠ אותה החלפה בדיוק של seed-plenary — `;\r?\n` ומחיקת
     כפילויות, כדי שעץ ב-CRLF לא ייצור הצהרת export שנייה
     ואיתה SyntaxError שמפיל את כל המערכת (5כג).
   ============================================================ */
{
  const value = { ...LECT_COLS, category: categoryId };
  const re = () => /export const LECT_COLS = [\s\S]*?;\r?\n/g;
  const line = `export const LECT_COLS = ${JSON.stringify(value, null, 2)};\n`;
  let src = readFileSync(PATH, "utf8");
  if (!re().test(src)) {
    console.error(`\n✗ לא נמצאה ההצהרה LECT_COLS ב-${PATH}\n`);
    process.exit(1);
  }
  let first = true;
  src = src.replace(re(), () => (first ? ((first = false), line) : ""));
  writeFileSync(PATH, src, "utf8");
  console.log(`\n✓ נכתב ${PATH}`);
}

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/lecturers-ids.js?v=" + Date.now());
if (!fresh.lectCategoryReady()) {
  console.error("\n✗ lectCategoryReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ lectCategoryReady() = true");
console.log("⚠ shared/lecturers-ids.js חייב להיכנס לקומיט.\n");
