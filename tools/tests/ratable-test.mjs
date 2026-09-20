/* ============================================================
   מתי מפגש פתוח לדירוג — הגדרה אחת
   ------------------------------------------------------------
     node tools/tests/ratable-test.mjs

   ⚠ **בדיקה טהורה, בלי רשת.** הכלל כולו ב-`lessonRatable`,
     ושלושת מסלולי הקריאה מייבאים אותו.

   ⚠⚠⚠ **הכלל התהפך כאן שלוש פעמים, והפעם הוא פשוט:**

       לחצו "שליחת דירוג לחניכים"  →  פתוח
       לא לחצו                          →  סגור

     אין חלון זמן, ואין פתיחה מסיכום.

   **למה:** הכלל הקודם ("סיכום פותח דירוג", 5כד) נכשל
   בשקט: מי שכתב על המרצה כתב **בחוות הדעת** ולא בסיכום
   המפגש, ולכן מור סגל ומירב לשם גונן מעולם לא הגיעו
   לחניכים — אף על פי ששניהם על נושא מדורג. כלל שפועל
   מעצמו גם **אינו פועל** מעצמו, בלי לומר מילה.
   ============================================================ */
import {
  lessonRatable, mayPushRate, RATED_SUBJECTS, sheetRated,
} from "../../shared/lessons-boards.js";

/* ⚠ שער הנושא נבדק בסעיף משלו — כאן מועבר `true`
   כדי ששתי שאלות שונות לא יתערבבו באותה טענה. */
const OK = true;

const T = "2026-09-08";
let pass = 0, fail = 0;
const is = (got, want, why) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? "V" : "X"} ${why}${ok ? "" : `  (ציפינו ${want}, קיבלנו ${got})`}`);
};
const m = (date, planned = "כן") => ({ date, planned });

console.log("\n— הלחיצה היא השער —\n");

is(lessonRatable(m("2026-09-05"), { openRate: true }, T, OK), true,
  "נשלח — פתוח");
is(lessonRatable(m("2026-09-05"), { openRate: false }, T, OK), false,
  "לא נשלח — סגור");
is(lessonRatable(m("2026-09-05"), {}, T, OK), false,
  "בלי תוכן כלל — סגור");
is(lessonRatable(m("2026-09-05"), null, T, OK), false,
  "בלי רשומת תוכן — סגור");

/* ⚠⚠ **סיכום כבר אינו פותח דירוג.** זה השינוי עצמו,
   והטענה הזו היא מה שיתפוס אותו אם יוחזר בטעות. */
is(lessonRatable(m("2026-09-05"), { summary: "דיברנו על העלייה השנייה" }, T, OK), false,
  "סיכום לבדו אינו פותח דירוג");
is(lessonRatable(m("2026-09-05"), { summary: "היה", openRate: true }, T, OK), true,
  "ועם שליחה — פתוח גם כשיש סיכום");

console.log("\n— גם בדיעבד —\n");

/* ⚠⚠ **"גם בדיעבד" היא הבקשה עצמה.** חלון של שבועיים
   חסם שיעורים שראש המכינה רצה לשלוח — יוסי כהן
   מה-2.9 הוא 18 יום אחורה. */
is(lessonRatable(m("2026-08-01"), { openRate: true }, T, OK), true,
  "שיעור מלפני חודשיים — נשלח ופתוח");
is(lessonRatable(m("2026-01-01"), { openRate: true }, T, OK), true,
  "וגם מלפני שמונה חודשים");

console.log("\n— מה עדיין סוגר —\n");

is(lessonRatable(m("2026-09-20"), { openRate: true }, T, OK), false,
  "שיעור עתידי — אין מה לדרג עדיין");
is(lessonRatable(m(T), { openRate: true }, T, OK), true, "היום עצמו — כן");
is(lessonRatable(m("2026-09-05", "לא"), { openRate: true }, T, OK), false,
  "מפגש שבוטל — סגור גם אם נשלח");
is(lessonRatable(m(""), { openRate: true }, T, OK), false, "בלי תאריך");
is(lessonRatable(null, { openRate: true }, T, OK), false, "בלי מפגש");

console.log("\n— שער הנושא —\n");

/* ⚠⚠ **שני הכיוונים.** טענה שתבדוק רק שציונות נסגרה
   הייתה נשארת ירוקה גם אילו **הכול** נסגר, ואז אין
   דירוג בשום מקום — התקלה ההפוכה. */
for (const name of RATED_SUBJECTS) {
  is(mayPushRate({ subject: name }, false), true, `נאסף דירוג: ${name}`);
}
is(mayPushRate({ subject: "ציונות" }, false), false, "ציונות — סיכום בלבד");
is(mayPushRate({ subject: "דינמיקה קבוצתית" }, false), false, "דינמיקה — סגור");

/* ⚠⚠ **החריגה המפורשת:** *"או הוספת חוות דעת
   מזדמנת"*. חוות דעת שנפתחה במפורש על מפגש היא
   ההצהרה שרוצים משוב על המרצה הזה. */
is(mayPushRate({ subject: "ציונות" }, true), true,
  "אבל חוות דעת מזדמנת פותחת גם שם");
is(mayPushRate(null, true), true, "וגם בלי גיליון מוכר");
is(mayPushRate(null, false), false, "ובלי שניהם — סגור");
is(sheetRated({ subject: " מדעי המדינה " }), true, "רווחים אינם שוברים");

/* ⚠ נכשל סגור: קורא ששכח להעביר את השער אינו פותח הכול. */
is(lessonRatable(m("2026-09-05"), { openRate: true }, T, undefined), false,
  "קורא שלא העביר שער — סגור, ולא פתוח לכולם");
is(lessonRatable(m("2026-09-05"), { openRate: true }, T, false), false,
  "ושער שללי — סגור");

console.log(`\n${pass} עברו, ${fail} נכשלו\n`);
process.exit(fail ? 1 : 0);
