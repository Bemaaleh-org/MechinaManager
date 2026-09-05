/* ============================================================
   מחזורים — הגדרת המפה
   ------------------------------------------------------------
   ⚠ למכינה יש מחזור אחד פעיל בכל רגע. הרעיון כאן הוא שמחזור
     חדש נפתח **מתוך האפליקציה** ולא בפיתוח: ראש המכינה יוצר
     אותו, מייבא גאנט וגיליונות ומצבה, ומהרגע הזה המערכת
     עובדת מולו.

   ⚠ הרשימה למטה היא **החוזה**: אילו לוחות מרכיבים מחזור, ולאן
     כל אחד נכנס במפת המזהים. תוספת של תחום חדש למערכת דורשת
     שורה כאן — אחרת מחזור חדש ייווצר בלעדיה, וזו תקלה שתתגלה
     רק בעוד שנה.

   ⚠ מה **לא** שייך למחזור: לוח ההרשאות (הצוות ממשיך), לוח
     המנות (מתכונים אינם משתנים בין מחזורים), ולוח הבוגרים —
     שהוא בדיוק המקום שבו מחזור שהסתיים ממשיך לחיות.
   ============================================================ */

/**
 * כל לוח: המפתח במפה, שם התצוגה, והנתיב במודול המזהים.
 *
 *   path: "MECHINA_BOARDS.roster"  →  לאן לכתוב את המזהה החדש
 *   need: האם מחזור בלי הלוח הזה שביר
 */
export const CYCLE_BOARDS = [
  { key: "roster", title: "מצבת החניכים", path: "mechina.roster", need: true },
  { key: "requests", title: "בקשות יציאה", path: "mechina.requests", need: true },
  { key: "absence", title: "היעדרויות", path: "mechina.absence", need: false },
  { key: "calendar", title: "לוח השנה", path: "mechina.calendar", need: false },
  { key: "marked", title: "סימוני נוכחות", path: "mechina.marked", need: false },
  { key: "incidents", title: "אירועים חריגים", path: "mechina.incidents", need: false },
  { key: "leaderWeeks", title: "מובילי שבוע", path: "mechina.leaderWeeks", need: false },
  { key: "dutyTasks", title: "משימות בעלי תפקידים", path: "duty.tasks", need: false },
  { key: "dutyNotes", title: "הצפות לבעלי תפקידים", path: "duty.notes", need: false },
  /* ⚠ **משימות הצוותים כן במחזור, ואוצר המילים לא.**
     המשימות הן של ועדת מחזור זה ואינן עוברות הלאה; אוצר
     המילים ("בעבודה", "לפני האירוע", ומה נחשב סגור) הוא
     ידע מוסדי שהמכינה כיוונה פעם אחת — בדיוק כמו מסמכי
     החפיפה ולוח המנות, שגם הם מחוץ לחוזה (4מז). */
  { key: "teamTasks", title: "משימות ועדות וסדרות", path: "team.tasks", need: false },
  { key: "sheets", title: "גיליונות מרצים", path: "lessons.sheets", need: true },
  { key: "meetings", title: "מפגשי שיעורים", path: "lessons.meetings", need: true },
  { key: "evals", title: "חוות דעת", path: "lessons.evals", need: false },
  { key: "gantt", title: "גאנט שנתי", path: "lessons.gantt", need: true },
  { key: "assignments", title: "שיבוצי חניכים", path: "placements.assignments", need: false },
  { key: "definitions", title: "ענפים, ועדות וסדרות", path: "placements.definitions", need: false },
  { key: "budgetDays", title: "ימי התקציב", path: "budget.days", need: false },
  { key: "budgetOrders", title: "קניות", path: "budget.orders", need: false },
  { key: "faults", title: "תקלות ובעיות", path: "faults.board", need: false },
  { key: "safety", title: "אירועי בטיחות", path: "safety.board", need: false },
  { key: "hosting", title: "אירוח קבוצות", path: "extras.hosting", need: false },
  { key: "loans", title: "השאלת ציוד", path: "extras.loans", need: false },
  /* ⚠ **הפרויקטים שייכים למחזור.** הם העבודה של החניכים האלה
     ואינם עוברים הלאה — בדיוק כמו משימות הוועדות. שלושת
     הלוחות יחד, אחרת מחזור חדש יקבל משימות ותקציב שמצביעים
     על פרויקטים שאינם קיימים בו. */
  { key: "projects", title: "פרויקטים", path: "projects.projects", need: false },
  { key: "projectTasks", title: "משימות פרויקט", path: "projects.tasks", need: false },
  { key: "projectMoney", title: "תקציב פרויקט", path: "projects.budget", need: false },
];

/** מה נדרש כדי שמחזור ייחשב מוכן */
/* ⚠ **משימות והצפות שייכות למחזור; מסמכי החפיפה לא.**
   חפיפה היא ידע מוסדי שעובר בין מחזורים — בדיוק הנימוק
   שבגללו לוח המנות ולוח הבוגרים נשארים מחוץ לרשימה. משימות
   שייכות לשנה שלהן. */

export const REQUIRED = CYCLE_BOARDS.filter((b) => b.need).map((b) => b.key);

export const CYCLE_STATUS = {
  building: "בהקמה",
  active: "פעיל",
  archived: "ארכיון",
};
export const CYCLE_STATUSES = Object.values(CYCLE_STATUS);

/* ============================================================
   שלבי ההקמה
   ------------------------------------------------------------
   ⚠ סדר ולא רשימה. אי אפשר לייבא מפגשי שיעורים לפני שיש
     גיליונות, ואי אפשר לשבץ חניכים לוועדות לפני שיש חניכים.
     המסך מציג את השלב הבא ולא את כולם בבת אחת.

   ⚠ רק שני הראשונים חובה. מחזור עם גאנט ומצבה כבר שימושי;
     השאר נכנס במהלך השנה, וחסימה עליהם הייתה מונעת מלהתחיל.
   ============================================================ */
export const CYCLE_STEPS = [
  { key: "boards", title: "פתיחת הלוחות", need: true,
    desc: "העתקת מבנה הלוחות של המחזור הנוכחי — בלי הנתונים שבהם" },
  { key: "students", title: "מצבת החניכים", need: true,
    desc: "שם ותעודת זהות לכל חניך. משם הם נכנסים למערכת בפעם הראשונה" },
  { key: "gantt", title: "הגאנט השנתי", need: false,
    desc: "סדרות, שבתות, חגים וסופי שבוע בבית. מזין גם את תקציב המטבח" },
  { key: "sheets", title: "גיליונות המרצים", need: false,
    desc: "נושא, מרצה, יום ושעה. המפגשים נוצרים מהם" },
  { key: "groups", title: "ענפים, ועדות וסדרות", need: false,
    desc: "הקבוצות שאליהן משבצים את החניכים" },
  { key: "roles", title: "תפקידים במכינה", need: false,
    desc: "אחראי מטבח, מכולה, בטיחות, אב בית ולו״ז" },
];

/** האם המחזור מוכן להפעלה */
export function cycleReady(cycle) {
  const done = new Set(cycle?.done || []);
  const missing = CYCLE_STEPS.filter((s) => s.need && !done.has(s.key));
  return { ready: missing.length === 0, missing: missing.map((s) => s.title) };
}

/** השלב הבא שדורש טיפול */
export const nextStep = (cycle) => {
  const done = new Set(cycle?.done || []);
  return CYCLE_STEPS.find((s) => !done.has(s.key)) || null;
};

/**
 * מפה שטוחה → מקוננת.
 *   { "mechina.roster": "123" }  →  { mechina: { roster: "123" } }
 * ⚠ הפורמט השטוח הוא מה שנשמר בלוח, כי הוא קריא לאדם שפותח
 *   אותו. הקינון הוא מה שהקוד צריך.
 */
export function nestBoards(flat) {
  const out = {};
  for (const [path, id] of Object.entries(flat || {})) {
    if (!id) continue;
    const [ns, key] = String(path).split(".");
    if (!ns || !key) continue;
    (out[ns] = out[ns] || {})[key] = String(id);
  }
  return out;
}
