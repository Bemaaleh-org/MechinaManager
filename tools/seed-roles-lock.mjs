/* ============================================================
   קוד נעילת התפקידים הקבועים
   ------------------------------------------------------------
     node --env-file=.env tools/seed-roles-lock.mjs        (יבש)
     node --env-file=.env tools/seed-roles-lock.mjs --go   (מבצע)

   יוצר בלוח ההרשאות עמודה "קוד נעילת תפקידים" ושורה אחת
   שנושאת אותה, ומכניס לה את ברירת המחדל.

   ⚠⚠⚠ **הקוד אינו נכתב לעמודת `code`.** היא סוד הכניסה
     (`_signin.js` מחפש בה התאמה), וכל ערך שם הוא קוד שאפשר
     להיכנס איתו. השורה שנוצרת כאן נושאת `code` **ריק**
     ו-`active` **כבוי**, ולכן היא אינה דלת כניסה: בלי סוד
     אין מה להתאים, ושורה כבויה נדחית ממילא.

   ⚠ **הרצה יבשה כברירת מחדל** — זה לוח ההרשאות, הרגיש
     במערכת. `--go` כדי לבצע (הדפוס של 5ז).

   ⚠ **אידמפוטנטי** — עמודה או שורה בשם הזה אינן נוצרות שוב,
     וקוד שכבר הוזן אינו נדרס.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import {
  AUTH_BOARD, AUTH_COLS, SETTINGS_ROW, ROLES_LOCK_DEFAULT, KIND,
} from "../shared/auth-board.js";

const GO = process.argv.includes("--go");
const PATH = "shared/auth-board.js";
const TITLE = "קוד נעילת תפקידים";

const say = (s) => console.log(s);
say(GO ? "\n▶ מבצע\n" : "\n▶ הרצה יבשה — הוסיפו --go כדי לבצע\n");

const b = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`,
  { b: [AUTH_BOARD] },
)).boards[0];
say(`לוח: ${b.name}`);

/* ---- העמודה ---- */
let colId = "";
const haveCol = b.columns.find((c) => String(c.title).trim() === TITLE);
if (haveCol) {
  colId = String(haveCol.id);
  say(`  קיימת: ${TITLE} → ${colId}`);
} else if (GO) {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: AUTH_BOARD, t: TITLE, c: "text" },
  );
  colId = String(d.create_column.id);
  say(`  נוצרה: ${TITLE} → ${colId}`);
} else {
  say(`  תיווצר: ${TITLE}`);
}

/* ---- שורת ההגדרות ----
   ⚠ נקראת לפי **שם**, כדי ששורה שנמחקה בטעות תחזור לחיים
   ביצירה מחדש עם אותו שם — בלי לתקן קוד (הדפוס של 4צ). */
const rows = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ items_page(limit:500){ items{ id name } } } }`,
  { b: [AUTH_BOARD] },
)).boards[0].items_page.items;

const haveRow = rows.find((r) => String(r.name).trim() === SETTINGS_ROW);
if (haveRow) {
  say(`  קיימת שורה: ${SETTINGS_ROW} → ${haveRow.id}`);
} else if (GO) {
  /* ⚠ code ריק ו-active כבוי — ראו האזהרה בראש הקובץ.

     ⚠⚠ **ו-kind = "קוד משותף", כדי ש-`identities()` תדלג עליה.**
       המסנן הזה כבר קיים ומתועד ("אינו אדם ולכן אין לו זהות
       אישית"), והשורה הזו אינה אדם בדיוק באותו מובן. בלעדיו
       היא נכנסת לרשימת הזהויות כאיש צוות ש-`isFresh` שלו
       true — כלומר "טרם נרשם" — וכל מסלול שמחפש שם עובר
       עליה. אין היום מסך שמציג אותה, וזו בדיוק הסיבה לסגור
       את זה עכשיו ולא אחרי שייכתב אחד. */
  const vals = JSON.stringify({
    [AUTH_COLS.code]: "",
    [AUTH_COLS.active]: { checked: "false" },
    [AUTH_COLS.kind]: { label: KIND.shared },
    ...(colId ? { [colId]: ROLES_LOCK_DEFAULT } : {}),
  });
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: AUTH_BOARD, n: SETTINGS_ROW, v: vals },
  );
  say(`  נוצרה שורה: ${SETTINGS_ROW} → ${d.create_item.id}`);
} else {
  say(`  תיווצר שורה: ${SETTINGS_ROW} (code ריק · active כבוי)`);
}

/* ---- הקוד עצמו, רק אם השורה קיימת וריקה ----
   ⚠ **קוד שכבר הוזן אינו נדרס.** ראש המכינה עשוי לשנות אותו
     בלוח, והרצה חוזרת של ההקמה אינה אמורה להחזיר את 890890. */
if (GO && haveRow && colId) {
  const cur = (await gql(
    `query($i:[ID!],$c:[String!]){ items(ids:$i){ column_values(ids:$c){ text } } }`,
    { i: [haveRow.id], c: [colId] },
  )).items[0].column_values[0]?.text || "";
  if (cur.trim()) {
    say(`  לא נגעתי — קוד כבר מוגדר בלוח`);
  } else {
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: AUTH_BOARD, i: haveRow.id, v: JSON.stringify({ [colId]: ROLES_LOCK_DEFAULT }) },
    );
    say(`  נכתב הקוד ההתחלתי`);
  }
}

if (!GO) { say("\n(יבש — לא נכתב דבר)\n"); process.exit(0); }

/* ---- המזהה לקובץ, בהחלפה כירורגית ----
   ⚠ shared/auth-board.js אינו מחולל והוא מלא בהערות; מוחלף
     רק מציין המקום הריק (הדפוס של seed-appeal). */
let src = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)lockCode: )""(,)/;
if (empty.test(src)) {
  writeFileSync(PATH, src.replace(empty, `$1"${colId}"$3`), "utf8");
  say(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = src.match(/\n\s*lockCode: "([^"]+)"/);
  if (!filled) { console.error(`\n✗ לא נמצאה השורה lockCode ב-${PATH}`); process.exit(1); }
  say(`  לא נגעתי — lockCode כבר מוגדר: ${filled[1]}`);
}

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/auth-board.js?v=" + Date.now());
if (!fresh.rolesLockReady()) {
  console.error("\n✗ rolesLockReady() עדיין false.\n");
  process.exit(1);
}
say("✓ rolesLockReady() = true");
say("⚠ shared/auth-board.js חייב להיכנס לקומיט.\n");
