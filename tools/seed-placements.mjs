/* ============================================================
   הקמת לוחות שיבוצי החניכים ב-monday
   ------------------------------------------------------------
   רץ פעם אחת, מהמחשב שיש עליו .env:

     node --env-file=.env tools/seed-placements.mjs

   מה הוא עושה:
     1. יוצר שני לוחות — הגדרות שיבוצים ושיבוץ בפועל
     2. זורע את השיבוצים: ענפים, סדרות, ועדות וקבוצות
     3. מוסיף את התווית "אב בית" לעמודת התפקידים בלוח החניכים
     4. כותב את המזהים ל-shared/placements-ids.js

   ⚠ מי משובץ איפה לא נזרע — זו בדיוק העבודה שנעשית במסך.

   ⚠ מסרב לרוץ אם המזהים כבר מלאים (--force עוקף), כדי שלא
     ייווצרו לוחות כפולים.
   ============================================================ */

import fs from "node:fs";
import { PLACEMENT_BOARDS } from "../shared/placements-ids.js";
import { CATEGORY, PERIOD } from "../shared/placements.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { ROLES_COL } from "../shared/lessons-boards.js";

const ENDPOINT = "https://api.monday.com/v2";
const TOKEN = process.env.MONDAY_TOKEN;
const FORCE = process.argv.includes("--force");

const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const step = (m) => console.log(`\n${m}`);
const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };

if (!TOKEN) die("MONDAY_TOKEN לא מוגדר. הריצו עם --env-file=.env");
if (PLACEMENT_BOARDS.definitions && !FORCE) {
  die(`הלוחות כבר מוגדרים (הגדרות: ${PLACEMENT_BOARDS.definitions}).\n` +
      `  הרצה חוזרת תיצור לוחות כפולים. להקמה מחדש: --force`);
}

async function gql(query, variables = {}) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  const json = await r.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const labels = (...names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(i), n])) });

async function createBoard(name) {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`, { n: name });
  return String(d.create_board.id);
}
async function createColumn(board, title, type, defaults = null) {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$d:JSON){
       create_column(board_id:$b, title:$t, column_type:$c, defaults:$d){ id } }`,
    { b: board, t: title, c: type, d: defaults });
  return String(d.create_column.id);
}
async function createItem(board, name, cols) {
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
    { b: board, n: name, v: JSON.stringify(cols) });
  return String(d.create_item.id);
}

/* ---------- מה נזרע ----------
   התקופה של חד״א וכולבו סומנה "שנתי" כהנחה — אם הם מתחלפים
   בסמסטר, משנים את התא בלוח ל"לפי סמסטר" וזה הכול. */
const SEEDS = [
  [CATEGORY.branch, PERIOD.perSemester, ["נוי", "גד״ש", "רפת", "חינוך", "פרויקטים"]],
  [CATEGORY.branch, PERIOD.yearly, ["חד״א", "כולבו"]],
  [CATEGORY.series, PERIOD.yearly, ["סדרת איושלים", "סדרת חתול בשק", "סדרת חינוך", "סדרה מסכמת"]],
  [CATEGORY.committee, PERIOD.perSemester, [
    "ועדת תרבות", "ועדת קבוצה ותוכן", "ועדת קהילה",
    "ועדת הכנה לצה״ל וידיעת הארץ", "ועדת לוגיסטיקה ושפ״ה",
  ]],
  [CATEGORY.committee, PERIOD.secondOnly, ["ועדת גיוסים"]],
  [CATEGORY.group, PERIOD.yearly, ["קבוצת שירה", "קבוצת נעם"]],
];

/* ---------- 1. חיבור ---------- */
step("1. חיבור ל-monday");
const me = await gql("{ me { name } }").catch((e) => die("החיבור נכשל: " + e.message));
ok(`מחובר כ-${me.me.name}`);

/* ---------- 2. הלוחות ---------- */
step("2. יצירת הלוחות");
const defsBoard = await createBoard("שיבוצים – הגדרות");
ok(`הגדרות: ${defsBoard}`);
const asgnBoard = await createBoard("שיבוצים – שיבוץ");
ok(`שיבוץ: ${asgnBoard}`);

/* ---------- 3. העמודות ---------- */
step("3. יצירת העמודות");
const D = {
  category: await createColumn(defsBoard, "קטגוריה", "status",
    labels(CATEGORY.branch, CATEGORY.series, CATEGORY.committee, CATEGORY.group)),
  period: await createColumn(defsBoard, "תקופה", "status",
    labels(PERIOD.perSemester, PERIOD.yearly, PERIOD.firstOnly, PERIOD.secondOnly)),
  capacity: await createColumn(defsBoard, "מכסה", "numbers"),
  /* ⚠ ארבע העמודות האלה נוספו ללוח אחרי ההקמה הראשונה ולא
  נוספו לכאן, והמחולל היה מוחק אותן מקובץ המזהים בהרצה
  הבאה — `lead` ריקה פירושה `guideMap` ריקה, כלומר כל בקשת
  יציאה מדלגת על המדריך **בלי שגיאה ובלי שאיש ישים לב**. */
  desc: await createColumn(defsBoard, "תיאור", "long_text"),
  hours: await createColumn(defsBoard, "שעות פעילות", "text"),
  needs: await createColumn(defsBoard, "מה נדרש", "long_text"),
  lead: await createColumn(defsBoard, "אחראי", "text"),
  /* יו״ר ועדה או סדרה — חניך, ולא המדריך המלווה */
  chair: await createColumn(defsBoard, "מזהה יו״ר", "text"),
  chairName: await createColumn(defsBoard, "יו״ר", "text"),
};
ok(`הגדרות — ${Object.keys(D).length} עמודות`);

const A = {
  student: await createColumn(asgnBoard, "מזהה חניך", "text"),
  studentName: await createColumn(asgnBoard, "חניך", "text"),
  placement: await createColumn(asgnBoard, "מזהה שיבוץ", "text"),
  placementName: await createColumn(asgnBoard, "שיבוץ", "text"),
  semester: await createColumn(asgnBoard, "סמסטר", "status",
    labels("סמסטר א׳", "סמסטר ב׳", "שנתי")),
};
ok(`שיבוץ — ${Object.keys(A).length} עמודות`);

/* ---------- 4. כתיבת המזהים (לפני הזריעה, בכוונה) ---------- */
step("4. כתיבת shared/placements-ids.js");
fs.writeFileSync(new URL("../shared/placements-ids.js", import.meta.url),
`/* ============================================================
   מזהי לוחות ועמודות של שיבוצי החניכים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב מחדש במלואו על ידי
     tools/seed-placements.mjs. נוצר על ידי ${me.me.name}.
   ============================================================ */

export const PLACEMENT_BOARDS = {
  definitions: "${defsBoard}",
  assignments: "${asgnBoard}",
};

export const PLACEMENT_COLS = {
  definitions: {
    category: "${D.category}", period: "${D.period}", capacity: "${D.capacity}",
    desc: "${D.desc}", hours: "${D.hours}", needs: "${D.needs}", lead: "${D.lead}",
    chair: "${D.chair}", chairName: "${D.chairName}",
  },
  assignments: { student: "${A.student}", studentName: "${A.studentName}", placement: "${A.placement}", placementName: "${A.placementName}", semester: "${A.semester}" },
};
`);
ok("המזהים נכתבו");

/* ---------- 5. זריעת ההגדרות ---------- */
step("5. זריעת השיבוצים");
let done = 0; const failed = [];
for (const [category, period, names] of SEEDS) {
  for (const name of names) {
    try {
      await createItem(defsBoard, name, {
        [D.category]: { label: category },
        [D.period]: { label: period },
      });
      done++;
    } catch (e) { failed.push(`${name}: ${e.message}`); }
  }
}
ok(`נזרעו ${done} שיבוצים`);
failed.forEach((f) => warn(f));

/* ---------- 6. התווית "אב בית" בעמודת התפקידים ---------- */
/* עמודת dropdown מקבלת תווית חדשה רק דרך כתיבת ערך עם
   create_labels_if_missing. לוקחים שורה קיימת, כותבים את
   התפקידים הנוכחיים שלה + אב בית, ומיד משחזרים — התווית
   נשארת בעמודה, השורה חוזרת בדיוק למה שהייתה. */
step('6. התווית "אב בית" בעמודת התפקידים');
try {
  const d = await gql(`{ boards(ids:[${MECHINA_BOARDS.roster}]) {
    items_page(limit:1) { items { id column_values(ids:["${ROLES_COL}"]) { text } } } } }`);
  const row = d.boards[0].items_page.items[0];
  if (!row) throw new Error("לוח החניכים ריק");
  const current = (row.column_values[0]?.text || "").split(",").map((s) => s.trim()).filter(Boolean);

  const write = (roles, create) => gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:${create}){ id } }`,
    { b: MECHINA_BOARDS.roster, i: row.id,
      v: JSON.stringify({ [ROLES_COL]: roles.length ? { labels: roles } : null }) });

  await write([...current, "אב בית"], true);   // יוצר את התווית
  await write(current, false);                  // משחזר את השורה
  ok('"אב בית" נוספה לרשימת התפקידים');
} catch (e) {
  warn(`לא הצלחתי להוסיף אוטומטית: ${e.message}`);
  warn('להוסיף ידנית: לוח החניכים ב-monday → עמודת התפקידים → תווית "אב בית"');
}

/* ---------- סיום ---------- */
step("הושלם.");
console.log(`
  לוח ההגדרות: https://monday.com/boards/${defsBoard}
  לוח השיבוץ:  https://monday.com/boards/${asgnBoard}

  ⚠ לוודא ש-shared/placements-ids.js נכנס לקומיט.
`);
