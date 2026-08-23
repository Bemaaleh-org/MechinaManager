/* ============================================================
   הקמת לוחות המטבח ב-monday וזריעת המלאי הפותח
   ------------------------------------------------------------
   רץ פעם אחת, מהמחשב שיש עליו .env:

     node --env-file=.env tools/seed-kitchen.mjs

   מה הוא עושה:
     1. יוצר שני לוחות — ציוד מטבח וקניות מטבח
     2. יוצר את העמודות ואת התוויות שלהן
     3. זורע 16 פריטי חד״פ ו-89 פריטי אוכל
     4. כותב את המזהים ל-shared/kitchen-ids.js

   ⚠ הסקריפט מסרב לרוץ אם המזהים כבר מלאים, כדי שלא ייווצרו
     לוחות כפולים בהרצה שנייה. להקמה מחדש — --force.

   ⚠ הזריעה אינה טרנזקציה. אם היא נופלת באמצע, הלוחות כבר
     קיימים והמזהים כבר נכתבו — להשלים את החסר ידנית בלוח, או
     למחוק את הלוחות ב-monday ולהריץ שוב עם --force.
   ============================================================ */

import fs from "node:fs";
import { DISPOSABLE, FOOD } from "./kitchen-seed-items.mjs";
import { KITCHEN_BOARDS } from "../shared/kitchen-ids.js";

const ENDPOINT = "https://api.monday.com/v2";
const TOKEN = process.env.MONDAY_TOKEN;
const FORCE = process.argv.includes("--force");

const ok = (m) => console.log(`  ✓ ${m}`);
const step = (m) => console.log(`\n${m}`);
const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };

if (!TOKEN) die("MONDAY_TOKEN לא מוגדר. הריצו עם --env-file=.env");
if (KITCHEN_BOARDS.equipment && !FORCE) {
  die(`הלוחות כבר מוגדרים (ציוד: ${KITCHEN_BOARDS.equipment}).\n` +
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

/** תווית סטטוס נוצרת עם defaults; monday ממספר את התוויות מ-0 */
const labels = (...names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(i), n])) });

async function createBoard(name) {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
    { n: name }
  );
  return String(d.create_board.id);
}

async function createColumn(board, title, type, defaults = null) {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$d:JSON){
       create_column(board_id:$b, title:$t, column_type:$c, defaults:$d){ id }
     }`,
    { b: board, t: title, c: type, d: defaults }
  );
  return String(d.create_column.id);
}

async function createItem(board, name, cols) {
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id }
     }`,
    { b: board, n: name, v: JSON.stringify(cols) }
  );
  return String(d.create_item.id);
}

/* ---------- 1. חיבור ---------- */
step("1. חיבור ל-monday");
const me = await gql("{ me { name } }").catch((e) => die("החיבור נכשל: " + e.message));
ok(`מחובר כ-${me.me.name}`);

/* ---------- 2. הלוחות ---------- */
step("2. יצירת הלוחות");
const equipBoard = await createBoard("מטבח – ציוד");
ok(`ציוד מטבח: ${equipBoard}`);
const shopBoard = await createBoard("מטבח – קניות");
ok(`קניות מטבח: ${shopBoard}`);

/* ---------- 3. העמודות ---------- */
step("3. יצירת העמודות");

/* ⚠ הכמות היא text ולא numbers — ראו ההסבר ב-kitchen-seed-items.mjs */
const E = {
  qty: await createColumn(equipBoard, "כמות", "text"),
  kind: await createColumn(equipBoard, "סוג", "status", labels("מתכלה", "תמידי")),
  area: await createColumn(equipBoard, "תחום", "status", labels("אוכל", "חד״פ")),
  par: await createColumn(equipBoard, "מפתח", "numbers"),
};
ok(`ציוד — ${Object.keys(E).length} עמודות`);

const S = {
  qty: await createColumn(shopBoard, "כמות", "text"),
  date: await createColumn(shopBoard, "תאריך", "date"),
  status: await createColumn(shopBoard, "סטטוס", "status", labels("פתוח", "נקנה")),
  by: await createColumn(shopBoard, "ביקש", "text"),
  area: await createColumn(shopBoard, "תחום", "status", labels("אוכל", "חד״פ")),
};
ok(`קניות — ${Object.keys(S).length} עמודות`);

/* ---------- 4. כתיבת המזהים ---------- */
/* ⚠ נכתב לפני הזריעה ולא אחריה. אם הזריעה תיפול באמצע, הלוחות
   כבר קיימים — ובלי המזהים בקובץ הם היו הופכים ליתומים. */
step("4. כתיבת shared/kitchen-ids.js");
const idsFile = `/* ============================================================
   מזהי לוחות ועמודות של המטבח — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. הקובץ נכתב מחדש במלואו על ידי
     tools/seed-kitchen.mjs כשהוא יוצר את הלוחות ב-monday.

   נוצר על ידי ${me.me.name}.
   ============================================================ */

export const KITCHEN_BOARDS = {
  equipment: "${equipBoard}",
  shopping: "${shopBoard}",
};

export const KITCHEN_COLS = {
  equipment: { qty: "${E.qty}", kind: "${E.kind}", area: "${E.area}", par: "${E.par}" },
  shopping: { qty: "${S.qty}", date: "${S.date}", status: "${S.status}", by: "${S.by}", area: "${S.area}" },
};
`;
fs.writeFileSync(new URL("../shared/kitchen-ids.js", import.meta.url), idsFile);
ok("המזהים נכתבו");

/* ---------- 5. הזריעה ---------- */
step("5. זריעת המלאי");
let done = 0, failed = [];
const total = DISPOSABLE.length + FOOD.length;

for (const [area, rows] of [["חד״פ", DISPOSABLE], ["אוכל", FOOD]]) {
  for (const [name, qty] of rows) {
    try {
      await createItem(equipBoard, name, {
        [E.qty]: String(qty),
        [E.kind]: { label: "מתכלה" },
        [E.area]: { label: area },
      });
      done++;
      if (done % 10 === 0) console.log(`     ${done}/${total}`);
    } catch (e) {
      failed.push(`${name} (${area}): ${e.message}`);
    }
  }
}

ok(`נזרעו ${done} מתוך ${total} פריטים`);
if (failed.length) {
  console.log(`\n  ! ${failed.length} פריטים נכשלו — להוסיף ידנית בלוח:`);
  failed.forEach((f) => console.log(`    · ${f}`));
}

/* ---------- סיום ---------- */
step("הושלם.");
console.log(`
  לוח הציוד:  https://monday.com/boards/${equipBoard}
  לוח הקניות: https://monday.com/boards/${shopBoard}

  ⚠ המזהים נכתבו ל-shared/kitchen-ids.js — לוודא שהוא נכנס
    לקומיט, אחרת הדיפלוי ב-Vercel לא ימצא את הלוחות.

  להרצה:  npm run dev
`);
