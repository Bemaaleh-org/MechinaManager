/* ============================================================
   שחזור ימי סימון, וניקוי שאריות בדיקה
   ------------------------------------------------------------
   ⚠ שלושת ימי הנוכחות הראשונים של הפיילוט (1–3 בספטמבר 2026)
     נמחקו על ידי הניקוי של `quota-test`, שמחק לפי **תאריך**
     ולא לפי מה שהוא יצר. הבדיקה תוקנה; זה משחזר את הנתון.

   הערכים ידועים מסריקה שנעשתה לפני המחיקה: שלושת הימים סומנו
   על ידי "אחים — פיתוח", ובכל אחד **33 נוכחים** — כלומר כל
   החניכים שהיו אז במצבה.

   ⚠ חשבון הבדיקה **אינו** נכלל: הוא נוצר אחרי התאריכים האלה
     ואינו נספר בשום מקום (4לא).

   ⚠ יום קיים עם רשימת נוכחים **אינו נדרס**. יום קיים וריק —
     שנוצר על ידי הבדיקה מעל היום האמיתי — כן ממולא.

   ⚠ המחיקה היא **לפי מזהה מפורש בלבד** (ראו CLAUDE.md).
   ============================================================ */
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { loadMarked, invalidateAttendance } from "../api/_attendance-data.js";
import { activeStudents } from "../api/_student-rows.js";

const DATES = ["2026-09-01", "2026-09-02", "2026-09-03"];
const BY = "אחים — פיתוח";
const AT = "2026-09-03";

/* שאריות שהרצת בדיקה שנפלה באמצע השאירה בלוח האמיתי.
   ⚠ מזהים מפורשים, ולא סינון "כל מה שאינו בשלושת הימים". */
const JUNK = [
  { id: "3205491097", date: "2026-09-04" },
  { id: "3205491311", date: "2027-02-07" },
];

const M = MECHINA_COLS.marked;
const ids = (await activeStudents()).map((s) => String(s.id));
console.log("חניכים פעילים (בלי חשבון הבדיקה): " + ids.length);

const existing = await loadMarked({ force: true });

/* ---- 1 · שחזור ---- */
for (const date of DATES) {
  const hit = existing.get(date);
  /* ⚠ **גם רשימה שיש בה מי שאינו חניך פעיל נכתבת מחדש.**
     הרצה שנפלה השאירה את דגל הבדיקה כבוי, ואז `activeStudents()`
     החזירה גם את חשבון הבדיקה — והוא נספר כנוכח ביום אמיתי.
     זה בדיוק סוג הזיהום שאי אפשר לראות בעין בלוח. */
  const stray = hit && [...hit.present].filter((x) => !ids.includes(String(x)));
  if (hit && hit.present.size > 0 && !stray.length) {
    console.log(date + " — קיים עם " + hit.present.size + " נוכחים. לא נגענו.");
    continue;
  }
  if (stray && stray.length) {
    console.log(date + " — ⚠ " + stray.length + " מזהים שאינם חניכים פעילים. נכתב מחדש.");
  }
  const cols = {
    [M.date]: { date },
    [M.by]: BY,
    [M.at]: { date: AT },
    [M.present]: ids.join(","),
    [M.presentCount]: String(ids.length),
  };
  if (hit) {
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                       create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.marked, i: hit.id, v: JSON.stringify(cols) });
    console.log(date + " — היה ריק, מולא מחדש (" + ids.length + " נוכחים)");
  } else {
    const r = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){
         create_item(board_id:$b,item_name:$n,column_values:$v,
                     create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.marked, n: date, v: JSON.stringify(cols) });
    console.log(date + " — נוצר מחדש (" + r.create_item.id + "), " + ids.length + " נוכחים");
  }
}

/* ---- 2 · שאריות ---- */
for (const j of JUNK) {
  const hit = existing.get(j.date);
  if (!hit || String(hit.id) !== j.id) {
    console.log(j.date + " — אינו בלוח במזהה הצפוי. מדלג.");
    continue;
  }
  if (hit.present.size > 0) {
    console.log(j.date + " — יש בו נוכחים. לא נמחק.");
    continue;
  }
  await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: j.id });
  console.log(j.date + " — שארית בדיקה נמחקה");
}

invalidateAttendance();
