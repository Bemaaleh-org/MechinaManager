/* ============================================================
   מיונים ושיבוצים — שינויי הלוחות
   ------------------------------------------------------------
   שלושה שינויים, וכולם ניתנים להרצה חוזרת בלי נזק:

   1. **סטטוס המיון** — חמש האפשרויות שהמכינה ביקשה, במקום השש
      הישנות. הרשימה נכתבת מחדש על **אותה עמודה** ולא בעמודה
      שנייה: עמודה שנייה הייתה משאירה את הישנה בלוח ואת
      `TRYOUT_COLS.status` מצביע על אחת מהן בלבד.

      ⚠⚠ **אף תווית ישנה אינה נמחקת — כולן מושבתות.**
        `update_status_column` **דורס את כל הרשימה**, ותווית
        שנעלמת ממנה מוחקת בשקט את הערך של כל שורה שיושבת
        עליה. השבתה מורידה אותה מהבחירה, שומרת על הנתון,
        והיא הפיכה בקליק בלוח. ראו את הבלוק על הצבעים למטה —
        שם גם הסיבה שאיננו נוגעים בצבע של אף תווית קיימת.

   2. **שיבוץ לצה״ל** — חיל אחד לחניך, ולצידו פירוט תפקיד
      חופשי. ⚠ רשימת החילות **נקראת מלוח הבוגרים** ואינה
      מוקלדת כאן: זו אותה שאלה ("לאיזה חיל"), ושתי רשימות
      מקבילות מתפצלות ביום הראשון — ואז הסטטיסטיקה של הבוגרים
      מפסיקה להתיישב עם השיבוצים של החניכים (4טז).

   3. **שיעור שאינו בדוח התשלום** — תיבה בגיליון.

   הרצה: node --env-file=.env tools/seed-army.mjs
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import { TRYOUT_BOARD, TRYOUT_COLS } from "../shared/tryouts-ids.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";
import { EXTRA } from "../shared/extras-ids.js";

/* ⚠ זהות בתו לתוויות שיישבו בלוח, ולמה שב-shared/tryouts-ids.js. */
export const TRYOUT_STATUS = [
  "טרם ניגשתי",
  "ניגשתי ועברתי לשלב הבא",
  "ניגשתי והתקבלתי",
  "ניגשתי ולא התקבלתי",
  "לא ניגשתי",
];

/* ============================================================
   הצבעים — **כל תווית קיימת שומרת את שלה, ואיש אינו נמחק**
   ------------------------------------------------------------
   ⚠⚠ הניסיון הראשון כאן נפל ב-`request to change default status
     label color`, וזו בדיוק מלכודת 4כד: monday דוחה שינוי צבע
     של שלוש התוויות הראשונות (אלה שירשו את Working on it /
     Done / Stuck), **וגם דחייה כזו מפילה את כל הקריאה** —
     כלומר גם התוויות החדשות אינן נוצרות.

   הפתרון אינו לנחש צבעים נכונים אלא **לא לשנות אף צבע**:
   כל תווית קיימת נשלחת בחזרה עם ה-id, ה-label והצבע שלה
   עצמה, והחדשות מקבלות צבע מהמאגר שעוד לא בשימוש.

   ⚠⚠ **ואף תווית אינה נמחקת — רק מושבתת.** `update_status_column`
     דורס את כל הרשימה, ותווית שנעלמת ממנה מוחקת בשקט את הערך
     של כל שורה שיושבת עליה. השבתה מורידה אותה מהבחירה, שומרת
     על הנתון, והיא הפיכה בקליק בלוח. זו אותה הכרעה בדיוק כמו
     ברשימת הזרועות של הבוגרים.

   ⚠ שמות הצבעים ב-`settings_str` הם הישנים ("orange") ואינם
     שמות ה-enum ("working_orange"). הטבלה ב-`tools/monday-colors.json`
     נבנתה בניסוי ולא בניחוש.
   ⚠ וכל צבע חייב להיות ייחודי ברשימה.
   ============================================================ */
import COLOR_MAP from "./monday-colors.json" with { type: "json" };

const POOL = ["dark_blue", "purple", "grass_green", "bright_blue", "dark_red",
  "sofia_pink", "egg_yolk", "blackish", "american_gray", "brown", "dark_orange",
  "saladish", "lipstick", "dark_purple", "berry", "navy", "teal", "indigo",
  "steel", "coffee", "lilac", "tan", "sky", "royal", "orchid", "lavender",
  "bright_green", "chili_blue", "sunset", "bubble", "peach", "winter", "river",
  "aquamarine", "dark_indigo", "pecan", "explosive"];

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title type settings_str revision } } }`,
    { b: [board] })).boards[0].columns;

/* ============================================================
   ⚠⚠⚠ **אינדקס 5 הוא המשבצת הריקה של monday — ואסור לתת לו שם.**

   נתפס כאן בפעם הראשונה, ובגדול: עמודת "שיבוץ צה״ל — חיל"
   נוצרה עם 15 תוויות במפתחות 1..15, ומיד **כל 35 החניכים
   הופיעו כמשובצים ל"חיל האוויר"** — התווית שנפלה על מפתח 5.

   התאים עצמם ריקים (`value` הוא `null`), אבל `text` מחזיר את
   שם התווית שיושבת על 5, ו**כל הקוד במאגר קורא `text`**. כלומר
   שישה חניכים אמיתיים היו נראים משובצים לחיל שמעולם לא בחרו,
   בלי שום סימן שמשהו לא בסדר.

   ולא רק בקריאה: ניקוי של עמודת סטטוס (`""`) כותב `index:5`
   במפורש — כלומר "למחוק את השיבוץ" היה **קובע** אותו.

   ⚠ אותה מלכודת יושבת ב-`tools/seed-tryouts.mjs`: "לא הגיע"
     נפלה על 5, וכל מיון בלי מצב היה נקרא "לא הגיע".

   הכלל: **מדלגים על 5 בבניית `labels`.** התוצאה היא רשימה
   רגילה לגמרי בממשק של monday, ותא ריק שנקרא באמת כריק.
   ============================================================ */
const labelKeys = (n) => {
  const out = [];
  for (let k = 1; out.length < n; k++) if (k !== 5) out.push(k);
  return out;
};

/** יצירת עמודה אם אינה קיימת. אידמפוטנטי — מזוהה לפי הכותרת. */
const make = async (board, title, type, labels) => {
  const have = (await cols(board)).find((c) => String(c.title).trim() === title);
  if (have) return { id: String(have.id), made: false };
  const keys = labels ? labelKeys(labels.length) : [];
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type,
      s: labels
        ? JSON.stringify({ labels: Object.fromEntries(labels.map((l, i) => [keys[i], l])) })
        : null });
  return { id: String(d.create_column.id), made: true };
};

const out = {};

/* ============================================================
   1 · סטטוס המיון — כתיבה מחדש של הרשימה
   ============================================================ */
{
  const col = (await cols(TRYOUT_BOARD.board)).find((c) => c.id === TRYOUT_COLS.status);
  if (!col) {
    console.log("⚠⚠ עמודת הסטטוס של המיונים לא נמצאה. לא בוצע שינוי.");
  } else {
    const parsed = JSON.parse(col.settings_str || "{}");
    const old = parsed.labels || {};
    const oldColors = parsed.labels_colors || {};
    console.log("תוויות כיום: " + Object.values(old).filter(Boolean).join(" · "));

    /* ⚠ מי יושב על מה — **לפני** שנוגעים ברשימה. */
    const items = await allItems(TRYOUT_BOARD.board);
    const used = new Set();
    for (const i of items) {
      const v = (i.column_values.find((x) => x.id === TRYOUT_COLS.status) || {}).text || "";
      if (v) used.add(v);
    }
    console.log("בשימוש כרגע: " + ([...used].join(" · ") || "אף תווית"));

    /* ============================================================
       ⚠⚠ **שם הצבע יושב ב-`var_name` ולא ב-`color`.**
       `color` ב-`settings_str` הוא **הקס** ("#00c875"), ורק
       `var_name` הוא השם שהטבלה ממפה ("green-shadow"). קריאה
       מהשדה הלא-נכון מחזירה `undefined` לכל תווית, ואז השדה
       `color` — שהוא **חובה** ב-API — פשוט אינו נשלח, והקריאה
       נופלת כולה ב-BAD_USER_INPUT.
       ============================================================ */
    const taken = new Set();
    const colorOfExisting = (id) => {
      const varName = (oldColors[id] || {}).var_name || "";
      const enumName = COLOR_MAP[varName];
      /* ⚠ **נכשלים ברעש ולא מנחשים.** צבע שגוי על אחת משלוש
         התוויות הראשונות מפיל את כל הקריאה (4כד), וניחוש כאן
         היה מחזיר בדיוק את השגיאה הקודמת בלי לומר למה. */
      if (!enumName) {
        throw new Error(`אין מיפוי לצבע "${varName}" (תווית ${id}). `
          + `להוסיף אותו ל-tools/monday-colors.json ולהריץ שוב.`);
      }
      taken.add(enumName);
      return enumName;
    };

    const next = [];
    const already = new Set();

    /* ---- כל תווית קיימת: אותו id, אותו טקסט, אותו צבע ----
       ⚠ מי שאינה ברשימה החדשה **מושבתת ולא נמחקת**. */
    for (const [id, text] of Object.entries(old)) {
      const label = String(text || "");
      if (!label) continue;
      const keep = TRYOUT_STATUS.includes(label);
      if (keep) already.add(label);
      /* ⚠ אותו id, אותו טקסט, **אותו צבע** — אין כאן שום שינוי
         שמונדיי יכולה לדחות. */
      next.push({ id: Number(id), label, index: next.length,
        color: colorOfExisting(id), is_deactivated: !keep });
    }

    /* ---- החדשות, בסוף, עם צבע פנוי ---- */
    const added = [];
    for (const label of TRYOUT_STATUS) {
      if (already.has(label)) continue;
      /* ⚠ צבע חייב להיות ייחודי ברשימה, והוא שדה חובה. */
      const c = POOL.find((x) => !taken.has(x));
      if (!c) throw new Error("נגמרו הצבעים הפנויים — להרחיב את POOL.");
      taken.add(c);
      added.push(label);
      next.push({ label, index: next.length, color: c, is_deactivated: false });
    }
    console.log("נוספות: " + (added.join(" · ") || "אף אחת"));

    await gql(
      `mutation($b:ID!,$c:String!,$s:UpdateStatusColumnSettingsInput!,$r:String!){
         update_status_column(board_id:$b,id:$c,settings:$s,revision:$r){ id } }`,
      { b: TRYOUT_BOARD.board, c: TRYOUT_COLS.status, s: { labels: next }, r: String(col.revision) });

    /* ⚠ ווידוא בקריאה חוזרת — כתיבה שגויה מוחקת רשימה שלמה
       בשקט, וזה נראה בדיוק כמו הצלחה (4ס). */
    const after = (await cols(TRYOUT_BOARD.board)).find((c) => c.id === TRYOUT_COLS.status);
    const now = Object.values(JSON.parse(after.settings_str || "{}").labels || {}).filter(Boolean);
    console.log("תוויות עכשיו: " + now.join(" · "));
    const missing = TRYOUT_STATUS.filter((s) => !now.includes(s));
    if (missing.length) console.log("⚠⚠ חסרות: " + missing.join(" · "));

    /* ⚠⚠ **ההשבתה יושבת ב-`deactivated_labels` ולא בתוך
       `labels_colors`.** הגרסה הראשונה של הבדיקה קראה מהמקום
       הלא-נכון והדפיסה "מושבתות: —" אחרי השבתה שהצליחה. שורת
       ווידוא שמסתכלת על שדה שאינו קיים אומרת תמיד "לא קרה
       כלום", וזה בדיוק הדיווח שמסתיר כישלון אמיתי בפעם הבאה. */
    const st2 = JSON.parse(after.settings_str || "{}");
    const off = (st2.deactivated_labels || [])
      .map((k) => st2.labels[String(k)]).filter(Boolean);
    console.log("מושבתות: " + (off.join(" · ") || "—"));

    const lost = [...used].filter((u) => !now.includes(u));
    console.log(lost.length ? "⚠⚠ אבדו תוויות בשימוש: " + lost.join(" · ")
      : "כל התוויות שהיו בשימוש שרדו.");
  }
}

/* ============================================================
   2 · שיבוץ לצה״ל
   ============================================================ */
let corps = [];
try {
  const alum = await cols(EXTRA.alumni.board);
  const branch = alum.find((c) => c.id === EXTRA.alumni.cols.branch);
  if (branch && branch.settings_str) {
    corps = Object.values(JSON.parse(branch.settings_str).labels || {})
      .map(String).filter(Boolean);
  }
} catch (e) {
  console.log("⚠ לא הצלחתי לקרוא את החילות מלוח הבוגרים: " + e.message);
}
if (!corps.length) {
  console.log("\n⚠⚠ רשימת החילות ריקה — **לא נוצרת עמודה עם רשימה מומצאת.**");
  console.log("   עדיף בלי העמודה מאשר עם רשימה שאינה זו של המכינה.");
} else {
  console.log(`\nחילות מלוח הבוגרים (${corps.length}): ${corps.join(" · ")}`);
  const c1 = await make(MECHINA_BOARDS.roster, "שיבוץ צה״ל — חיל", "status", corps);
  const c2 = await make(MECHINA_BOARDS.roster, "שיבוץ צה״ל — תפקיד", "text");
  out["roster.armyCorps"] = c1.id;
  out["roster.armyRole"] = c2.id;
  console.log(`  חיל:   ${c1.id} ${c1.made ? "(נוצר)" : "(קיים)"}`);
  console.log(`  תפקיד: ${c2.id} ${c2.made ? "(נוצר)" : "(קיים)"}`);
}

/* ============================================================
   3 · שיעור מחוץ לדוח התשלום
   ============================================================ */
const ex = await make(LESSON_BOARDS.sheets, "מחוץ לדוח התשלום", "checkbox");
out["sheets.noPay"] = ex.id;
console.log(`\nמחוץ לדוח: ${ex.id} ${ex.made ? "(נוצר)" : "(קיים)"}`);

console.log("\n============================================================");
console.log("  להעתיק למזהים:");
console.log("============================================================");
for (const [k, v] of Object.entries(out)) console.log(`  ${k}: "${v}",`);
