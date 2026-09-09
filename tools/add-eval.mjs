/* ============================================================
   הוספת שורת חוות דעת מהטרמינל
   ------------------------------------------------------------
   הרצה:
     node --env-file=.env tools/add-eval.mjs "שחר סדנאות"

   ואפשר גם:
     --topic "..."   נושא ההרצאה
     --field "..."   תחום (תווית בעמודת התחום)
     --opinion "..." חוות הדעת עצמה
     --cycle  "..."  ברירת המחדל היא המחזור הנוכחי
     --by     "..."  מי כתב

   ⚠⚠ **זה אינו מסלול שני לאפליקציה.** הדרך הרגילה היא המסך —
     שיעורים ← חוות דעת ← "חוות דעת חדשה", או כפתור "הוספת חוות
     דעת" שעל המפגש. הכלי הזה קיים לסביבה שאין בה דפדפן, ולמצב
     שבו צריך להכניס שורה אחת ולהמשיך. **מי שמוסיף כאן שדות
     חדשים במקום במסך מפצל את המערכת לשני מסלולים** — וזה בדיוק
     מה שכל הכללים על "דלת אחת" נועדו למנוע.

   ⚠ **אינו מכפיל.** שם שכבר קיים בלוח עוצר את הכלי ומדפיס את
     השורה הקיימת ואת המחזור שלה. שתי שורות לאותו מרצה מפצלות
     את ההיסטוריה שלו, וזה בדיוק מה שלוח אחד לחוות הדעת נועד
     למנוע (5ד).

   ⚠ **המחזור נלקח מהמחזור הפעיל ולא מהקובץ.** `LESSON_BOARDS`
     הוא אובייקט ש-`ensureCycle()` דורס בזמן ריצה (4ל); כלי
     שקורא אותו בלי לקרוא לה כותב ללוח של המחזור שכתוב בקוד,
     ואחרי מעבר מחזור זה הלוח הלא-נכון — בשקט.

   ⚠ **`by` נשאר ריק אם לא נמסר.** כל כתיבה לחוות דעת חותמת את
     שם הכותב, ולכלי אין סשן. שם מומצא גרוע משדה ריק.
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import { ensureCycle, activeName } from "../api/_cycle.js";
import { LESSON_BOARDS, LESSON_COLS, CYCLE } from "../shared/lessons-boards.js";

const argv = process.argv.slice(2);
const flag = (k) => {
  const i = argv.indexOf("--" + k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};
/* השם הוא הארגומנט הראשון שאינו דגל ואינו ערך של דגל. */
const flagKeys = ["topic", "field", "opinion", "cycle", "by"];
const consumed = new Set();
for (const k of flagKeys) {
  const i = argv.indexOf("--" + k);
  if (i >= 0) { consumed.add(i); consumed.add(i + 1); }
}
const positional = argv.filter((_, i) => !consumed.has(i)).filter((a) => !a.startsWith("--"));
const lecturer = String(positional[0] || "").trim();

if (!lecturer) {
  console.log('שימוש: node --env-file=.env tools/add-eval.mjs "שם המרצה" [--topic ..] [--field ..] [--opinion ..] [--cycle ..] [--by ..]');
  process.exit(1);
}

if (!process.env.MONDAY_TOKEN) {
  console.log("חסר MONDAY_TOKEN. להריץ עם --env-file=.env מתיקיית המאגר.");
  process.exit(1);
}

/* ⚠ נכשל ברעש ולא ממשיך על המזהים שבקוד: כתיבה ללוח של מחזור
   קודם היא בדיוק סוג הטעות שמתגלה בעוד שנה. */
try {
  await ensureCycle();
} catch (e) {
  console.log("טעינת המחזור הפעיל נכשלה:", e.message);
  process.exit(1);
}

const board = LESSON_BOARDS.evals;
const E = LESSON_COLS.evals;
const cycle = flag("cycle") || CYCLE.second;

/* ⚠ המחזור נבדק מול `CYCLE` **לפני** הכתיבה ואינו טקסט חופשי:
   `create_labels_if_missing` דלוק במוטציה, ותווית שהוקלדה בטעות
   נוצרת בלוח ואי אפשר למחוק אותה דרך ה-API (4כא). */
if (!Object.values(CYCLE).includes(cycle)) {
  console.log(`מחזור לא מוכר: ${cycle}. אפשריים: ${Object.values(CYCLE).join(" · ")}`);
  process.exit(1);
}

console.log(`מחזור פעיל: ${activeName() || "לא ידוע"} · לוח חוות הדעת: ${board}`);

const rows = await allItems(board);
const clash = rows.find((r) => String(r.name || "").trim() === lecturer);
if (clash) {
  const cv = (clash.column_values || []).find((c) => c.id === E.cycle);
  console.log(`\n"${lecturer}" כבר קיים בלוח (${clash.id})${cv && cv.text ? ` — ${cv.text}` : ""}.`);
  console.log("לא נוצרה שורה שנייה: שתי שורות לאותו מרצה מפצלות את ההיסטוריה שלו.");
  console.log("להעברה בין מחזורים — מסך חוות הדעת, עריכה, בורר המחזור (ראש המכינה).");
  process.exit(1);
}

const cols = {
  [E.cycle]: { label: cycle },
  [E.at]: { date: new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()) },
};
if (flag("topic")) cols[E.topic] = flag("topic").slice(0, 200);
if (flag("field")) cols[E.field] = { label: flag("field") };
if (flag("opinion")) cols[E.opinion] = flag("opinion").slice(0, 2000);
if (flag("by")) cols[E.by] = flag("by").slice(0, 120);

/* ⚠ `create_labels_if_missing` דלוק כי **התחום** הוא רשימה
   שהמכינה מרחיבה לאורך השנה — אותו חריג בדיוק שכבר קיים ב-POST
   של נקודת הקצה. המחזור כבר נבדק למעלה. */
const d = await gql(
  `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:true){ id } }`,
  { b: board, n: lecturer, v: JSON.stringify(cols) }
);

const id = String(d.create_item.id);
console.log(`\n✓ נוצרה שורת חוות דעת: ${lecturer} · ${cycle} · ${id}`);
if (!flag("opinion")) {
  console.log("  בלי הערה — היא נכתבת מהמסך בכפתור \"הוספת הערה\".");
}
