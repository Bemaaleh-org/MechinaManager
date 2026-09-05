/* ============================================================
   העדפות תצוגה — מצב לילה, גודל גופן, ניגודיות
   ------------------------------------------------------------
   ⚠⚠ **יושבות במכשיר ולא בשרת, ובכוונה.**

   העדפת תצוגה היא של **המכשיר** ולא של האדם: אותו חניך רוצה
   מצב לילה בטלפון שלו בלילה, ולא במחשב של המכינה שבו הוא
   נכנס לרגע. שמירה בשרת הייתה גוררת אותה בין מכשירים, וגם
   מוסיפה קריאה ללוח לכל טעינת מסך — בשביל צבע.

   ⚠ **וזה גם אומר שהיא שורדת התנתקות**, וזה נכון: מי שהגדיל
     את הגופן כי הוא מתקשה לקרוא לא צריך להגדיר אותו מחדש
     בכל כניסה.

   ------------------------------------------------------------
   ⚠ **`localStorage` נופל בגלישה בסתר ובחלק מהדפדפנים.** כל
     גישה עטופה, וכישלון מחזיר את ברירת המחדל בשקט — העדפת
     תצוגה אינה סיבה למסך שבור (עיקרון 6 בגרסה ההפוכה: כאן
     דווקא **אין** מה להודיע).

   ⚠ **וברירת המחדל של הנושא היא "לפי המכשיר".** מי שהגדיר
     במכשיר שלו מצב לילה מצפה שכל אפליקציה תכבד אותו, ומי
     שרוצה אחרת בוחר במפורש. שלושה מצבים ולא שניים.
   ============================================================ */

const KEY = "kx-prefs";

export const THEMES = [
  { id: "auto", label: "לפי המכשיר" },
  { id: "light", label: "בהיר" },
  { id: "dark", label: "כהה" },
];
export const TEXTS = [
  { id: "md", label: "רגיל" },
  { id: "lg", label: "גדול" },
  { id: "xl", label: "גדול מאוד" },
];

export const DEFAULTS = { theme: "auto", text: "md", contrast: "normal" };

const clean = (p) => ({
  theme: THEMES.some((t) => t.id === p.theme) ? p.theme : DEFAULTS.theme,
  text: TEXTS.some((t) => t.id === p.text) ? p.text : DEFAULTS.text,
  contrast: p.contrast === "high" ? "high" : "normal",
});

export function readPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? clean(JSON.parse(raw)) : { ...DEFAULTS };
  } catch {
    /* גלישה בסתר, אחסון חסום, JSON פגום — ברירת המחדל. */
    return { ...DEFAULTS };
  }
}

export function writePrefs(p) {
  const next = clean(p);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ריק */ }
  apply(next);
  return next;
}

/** האם הנושא האפקטיבי כהה — "auto" נשאל את המכשיר. */
export function isDark(p) {
  if (p.theme === "dark") return true;
  if (p.theme === "light") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch { return false; }
}

/* ============================================================
   ⚠ **המאפיינים נכתבים על `document.documentElement` ועל כל
     `.kx` שקיים** — לא על אלמנט אחד שנשמר בזיכרון.

   `src/App.jsx` מרנדר שני עצי `.kx` שונים (מסך הכניסה והמעטפת),
   והחלפה ביניהם בונה אלמנט חדש. הפניה שמורה הייתה מצביעה על
   אלמנט שאינו במסמך, והמצב היה נעלם בדיוק ברגע הכניסה.

   ⚠ ו-`html` מקבל `data-kx-theme` כדי שגם רקע ה-body ייצבע —
     גלישת-יתר באייפון חושפת אותו מתחת לתוכן.
   ============================================================ */
export function apply(p = readPrefs()) {
  const dark = isDark(p);
  try {
    document.documentElement.setAttribute("data-kx-theme", dark ? "dark" : "light");
    for (const el of document.querySelectorAll(".kx")) {
      el.setAttribute("data-theme", dark ? "dark" : "light");
      el.setAttribute("data-text", p.text);
      el.setAttribute("data-contrast", p.contrast);
    }
    /* ⚠ צבע סרגל הדפדפן בנייד — בלעדיו נשארת רצועה כחולה
       בהירה מעל אפליקציה כהה. */
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0B1826" : "#012E58");
  } catch { /* ריק */ }
}

/* ⚠ **מוחל שוב אחרי כל רינדור, ולא פעם אחת בטעינה.** React
   בונה ומחליף את עץ ה-`.kx` (כניסה → מעטפת), ומאפיין שנכתב
   פעם אחת נמחק ברגע שהאלמנט מוחלף. `MutationObserver` על
   `body` מחזיר אותו מיד, וזה זול — הוא מגיב להוספת אלמנטים
   בלבד ואינו סורק דבר. */
export function watch() {
  apply();
  try {
    /* ⚠ **מצומצם לפריים אחד.** React מעדכן את ה-DOM
       עשרות פעמים בשנייה, ו-`apply` שרץ על כל שינוי היה
       עובד הרבה ממנו לשוא. */
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; apply(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    /* ⚠ ושינוי במכשיר עצמו, כשהנושא הוא "auto". */
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (readPrefs().theme === "auto") apply(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch { /* ריק */ }
}
