/* ============================================================
   השלמת שמות מרצים בחוות דעת — וריענון הדירוג השמור
   ------------------------------------------------------------
     npm run fix:eval-names          (יבש)
     npm run fix:eval-names -- --go  (מבצע)

   הדיווח (ראש המכינה, 17.9.2026): *"אני לא מבין למה זה קורה
   כל פעם, למרות שהשם בפנים"*.

   שם השורה בחוות דעת נקבע ברגע היצירה בלבד. שורה שנפתחה לפני
   שהיה שם נשארה "טרם נרשם שם המרצה · …" לנצח, גם אחרי שמישהו
   הקליד את השם על המפגש. **במסכים זה כבר נפתר** — `resolveEvalNames`
   גוזר את השם בכל שליפה — והכלי הזה מתקן את **הלוח עצמו**, כי
   הלוח הוא מסד הנתונים ומישהו מסתכל בו (4יז).

   ⚠⚠ **טקסט שאדם כתב לעולם אינו נדרס.** רק מציין מקום מוחלף.
     שורה ששמה שונה מהמפגש היא עריכה מכוונת — "מור סגל - הכנה
     לראיון" מול "מור סגל - ראיונות" — ודריסה שלה מוחקת עבודה
     של אדם בלי לומר מילה.

   ⚠ **והדירוג השמור מרוענן גם הוא.** התצוגה מחשבת חי מלוח
     הדירוגים בכל מקרה, ולכן זה נוגע רק למי שקורא את הלוח —
     אבל מספר שמוצג שם ואינו נכון הוא בדיוק מה שגורם לאבד
     אמון בלוח.

   ⚠ הרצה יבשה כברירת מחדל, ומדפיסה בדיוק מה היא עומדת לשנות.
   ============================================================ */
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";

const GO = process.argv.includes("--go");

/* ⚠⚠ `ensureCycle()` לפני שנוגעים במזהי הלוחות — הם אובייקטים
   שנדרסים בזמן ריצה (4ל), וכלי שקורא אותם כמות שהם כותב ללוח
   של המחזור שכתוב בקוד, בשקט. */
try {
  await ensureCycle();
} catch (e) {
  console.error("\n✗ טעינת המחזור נכשלה — לא נגעתי בכלום.");
  console.error("  " + (e && e.message) + "\n");
  process.exit(1);
}

const { LESSON_BOARDS, LESSON_COLS, evalDisplayName, isEvalPlaceholder } =
  await import("../shared/lessons-boards.js");
const { loadEvals, loadMeetings, loadSheets, loadRatings, ratingFor, invalidateEvals } =
  await import("../api/_lessons-data.js");

const E = LESSON_COLS.evals;
const [evals, meets, sheets, ratings] = await Promise.all([
  loadEvals(), loadMeetings(), loadSheets(), loadRatings(),
]);
const byMeeting = new Map(meets.map((m) => [m.id, m]));
const bySheet = new Map(sheets.map((s) => [s.id, s]));

const names = [];
const scores = [];
let stuck = 0;

for (const e of evals) {
  const m = e.meetingId ? byMeeting.get(String(e.meetingId)) : null;
  const sh = m ? bySheet.get(m.sheetId) : null;

  if (isEvalPlaceholder(e.name)) {
    const { name, provisional } = evalDisplayName(e, m, sh);
    if (provisional) stuck++;
    else names.push({ id: e.id, from: e.name, to: name });
  }

  /* ⚠ רק לשורות שקשורות למפגש — לשורות המיובאות של מחזור א׳
     אין מפגש, והמספר שעליהן הוא כל מה שיש. */
  if (!m) continue;
  const live = ratingFor(String(e.meetingId), ratings);
  if (!live) continue;
  if (Number(e.avg) !== Number(live.avg) || Number(e.votes) !== Number(live.votes)) {
    scores.push({ id: e.id, name: e.name, from: `${e.avg}/${e.votes}`, to: `${live.avg}/${live.votes}` });
  }
}

console.log(`\nחוות דעת בלוח: ${evals.length}`);
console.log(`  שמות להשלמה: ${names.length}`);
for (const n of names) console.log(`    ${n.id}  "${n.from}"\n      → "${n.to}"`);
if (stuck) console.log(`  ⚠ ${stuck} שורות שאין ממה לגזור להן שם — נשארות כפי שהן.`);
console.log(`  דירוגים לרענון: ${scores.length}`);
for (const s of scores) console.log(`    ${s.id}  ${s.name}  ${s.from} → ${s.to}`);

if (!names.length && !scores.length) {
  console.log("\n✓ אין מה לתקן.\n");
  process.exit(0);
}
if (!GO) {
  console.log("\n(יבש — לא נכתב דבר. להוסיף --go כדי לבצע)\n");
  process.exit(0);
}

for (const n of names) {
  await gql(
    `mutation($b:ID!,$i:ID!,$n:String!){ change_simple_column_value(board_id:$b,item_id:$i,column_id:"name",value:$n){ id } }`,
    { b: LESSON_BOARDS.evals, i: n.id, n: n.to },
  );
  console.log(`✓ שם: ${n.id} → ${n.to}`);
}
for (const s of scores) {
  const [avg, votes] = s.to.split("/");
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.evals, i: s.id, v: JSON.stringify({ [E.avg]: avg, [E.votes]: votes }) },
  );
  console.log(`✓ דירוג: ${s.id} → ${s.to}`);
}
invalidateEvals();

/* ⚠ ווידוא בקריאה חוזרת — סקריפט שיוצא 0 אינו עדות לכך שהוא
   עבד; מה שקובע הוא קריאה של התוצאה (5כג). */
const after = await loadEvals({ force: true });
const left = after.filter((e) => {
  const m = e.meetingId ? byMeeting.get(String(e.meetingId)) : null;
  const sh = m ? bySheet.get(m.sheetId) : null;
  return isEvalPlaceholder(e.name) && !evalDisplayName(e, m, sh).provisional;
});
if (left.length) {
  console.error(`\n✗ ${left.length} שורות עדיין נושאות מציין מקום.\n`);
  process.exit(1);
}
console.log("\n✓ אומת בקריאה חוזרת.\n");
