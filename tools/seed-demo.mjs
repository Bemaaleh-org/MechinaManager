/* ============================================================
   חשבון הבדיקה — יצירה מחדש
   ------------------------------------------------------------
   חבילות הבדיקה נכנסות דרך החשבון הזה. בלעדיו `npm test`
   נופל כולו ב"אין חשבון בדיקה", ואין דרך לאמת שינוי בשרת.

   ⚠ **`demo` דולק ולכן הוא אינו נספר בשום מקום** — לא בנוכחות,
     לא בממוצע התורניות, לא במכסות ולא בסטטיסטיקה (4לא).
     `activeStudents()` מסננת אותו בשורה אחת, ולכן גם מסך
     שייכתב מחר יסנן אותו מעצמו.

   ⚠ **`active` דולק בכוונה.** כיבויו מוציא אותו מכל ספירה —
     וגם **חוסם לו את הכניסה**, וזה בדיוק ההפך ממה שנדרש.

   ⚠ **הסיסמה יושבת כאן ולא בלוח** (שם יש גיבוב scrypt). זה
     מקובל **רק** משום שזה חשבון שאינו של אדם ואינו נספר.

   הרצה: node --env-file=.env tools/seed-demo.mjs
   ============================================================ */
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { CRED_COLS } from "../shared/cred-ids.js";
import { studentRows } from "../api/_student-rows.js";
import { hashPassword } from "../api/_credentials.js";

const NAME = "חשבון בדיקה";
const TZ = "999999999";
const USER = "bdika";
const PASS = process.env.DEMO_PASS || "mechina2026";

const rows = await studentRows();
if (rows.some((r) => r.demo)) {
  console.log("כבר קיים חשבון בדיקה. לא נוצר שני.");
  process.exit(0);
}
if (rows.some((r) => r.name === NAME || String(r.tz) === TZ)) {
  console.log("קיימת שורה בשם או בת.ז האלה בלי דגל הבדיקה — לבדוק ידנית.");
  process.exit(1);
}

const C = MECHINA_COLS.roster;
const S = CRED_COLS.student;
const cols = {
  [C.tz]: TZ,
  [C.demo]: { checked: "true" },
  [C.active]: { checked: "true" },
  [C.gender]: { label: "זכר" },
  [S.user]: USER,
  [S.pass]: await hashPassword(PASS),
  [S.email]: "bdika@bemaaleh.com",
};

const r = await gql(
  `mutation($b:ID!,$n:String!,$c:JSON!){
     create_item(board_id:$b, item_name:$n, column_values:$c,
                 create_labels_if_missing:false){ id } }`,
  { b: MECHINA_BOARDS.roster, n: NAME, c: JSON.stringify(cols) });

console.log("נוצר חשבון בדיקה: " + r.create_item.id + "  (" + USER + ")");
console.log("⚠ אינו נספר בשום מונה. כן מופיע בבוררי שיבוץ (assignableStudents).");
