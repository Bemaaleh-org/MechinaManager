/* ============================================================
   פרטי קשר של המרצה בגיליון השיעור
   ------------------------------------------------------------
   ⚠ **הפרטים יושבים על הגיליון ולא על חוות הדעת.** חוות דעת
     היא אירוע — מרצה שהגיע פעם אחת; הגיליון הוא הקשר המתמשך
     איתו. מספר טלפון שיושב רק על חוות דעת נמצא רק אחרי שכבר
     כתבו עליו משהו, וזה בדיוק ההפך מהצורך.

   ⚠ **טלפון ואימייל כטקסט ולא כעמודות המיוחדות של monday.**
     עמודת `phone` דורשת `{phone,countryShortName}` ו-`email`
     דורשת `{email,text}`, ומחרוזת לבדה **נדחית בשקט** (4ש).
     כאן הערך מוקלד ביד על ידי אחראי הלו״ז ולא מיובא, והוא
     לעיתים "052-1234567 (המשרד)" — טקסט חופשי הוא הצורה
     הנכונה, לא פשרה.

   מריצים פעם אחת ומעתיקים את המזהים ל-shared/lessons-boards.js.
   ============================================================ */
import { gql } from "../api/_monday.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";

const WANT = [
  ["טלפון המרצה", "text", "phone"],
  ["אימייל המרצה", "text", "mail"],
  ["פרטי קשר נוספים", "long_text", "contact"],
];

const cols = (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
  { b: [LESSON_BOARDS.sheets] })).boards[0].columns;

const out = [];
for (const [title, type, key] of WANT) {
  const hit = cols.find((c) => String(c.title).trim() === title);
  if (hit) { out.push([key, String(hit.id), "קיימת"]); continue; }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: LESSON_BOARDS.sheets, t: title, c: type });
  out.push([key, String(d.create_column.id), "נוצרה"]);
}

console.log("\n  → shared/lessons-boards.js · LESSON_COLS.sheets:");
for (const [key, id, what] of out) console.log(`    ${key}: "${id}",   // ${what}`);
