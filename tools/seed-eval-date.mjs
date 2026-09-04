/* ============================================================
   עמודת "תאריך השיעור" בלוח חוות הדעת
   ------------------------------------------------------------
   ⚠ **שונה מעמודת "תאריך" הקיימת.** זו נושאת את היום שבו
     **נכתבה** חוות הדעת; החדשה נושאת את היום שבו **התקיים
     השיעור**. הם שונים כמעט תמיד — חוות דעת נכתבת ימים אחרי —
     ומיזוגם היה מוחק את השאלה "מתי זה היה".

   ⚠ נוצרת פעם אחת, וכותבת את המזהה למסך. מריצים ומעתיקים את
     המזהה ל-shared/lessons-boards.js.

   ⚠ וממלאת למפרע את מה שאפשר לגזור: לכל חוות דעת שנושאת מזהה
     מפגש, התאריך נלקח מהמפגש עצמו.
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";

const TITLE = "תאריך השיעור";
const E = LESSON_COLS.evals;
const M = LESSON_COLS.meetings;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ---- 1 · העמודה ---- */
const cols = (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title type } } }`,
  { b: [LESSON_BOARDS.evals] })).boards[0].columns;

let id = (cols.find((c) => String(c.title).trim() === TITLE) || {}).id;
if (id) {
  console.log("העמודה כבר קיימת: " + id);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!){ create_column(board_id:$b,title:$t,column_type:date){ id } }`,
    { b: LESSON_BOARDS.evals, t: TITLE });
  id = String(d.create_column.id);
  console.log("נוצרה עמודה: " + id);
}
console.log('  → shared/lessons-boards.js:  lessonDate: "' + id + '",');

/* ---- 2 · מילוי למפרע ממפגשים ---- */
const meetings = await allItems(LESSON_BOARDS.meetings);
const dateOf = new Map(meetings.map((m) => [String(m.id), val(m, M.date)]));

const evals = await allItems(LESSON_BOARDS.evals);
let filled = 0, already = 0, noMeeting = 0;

for (const e of evals) {
  if (val(e, id)) { already++; continue; }
  const mid = val(e, E.meetingId);
  const date = mid ? dateOf.get(String(mid)) : null;
  if (!date) { noMeeting++; continue; }
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                     create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.evals, i: e.id, v: JSON.stringify({ [id]: { date } }) });
  filled++;
}

console.log(`מולאו ${filled} · כבר היה ב-${already} · ` +
  `${noMeeting} בלי מפגש (מחזור א׳ ברובן — יוזן ביד)`);
