/* ============================================================
   חשבון הבדיקה של אחים — הרשאת מוביל שבוע, וסדרה וּועדה
   ------------------------------------------------------------
   ⚠⚠ **הרשאת מוביל שבוע ניתנת בסימון הידני ולא בשיבוץ.**
     `MECHINA_COLS.roster.leader` הוא עוקף חירום **בלי טווח**:
     מי שמסומן בו הוא מוביל שבוע בכל יום, וההרשאה שלו אינה
     עוברת לאיש. בשביל חשבון בדיקה זה בדיוק מה שצריך —
     "תמידית, בלי לשבץ".

   ⚠ **ולכן הוא לא נכנס ללוח מובילי השבוע.** שיבוץ שם היה
     גוזל שבוע אמיתי מחניכים אמיתיים, משנה את מי שאמור להוביל
     אותו, ומופיע לכולם במסך.

   ⚠ **חשבון הבדיקה אינו נספר בשום מונה** (`demo`), ולכן שיבוצו
     לסדרה ולוועדה אינו מזייף מכסות — `activeStudents()` מסננת
     אותו, ורק בוררי השיבוץ רואים אותו (`assignableStudents`).

   ⚠ **ולא מוסיפים אותו לצוות שכבר מלא במכסה.** הסקריפט בוחר
     סדרה וּועדה, ומדווח בשמן — ולא בוחר בשקט.

   הרצה: node --env-file=.env tools/seed-tester-roles.mjs [--go]
   ============================================================ */
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { PLACEMENT_BOARDS, PLACEMENT_COLS } from "../shared/placements-ids.js";
import { studentRows } from "../api/_student-rows.js";
import { loadDefinitions, loadAssignments } from "../api/_placements.js";

const NAME = "בדיקה — אחים";
const WANT = { "סדרה": "סדרת חתול בשק", "ועדה": "ועדת תרבות" };
const GO = process.argv.includes("--go");

const me = (await studentRows({ force: true })).find((r) => r.name === NAME);
if (!me) { console.log(`"${NAME}" לא נמצא. מריצים npm run seed:tester.`); process.exit(1); }
console.log(`${NAME}  ·  מזהה ${me.id}  ·  demo=${me.demo}  ·  מוביל שבוע=${me.leader}`);

const defs = await loadDefinitions({ force: true });
const A = PLACEMENT_COLS.assignments;
const assigns = await loadAssignments({ force: true });

const picks = [];
for (const [cat, name] of Object.entries(WANT)) {
  const def = defs.find((d) => d.name === name && d.category === cat);
  if (!def) {
    console.log(`⚠ "${name}" (${cat}) לא נמצא בלוח ההגדרות. לא בוצע שינוי.`);
    process.exit(1);
  }
  /* ⚠ הסמסטר נגזר מהתקופה שבהגדרה, ולא מקובע כאן: ועדה "לפי
     סמסטר" ששורתה נכתבת בלי סמסטר לא תופיע באף מסך (4נ). */
  const semester = def.period === "שנתי" ? "שנתי" : "סמסטר א׳";
  const already = assigns.find(
    (x) => String(x.student) === String(me.id) && String(x.placement) === String(def.id));
  picks.push({ def, semester, already: Boolean(already) });
  console.log(`  ${cat}: ${def.name}  ·  ${semester}  ${already ? "(כבר משובץ)" : ""}`);
}

console.log(`\nסימון "מוביל שבוע" בלוח החניכים: ${me.leader ? "כבר דולק" : "יידלק"}`);
if (!GO) { console.log("\nהרצה יבשה. להוספת --go כדי לבצע."); process.exit(0); }

/* ---------- 1 · ההרשאה ---------- */
if (!me.leader) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
         create_labels_if_missing:false){ id } }`,
    { b: MECHINA_BOARDS.roster, i: me.id,
      v: JSON.stringify({ [MECHINA_COLS.roster.leader]: { checked: "true" } }) });
  console.log("הודלק: מוביל שבוע");
}

/* ---------- 2 · השיבוצים ---------- */
for (const p of picks) {
  if (p.already) continue;
  await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b,item_name:$n,column_values:$v,
         create_labels_if_missing:false){ id } }`,
    { b: PLACEMENT_BOARDS.assignments, n: `${me.name} · ${p.def.name}`,
      v: JSON.stringify({
        [A.student]: String(me.id), [A.studentName]: me.name,
        [A.placement]: String(p.def.id), [A.placementName]: p.def.name,
        [A.semester]: { label: p.semester },
      }) });
  console.log("שובץ: " + p.def.name);
}

/* ---------- ווידוא ---------- */
const after = (await studentRows({ force: true })).find((r) => r.id === me.id);
const mine = (await loadAssignments({ force: true }))
  .filter((x) => String(x.student) === String(me.id));
console.log(`\nמוביל שבוע: ${after.leader}  ·  demo: ${after.demo}  ·  פעיל: ${after.active}`);
console.log("שיבוצים: " + (mine.map((x) => x.placementName).join(" · ") || "אין"));
