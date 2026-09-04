/* ============================================================
   מחזיר את דגל הבדיקה למקומו
   ------------------------------------------------------------
   ⚠ חבילות בדיקה מכבות זמנית את `demo` כדי לבדוק התנהגות של
     חניך רגיל, ומחזירות אותו ב-`finally`. הרצה שנפלה באמצע —
     או שנקטעה — משאירה אותו כבוי, **וחשבון הבדיקה נספר בנוכחות
     ובממוצעים של כל המכינה** בלי שאיש ישים לב.

   להריץ אחרי כל הרצה שנפלה:
     node --env-file=.env tools/demo-flag.mjs
   ============================================================ */
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { studentRows } from "../api/_student-rows.js";

const NAME = "חשבון בדיקה";
const rows = await studentRows({ force: true });
const row = rows.find((r) => r.name === NAME);

if (!row) { console.log("אין שורה בשם \"" + NAME + "\"."); process.exit(1); }
if (row.demo) { console.log("דגל הבדיקה כבר דולק. אין מה לעשות."); process.exit(0); }

await gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){
     change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                   create_labels_if_missing:false){ id } }`,
  { b: MECHINA_BOARDS.roster, i: row.id,
    v: JSON.stringify({ [MECHINA_COLS.roster.demo]: { checked: "true" } }) });

console.log("דגל הבדיקה הודלק על " + row.id + " — החשבון חזר להיות לא-נספר.");
