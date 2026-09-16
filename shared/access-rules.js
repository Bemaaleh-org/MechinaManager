/* ============================================================
   הרשאות מותאמות — מה שראש המכינה קובע ידנית
   ------------------------------------------------------------
   הבקשה: *"דף הרשאות למנהלי המכינה עם כל תפקיד... שלכל אחד יש
   את כל דפי המכינה ומנהל המכינה בוחר איזה הרשאות לתת לו, בכלל
   לא, צפייה, עריכה, אפשר לתת גם לתפקיד ספציפי וגם לכל משתמש."*

   ⚠⚠⚠ **הכלל שמחזיק את כל זה: ההתאמה יכולה רק לצמצם.**

     כל מה שכתוב כאן יושב **מעל** ההרשאות שהקוד כבר אוכף, ואינו
     מחליף אותן. חניך שקיבל "עריכה" על מסך הבוגרים עדיין מקבל
     403 — `withAuth` חוסם אותו לפני שמגיעים לכאן.

     זו אינה מגבלה טכנית אלא ההחלטה: מנגנון שיכול **להעניק**
     גישה הופך כל כלל אבטחה במאגר לניתן לעקיפה משורה בלוח, ואז
     אי אפשר עוד לענות על "מי רואה מה" בלי לפתוח את monday.
     מנגנון שרק מצמצם משאיר כל הבטחה קיימת בתוקף — ומוסיף
     מעליה מה שראש המכינה רוצה לסגור.

   ⚠⚠ **וכישלון בטעינה משאיר את המערכת פתוחה כפי שהייתה.**
     אותו כלל של `ensureCycle` (4ל): לוח שלא נענה לא אמור לנעול
     את המטבח באמצע שירות. הטעות היקרה כאן היא חסימה שגויה,
     לא היעדר חסימה.

   ⚠ **המסך הוא היחידה, וה-`?action=` הוא מה שנאכף.** אלה שני
     דברים, והחיבור ביניהם הוא `SCREEN_API` שב-shared/screens.js.
     `npm run check:access` מוודא שכל פעולה שקיימת בנתבים
     ממופה למסך או מוצהרת כפתוחה — בלי הבדיקה זו רשימה שנייה
     שמתפצלת בתוספת הראשונה (4מד).
   ============================================================ */

/** שלוש הרמות, מהפתוח לסגור. ⚠ `edit` = בלי התאמה כלל. */
export const LEVELS = ["edit", "view", "none"];

export const LEVEL_HE = {
  edit: "מלא",
  view: "צפייה בלבד",
  none: "חסום",
};

export const LEVEL_NOTE = {
  edit: "כפי שהמערכת מגדירה ממילא — ההתאמה אינה מוסיפה הרשאה",
  view: "רואה את המסך ואינו משנה בו דבר",
  none: "המסך אינו נפתח כלל",
};

/** ⚠ `edit` היא ברירת המחדל, כלומר "אין התאמה". */
export const DEFAULT_LEVEL = "edit";

/** כמה מצומצמת הרמה — גבוה יותר = סגור יותר. */
const RANK = { edit: 0, view: 1, none: 2 };

/**
 * ⚠ **הצמצום החזק ביותר מנצח, ולא המפורש ביותר.**
 *   מי שחסום ברמת התפקיד וקיבל "צפייה" אישית נשאר חסום. הכיוון
 *   הזה הוא היחיד שעקבי עם "רק מצמצמת": אילו ההתאמה האישית
 *   הייתה גוברת, היא הייתה **מרחיבה** את מה שהתפקיד סגר.
 */
export const narrower = (a, b) => (RANK[b] > RANK[a] ? b : a);

/* ============================================================
   נושא ההתאמה
   ------------------------------------------------------------
   שלושה סוגים, והם מה שהתבקש: "לתפקיד ספציפי וגם לכל משתמש".

     kind:staff    · kind:student   — כל הצוות / כל החניכים
     role:<שם>                      — תפקיד מלוח החניכים
     user:<מזהה>                    — אדם אחד

   ⚠ **המפתח הוא מזהה ולא שם** למשתמש: שם משתנה, והתאמה שנקשרה
     לשם הייתה נעלמת ביום שחניך משנה אותו. השם נגזר לתצוגה
     ואינו נשמר — אותו דפוס של השותפים בפרויקטים (5ח).
   ============================================================ */
export const SUBJECT = { kind: "kind", role: "role", user: "user" };

export const subjectKey = (kind, id) => `${kind}:${String(id || "").trim()}`;

export function parseSubject(key) {
  const s = String(key || "");
  const i = s.indexOf(":");
  if (i < 0) return null;
  const kind = s.slice(0, i);
  const id = s.slice(i + 1).trim();
  if (!id || !Object.values(SUBJECT).includes(kind)) return null;
  return { kind, id };
}

/**
 * כל המפתחות שסשן נתון נופל תחתיהם, מהכללי לפרטי.
 * ⚠ הסדר כאן אינו קובע — `narrower` קובע — והוא לתצוגה בלבד.
 */
export function subjectsOf(session) {
  const out = [];
  if (!session) return out;
  out.push(subjectKey(SUBJECT.kind, session.isStudent ? "student" : "staff"));
  for (const r of session.roles || []) out.push(subjectKey(SUBJECT.role, r));
  if (session.itemId) out.push(subjectKey(SUBJECT.user, session.itemId));
  return out;
}

/**
 * הרמה בפועל למסך אחד.
 * @param rules מערך של { subject, screen, level }
 */
export function levelFor(session, screen, rules) {
  let lvl = DEFAULT_LEVEL;
  if (!screen || !Array.isArray(rules) || !rules.length) return lvl;
  const mine = new Set(subjectsOf(session));
  for (const r of rules) {
    if (r.screen !== screen) continue;
    if (!mine.has(r.subject)) continue;
    if (!RANK[r.level]) continue;      /* ⚠ `edit` ו-ערך לא מוכר אינם מצמצמים */
    lvl = narrower(lvl, r.level);
  }
  return lvl;
}

/**
 * כל המסכים שסשן נתון מצומצם בהם — **רק אלה**.
 * ⚠ מפה של 50 מסכים ברובם `edit` היא רעש; מה שמוחזר הוא מה
 *   שהשתנה, והמסך מניח `edit` על כל השאר.
 */
export function narrowedFor(session, rules) {
  const out = {};
  if (!Array.isArray(rules)) return out;
  const mine = new Set(subjectsOf(session));
  for (const r of rules) {
    if (!mine.has(r.subject) || !RANK[r.level]) continue;
    out[r.screen] = narrower(out[r.screen] || DEFAULT_LEVEL, r.level);
  }
  for (const k of Object.keys(out)) if (out[k] === DEFAULT_LEVEL) delete out[k];
  return out;
}

/* ============================================================
   ⚠⚠⚠ **הפעולות שלעולם אינן נחסמות.**

   מי שיחסום לעצמו את `me` ננעל מחוץ למערכת בלי שום דרך לתקן,
   ומי שיחסום `logout` נשאר תקוע עם עוגייה חיה. אלה אינם מסכים
   אלא התשתית שמחזיקה כל מסך אחר:

     me · logout · login · signin · account · recover · notify

   ⚠ **`notify` ברשימה בכוונה:** הפעמון נטען בכל מסך, וחסימה
     שלו הייתה מציגה שגיאה על כל דף במערכת (4כו).
   ⚠ ו-`search` פתוח כי כל מקור בו אוכף את ההרשאה של עצמו
     (5יג) — חסימה שלו לא מוסיפה דבר ומשאירה את המשתמש בלי
     דרך למצוא את מה שכן פתוח לו.
   ============================================================ */
export const NEVER_BLOCKED = new Set([
  "me", "logout", "login", "signin", "account", "recover", "notify", "search",
]);
