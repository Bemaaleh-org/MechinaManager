/* ============================================================
   ניקוי פריטי ברירת המחדל של monday מלוחות שזה עתה נוצרו
   ------------------------------------------------------------
   ⚠⚠ **monday יוצרת לוח חדש עם שורות דמה** — "Task 1", "Task 2",
     קבוצה בשם "Group Title". הן אינן ריקות מבחינת הקוד: הן
     שורות לכל דבר, עם שם, והן מופיעות במסך כמודעה אמיתית
     בשם "Task 1".

   זה בדיוק עיקרון 6 מהכיוון ההפוך: הלוח **נראה** כאילו יש בו
   תוכן, בזמן שאין. מסך ריק אמיתי הוא מידע; מסך עם זבל אינו.

   ⚠ **מוחק לפי שם מתוך רשימה סגורה, ורק כשאין בשורה שום נתון
     אחר.** שורה בשם "Task 1" שמישהו מילא בה עמודות היא שורה
     שמישהו נגע בה, ומחיקה שלה היא מחיקת נתון (הכלל של "ניקוי
     לפי מזהה ולא לפי סינון" — כאן אין מזהה שנשמר, ולכן
     הבדיקה השנייה היא ההגנה).

   הרצה יבשה: node --env-file=.env tools/clean-defaults.mjs
   ביצוע:     node --env-file=.env tools/clean-defaults.mjs --go
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import { LEAD_BOARDS } from "../shared/lead-ids.js";
import { BOARD_BOARDS } from "../shared/board-ids.js";
import { TEAM_BOARDS } from "../shared/team-ids.js";

const GO = process.argv.includes("--go");

/** ⚠ רשימה סגורה. לא regex — "Task" הוא שם לגיטימי בעברית? לא,
    אבל "משימה 1" כן, ולכן רק השמות שmonday יוצרת בפועל. */
const DEFAULT_NAMES = new Set([
  "Task 1", "Task 2", "Task 3", "Item 1", "Item 2", "Item 3",
  "משימה 1", "משימה 2", "משימה 3", "פריט 1", "פריט 2", "פריט 3",
]);

const TARGETS = {
  "צ׳ק ליסט הובלה": LEAD_BOARDS.checklist,
  "ביצוע הובלה": LEAD_BOARDS.log,
  "בנק פעילויות": LEAD_BOARDS.activities,
  "לוח מודעות": BOARD_BOARDS.notices,
  "תגובות": BOARD_BOARDS.comments,
  "סקרי מכינה": BOARD_BOARDS.polls,
  "הצבעות מכינה": BOARD_BOARDS.votes,
  "משוב למכינה": BOARD_BOARDS.feedback,
  "רשומות צוות": TEAM_BOARDS.entries,
  "משוב לצוות": TEAM_BOARDS.feedback,
  "סקרי צוות": TEAM_BOARDS.polls,
  "הצבעות בסקר": TEAM_BOARDS.votes,
};

let found = 0, gone = 0;

for (const [label, board] of Object.entries(TARGETS)) {
  if (!board) { console.log(`${label}: הלוח טרם הוקם — מדלג`); continue; }
  const items = await allItems(board);
  const junk = items.filter((i) => {
    if (!DEFAULT_NAMES.has(String(i.name || "").trim())) return false;
    /* ⚠ ההגנה השנייה: שורה שיש בה נתון היא שורה שמישהו נגע בה. */
    return !(i.column_values || []).some((c) => String(c.text || "").trim());
  });
  if (!junk.length) { console.log(`${label}: נקי`); continue; }
  found += junk.length;
  console.log(`${label}: ${junk.length} שורות ברירת מחדל — ${junk.map((i) => i.name).join(", ")}`);
  if (!GO) continue;
  for (const i of junk) {
    try {
      await gql("mutation($i:ID!){ delete_item(item_id:$i){id} }", { i: String(i.id) });
      gone++;
    } catch (e) { console.log("  ! לא נמחקה " + i.id + ": " + e.message); }
  }
}

console.log(GO
  ? `\nנמחקו ${gone} מתוך ${found}.`
  : `\nנמצאו ${found}. להרצה בפועל: --go`);
