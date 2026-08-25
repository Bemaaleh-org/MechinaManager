/* ============================================================
   הקמת לוחות תקציב המטבח + כתיבת shared/budget-ids.js
   ------------------------------------------------------------
   הרצה:  node --env-file=.env tools/seed-budget.mjs

   ⚠ מוסיף בלבד. אם הלוחות כבר קיימים (המזהים מלאים) — יוצא
     בלי לגעת, כדי שלא ייווצרו לוחות כפולים. הבעיה הזו כבר
     קרתה שלוש פעמים במאגר הזה.
   ============================================================ */

import fs from "node:fs";
import { gql } from "../api/_monday.js";
import {
  DAY_TYPE_SEED, DEFAULT_HEADCOUNT, SETTING_HEADCOUNT, budgetReady,
} from "../shared/budget-boards.js";

if (budgetReady()) {
  console.log("לוחות התקציב כבר קיימים. אין מה להקים.");
  process.exit(0);
}

const board = async (name) => String((await gql(
  `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
  { n: name })).create_board.id);

const column = async (b, title, type, defaults = null) => String((await gql(
  `mutation($b:ID!,$t:String!,$c:ColumnType!,$d:JSON){
     create_column(board_id:$b,title:$t,column_type:$c,defaults:$d){ id } }`,
  { b, t: title, c: type, d: defaults })).create_column.id);

const item = (b, name, cols) => gql(
  `mutation($b:ID!,$n:String!,$v:JSON!){
     create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
  { b, n: name, v: JSON.stringify(cols) });

const labels = (...names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(i), n])) });

console.log("יוצר לוחות…");

/* ---------- 1. סוגי ימים ---------- */
const dayTypes = await board("מטבח – סוגי ימים");
const dtCost = await column(dayTypes, "מחיר לאדם", "numbers");
for (const t of DAY_TYPE_SEED) {
  await item(dayTypes, t.name, { [dtCost]: String(t.cost) });
  console.log(`  סוג יום: ${t.name} — ${t.cost} ₪`);
}

/* ---------- 2. חריגות יומיות ---------- */
const days = await board("מטבח – ימי תקציב");
const dDate = await column(days, "תאריך", "date");
const dType = await column(days, "סוג היום", "status", labels(...DAY_TYPE_SEED.map((t) => t.name)));
const dCost = await column(days, "מחיר מיוחד לאדם", "numbers");
const dNote = await column(days, "הערה", "text");

/* ---------- 3. הזמנות אוכל יבש ---------- */
const orders = await board("מטבח – הזמנות אוכל יבש");
const oAmount = await column(orders, "סכום ההזמנה", "numbers");
const oStart = await column(orders, "חודש פתיחה", "text");
const oDate = await column(orders, "תאריך ההזמנה", "date");
const oNote = await column(orders, "הערה", "text");

/* ---------- 4. הגדרות ---------- */
const settings = await board("מטבח – הגדרות תקציב");
const sValue = await column(settings, "ערך", "numbers");
await item(settings, SETTING_HEADCOUNT, { [sValue]: String(DEFAULT_HEADCOUNT) });
console.log(`  הגדרה: ${SETTING_HEADCOUNT} = ${DEFAULT_HEADCOUNT}`);

fs.writeFileSync(new URL("../shared/budget-ids.js", import.meta.url),
`/* ============================================================
   מזהי לוחות תקציב המטבח — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-budget.mjs.
     חייב להיכנס לקומיט — קובץ מזהים שאינו בגיט הוא לוח כפול
     בהמתנה בעמדה הבאה.
   ============================================================ */

export const BUDGET_BOARDS = {
  dayTypes: "${dayTypes}",
  days: "${days}",
  orders: "${orders}",
  settings: "${settings}",
};

export const BUDGET_COLS = {
  dayTypes: { cost: "${dtCost}" },
  days: { date: "${dDate}", type: "${dType}", cost: "${dCost}", note: "${dNote}" },
  orders: { amount: "${oAmount}", startMonth: "${oStart}", date: "${oDate}", note: "${oNote}" },
  settings: { value: "${sValue}" },
};
`);

console.log(`
הוקם:
  סוגי ימים   ${dayTypes}
  ימי תקציב   ${days}
  הזמנות      ${orders}
  הגדרות      ${settings}

המזהים נכתבו ל-shared/budget-ids.js — לזכור לשמור בגיט.`);
