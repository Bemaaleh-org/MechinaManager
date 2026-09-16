/* ============================================================
   קבוצות ניווט שחייבות להיות זהות בשתי המעטפות
   ------------------------------------------------------------
     npm run check:nav

   `src/App.jsx` (צוות) ו-`src/Mechina.jsx` (חניך) הן שתי מעטפות
   לאותם רכיבים (4יט).

   ⚠⚠ **מה שקרה:** מליאות, שיעורי חניך ומאגר מרצים קיבלו קבוצה
     בשם "קבוצה ותוכן" במעטפת החניך, ובמעטפת הצוות נשארו תחת
     **"בטיחות ותחזוקה"** — קבוצה שהם נוספו אליה רק מפני שהיא
     הייתה פתוחה על המסך באותו רגע. שני המסכים עבדו, ולכן שום
     בדיקה לא תפסה; הם פשוט לא היו באותו מקום.

   ⚠⚠⚠ **ולמה זו רשימה מוצהרת ולא כלל כללי.**
   ------------------------------------------------------------
   נוסו שני כללים גורפים, ושניהם רעש:

     · "מסך שקיים בשתיהן — אותה קבוצה" → **12 התאמות שגויות**.
       שתי המעטפות מקבצות לפי שאלות שונות בכוונה: הצוות לפי
       תחום (לו״ז · צבא · ניהול), והחניך לפי "מה שלי" מול
       "היום־יום". `requests` אצל הצוות הוא "מה להכריע" ואצל
       החניך "מה ביקשתי" — אותו מסך, ובצדק לא אותה קבוצה.
     · "מסך שמרונדר ואינו בניווט" → **19 התאמות שגויות**,
       כי מסכים מגיעים גם מכינויים, מתת-לשוניות וממרכז התפקיד.

   בדיקה שמדווחת שתים־עשרה שגיאות שאינן שגיאות היא בדיקה
   שמפסיקים להסתכל על הפלט שלה — וזה כתוב ב-CLAUDE.md על
   `check:undef` ("כלל אחד ולא חבילת lint"). לכן כאן **חוזה**:
   מה שהוחלט במפורש שיהיה זהה, ורק הוא.

   **קבוצה חדשה שאמורה להיות זהה בשתי המעטפות — שורה כאן.**
   ============================================================ */
import { readFileSync } from "node:fs";

/* ============================================================
   החוזה
   ------------------------------------------------------------
   ⚠ `keys` הם מזהי הפריטים כפי שהם כתובים בשתי המעטפות. מסך
     שנקרא אחרת בכל אחת מהן אינו שייך לכאן — הוא ייכשל על שם
     ולא על מיקום.
   ============================================================ */
const CONTRACT = [
  {
    group: "קבוצה ותוכן",
    keys: ["plenary", "stu-lessons", "lecturers", "l-evals", "l-sheets"],
    why: "מסכי ועדת קבוצה ותוכן (5לא), וגיליונות המרצים שנפתחו לה",
  },
];

/** כל קבוצות הניווט בקובץ: label → [keys] */
function groups(file) {
  const src = readFileSync(file, "utf8");
  const out = new Map();
  const RE = /\{\s*label:\s*"([^"]+)",\s*items:\s*\[/g;
  let m;
  while ((m = RE.exec(src))) {
    /* ⚠ התאמת סוגריים ולא "עד ה-label הבא": קבוצה מקוננת הייתה
       נבלעת, והמפתחות שלה מדווחים כשייכים לקבוצה שמעליה. */
    let depth = 1, i = RE.lastIndex;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "[") depth++;
      else if (c === "]") depth--;
      i++;
    }
    const keys = [...src.slice(RE.lastIndex, i - 1).matchAll(/key:\s*"([^"]+)"/g)].map((k) => k[1]);
    out.set(m[1], [...(out.get(m[1]) || []), ...keys]);
  }
  return out;
}

const SHELLS = [
  { file: "src/App.jsx", who: "צוות" },
  { file: "src/Mechina.jsx", who: "חניך" },
];

let bad = 0;
for (const c of CONTRACT) {
  console.log(`\n▶ ${c.group}  —  ${c.why}\n`);
  for (const sh of SHELLS) {
    const g = groups(sh.file);
    const keys = g.get(c.group);
    if (!keys) {
      bad++;
      console.log(`  ✗ ${sh.who}: אין קבוצה בשם "${c.group}" ב-${sh.file}`);
      /* ⚠ אומר **איפה כן** יושבים המסכים — "אין קבוצה" לבדו
         שולח לחפש, וזו בדיוק התקלה שהבדיקה מתעדת. */
      for (const k of c.keys) {
        for (const [label, ks] of g) {
          if (ks.includes(k)) console.log(`      ${k} יושב כרגע תחת "${label}"`);
        }
      }
      continue;
    }
    const missing = c.keys.filter((k) => !keys.includes(k));
    if (missing.length) {
      bad++;
      console.log(`  ✗ ${sh.who}: חסרים בקבוצה — ${missing.join(" · ")}`);
      for (const k of missing) {
        for (const [label, ks] of g) {
          if (ks.includes(k)) console.log(`      ${k} יושב תחת "${label}"`);
        }
      }
    } else {
      console.log(`  ✓ ${sh.who}: ${c.keys.join(" · ")}`);
    }
  }
}

/* ============================================================
   ⚠⚠ **קטלוג החיפוש מול המגירה.**

   `shared/screens.js` הוא רשימה שנייה של מסכים, ורשימה
   שנייה מתפצלת בתיקון הראשון (4מד). השרת אינו יכול
   לייבא את המגירה (JSX עם אייקונים ותנאי הרשאה), ולכן
   מה שמחזיק את השתיים צמודות הוא הבדיקה הזו.

   ⚠ מסך שאינו בקטלוג פשוט **אינו נמצא בחיפוש** — בלי
     שגיאה ובלי רמז, וזה בדיוק מה שדווח ("מכולה" החזיר
     תקלה אחת).
   ============================================================ */
console.log("\n▶ קטלוג החיפוש (shared/screens.js) מול המגירה\n");
{
  const { STAFF_SCREENS } = await import("../shared/screens.js");
  const src = readFileSync("src/App.jsx", "utf8");
  const drawer = new Map(
    [...src.matchAll(/key:\s*"([a-z0-9-]+)",\s*label:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
  /* ⚠⚠ **ארבעת מסכי השיעורים נבנים במגירה מ-`LESSON_TABS`**
     (`key: t.tab, label: t.label`) ולא נכתבים שם אחד-אחד, ולכן
     הרגקס שלמעלה אינו תופס אותם. בלי השורות האלה
     הבדיקה היתה מדווחת "אינו קיים במעטפת הצוות" על
     מסך שקיים בהחלט. */
  const lessons = readFileSync("src/Lessons.jsx", "utf8");
  for (const m of lessons.matchAll(/sub:\s*"[a-z-]+",\s*tab:\s*"([a-z0-9-]+)",\s*label:\s*"([^"]+)"/g)) {
    if (!drawer.has(m[1])) drawer.set(m[1], m[2]);
  }
  let miss = 0;
  for (const sc of STAFF_SCREENS) {
    const label = drawer.get(sc.tab);
    if (!label) { miss++; console.log(`  ✗ ${sc.tab} ("${sc.label}") אינו קיים במעטפת הצוות`); continue; }
    if (label !== sc.label) {
      miss++;
      console.log(`  ✗ ${sc.tab}: בקטלוג "${sc.label}" ובמגירה "${label}"`);
    }
  }
  if (miss) bad += miss;
  else console.log(`  ✓ כל ${STAFF_SCREENS.length} המסכים קיימים במגירה באותה תווית`);
}

console.log("");
if (bad) {
  console.error("✗ הניווט אינו זהה בשתי המעטפות (4יט).");
  console.error("  החניך והמנהל מחפשים את אותו מסך בשני מקומות שונים.\n");
  process.exit(1);
}
/* ============================================================
   ⚠⚠ **`LESSON_TABS` מול `DUTIES[אחראי לו״ז]` — אותו מסך, אותה
     תווית.**

   שתי הרשימות מזינות שתי מגירות: `LESSON_TABS` את רצועת
   הלשוניות ואת מגירת הצוות, ו-`DUTIES` את מגירת בעל התפקיד.
   מסך שנוסף לאחת ולא לשנייה **עובד בשתיהן** ופשוט אינו קיים
   אצל אחד הקהלים — בדיוק 4יט, ובדיוק כך "תקני שיעורים" נעלם
   מאחראי הלו״ז ביום שנוסף.

   ⚠ ותווית שונה לאותו מסך מלמדת את מי שמחפש שאלה שני מסכים.
   ============================================================ */
{
  const { DUTIES } = await import("../shared/duties.js");
  const { ROLE_SCHEDULE } = await import("../shared/lessons-boards.js");
  const duty = new Map((DUTIES[ROLE_SCHEDULE]?.tabs || []).map((t) => [t.tab, t.label]));
  const lessons2 = readFileSync("src/Lessons.jsx", "utf8");
  const tabs = [...lessons2.matchAll(
    /sub:\s*"[a-z-]+",\s*tab:\s*"([a-z0-9-]+)",\s*label:\s*"([^"]+)"/g)];
  const gone = [];
  for (const [, tab, label] of tabs) {
    if (!duty.has(tab)) gone.push(`  ✗ ${label} (${tab}) — ב-LESSON_TABS ואינו ב-DUTIES`);
    else if (duty.get(tab) !== label) {
      gone.push(`  ✗ ${tab} — "${label}" ב-LESSON_TABS מול "${duty.get(tab)}" ב-DUTIES`);
    }
  }
  if (gone.length) {
    bad += gone.length;
    console.error("\nמסכי השיעורים אינם זהים בין שתי הרשימות:");
    for (const g of gone) console.error(g);
    console.error("  להוסיף ל-DUTIES[ROLE_SCHEDULE].tabs, או לתקן את התווית.");
  } else {
    console.log(`  ✓ כל ${tabs.length} לשוניות השיעורים ב-DUTIES באותה תווית`);
  }
}

console.log("✓ הקבוצות שבחוזה זהות בשתי המעטפות.\n");
