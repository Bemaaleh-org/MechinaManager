/* ============================================================
   סריקת נתוני בדיקה לפני הפיילוט — קריאה בלבד, לא מוחקת דבר
   ------------------------------------------------------------
   ⚠ הסקריפט הזה **אינו מוחק**. הוא מדפיס מה יש בכל לוח
     שהחניכים רואים, עם תאריך היצירה, כדי שההחלטה מה למחוק
     תיפול על נתונים ולא על הנחה.

   ⚠ ת.ז לא מודפסת. שמות כן — הם נחוצים כדי להחליט.
   ============================================================ */
import { allItems, gql } from "../api/_monday.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";

const CUT = process.argv[2] || "2026-08-31";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const rel = (i, c) => ((i.column_values.find((x) => x.id === c) || {}).linked_item_ids || []);
const day = (i) => String(i.created_at || "").slice(0, 10);

function section(title) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

/* שמות החניכים, כדי שהפלט יהיה קריא */
const roster = await allItems(MECHINA_BOARDS.roster);
const nameOf = new Map(roster.map((r) => [String(r.id), r.name]));

/* ============ בקשות יציאה ============ */
section("בקשות יציאה — כל הלוח");
const R = MECHINA_COLS.requests;
const reqs = await allItems(MECHINA_BOARDS.requests, "created_at");
reqs.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
for (const i of reqs) {
  const who = rel(i, R.student).map((x) => nameOf.get(String(x)) || x).join(", ");
  const flag = day(i) < CUT ? " ⚠ לפני " + CUT : "";
  console.log(
    [day(i), (who || "—").padEnd(16), val(i, R.type).padEnd(14),
     val(i, R.date), val(i, R.status), i.id].join(" | ") + flag);
}
console.log("סה״כ " + reqs.length + " · לפני " + CUT + ": " +
  reqs.filter((i) => day(i) < CUT).length);

/* ============ היעדרויות ============ */
section("היעדרויות");
const A = MECHINA_COLS.absence;
const abs = await allItems(MECHINA_BOARDS.absence, "created_at");
abs.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
for (const i of abs) {
  const who = rel(i, A.student).map((x) => nameOf.get(String(x)) || x).join(", ");
  console.log([day(i), (who || "—").padEnd(16), val(i, A.type).padEnd(14),
    val(i, A.date), val(i, A.source), i.id].join(" | ") +
    (day(i) < CUT ? " ⚠" : ""));
}
console.log("סה״כ " + abs.length + " · לפני " + CUT + ": " +
  abs.filter((i) => day(i) < CUT).length);

/* ============ ימי סימון ============ */
section("ימי סימון (נוכחות)");
const M = MECHINA_COLS.marked;
const marked = await allItems(MECHINA_BOARDS.marked, "created_at");
marked.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
for (const i of marked) {
  console.log([day(i), val(i, M.date), "סומנו: " + val(i, M.presentCount),
    "ע״י " + val(i, M.by), i.id].join(" | ") + (day(i) < CUT ? " ⚠" : ""));
}
console.log("סה״כ " + marked.length);

/* ============ אירועים חריגים ============ */
section("אירועים חריגים (צוות בלבד)");
const I = MECHINA_COLS.incidents;
const inc = await allItems(MECHINA_BOARDS.incidents, "created_at");
for (const i of inc) {
  const who = rel(i, I.student).map((x) => nameOf.get(String(x)) || x).join(", ");
  console.log([day(i), (who || "—").padEnd(16), val(i, I.kind),
    val(i, I.date), i.id].join(" | ") + (day(i) < CUT ? " ⚠" : ""));
}
console.log("סה״כ " + inc.length);
