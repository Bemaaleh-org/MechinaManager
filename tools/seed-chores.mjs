/* ============================================================
   הקמת לוחות התורניות
   ------------------------------------------------------------
   node --env-file=.env tools/seed-chores.mjs

   ⚠ הרצה חוזרת אינה מכפילה: לוח, עמודה ושורת זריעה נמצאים
     לפי שם. הקובץ כותב את shared/chores-ids.js — **הוא חייב
     להיכנס לקומיט**, אחרת הדיפלוי לא ימצא את הלוחות.

   ⚠ **חמישה לוחות ולא אחד.** הפיצול אינו סגנון:
       גזרות   — הגדרה. משתנה נדיר, ואב הבית עורך אותה.
       שיבוץ   — שורה לכל חניך·גזרה·תקופה. **המונים נגזרים ממנה**
                 ולא נשמרים בשום מקום.
       התאמות  — +1 / -1 ידני, עם סיבה. נפרד מהשיבוץ כי הוא
                 **אינו** תורנות שקרתה — הוא תיקון של הספירה.
       צ׳ק ליסט — תבנית המטלות לכל יום.
       ביצוע   — שורה = בוצע. אין עמודת "בוצע": ביטול סימון הוא
                 מחיקת שורה, ולכן אין מצב שלישי שקוף.
   ============================================================ */
import { writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";

const ws = (await gql(`query($b:[ID!]){ boards(ids:$b){ workspace_id } }`,
  { b: [MECHINA_BOARDS.roster] })).boards[0].workspace_id;
const all = await gql(`query{ boards(limit:400, board_kind:public){ id name } }`);

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
async function tidy(bid) {
  const items = (await gql(
    `query($b:[ID!]){ boards(ids:$b){ items_page(limit:100){ items{ id name } } } }`,
    { b: [bid] })).boards[0].items_page.items;
  for (const i of items) {
    if (/^(Task|Item|Group|Subitem)\s*\d*$/i.test(String(i.name || "").trim())) {
      await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: i.id });
    }
  }
}

/* ============ 1 · גזרות ============ */
const sectors = await board("תורניות – גזרות");
const S = {
  /* ⚠ שני סוגים, ולא דגל בוליאני. "סוף יום" ו"יומי" מתנהגים
     אחרת לגמרי — האחד שבועי והשני יומי, ולשני יש צ׳ק ליסט. */
  kind: await col(sectors, "סוג", "status", labels("סוף יום", "יומי")),
  cap: await col(sectors, "כמה חניכים", "numbers"),
  detail: await col(sectors, "מה מנקים", "long_text"),
  order: await col(sectors, "סדר", "numbers"),
  /* ⚠ ריק = פעילה. אותה קוטביות הפוכה כמו בכל המערכת. */
  archived: await col(sectors, "מוסתרת", "checkbox"),
};

/* ============ 2 · שיבוץ ============ */
const roster = await board("תורניות – שיבוץ");
const R = {
  student: await col(roster, "מזהה חניך", "text"),
  studentName: await col(roster, "חניך", "text"),
  sector: await col(roster, "מזהה גזרה", "text"),
  sectorName: await col(roster, "גזרה", "text"),
  /* ⚠ **שבוע או תאריך — אחד מהם, לפי סוג הגזרה.** גזרת סוף-יום
     מקבלת `week` (מזהה שבוע ההובלה), וגזרה יומית מקבלת `date`.
     שורה עם שניהם או בלי אף אחד היא שורה שאף מסך לא יציג. */
  week: await col(roster, "מזהה שבוע", "text"),
  weekName: await col(roster, "שבוע", "text"),
  date: await col(roster, "תאריך", "date"),
  by: await col(roster, "שובץ על ידי", "text"),
  at: await col(roster, "נשמר", "text"),
};

/* ============ 3 · התאמות ============ */
const adjust = await board("תורניות – התאמות");
const A = {
  student: await col(adjust, "מזהה חניך", "text"),
  studentName: await col(adjust, "חניך", "text"),
  sector: await col(adjust, "מזהה גזרה", "text"),
  sectorName: await col(adjust, "גזרה", "text"),
  /* ⚠ מספר עם סימן: 1+ או 1-. לא שני שדות. */
  delta: await col(adjust, "שינוי", "numbers"),
  reason: await col(adjust, "סיבה", "text"),
  by: await col(adjust, "נרשם על ידי", "text"),
  at: await col(adjust, "נרשם", "text"),
};

/* ============ 4 · צ׳ק ליסט ============ */
const checklist = await board("תורניות – צ׳ק ליסט");
const C = {
  /* ⚠ "כל יום" הוא ערך אמיתי ולא ברירת מחדל: השגרה היומית
     חוזרת בכל יום, ומטלות השבוע נוספות עליה. */
  day: await col(checklist, "יום", "status",
    labels("כל יום", "א", "ב", "ג", "ד", "ה", "ו", "ש")),
  area: await col(checklist, "אזור", "text"),
  order: await col(checklist, "סדר", "numbers"),
  archived: await col(checklist, "מוסתרת", "checkbox"),
};

/* ============ 5 · ביצוע ============ */
const done = await board("תורניות – ביצוע");
const D = {
  /* ⚠ **שורה = בוצע.** אין עמודת "בוצע", כי ביטול סימון הוא
     מחיקת שורה — ואז אין מצב שלישי שקוף שבו השורה קיימת
     ומסומנת "לא". */
  date: await col(done, "תאריך", "date"),
  item: await col(done, "מזהה מטלה", "text"),
  itemName: await col(done, "מטלה", "text"),
  by: await col(done, "סומן על ידי", "text"),
  byId: await col(done, "מזהה מסמן", "text"),
  at: await col(done, "נשמר", "text"),
};

/* ============ 6 · טקסטים נערכים ============ */
const texts = await board("טקסטים באפליקציה");
const T = {
  /* ⚠ **המפתח הוא שם הפריט**, כדי שהלוח ייקרא לאדם. הקוד
     מחפש לפי המפתח ולא לפי מזהה — כך אפשר לשחזר שורה שנמחקה
     בטעות פשוט ביצירתה מחדש עם אותו שם. */
  title: await col(texts, "כותרת", "text"),
  body: await col(texts, "תוכן", "long_text"),
  by: await col(texts, "נערך על ידי", "text"),
  at: await col(texts, "נערך", "text"),
};

for (const b of [sectors, roster, adjust, checklist, done, texts]) await tidy(b);

/* ============ זריעת הגזרות ============ */
const have = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ items_page(limit:100){ items{ id name } } } }`,
  { b: [sectors] })).boards[0].items_page.items;

/* ⚠ **נקודת הפתיחה בלבד.** אב הבית מוסיף, משנה שם ומסתיר
   מהמסך, בלי דיפלוי — זו כל התכלית של לוח הגזרות. */
const SEED = [
  ["כיתה", "סוף יום", 1],
  ["מגורי בנים", "סוף יום", 2],
  ["מגורי בנות", "סוף יום", 3],
  ["חאן יונס וחוץ", "סוף יום", 4],
  ["משרדים", "סוף יום", 5],
  /* ⚠ הגזרה היומית. שלושה חניכים ליום — והמספר בלוח ולא בקוד,
     כי אב הבית משנה אותו. */
  ["מטבח וחד״א", "יומי", 6],
];
for (const [name, kind, order] of SEED) {
  if (have.some((i) => i.name.trim() === name)) { console.log("  קיימת:", name); continue; }
  await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){id} }`,
    { b: sectors, n: name, v: JSON.stringify({
      [S.kind]: { label: kind },
      [S.order]: order,
      [S.cap]: kind === "יומי" ? 3 : "",
    }) });
  console.log("  נזרעה:", name);
}

const j = (o) => JSON.stringify(o, null, 4).replace(/\n/g, "\n  ");
writeFileSync(new URL("../shared/chores-ids.js", import.meta.url), `/* ============================================================
   מזהי לוחות התורניות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-chores.mjs.

   ⚠ **אובייקטים ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign, ומחרוזת מיוצאת נקבעת פעם אחת
     בטעינת המודול.

   ⚠ **\`texts\` אינו שייך למחזור.** נוסח נוהל הוא ידע מוסדי
     שעובר בין מחזורים, כמו מסמכי החפיפה ולוח המנות (4מז).
     הגזרות, השיבוץ, ההתאמות והביצוע **כן** במחזור.
   ============================================================ */

export const CHORE_BOARDS = {
  sectors: "${sectors}",
  roster: "${roster}",
  adjust: "${adjust}",
  checklist: "${checklist}",
  done: "${done}",
  texts: "${texts}",
};

export const CHORE_COLS = {
  sectors: ${j(S)},
  roster: ${j(R)},
  adjust: ${j(A)},
  checklist: ${j(C)},
  done: ${j(D)},
  texts: ${j(T)},
};
`);

console.log("\nנכתב shared/chores-ids.js");
console.log(JSON.stringify({ sectors, roster, adjust, checklist, done, texts }));
