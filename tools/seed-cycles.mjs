/* ============================================================
   לוח המחזורים
   ------------------------------------------------------------
   ⚠ רושם את המחזור הנוכחי כשורה ראשונה, עם המזהים שכבר קיימים
     בקבצי ה-ids. בלי זה המערכת הייתה מתחילה מ"אין מחזור" —
     ומחזור ב׳ הוא נתון, לא היעדר נתון.

   ⚠ רץ שוב ושוב בבטחה.
   ============================================================ */
import fs from "fs";
import { gql } from "../api/_monday.js";
import { CYCLE_STATUS, CYCLE_STATUSES, CYCLE_BOARDS } from "../shared/cycles.js";

import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";
import { PLACEMENT_BOARDS } from "../shared/placements-ids.js";
import { BUDGET_BOARDS } from "../shared/budget-ids.js";
import { FAULTS_BOARD } from "../shared/faults-ids.js";
import { SAFETY_BOARD } from "../shared/safety-ids.js";
import { EXTRA } from "../shared/extras-ids.js";

const WORKSPACE = process.env.MONDAY_WORKSPACE || null;
const LAB = (arr) => JSON.stringify({ labels: Object.fromEntries(arr.map((l, i) => [String(i + 1), l])) });

const boards = (await gql(`{ boards(limit:200){ id name state } }`)).boards
  .filter((b) => b.state === "active");

const NAME = "מכינה — מחזורים";
let board = boards.find((b) => b.name.trim() === NAME);
if (board) {
  console.log(`לוח קיים: ${NAME} -> ${board.id}`);
} else {
  const d = await gql(
    `mutation($n:String!,$w:ID){ create_board(board_name:$n, board_kind:public, workspace_id:$w){ id } }`,
    { n: NAME, w: WORKSPACE });
  board = { id: d.create_board.id };
  console.log(`לוח נוצר: ${NAME} -> ${board.id}`);
}

async function col(title, type, defaults) {
  const cols = (await gql(`{ boards(ids:[${board.id}]){ columns{ id title } } }`)).boards[0].columns;
  const hit = cols.find((c) => c.title === title);
  if (hit) { console.log(`  = ${title}`); return hit.id; }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$ty:ColumnType!,$s:JSON){ create_column(board_id:$b,title:$t,column_type:$ty,defaults:$s){ id } }`,
    { b: board.id, t: title, ty: type, s: defaults || null });
  console.log(`  + ${title}`);
  return d.create_column.id;
}

const cols = {
  status: await col("סטטוס", "status", LAB(CYCLE_STATUSES)),
  from: await col("תחילת השנה", "date"),
  to: await col("סוף השנה", "date"),
  /* ⚠ מפה שטוחה בטקסט, קריאה לאדם שפותח את הלוח:
       mechina.roster = 123456
       lessons.gantt  = 123457 */
  boards: await col("לוחות", "long_text"),
  /* אילו שלבי הקמה כבר נעשו, מופרדים בפסיק */
  done: await col("שלבים שהושלמו", "long_text"),
  by: await col("נפתח על ידי", "text"),
  note: await col("הערה", "text"),
};

/* ---------- המחזור הנוכחי ---------- */
const CURRENT = {
  "mechina.roster": MECHINA_BOARDS.roster,
  "mechina.requests": MECHINA_BOARDS.requests,
  "mechina.absence": MECHINA_BOARDS.absence,
  "mechina.calendar": MECHINA_BOARDS.calendar,
  "mechina.marked": MECHINA_BOARDS.marked,
  "mechina.incidents": MECHINA_BOARDS.incidents,
  "mechina.leaderWeeks": MECHINA_BOARDS.leaderWeeks,
  "lessons.sheets": LESSON_BOARDS.sheets,
  "lessons.meetings": LESSON_BOARDS.meetings,
  "lessons.evals": LESSON_BOARDS.evals,
  "lessons.gantt": LESSON_BOARDS.gantt,
  "placements.assignments": PLACEMENT_BOARDS.assignments,
  "placements.definitions": PLACEMENT_BOARDS.definitions,
  "budget.days": BUDGET_BOARDS.days,
  "budget.orders": BUDGET_BOARDS.orders,
  "faults.board": FAULTS_BOARD,
  "safety.board": SAFETY_BOARD,
  "extras.hosting": EXTRA.hosting.board,
  "extras.loans": EXTRA.loans.board,
};

const flat = Object.entries(CURRENT)
  .filter(([, v]) => v)
  .map(([k, v]) => `${k} = ${v}`).join("\n");

const items = (await gql(`{ boards(ids:[${board.id}]){ items_page(limit:50){ items{ id name } } } }`))
  .boards[0].items_page.items;

const NOW = "מחזור ב׳";
let cur = items.find((i) => i.name.trim() === NOW);
const values = JSON.stringify({
  [cols.status]: { label: CYCLE_STATUS.active },
  [cols.boards]: flat,
  [cols.done]: "boards,students,gantt,sheets,groups,roles",
  [cols.note]: "המחזור שרץ. נרשם אוטומטית מקבצי המזהים.",
});

if (cur) {
  await gql(`mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: board.id, i: cur.id, v: values });
  console.log(`\nעודכן: ${NOW} -> ${cur.id}`);
} else {
  const d = await gql(`mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: board.id, n: NOW, v: values });
  console.log(`\nנוצר: ${NOW} -> ${d.create_item.id}`);
}

const body = `/* ============================================================
   מזהי לוח המחזורים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-cycles.mjs.
   ============================================================ */

export const CYCLES_BOARD = ${JSON.stringify(String(board.id))};

export const CYCLES_COLS = ${JSON.stringify(cols, null, 2)};
`;
fs.writeFileSync("shared/cycles-ids.js", body, "utf8");
console.log("נכתב shared/cycles-ids.js");

console.log(`\n${Object.keys(CURRENT).length} לוחות נרשמו · ${CYCLE_BOARDS.length} מוגדרים בחוזה`);
for (const b of CYCLE_BOARDS) {
  if (!CURRENT[b.path]) console.log(`  ⚠ חסר מזהה: ${b.title} (${b.path})`);
}
