/* ============================================================
   לוחות "הפרויקטים שלי" — הקמה חד-פעמית
   ------------------------------------------------------------
   שלושה לוחות: הפרויקט עצמו, המשימות שלו, ותנועות התקציב שלו.

   ⚠⚠ **הפרויקט שייך לחניכים, והצוות אינו רואה אותו.** זו אותה
     הבטחה של מרכז התפקיד (4מה), ומאותו טעם: פרויקט הוא מקום
     שבו חניך מנסה דברים, מתכנן תקציב שאולי לא יסתדר, וכותב
     משימות שאולי לא יבוצעו. ברגע שהוא יודע שמישהו קורא — הוא
     כותב אחרת, וזה כבר לא כלי עבודה אלא דוח.

   ⚠ **ולכן עמודת הבעלים מחזיקה מזהה בלבד ולא שם.** מי שיפתח
     את הלוח ב-monday יראה רשימת פרויקטים, לא יומן של אדם. זו
     הפחתה שעולה אפס והיא הדבר היחיד שאפשר לעשות מול מי שיש לו
     גישה ישירה ללוח.

   ⚠ **הסטטוסים והקטגוריות הם תוויות בלוח** — המכינה תוסיף
     סוג פרויקט בלי דיפלוי (עיקרון 1).

   הרצה: node --env-file=.env tools/seed-projects.mjs
   ============================================================ */
import { gql } from "../api/_monday.js";
import { writeFileSync } from "node:fs";

const BOARDS = {
  projects: "מכינה ב׳ – פרויקטים",
  tasks: "מכינה ב׳ – משימות פרויקט",
  budget: "מכינה ב׳ – תקציב פרויקט",
};

/* ⚠ מדלגים על מפתח 5 — המשבצת הריקה של monday. ראו 5ז. */
const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

export const PROJECT_STATUS = ["רעיון", "בתכנון", "בביצוע", "מושהה", "הושלם", "בוטל"];
export const PROJECT_KIND = ["אישי", "קבוצתי", "קהילתי", "עסקי", "אחר"];
export const MONEY_KIND = ["הוצאה", "הכנסה"];

const COLS = {
  projects: [
    /* שם הפרויקט הוא שם הפריט */
    ["בעלים", "text", "owner"],
    /* ⚠ שותפים — מזהים מופרדים בפסיק. פרויקט קבוצתי הוא מצב
       רגיל, ולא חריג שדוחפים לתוך שדה הערות. */
    ["שותפים", "long_text", "partners"],
    ["סטטוס", "status", "status", PROJECT_STATUS],
    ["סוג", "status", "kind", PROJECT_KIND],
    ["תיאור", "long_text", "about"],
    ["מטרה", "long_text", "goal"],
    ["התחלה", "date", "start"],
    ["יעד", "date", "due"],
    /* ⚠ תקציב מתוכנן — מספר אחד. מה שבפועל נגזר מהתנועות
       ואינו נשמר, אחרת שני המספרים היו נפרדים ביום הראשון. */
    ["תקציב מתוכנן", "numbers", "budget"],
    ["ארכיון", "checkbox", "archived"],
  ],
  tasks: [
    ["פרויקט", "text", "project"],
    ["בוצע", "checkbox", "done"],
    ["יעד", "date", "due"],
    /* ⚠ באחריות מי — מזהה חניך. **בפרויקט קבוצתי זו כל
       התכלית**, ולכן כאן כן שומרים שיוך, בניגוד לתורנויות
       (עיקרון 5) — שם זו הייתה מדידה של עבודה, וכאן זו חלוקה
       שהחניכים עושים לעצמם ורואים רק הם. */
    ["באחריות", "text", "owner"],
    ["הערות", "long_text", "note"],
  ],
  budget: [
    ["פרויקט", "text", "project"],
    ["סוג", "status", "kind", MONEY_KIND],
    ["סכום", "numbers", "amount"],
    ["תאריך", "date", "date"],
    ["הערות", "long_text", "note"],
  ],
};

const existing = (await gql(`{ boards(limit:300, state:active){ id name } }`)).boards;
const ids = { boards: {}, cols: {} };

for (const [key, title] of Object.entries(BOARDS)) {
  let board = existing.find((b) => String(b.name).trim() === title);
  if (board) console.log(`הלוח כבר קיים: ${title} → ${board.id}`);
  else {
    const d = await gql(
      `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
      { n: title });
    board = { id: d.create_board.id, name: title };
    console.log(`נוצר לוח: ${title} → ${board.id}`);
  }
  ids.boards[key] = String(board.id);

  const have = (await gql(
    `query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`, { b: [board.id] }))
    .boards[0].columns;

  ids.cols[key] = {};
  for (const [colTitle, type, name, labels] of COLS[key]) {
    const hit = have.find((c) => String(c.title).trim() === colTitle);
    if (hit) { ids.cols[key][name] = String(hit.id); continue; }
    const d = await gql(
      `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
         create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
      { b: board.id, t: colTitle, c: type,
        s: labels
          ? JSON.stringify({ labels: Object.fromEntries(labels.map((l, i) => [LABEL_KEYS[i], l])) })
          : null });
    ids.cols[key][name] = String(d.create_column.id);
    console.log(`  עמודה: ${colTitle} → ${ids.cols[key][name]}`);
  }
}

const out = `/* ============================================================
   מזהי לוחות הפרויקטים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-projects.mjs.

   ⚠⚠ **הלוחות האלה שייכים לחניכים, והצוות אינו קורא אותם.**
     \`api/_projects.js\` מחזיר 403 לכל כניסת צוות — זו נקודת
     הקצה השנייה במערכת שבה \`isManager\` אינו מרחיב גישה, אחרי
     משימות בעלי התפקידים (4מה). מי שיוסיף כאן מסלול לצוות
     שובר הבטחה, ולא רק מוסיף תכונה.

   ⚠ **עמודת הבעלים מחזיקה מזהה בלבד ולא שם**, כדי שהלוח
     ייקרא כרשימת פרויקטים ולא כיומן של אדם.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign.
   ============================================================ */

export const PROJECT_BOARDS = ${JSON.stringify(ids.boards, null, 2)};

export const PROJECT_COLS = ${JSON.stringify(ids.cols, null, 2)};

/** ⚠ זהות בתו לתוויות שבלוח. */
export const PROJECT_STATUS = ${JSON.stringify(PROJECT_STATUS, null, 2)};
export const PROJECT_KIND = ${JSON.stringify(PROJECT_KIND, null, 2)};
export const MONEY_KIND = ${JSON.stringify(MONEY_KIND, null, 2)};

/** סטטוסים שנחשבים סגורים — לחישוב ההתקדמות */
export const PROJECT_CLOSED = ["הושלם", "בוטל"];

export const projectsReady = () =>
  Boolean(PROJECT_BOARDS.projects && PROJECT_BOARDS.tasks && PROJECT_BOARDS.budget);
`;

writeFileSync("shared/projects-ids.js", out, "utf8");
console.log("\nנכתב shared/projects-ids.js");
console.log("⚠ הקובץ חייב להיכנס לקומיט — בלעדיו הדיפלוי לא ימצא את הלוחות.");
