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

  /* ⚠ ארבעת המסכים האלה נבנים במגירה מ-`LESSON_TABS`
     שב-Lessons.jsx, ולא נכתבים שם אחד-אחד. check:nav קורא
     גם משם. */
  { tab: "l-board", label: "שיעורים קרובים" },
  { tab: "l-sheets", label: "גיליונות המרצים" },
  { tab: "pay", label: "תשלום למרצים" },
  { tab: "l-quota", label: "תקני שיעורים" },
  { tab: "l-changes", label: "שינויים בלו״ז" },
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

/* ============================================================
   מסך → פעולות בשרת
   ------------------------------------------------------------
   ⚠⚠ **זה החוזה שהופך "הרשאה למסך" לדבר שהשרת יכול לאכוף.**
     המסך הוא מה שראש המכינה בוחר, ו-`?action=` הוא מה שנבדק
     בכל בקשה. בלי המפה הזו דף ההרשאות היה מסתיר אריח ולא
     חוסם כלום — כלומר "מסך שמשקר על אבטחה", שזה בדיוק מה
     ש-5ד אוסר.

   ⚠ **פעולה יכולה להיות בכמה מסכים, ומסך בכמה פעולות.** מה
     שקובע הוא הצמצום החזק ביותר מבין המסכים שהפעולה שייכת
     להם — חסימת "שיעורים קרובים" לא אמורה להישבר בגלל
     ש-`list` משרת גם את הארכיון.

   ⚠⚠ **`npm run check:access` מוודא שכל פעולה שקיימת בנתבים
     נמצאת כאן או ב-`OPEN_ACTIONS`.** בלי הבדיקה זו רשימה
     שנייה שמתפצלת בתוספת הראשונה (4מד), ופעולה שתתווסף מחר
     תישאר פתוחה בשקט.
   ============================================================ */
export const SCREEN_API = {
  /* --- נוכחות, חניכים ותפקידים --- */
  "a-students": ["list", "year", "profile", "edit", "incident"],
  "a-roles": ["role", "duty", "chair"],
  "a-requests": ["requests", "decide", "recost"],
  "a-mark": ["day", "mark", "train"],
  /* ⚠⚠ **שמות נרדפים מ-`DUTIES`.** אותו מסך נושא מפתח אחד
     במגירת הצוות ומפתח אחר בלשוניות התפקיד (`k-budget` מול
     `budget`, `c-container` מול `container`). שניהם חייבים
     למפות לאותן פעולות, אחרת חסימה דרך אחד מהם אינה חוסמת
     דבר — וזה בדיוק 4יט בגרסת הרשאות. */
  mark: ["day", "mark", "train"],
  budget: ["budget"],
  container: ["equip", "shop"],
  cleaning: ["equip", "shop"],
  "a-place": ["placements", "placements-setup"],
  "a-teams": ["team-admin"],
  "a-leaders": ["leader", "weeks"],
  "a-chores": ["view", "assign", "sector", "adjust", "task", "tick", "text"],
  "a-rules": ["text"],
  "a-content": ["text"],
  /* ⚠⚠ **דף ההרשאות ממופה לעצמו, וזה בכוונה.** מי שראש
     המכינה יצמצם לו את המסך הזה לא יוכל גם לקרוא את
     ההתאמות — והשרת ממילא מחזיר 403 לכל מי שאינו ראש
     מכינה, כך שהמיפוי אינו מוסיף חסימה אלא רק עקביות:
     `check:access` נכשל על פעולה שאינה ממופה, ו"פתוחה"
     הייתה הצהרה לא נכונה. */
  "a-access": ["access"],
  "a-tryouts": ["tryouts"],
  "a-recruit": ["recruit"],

  /* --- מטבח --- */
  "k-all": ["equip", "shop", "doctor", "par-import", "produce"],
  "k-budget": ["budget"],
  "k-menu": ["menu", "weekmenu", "staples"],
  buy: ["buy", "allshop"],
  "gear-week": ["gear-week"],

  /* --- מכולה, תחזוקה ובטיחות --- */
  "c-container": ["equip", "shop"],
  "c-clean": ["equip", "shop"],
  loans: ["loans"],
  /* ⚠ `pros` כאן ולא במסך משלו — מאגר אנשי המקצוע מרונדר
     בתוך מסך התקלות (src/Faults.jsx) ואינו דף בניווט. */
  faults: ["faults", "faults-setup", "pros"],
  safety: ["safety", "safety-setup"],
  hosting: ["hosting"],
  laundry: ["laundry"],

  /* --- שיעורים --- */
  "l-board": ["board", "mark"],
  "l-sheets": ["sheet", "meeting", "list"],
  pay: ["pay"],
  "l-quota": ["sheet"],
  "l-changes": ["changes"],
  "l-evals": ["evals", "last-eval"],
  archive: ["archive", "content", "rate"],
  lecturers: ["lecturers"],
  "stu-lessons": ["stu-lessons"],
  plenary: ["plenary"],
  gantt: ["gantt"],
  mishmar: ["mishmar"],
  "lead-week": ["lead-week", "lead-activity"],
  agenda: ["agenda"],

  /* --- אישי, ועדות וניהול --- */
  profile: ["profile"],
  /* ⚠ הסקרים והמשוב להנהלה יושבים בתוך לוח המודעות (5יב). */
  board: ["notices", "mpoll", "mfeedback"],
  requests: ["requests"],
  year: ["year"],
  tryouts: ["tryouts"],
  leadership: ["leadership"],
  projects: ["projects", "project-task", "project-money", "project-entry"],
  chores: ["view", "tick", "text"],
  menu: ["menu", "weekmenu"],
  rules: ["text"],
  placements: ["placements"],
  teams: ["team", "team-task", "team-entry", "team-poll", "team-feedback",
    "team-lecturer"],
  mydata: ["mydata"],
  quotes: ["quotes"],
  group: ["group"],
  alumni: ["alumni"],
  trends: ["trends"],
  cycles: ["cycles", "import"],
  export: ["report", "export"],
  bugs: ["bugs"],
};

/* ============================================================
   ⚠⚠ **פעולות שאינן שייכות לשום מסך, ולמה.**

   כל אחת כאן היא הצהרה מפורשת ולא השמטה: `check:access` נכשל
   על פעולה שאינה באף אחת משתי הרשימות, ולכן אי אפשר להוסיף
   נקודת קצה ולשכוח אותה (4ט).
   ============================================================ */
export const OPEN_ACTIONS = {
  /* התשתית — ראו NEVER_BLOCKED ב-shared/access-rules.js */
  me: "זהות הסשן — חסימה שלה נועלת את המשתמש בלי דרך לתקן",
  login: "כניסה",
  logout: "יציאה — מי שנחסם חייב להיות מסוגל לצאת",
  signin: "כניסה",
  account: "מסך ההקמה של החשבון",
  recover: "איפוס סיסמה",
  notify: "הפעמון נטען בכל מסך — חסימה הייתה מציגה שגיאה בכל דף",
  search: "כל מקור בחיפוש אוכף את ההרשאה של עצמו (5יג)",

  /* כלים של ראש המכינה בלבד, ואינם דף במגירה */
  mailtest: "בדיקת מייל — מסך הגדרות, לא דף",
  push: "רישום המכשיר להתראות",
  "push-run": "משימה מתוזמנת — CRON_SECRET ולא סשן",

  /* פעולות שהמסך שלהן אינו נפרד */
  "duty-notes": "הצפה — יושבת בתוך כרטיס התפקיד ובכל ועדה (4ס)",
  /* ⚠⚠ **ומרכז התפקיד אינו ניתן לחסימה, במכוון.** `isManager`
     אינו מרחיב שם גישה (4מה), וראש המכינה אינו רואה את
     המשימות של אף חניך. מנגנון שיאפשר לו לחסום אותן היה
     הופך את הגבול הזה למשהו שהוא שולט בו. */
  "duty-tasks": "מרכז התפקיד — הגבול של 4מה, ואינו ניתן לחסימה",
};
