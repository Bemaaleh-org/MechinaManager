/* ============================================================
   שליחת דחיפת ניסוי למשתמש אחד
   ------------------------------------------------------------
   ⚠ **הדחיפה ריקה, כמו בייצור.** אין בה מטען — ה-Service Worker
     שמקבל אותה פונה בעצמו לשרת ושואל מה חדש. לכן "הודעת ניסוי"
     אינה מציגה טקסט שנכתב כאן, אלא בדיוק את מה שיש בפעמון של
     אותו משתמש באותו רגע (5ה).

   ⚠ **מסרב לרוץ בלי מפתחות VAPID**, ואומר מה חסר — במקום
     "נכשל" סתום.

   ⚠ **ואינו מדפיס את המנוי עצמו.** הוא מכיל את הכתובת הייחודית
     של המכשיר אצל גוגל/אפל, וזו כתובת שמי שמחזיק בה יכול
     לשלוח אליה. מודפס רק כמה מכשירים רשומים.

   הרצה: node --env-file=.env tools/push-test.mjs "בדיקה — אחים"
   ============================================================ */
import { gql } from "../api/_monday.js";
import { pushReady, pushTo } from "../api/_push.js";
import { boardColumn } from "../api/_board-col.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { AUTH_BOARD } from "../shared/auth-board.js";
import { studentRows } from "../api/_student-rows.js";

const want = process.argv[2];
if (!want) {
  console.log('שימוש: node --env-file=.env tools/push-test.mjs "<שם>"');
  process.exit(1);
}

if (!pushReady()) {
  console.log("⚠ אין מפתחות VAPID בסביבה המקומית (VAPID_PUBLIC / VAPID_PRIVATE).");
  console.log("  מריצים npm run seed:push, ואז מעתיקים גם ל-Vercel.");
  process.exit(1);
}

/* מחפשים קודם בחניכים, ואז בלוח ההרשאות. */
const students = await studentRows({ force: true });
let hit = students.find((r) => r.name.includes(want));
let board = MECHINA_BOARDS.roster;

if (!hit) {
  const staff = (await gql(
    `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name } } } }`))
    .boards[0].items_page.items.find((x) => String(x.name).includes(want));
  if (staff) { hit = { id: staff.id, name: staff.name }; board = AUTH_BOARD; }
}

if (!hit) { console.log(`לא נמצא משתמש ששמו מכיל "${want}".`); process.exit(1); }
console.log(`נמצא: ${hit.name}  (${board === AUTH_BOARD ? "צוות" : "חניך"})`);

const col = await boardColumn(board, "מנויי דחיפה", "long_text");
if (!col) { console.log("עמודת המנויים אינה קיימת בלוח — איש עוד לא נרשם."); process.exit(1); }

const d = await gql(
  `query($b:[ID!],$i:[ID!]){ boards(ids:$b){ items_page(query_params:{ids:$i}, limit:1){
     items{ column_values(ids:[${JSON.stringify(col)}]){ text } } } } }`,
  { b: [board], i: [String(hit.id)] });
let list = [];
try {
  const p = JSON.parse(d.boards?.[0]?.items_page?.items?.[0]?.column_values?.[0]?.text || "[]");
  if (Array.isArray(p)) list = p;
} catch { /* ריק */ }

if (!list.length) {
  console.log("\n⚠ אין מכשירים רשומים למשתמש הזה.");
  console.log("  צריך להיכנס לאפליקציה → הפרופיל שלי → התראות לטלפון → לאשר.");
  console.log("  ⚠ באייפון חובה להתקין קודם את האפליקציה למסך הבית.");
  process.exit(1);
}

console.log(`מכשירים רשומים: ${list.length}`);
let ok = 0, gone = 0, fail = 0;
for (const s of list) {
  const r = await pushTo(s);
  if (r === "ok") ok++; else if (r === "gone") gone++; else fail++;
  console.log("  → " + r);
}
console.log(`\nנשלחו: ${ok}  ·  מנויים שפגו: ${gone}  ·  נכשלו: ${fail}`);
if (ok) console.log("⚠ ההודעה תציג את מה שבפעמון של המשתמש כרגע. אם הפעמון ריק — לא תופיע הודעה.");
