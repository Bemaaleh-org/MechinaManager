/* ============================================================
   שורות יתומות בלוחות הפרויקטים
   ------------------------------------------------------------
   משימה, תנועת תקציב או שלב נושאים **מזהה פרויקט**. פרויקט
   שנמחק משאיר אותם מאחור: הם אינם מופיעים בשום מסך (הטעינה
   מסננת לפי הפרויקטים של החניך), ולכן אי אפשר גם למחוק אותם
   מהמסך. הם פשוט נצברים בלוח.

   ⚠ **מחיקת פרויקט עם תוכן חסומה בשרת** בדיוק בגלל זה, ובכל
     זאת יתומים נוצרים: פרויקט ריק שנמחק אחרי שנוצרו לו שלבים
     מתבנית, או מחיקה ידנית ב-monday.

   ⚠ **מוחק רק מה שהפרויקט שלו אינו קיים.** שורה שהפרויקט שלה
     חי — גם אם הוא בארכיון, וגם אם הוא של חניך אחר — אינה
     נוגעת לכאן.

   ⚠ הרצה יבשה כברירת מחדל.
     node --env-file=.env tools/projects-orphans.mjs [--go]
   ============================================================ */
import { gql } from "../api/_monday.js";
import { PROJECT_BOARDS as B, PROJECT_COLS as C } from "../shared/projects-ids.js";

const GO = process.argv.includes("--go");

const rowsOf = async (board, colId) => {
  const d = await gql(
    `query($b:[ID!]){ boards(ids:$b){ items_page(limit:500){ items{ id name
       column_values(ids:[${JSON.stringify(colId)}]){ text } } } } }`, { b: [board] });
  return (d.boards?.[0]?.items_page?.items || []).map((i) => ({
    id: String(i.id), name: String(i.name || ""),
    project: i.column_values?.[0]?.text || "",
  }));
};

const live = new Set((await gql(
  `query($b:[ID!]){ boards(ids:$b){ items_page(limit:500){ items{ id } } } }`,
  { b: [B.projects] })).boards[0].items_page.items.map((i) => String(i.id)));
console.log(`פרויקטים קיימים: ${live.size}`);

let total = 0;
for (const [key, board, col] of [
  ["משימות", B.tasks, C.tasks.project],
  ["תקציב", B.budget, C.budget.project],
  ...(B.entries ? [["רשומות", B.entries, C.entries.project]] : []),
]) {
  const rows = await rowsOf(board, col);
  /* ⚠ שורה בלי מזהה פרויקט כלל אינה יתומה — היא שורה שנוצרה
     ביד ב-monday, וייתכן שמישהו באמצע העבודה עליה. */
  const orphans = rows.filter((r) => r.project && !live.has(r.project));
  total += orphans.length;
  console.log(`${key}: ${rows.length} שורות, ${orphans.length} יתומות` +
    (orphans.length ? " — " + orphans.map((r) => r.name).join(" | ") : ""));
  if (!GO) continue;
  for (const r of orphans) {
    await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: r.id });
    console.log("  נמחק: " + r.name);
  }
}

console.log(GO ? `\nנמחקו ${total} שורות יתומות.` : "\nהרצה יבשה. להוספת --go.");
