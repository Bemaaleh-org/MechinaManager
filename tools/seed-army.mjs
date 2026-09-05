/* ============================================================
   מיונים ושיבוצים — שינויי הלוחות
   ------------------------------------------------------------
   שלושה שינויים, וכולם ניתנים להרצה חוזרת בלי נזק:

   1. **סטטוס המיון** — חמש האפשרויות שהמכינה ביקשה, במקום השש
      הישנות. הרשימה נכתבת מחדש על **אותה עמודה** ולא בעמודה
      שנייה: עמודה שנייה הייתה משאירה את הישנה בלוח ואת
      `TRYOUT_COLS.status` מצביע על אחת מהן בלבד.

      ⚠⚠ **תווית שיש מאחוריה שורה אינה נמחקת — היא מושבתת.**
        `update_status_column` **דורס את כל הרשימה**, ותווית
        שנעלמת מהרשימה בזמן שמישהו יושב עליה מוחקת לו את הערך
        בשקט. לכן: תווית ישנה שאיש אינו עליה — יורדת; תווית
        שיש עליה מיון — נשארת, מושבתת, ומדווחת כאן בשמה.

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
   ⚠ שמות הצבעים ב-`settings_str` הם הישנים ("orange") ואינם
     שמות ה-enum ("working_orange"), ואין ביניהם כלל המרה.
     שלוש התוויות הראשונות **חייבות** להישאר על צבעי ברירת
     המחדל — monday דוחה שינוי שלהן גם בסיבוב ריק (4כד).
   ⚠ וכל צבע חייב להיות ייחודי ברשימה.
   ============================================================ */
const FIXED = ["working_orange", "done_green", "stuck_red"];
const POOL = ["dark_blue", "purple", "grass_green", "bright_blue", "dark_red",
  "sofia_pink", "egg_yolk", "blackish", "american_gray", "brown", "dark_orange",
  "saladish", "lipstick", "dark_purple", "berry", "navy", "teal", "indigo",
  "steel", "coffee", "lilac", "tan", "sky", "royal", "orchid", "lavender"];

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title type settings_str revision } } }`,
    { b: [board] })).boards[0].columns;

/** יצירת עמודה אם אינה קיימת. אידמפוטנטי — מזוהה לפי הכותרת. */
const make = async (board, title, type, labels) => {
  const have = (await cols(board)).find((c) => String(c.title).trim() === title);
  if (have) return { id: String(have.id), made: false };
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type,
      s: labels ? JSON.stringify({ labels: Object.fromEntries(labels.map((l, i) => [i + 1, l])) }) : null });
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
    const old = JSON.parse(col.settings_str || "{}").labels || {};
    console.log("תוויות כיום: " + Object.values(old).filter(Boolean).join(" · "));

    /* ⚠ מי יושב על מה — **לפני** שנוגעים ברשימה. */
    const items = await allItems(TRYOUT_BOARD.board);
    const used = new Set();
    for (const i of items) {
      const v = (i.column_values.find((x) => x.id === TRYOUT_COLS.status) || {}).text || "";
      if (v) used.add(v);
    }
    console.log("בשימוש כרגע: " + ([...used].join(" · ") || "אף תווית"));

    let pool = 0;
    const next = [];
    const colorOf = () => (next.length < FIXED.length ? FIXED[next.length] : POOL[pool++]);

    /* הישנות: מי שיש מאחוריה שורה נשארת ומושבתת. */
    const kept = [];
    for (const [id, text] of Object.entries(old)) {
      const label = String(text || "");
      if (!label || TRYOUT_STATUS.includes(label)) continue;
      if (!used.has(label)) continue;
      kept.push(label);
      next.push({ id: Number(id), label, index: next.length, color: colorOf(), is_deactivated: true });
    }

    /* החדשות: קיימת → נשמרת עם ה-id שלה; אינה קיימת → נוספת. */
    for (const label of TRYOUT_STATUS) {
      const id = Object.entries(old).find(([, t]) => String(t || "") === label)?.[0];
      const row = { label, index: next.length, color: colorOf(), is_deactivated: false };
      if (id) row.id = Number(id);
      next.push(row);
    }

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
    if (kept.length) console.log("הושבתו (יש עליהן מיונים): " + kept.join(" · "));

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
