/* ============================================================
   עמודות הזהות בשני הלוחות
   ------------------------------------------------------------
   ⚠ "סיסמה" מחזיקה **גיבוב** ולא סיסמה. שם העמודה בלוח נבחר
     בכוונה כך שמי שיפתח אותו יראה מיד שאין שם מה לקרוא.

   ⚠ האימייל של חניך הוא מידע אישי. הוא נשמר רק אם החניך הזין
     אותו בעצמו במסך, ואינו מיובא משום קובץ — בפרט לא מקובץ
     משרד החינוך, שנשאר מחוץ למערכת.

   ⚠ רץ שוב ושוב בבטחה. עמודה שקיימת מדולגת.
   ============================================================ */
import fs from "fs";
import { gql } from "../api/_monday.js";
import { AUTH_BOARD } from "../shared/auth-board.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";

async function col(board, title, type) {
  const cols = (await gql(`{ boards(ids:[${board}]){ columns{ id title } } }`)).boards[0].columns;
  const hit = cols.find((c) => c.title === title);
  if (hit) { console.log(`  = ${title} -> ${hit.id}`); return hit.id; }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$ty:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$ty){ id } }`,
    { b: board, t: title, ty: type });
  console.log(`  + ${title} -> ${d.create_column.id}`);
  return d.create_column.id;
}

const out = {};

for (const [key, board, label] of [
  ["staff", AUTH_BOARD, "לוח ההרשאות"],
  ["student", MECHINA_BOARDS.roster, "מצבת החניכים"],
]) {
  console.log(`\n${label}:`);
  out[key] = {
    user: await col(board, "שם משתמש", "text"),
    /* ⚠ גיבוב scrypt. אין כאן סיסמה ואי אפשר לגזור אותה מכאן. */
    pass: await col(board, "סיסמה (מגובבת)", "text"),
    email: await col(board, "אימייל", "text"),
    /* "hash|תפוגה" או "hand:hash|תפוגה" לקוד שנמסר ביד */
    reset: await col(board, "איפוס סיסמה", "text"),
    /* ⚠ מתי נקבעה הסיסמה — לא חובה, אבל זו השאלה הראשונה
       כשמישהו אומר "אני לא מצליח להיכנס". */
    setAt: await col(board, "הסיסמה נקבעה", "text"),
  };
}

const body = `/* ============================================================
   מזהי עמודות הזהות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-credentials.mjs.
   ⚠ צד שרת בלבד. אין לייבא מ-src/.
   ============================================================ */

export const CRED_COLS = ${JSON.stringify(out, null, 2)};
`;
fs.writeFileSync("shared/cred-ids.js", body, "utf8");
console.log("\nנכתב shared/cred-ids.js");
