/* ============================================================
   הקמת ארבעת הלוחות החדשים
   ------------------------------------------------------------
   בוגרים · אירוח קבוצות · השאלת ציוד · תפריט ומנות

   ⚠ רץ פעם אחת. מדלג על לוח שכבר קיים לפי שמו, כדי שלא
     ייווצרו כפילויות — זו הייתה תקלה חוזרת בסשנים קודמים.

   ⚠ כותב את המזהים ל-shared/extras-ids.js. הקובץ הזה חייב
     להיכנס לקומיט, אחרת הדיפלוי לא ימצא את הלוחות.
   ============================================================ */
import fs from "fs";
import { gql } from "../api/_monday.js";

const WORKSPACE = process.env.MONDAY_WORKSPACE || null;

const boards = (await gql(`{ boards(limit:200){ id name state } }`)).boards
  .filter((b) => b.state === "active");
const findBoard = (name) => boards.find((b) => b.name.trim() === name);

const LAB = (arr) => JSON.stringify({ labels: Object.fromEntries(arr.map((l, i) => [String(i + 1), l])) });

async function makeBoard(name) {
  const hit = findBoard(name);
  if (hit) { console.log(`לוח קיים: ${name} → ${hit.id}`); return { id: String(hit.id), fresh: false }; }
  const d = await gql(
    `mutation($n:String!,$w:ID){ create_board(board_name:$n, board_kind:public, workspace_id:$w){ id } }`,
    { n: name, w: WORKSPACE });
  console.log(`לוח נוצר: ${name} → ${d.create_board.id}`);
  return { id: String(d.create_board.id), fresh: true };
}

async function col(board, title, type, defaults) {
  const cols = (await gql(`{ boards(ids:[${board}]){ columns{ id title } } }`)).boards[0].columns;
  const hit = cols.find((c) => c.title === title);
  if (hit) return hit.id;
  const d = await gql(
    `mutation($b:ID!,$t:String!,$ty:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$ty,defaults:$s){ id } }`,
    { b: board, t: title, ty: type, s: defaults || null });
  return d.create_column.id;
}

const out = {};

/* ---------- בוגרים ---------- */
{
  const b = await makeBoard("מכינה — בוגרים");
  out.alumni = {
    board: b.id,
    cols: {
      cycle: await col(b.id, "מחזור", "status", LAB(["מחזור א׳", "מחזור ב׳"])),
      unit: await col(b.id, "תפקיד / יחידה", "text"),
      /* ⚠ הרשימה מפורטת מכדי בכוונה: "חי״ר" אחד הפך את
         הסטטיסטיקה לחסרת עניין — גדוד, סיירת ויחידה
         מובחרת הם שלושה מסלולים שונים. המנהל יכול
         להוסיף עוד — ראו CLAUDE.md סעיף 4טז. */
      branch: await col(b.id, "זרוע", "status",
        LAB(["גדודי חי״ר", "סיירות חי״ר וקומנדו", "יחידות מובחרות", "הדרכה",
             "שריון", "תותחנים", "חיל האוויר", "חיל הים", "מודיעין",
             "רפואה", "לוגיסטיקה", "חינוך", "אחר"])),
      /* ⚠ שני שדות ולא אחד: פיקוד וקצונה אינם אותו דבר
         ולא שלבים של אותו סולם. יש מסגרת פיקודית שאינה
         קצונה, ויש קצונה שאינה פיקוד. איחוד היה מוחק את ההבדל. */
      command: await col(b.id, "יצא פיקוד", "status", LAB(["כן", "לא"])),
      officer: await col(b.id, "יצא קצונה", "status", LAB(["כן", "לא"])),
      enlist: await col(b.id, "תאריך גיוס", "date"),
      birthday: await col(b.id, "תאריך לידה", "date"),
      city: await col(b.id, "מקום מגורים", "text"),
      note: await col(b.id, "הערה", "text"),
    },
  };
}

/* ---------- אירוח קבוצות ---------- */
{
  const b = await makeBoard("מכינה — אירוח קבוצות");
  out.hosting = {
    board: b.id,
    cols: {
      org: await col(b.id, "הגוף המתארח", "text"),
      contact: await col(b.id, "איש קשר", "text"),
      phone: await col(b.id, "טלפון", "text"),
      from: await col(b.id, "מתאריך", "date"),
      to: await col(b.id, "עד תאריך", "date"),
      people: await col(b.id, "מספר משתתפים", "numbers"),
      sleeping: await col(b.id, "לינה", "status", LAB(["לנים", "לא לנים"])),
      buildings: await col(b.id, "מבנים", "text"),
      meals: await col(b.id, "ארוחות", "text"),
      status: await col(b.id, "סטטוס", "status",
        LAB(["בתיאום", "מאושר", "התקיים", "בוטל"])),
      briefed: await col(b.id, "תודרך", "status", LAB(["כן", "לא"])),
      handback: await col(b.id, "המבנים הוחזרו", "status", LAB(["כן", "לא"])),
      /* ⚠ תשלום וסכום הם שני שדות. אירוח בתשלום שהסכום
         בו טרם סוכם הוא מצב רגיל, וסכום 0 היה נראה כמו חינם. */
      paid: await col(b.id, "תשלום", "status", LAB(["בתשלום", "ללא תשלום"])),
      amount: await col(b.id, "סכום", "numbers"),
      note: await col(b.id, "הערות", "long_text"),
      by: await col(b.id, "נרשם על ידי", "text"),
    },
  };
}

/* ---------- השאלת ציוד ---------- */
{
  const b = await makeBoard("מכינה — השאלת ציוד");
  out.loans = {
    board: b.id,
    cols: {
      party: await col(b.id, "הגוף", "text"),
      direction: await col(b.id, "כיוון", "status", LAB(["הושאל מאיתנו", "שאלנו מהם"])),
      items: await col(b.id, "הציוד", "long_text"),
      /* ⚠ שורה לכל פריט עם כמה יצא וכמה חזר. ראו
         shared/loan-items.js. העמודה הישנה נשארת לשורות
         שנכתבו לפני הפיצול. */
      lines: await col(b.id, "פריטים", "long_text"),
      out: await col(b.id, "תאריך יציאה", "date"),
      due: await col(b.id, "תאריך החזרה", "date"),
      back: await col(b.id, "חזר בפועל", "date"),
      contact: await col(b.id, "איש קשר", "text"),
      note: await col(b.id, "הערות", "text"),
      by: await col(b.id, "נרשם על ידי", "text"),
    },
  };
}

/* ---------- תפריט ומנות ---------- */
{
  const b = await makeBoard("מכינה — מנות");
  out.dishes = {
    board: b.id,
    cols: {
      /* ⚠ המצרכים לכמה אנשים. כל הכמויות בשורה מתייחסות למספר
         הזה, וההמרה למספר אחר היא הכפלה פשוטה. */
      baseHeads: await col(b.id, "מצרכים עבור (אנשים)", "numbers"),
      kind: await col(b.id, "סוג", "status",
        LAB(["עיקרית", "תוספת", "סלט", "מרק", "קינוח", "ארוחת בוקר", "אחר"])),
      items: await col(b.id, "מצרכים", "long_text"),
      how: await col(b.id, "הוראות הכנה", "long_text"),
      active: await col(b.id, "פעיל", "checkbox"),
    },
  };
  const m = await makeBoard("מכינה — תפריטים");
  out.menus = {
    board: m.id,
    cols: {
      date: await col(m.id, "תאריך", "date"),
      meal: await col(m.id, "ארוחה", "status", LAB(["בוקר", "צהריים", "ערב"])),
      heads: await col(m.id, "מספר סועדים", "numbers"),
      dishes: await col(m.id, "מנות", "long_text"),
      note: await col(m.id, "הערה", "text"),
    },
  };
}

const body = `/* ============================================================
   מזהי הלוחות הנוספים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-more.mjs.
   להקמה:  node --env-file=.env tools/seed-more.mjs
   ============================================================ */

export const EXTRA = ${JSON.stringify(out, null, 2)};

export const extrasReady = () => Boolean(EXTRA.alumni && EXTRA.alumni.board);
`;
fs.writeFileSync("shared/extras-ids.js", body, "utf8");
console.log("\nנכתב shared/extras-ids.js");
