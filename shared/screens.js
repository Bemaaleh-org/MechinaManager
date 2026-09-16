/* ============================================================
   קטלוג המסכים — לחיפוש
   ------------------------------------------------------------
   ⚠⚠ **למה הקובץ הזה קיים בכלל.**

   החיפוש הרוחבי (5יג) קבע ש"התוצאה הכי שימושית היא מסך ולא
   שורה", ושהרשימה "נגזרת מ-`DUTIES` ואינה נכתבת שוב". בפועל
   חצי ממנה כן נכתבה שוב: `COMMON` ב-`api/_search.js` מנה
   שישה־עשר מסכים, ומסכי התפקידים נבנו **רק לחניכים**
   (`if (session.isStudent)`).

   התוצאה שדווחה: ראש המכינה הקליד "מכולה" וקיבל תקלה אחת.
   מסך "ציוד מכולה" קיים, הוא פתוח לו לגמרי, ופשוט לא היה
   בשום רשימה שהחיפוש קורא.

   ⚠ **המגירה של הצוות היא המקור, והיא ב-`src/App.jsx`** —
     קובץ JSX עם אייקונים ותנאי הרשאה, שהשרת אינו יכול
     לייבא. לכן הקטלוג כאן, ו-`npm run check:nav` מוודא
     שכל שורה כאן קיימת שם **באותו מפתח ובאותה תווית**.
     בלי הבדיקה הזו זו בדיוק הרשימה השנייה ש-4מד מזהיר ממנה.

   ⚠ **מפתחות הצוות שונים ממפתחות החניך** — `c-container`
     מול `container`, `k-budget` מול `budget`. זו הסיבה
     שהרשימות נפרדות ולא אחת עם דגל.
   ============================================================ */

/** מסכי הצוות — ⚠ חייב להתאים למגירה ב-src/App.jsx (check:nav). */
export const STAFF_SCREENS = [
  { tab: "dash", label: "מסך הבית" },
  { tab: "profile", label: "הפרופיל שלי" },
  { tab: "board", label: "לוח מודעות" },
  { tab: "agenda", label: "הלו״ז שלי" },
  { tab: "news", label: "מה חדש" },

  { tab: "a-students", label: "חניכים" },
  { tab: "a-roles", label: "בעלי תפקידים" },
  { tab: "a-requests", label: "בקשות יציאה" },
  { tab: "a-mark", label: "סימון יומי" },
  { tab: "a-place", label: "שיבוצי חניכים" },
  { tab: "a-teams", label: "ניהול צוותים" },
  { tab: "a-leaders", label: "מובילי שבוע" },
  { tab: "a-chores", label: "תורנויות" },
  { tab: "a-rules", label: "נהלים במכינה" },
  { tab: "a-content", label: "ניהול תוכן" },
  { tab: "a-access", label: "הרשאות" },
  { tab: "a-tryouts", label: "מיונים ושיבוצים" },
  { tab: "a-recruit", label: "פניות גיוס" },

  { tab: "k-all", label: "אוכל וחד״פ" },
  { tab: "k-budget", label: "תקציב המטבח" },
  { tab: "k-menu", label: "תפריט ארוחות" },
  { tab: "buy", label: "קניות המכינה" },
  { tab: "gear-week", label: "רשימות ציוד שבועיות" },

  { tab: "c-container", label: "מכולה" },
  { tab: "c-clean", label: "ציוד ניקיון" },
  { tab: "loans", label: "השאלת ציוד" },
  { tab: "faults", label: "תקלות ושידרוגים" },
  { tab: "safety", label: "אירועי בטיחות" },
  { tab: "hosting", label: "אירוח קבוצות" },
  { tab: "laundry", label: "חדר כביסה" },

  { tab: "l-sheets", label: "גיליונות המרצים" },
  { tab: "l-evals", label: "חוות דעת על מרצים" },
  { tab: "archive", label: "השיעורים שהיו" },
  { tab: "lecturers", label: "מאגר מרצים" },
  { tab: "stu-lessons", label: "שיעורי חניך" },
  { tab: "plenary", label: "מליאות" },
  { tab: "gantt", label: "גאנט שנתי" },
  { tab: "mishmar", label: "משמר" },

  { tab: "group", label: "הקבוצה שלי" },
  { tab: "alumni", label: "בוגרי המכינה" },
  { tab: "trends", label: "מגמות" },
  { tab: "quotes", label: "הציטוט היומי" },
  { tab: "cycles", label: "מחזורים" },
  { tab: "export", label: "ייצוא לגיליונות" },
  { tab: "bugs", label: "באגים והערות" },
];

/** מסכי החניך שאינם תלויי תפקיד. ⚠ תפקידים מגיעים מ-`DUTIES`. */
export const STUDENT_SCREENS = [
  { tab: "home", label: "בית" },
  { tab: "profile", label: "הפרופיל שלי" },
  { tab: "board", label: "לוח מודעות" },
  { tab: "year", label: "הנוכחות שלי" },
  { tab: "requests", label: "בקשות יציאה" },
  { tab: "tryouts", label: "מיונים ושיבוצים" },
  { tab: "leadership", label: "המובילשיות שלי" },
  { tab: "projects", label: "הפרויקטים שלי" },
  { tab: "agenda", label: "הלו״ז שלי" },
  { tab: "gantt", label: "גאנט שנתי" },
  { tab: "chores", label: "תורנויות" },
  { tab: "menu", label: "תפריט ארוחות" },
  { tab: "rules", label: "נהלים במכינה" },
  { tab: "faults", label: "דיווח תקלה" },
  { tab: "placements", label: "השיבוצים שלי" },
  { tab: "teams", label: "ועדות וסדרות" },
  { tab: "mydata", label: "הנתונים שלי" },
  { tab: "laundry", label: "חדר כביסה" },
  { tab: "quotes", label: "הציטוט היומי" },
  { tab: "group", label: "הקבוצה שלי" },
  { tab: "archive", label: "השיעורים שהיו" },
  { tab: "mishmar", label: "משמר" },
];
