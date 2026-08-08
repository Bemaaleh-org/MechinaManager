/* ============================================================
   הכנת לוח הביצוע — הרצה חד־פעמית
   ------------------------------------------------------------
   יוצר את עמודת "סדר תצוגה" ואת התוויות בשלוש עמודות הסטטוס.
   אידמפוטנטי: הרצה חוזרת לא משכפלת דבר.

   הרצה:  node --env-file=.env api/tasks-schema.mjs

   ⚠ update_status_column דורס את כל התוויות. לכן שולחים תמיד את
     הרשימה המלאה, כשכל תווית קיימת נושאת את ה-id שלה. ראה
     מיפוי-לוחות.md — אותה מלכודת שנתקלנו בה בלוחות המלאי.
   ============================================================ */

import { gql } from "./_monday.js";
import { TASK_BOARDS, TASK_COLS, DONE, DAYS } from "../shared/tasks-boards.js";

const EXEC = TASK_BOARDS.execution;
const DEFAULTS = new Set(["Working on it", "Done", "Stuck"]);
// התאמת var_name (מה שנקרא) לשם ה-enum (מה שנכתב)
const VAR2ENUM = { orange: "working_orange", "green-shadow": "done_green", "red-shadow": "stuck_red" };

const FOCI = ["מטבח ושטיפת כלים", "מדפי אחסון", "כללי", "ציוד", "מחסן", "מקרר חדר אוכל", "ספרייה בחדר אוכל"];

const PALETTE = {
  day: ["bright_blue", "purple", "grass_green", "egg_yolk", "dark_orange", "river"],
  focus: ["navy", "sofia_pink", "lipstick", "brown", "teal", "lavender", "steel"],
  done: ["american_gray", "bright_green"],
};

async function column(colId) {
  const d = await gql(`{ boards(ids:[${EXEC}]){ columns(ids:["${colId}"]){ id title revision settings_str } } }`);
  return d.boards[0].columns[0];
}

/** מוסיף תוויות חסרות ומשבית את ברירות המחדל של monday */
async function setLabels(colId, wanted, palette) {
  const col = await column(colId);
  const s = JSON.parse(col.settings_str);
  const labels = s.labels || {};
  const colors = s.labels_colors || {};

  const missing = wanted.filter((w) => !Object.values(labels).includes(w));
  if (!missing.length && Object.entries(labels).every(([k, v]) => !DEFAULTS.has(v) || (s.deactivated_labels || []).map(String).includes(k))) {
    console.log(`   = ${col.title}: כבר מוכנה`);
    return;
  }

  const parts = [];
  let i = 0;
  for (const key of Object.keys(labels).sort((a, b) => Number(a) - Number(b))) {
    const text = labels[key];
    const enumColor = VAR2ENUM[(colors[key] || {}).var_name] || "american_gray";
    parts.push(
      `{index:${i++},id:${Number(key)},label:${JSON.stringify(text)},color:${enumColor}` +
      (DEFAULTS.has(text) ? ",is_deactivated:true" : "") + "}"
    );
  }
  const used = new Set(parts.map((p) => p.match(/color:(\w+)/)[1]));
  const free = palette.filter((c) => !used.has(c));
  for (const w of missing) {
    parts.push(`{index:${i++},label:${JSON.stringify(w)},color:${free.shift()}}`);
  }

  const r = await gql(
    `mutation{ update_status_column(board_id:${EXEC}, id:"${colId}", revision:"${col.revision}",
       settings:{labels:[${parts.join(",")}]}){ id } }`
  );
  if (r.errors) throw new Error(JSON.stringify(r.errors));
  console.log(`   ✓ ${col.title}: נוספו ${missing.length} תוויות, ברירות המחדל הושבתו`);
}

console.log("— עמודת סדר תצוגה —");
const cols = (await gql(`{ boards(ids:[${EXEC}]){ columns { id title type } } }`)).boards[0].columns;
let orderCol = cols.find((c) => c.title === "סדר תצוגה");
if (orderCol) {
  console.log(`   = כבר קיימת: ${orderCol.id}`);
} else {
  const r = await gql(
    `mutation($b:ID!,$t:String!,$ct:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$ct){ id title } }`,
    { b: EXEC, t: "סדר תצוגה", ct: "numbers" }
  );
  orderCol = r.create_column;
  console.log(`   ✓ נוצרה: ${orderCol.id}`);
}

console.log("\n— תוויות —");
await setLabels(TASK_COLS.execution.day, DAYS, PALETTE.day);
await setLabels(TASK_COLS.execution.focus, FOCI, PALETTE.focus);
await setLabels(TASK_COLS.execution.done, [DONE.no, DONE.yes], PALETTE.done);

console.log("\n— אימות —");
const after = (await gql(`{ boards(ids:[${EXEC}]){ columns { id title type settings_str } } }`)).boards[0].columns;
for (const c of after) {
  if (c.type !== "status") { console.log(`   ${c.type.padEnd(10)} ${c.title} (${c.id})`); continue; }
  const s = JSON.parse(c.settings_str);
  const dead = new Set((s.deactivated_labels || []).map(String));
  const active = Object.entries(s.labels).filter(([k]) => !dead.has(k)).map(([, v]) => v);
  console.log(`   status     ${c.title} (${c.id}) → ${active.join(", ")}`);
}

console.log(`\n⚠ עדכן ב-shared/tasks-boards.js:  order: "${orderCol.id}"`);
