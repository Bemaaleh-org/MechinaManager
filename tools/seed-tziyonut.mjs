/* ============================================================
   גיליון "איה - ציונות"
   ------------------------------------------------------------
   node --env-file=.env tools/seed-tziyonut.mjs

   הנתונים מהצילום שאחים שלח: 21 מפגשים, כל שבועיים ביום חמישי
   ב-9:30, מ-24/09/2026 עד 24/06/2027. שישה מהם אינם מתוכננים,
   וכל אחד עם הסיבה שכתובה בגיליון.

   ⚠ **"מתוכנן: לא" הוא מה שמכריע** אם המפגש מתקיים, ולא הגאנט
     (4כה). הסיבות כאן הועתקו כלשונן מהגיליון ולא נוסחו מחדש.

   ⚠ **הרצה חוזרת אינה מכפילה** — הגיליון נמצא לפי שם, והמפגש
     לפי גיליון+תאריך.
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";

const S = LESSON_COLS.sheets;
const M = LESSON_COLS.meetings;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const NAME = "איה - ציונות";
const LECTURER = "איה";
const DAYTIME = "חמישי 9:30";

/* ⚠ תאריך → סיבת ביטול. מה שאינו כאן — מתוכנן. */
const OFF = {
  "2026-10-01": 'חוה"מ סוכות',
  "2026-10-29": "טיול",
  "2027-02-04": "שבוע אמצע",
  "2027-03-04": "סדרת שטח",
  "2027-04-29": 'חוה"מ פסח',
  "2027-06-24": "סדרה מסכמת",
};

const DATES = [
  "2026-09-24", "2026-10-01", "2026-10-15", "2026-10-29",
  "2026-11-12", "2026-11-26", "2026-12-10", "2026-12-24",
  "2027-01-07", "2027-01-21", "2027-02-04", "2027-02-18",
  "2027-03-04", "2027-03-18", "2027-04-01", "2027-04-15",
  "2027-04-29", "2027-05-13", "2027-05-27", "2027-06-10",
  "2027-06-24",
];

/* ============ הגיליון ============ */
const sheets = await allItems(LESSON_BOARDS.sheets);
let sheet = sheets.find((i) => String(i.name || "").trim() === NAME);
if (sheet) {
  console.log("הגיליון קיים:", sheet.id);
} else {
  const r = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.sheets, n: NAME, v: JSON.stringify({
      [S.lecturer]: LECTURER,
      [S.dayTime]: DAYTIME,
      [S.active]: { checked: "true" },
    }) });
  sheet = { id: r.create_item.id };
  console.log("נוצר הגיליון:", sheet.id);
}

/* ============ המפגשים ============ */
const all = await allItems(LESSON_BOARDS.meetings);
/* ⚠ ההשוואה לפי **מזהה הגיליון** ולא לפי שם: שני שיעורים
   יכולים לחלוק תאריך, ושם משתנה. */
const linked = new Set(all
  .filter((i) => {
    const cv = i.column_values.find((x) => x.id === M.sheet);
    const raw = cv ? (cv.value || "") : "";
    return raw.includes(String(sheet.id));
  })
  .map((i) => val(i, M.date)));

let added = 0, skipped = 0;
for (const date of DATES) {
  if (linked.has(date)) { skipped++; continue; }
  const off = OFF[date];
  await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.meetings, n: `${NAME} · ${date.split("-").reverse().join("/")}`,
      v: JSON.stringify({
        [M.sheet]: { item_ids: [Number(sheet.id)] },
        [M.date]: { date },
        [M.day]: "חמישי",
        /* ⚠ "כן" ו"לא" בתו — אלה התוויות בלוח, ותווית שאינה
           קיימת מפילה את כל השורה בשקט (4לב). */
        [M.planned]: { label: off ? "לא" : "כן" },
        ...(off ? { [M.reason]: off } : {}),
      }) });
  added++;
}

console.log(`מפגשים: נוספו ${added} · כבר היו ${skipped}`);
console.log(`מתוכננים ${DATES.length - Object.keys(OFF).length} · מבוטלים ${Object.keys(OFF).length} · סה״כ ${DATES.length}`);
