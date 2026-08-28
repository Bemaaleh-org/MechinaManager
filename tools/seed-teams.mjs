/* ============================================================
   הקמת לוחות ניהול הצוותים — משימות ואוצר מילים
   ------------------------------------------------------------
   node --env-file=.env tools/seed-teams.mjs

   ⚠ הרצה חוזרת אינה מכפילה: לוח ועמודה נמצאים לפי שם.
   ⚠ הקובץ כותב את shared/team-ids.js. **הוא חייב להיכנס
     לקומיט**, אחרת הדיפלוי לא ימצא את הלוחות.
   ============================================================ */
import { writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { PLACEMENT_BOARDS } from "../shared/placements-ids.js";

const ws = (await gql(`query($b:[ID!]){ boards(ids:$b){ workspace_id } }`,
  { b: [MECHINA_BOARDS.roster] })).boards[0].workspace_id;
const all = await gql(`query{ boards(limit:300, board_kind:public){ id name } }`);

async function board(name) {
  const hit = all.boards.find((b) => b.name.trim() === name);
  if (hit) { console.log("קיים:", name, hit.id); return String(hit.id); }
  const r = await gql(
    `mutation($n:String!,$w:ID){ create_board(board_name:$n, board_kind:public, workspace_id:$w){ id } }`,
    { n: name, w: ws });
  console.log("נוצר:", name, r.create_board.id);
  return String(r.create_board.id);
}
async function col(bid, title, type, defaults = null) {
  const cs = (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`, { b: [bid] }))
    .boards[0].columns;
  const hit = cs.find((c) => c.title.trim() === title);
  if (hit) return String(hit.id);
  const r = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$d:JSON){ create_column(board_id:$b,title:$t,column_type:$c,defaults:$d){ id } }`,
    { b: bid, t: title, c: type, d: defaults });
  return String(r.create_column.id);
}
const labels = (...ls) => JSON.stringify({
  labels: Object.fromEntries(ls.map((l, i) => [String(i + 1), l])),
});

/* ---------- משימות הצוותים ---------- */
const tasks = await board("צוותים – משימות");
const T = {
  team: await col(tasks, "מזהה צוות", "text"),
  teamName: await col(tasks, "צוות", "text"),
  owner: await col(tasks, "מזהה אחראי", "text"),
  ownerName: await col(tasks, "באחריות", "text"),
  status: await col(tasks, "מזהה סטטוס", "text"),
  statusName: await col(tasks, "סטטוס", "text"),
  stage: await col(tasks, "מזהה שלב", "text"),
  stageName: await col(tasks, "שלב", "text"),
  due: await col(tasks, "תאריך יעד", "date"),
  note: await col(tasks, "הערות", "long_text"),
  link: await col(tasks, "קישור", "text"),
  by: await col(tasks, "נוצר על ידי", "text"),
  byId: await col(tasks, "מזהה יוצר", "text"),
  at: await col(tasks, "נוצר", "text"),
  upBy: await col(tasks, "עודכן על ידי", "text"),
  upAt: await col(tasks, "עודכן", "text"),
};

/* ---------- אוצר המילים ---------- */
const vocab = await board("צוותים – אוצר מילים");
const V = {
  kind: await col(vocab, "סוג", "status", labels("סטטוס", "שלב")),
  order: await col(vocab, "סדר", "numbers"),
  closes: await col(vocab, "נחשב סגור", "checkbox"),
  archived: await col(vocab, "מוסתר", "checkbox"),
};

/* ---------- עמודת ארכוב בהגדרות השיבוצים ---------- */
const archived = await col(PLACEMENT_BOARDS.definitions, "מוארכב", "checkbox");

/* ---------- זריעה ---------- */
const have = (await gql(`query($b:[ID!]){ boards(ids:$b){ items_page(limit:200){ items{ id name } } } }`,
  { b: [vocab] })).boards[0].items_page.items;
const SEED = [
  ["לא התחילה", "סטטוס", 1, false],
  ["בעבודה", "סטטוס", 2, false],
  ["הושלמה", "סטטוס", 3, true],
  ["בוטלה", "סטטוס", 4, true],
  ["לפני האירוע", "שלב", 1, false],
  ["לאחר האירוע", "שלב", 2, false],
];
for (const [name, kind, order, closes] of SEED) {
  if (have.some((i) => i.name.trim() === name)) continue;
  await gql(`mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){id} }`,
    { b: vocab, n: name, v: JSON.stringify({
      [V.kind]: { label: kind }, [V.order]: order,
      ...(closes ? { [V.closes]: { checked: "true" } } : {}) }) });
  console.log("נזרע:", name);
}
for (const i of have) {
  if (/^(Task|Item|Group)\s*\d*$/i.test(i.name.trim())) {
    await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: i.id });
  }
}
const stray = (await gql(`query($b:[ID!]){ boards(ids:$b){ items_page(limit:50){ items{ id name } } } }`,
  { b: [tasks] })).boards[0].items_page.items;
for (const i of stray) {
  if (/^(Task|Item|Group)\s*\d*$/i.test(i.name.trim())) {
    await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: i.id });
  }
}

const j = (o) => JSON.stringify(o, null, 4).replace(/\n/g, "\n  ");
writeFileSync(new URL("../shared/team-ids.js", import.meta.url), `/* ============================================================
   מזהי לוחות ניהול הצוותים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-teams.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign, ומחרוזת מיוצאת נקבעת פעם אחת
     בטעינת המודול.

   ⚠⚠ **\`ownerName\` כאן נכתב בכוונה, וזה ההפך מ-shared/duty-ids.js.**
     שם עמודת הבעלים מחזיקה **מזהה בלבד**, כדי שלוח המשימות
     האישיות לא ייקרא כיומן של אדם (CLAUDE 4מה). כאן הלוח
     **משותף** ליו״ר, למדריך ולחברי הצוות, ו"באחריות מי"
     היא כל התכלית — לכן השם נכתב.

     שני הלוחות נראים דומים וההיפוך הוא הדבר השברירי ביותר
     כאן. מי שיראה אותם זה לצד זה עלול "לתקן" אחד לפי השני.
     ראו CLAUDE.md סעיף 4נ.
   ============================================================ */

export const TEAM_BOARDS = {
  tasks: "${tasks}",
  vocab: "${vocab}",
};

export const TEAM_COLS = {
  tasks: ${j(T)},
  vocab: ${j(V)},
};

/** נוספה ללוח הגדרות השיבוצים הקיים */
export const PLACEMENT_ARCHIVED = "${archived}";
`);

console.log("\nנכתב shared/team-ids.js");
console.log(JSON.stringify({ tasks, vocab, archived }));
