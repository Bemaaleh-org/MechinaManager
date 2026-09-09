/* ============================================================
   התפריט השבועי — לוח, ותפריט שבוע 1
   ------------------------------------------------------------
     npm run seed:weekmenu

   ⚠⚠ **המקור הוא הקובץ שאחים צירף** ("תפריט שבועיים.xlsx"),
     והוזן **כלשונו**. לא קוצר, לא "שופר" ולא הושלם — אותו
     כלל של תיאורי התפקידים (4יא). מי שיערוך, לוודא מול מי
     שכתב.

   ⚠⚠ **רק שבוע 1, וזו בקשה מפורשת.** הקובץ מחזיק שבועיים,
     והוזן ממנו הבלוק הראשון בלבד.

   ⚠⚠ **ומה שהקובץ אינו אומר — נשאר ריק.**
     · **צהריים אינה בקובץ בכלל.** התאים נשארים ריקים והמסך
       אומר "טרם הוזן". ניחוש היה נראה סמכותי והיה שגוי —
       אותו לקח של מבנה הצ׳ק ליסט (4צ).
     · **שישי ושבת** מסומנים בקובץ במפורש כ-"—" (ריק), ולכן
       אינם נזרעים.
     · **ארוחת הבוקר אינה טבלה בקובץ** אלא רשימת מצרכים
       ב"סיכום מצרכים" שמסומנים "לבוקר". היא נזרעת כארוחה
       קבועה זהה לכל יום א׳–ה׳, וההערה על השורה אומרת מאיפה
       היא באה — כדי שמי שיפתח את הלוח לא יחשוב שמישהו תכנן
       חמש ארוחות בוקר שונות.

   ⚠ **אידמפוטנטי.** הלוח נמצא לפי שם ואינו נוצר שוב, ותא
     שכבר נכתב **אינו נדרס** — הזריעה היא נקודת פתיחה, ומרגע
     שאחראי המטבח נגע בתא הוא שלו.

   ⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז). בלי זה כל שורה בלי יום הייתה נקראת כאילו
     יש לה יום.

   ⚠ אחרי ההרצה: npm run clean:defaults — monday יוצרת לוח
     חדש עם שורות דמה (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { DAYS, MEALS } from "../shared/weekmenu.js";

const TITLE = "מטבח – תפריט שבועי";
const PATH = "shared/weekmenu-ids.js";

/* ⚠ 0,1,2,3,4,6,7… — מפתח 5 מדולג. ראו ההערה בראש. */
const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 0; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

const labels = (names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(LABEL_KEYS[i]), n])) });

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [board] })).boards[0].columns;

const make = async (board, title, type, defaults) => {
  const have = (await cols(board)).find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type, s: defaults || null });
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

/* ---------- הלוח ---------- */
const existing = (await gql(`{ boards(limit:400, state:active){ id name } }`)).boards;
const hit = existing.find((b) => String(b.name).trim() === TITLE);
let board;
if (hit) { board = String(hit.id); console.log(`\nקיים: ${TITLE} → ${board}\n`); }
else {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`, { n: TITLE });
  board = String(d.create_board.id);
  console.log(`\nנוצר: ${TITLE} → ${board}\n`);
}

const out = {
  day: await make(board, "יום", "status", labels(DAYS)),
  meal: await make(board, "ארוחה", "status", labels(MEALS)),
  main: await make(board, "מנה עיקרית", "long_text"),
  gf: await make(board, "ללא גלוטן", "text"),
  side: await make(board, "תוספת", "long_text"),
  protein: await make(board, "חלבון נוסף", "text"),
  items: await make(board, "מצרכים", "long_text"),
  /* ⚠ מזהי מנות מלוח המנות, מופרדים בפסיק. טקסט ולא connect
     כדי שלא נחזיק תלות במבנה של monday שאין לנו דרך לאמת. */
  dishes: await make(board, "מנות מקושרות", "text"),
  note: await make(board, "הערה", "text"),
};

/* ---------- כתיבת המזהים ---------- */
const head = `/* ============================================================
   התפריט השבועי — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-weekmenu.mjs.
   ============================================================ */

`;
let src = existsSync(PATH) ? readFileSync(PATH, "utf8") : head;

/* ⚠ `;\r?\n` ומחיקת כפילויות — git בווינדוס בודק ב-CRLF, והביטוי
   הישן לא תפס כלום ואז כל החלפה **הוסיפה** הצהרה שנייה. שתי
   הצהרות export לאותו שם הן SyntaxError, כלומר כל api/kitchen.js
   מפסיק להיטען וכל מסך מחזיר 500 (5כג). */
const put = (name, value) => {
  const re = () => new RegExp(`export const ${name} = [\\s\\S]*?;\\r?\\n`, "g");
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  if (!re().test(src)) { src += "\n" + line; return; }
  let first = true;
  src = src.replace(re(), () => (first ? ((first = false), line) : ""));
};

put("WEEKMENU_BOARDS", { board });
put("WEEKMENU_COLS", out);

if (!new RegExp("export const weekMenuReady\\s*=").test(src)) {
  src += `
/** ⚠ בלי הלוח המסך אומר מה להריץ, ואינו מציג טבלה ריקה (עיקרון 6). */
export const weekMenuReady = () =>
  Boolean(WEEKMENU_BOARDS.board && WEEKMENU_COLS.day && WEEKMENU_COLS.meal);
`;
}
writeFileSync(PATH, src, "utf8");

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/weekmenu-ids.js?v=" + Date.now());
if (!fresh.weekMenuReady()) {
  console.error("\n✗ weekMenuReady() עדיין false.\n");
  process.exit(1);
}
console.log(`\n✓ נכתב ${PATH} — חייב להיכנס לקומיט.`);

/* ============================================================
   תפריט שבוע 1 — מהקובץ, כלשונו
   ============================================================ */
const SALAD = "סלט\nמלפפון, עגבניה, פלפל, שמן זית, לימון";
const CUT = "ירקות חתוכים\nמלפפון, עגבניה, פלפל, שמן זית, לימון";

/* ⚠ ארוחת בוקר — מרשימת "לבוקר" שבגיליון "סיכום מצרכים",
   ולא מטבלה. אותה ארוחה בכל יום, וזה מה שהקובץ אומר. */
const BREAKFAST = {
  main: "לחם, גבינות, ממרחים",
  gf: "",
  side: "ירקות חתוכים",
  protein: "ביצים, טונה, קוטג׳, גבינה לבנה, טחינה",
  items: "לחם (לבן ומלא), ביצים, טונה, קוטג׳, גבינה לבנה, טחינה, שיבולת שועל, קורנפלקס, חלב, שוקולד למריחה, סילאן, זיתים",
  note: "ארוחה קבועה — מתוך רשימת המצרכים שבקובץ, ולא תוכננה ליום מסוים",
};

const DINNER = {
  ראשון: {
    main: "פתיתים ברוטב עגבניות",
    gf: "פתיתים ללא גלוטן",
    side: SALAD,
    protein: "טונה, קוטג׳",
    items: "3 קג פתיתים, פחית רסק עגבניות, פחית עגבניות חתוכות, בצל, תבלינים",
  },
  שני: {
    main: "מוקפץ נודלס וירקות",
    gf: "אורז במקום נודלס",
    side: CUT,
    protein: "קוטג׳, טונה",
    items: "3 קג נודלס, סויה, טריאקי, צ'ילי מתוק, גמבה, גזר, בצל, שום, תבלינים",
  },
  שלישי: {
    main: "נקנקייה בלחמניה\n(צמחונים: נקניקייה צמחונית)",
    gf: "לחמנייה ללא גלוטן",
    side: SALAD,
    protein: "טונה",
    items: "90 נקנקיות, 70 לחמניות, קטשופ, מיונז, כרוב כבוש, מלפפון חמוץ",
  },
  רביעי: {
    main: "פסטה ברוטב שמנת פטריות",
    gf: "פסטה ללא גלוטן",
    side: SALAD,
    protein: "קוטג׳, טונה",
    items: "3 קג פסטה, 3 חב' שמנת, פטריות, תבלינים",
  },
  חמישי: {
    main: "קוסקוס עם ירקות אפויים",
    gf: "אורז במקום קוסקוס",
    side: SALAD,
    protein: "לחם זעתר, טונה",
    items: "קוסקוס, גזר, תפו\"א, בטטה, קישוא, בצל, שום, תבלינים",
  },
};

/* מה כבר יש בלוח — ⚠ תא שנכתב אינו נדרס */
const have = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ items_page(limit:200){ items{ id name
     column_values(ids:["${out.day}","${out.meal}"]){ id text } } } } }`,
  { b: [board] })).boards[0].items_page.items;
const key = (i) => {
  const g = (c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
  return `${g(out.day)}|${g(out.meal)}`;
};
const taken = new Set(have.map(key));

let added = 0, skipped = 0;
for (const day of ["ראשון", "שני", "שלישי", "רביעי", "חמישי"]) {
  for (const [meal, data] of [["ארוחת בוקר", BREAKFAST], ["ארוחת ערב", DINNER[day]]]) {
    if (!data) continue;
    if (taken.has(`${day}|${meal}`)) { skipped++; continue; }
    await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){
         create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
      {
        b: board, n: `${day} · ${meal}`,
        v: JSON.stringify({
          [out.day]: { label: day },
          [out.meal]: { label: meal },
          [out.main]: data.main || "",
          [out.gf]: data.gf || "",
          [out.side]: data.side || "",
          [out.protein]: data.protein || "",
          [out.items]: data.items || "",
          [out.note]: data.note || "",
        }),
      });
    added++;
  }
}

console.log(`\n✓ תפריט שבוע 1: נוספו ${added} תאים${skipped ? `, ${skipped} כבר היו` : ""}.`);
console.log("  ⚠ ארוחות צהריים אינן בקובץ ונשארו ריקות, וכך גם שישי ושבת.");
console.log("\nעכשיו: npm run clean:defaults\n");
