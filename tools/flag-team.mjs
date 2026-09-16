/* ============================================================
   סימון ועדה בתיבה — content / army / community
   ------------------------------------------------------------
   שלוש ועדות במכינה נושאות תיבה בלוח ההגדרות ולא שם
   בקוד:

     content    — ועדת קבוצה ותוכן
     army       — ועדת ההכנה לצה״ל / הגיוסים
     community  — ועדת קהילה

   ⚠⚠ **הרשימה מיובאת מ-`api/_flag-team.js` ואינה כתובה כאן.**
     רשימה שנייה הייתה אומרת "העמודה טרם הוקמה" על תיבה
     שקיימת מצוין — וזה בדיוק 4מד.

   `api/_flag-team.js` הוא מי שקורא אותן, וללא סימון **אף אחת
   מההרשאות אינה בתוקף** — המסכים אומרים "אף ועדה אינה מסומנת"
   ומחזירים 403.

   ⚠⚠ **הסקריפטים של ההקמה אינם מסמנים בעצמם, וזו החלטה.**
     `seed:stulesson` יוצר את העמודה ועוצר שם. סימון לפי ניחוש
     שם היה נותן הרשאות ניהול לוועדה הלא-נכונה — ובלוח יש
     **שתי** מועמדות ל-`army` ("ועדת גיוסים" ו"ועדת ידיעת הארץ
     והכנה לצבא"). לכן הסימון הוא פעולה מפורשת עם שם מדויק.

   ------------------------------------------------------------
     הרצה יבשה:  node --env-file=.env tools/flag-team.mjs
     ביצוע:      node --env-file=.env tools/flag-team.mjs --go \
                   --content "ועדת קבוצה ותוכן" \
                   --army "ועדת ידיעת הארץ והכנה לצבא"
     הסרה:       --content "" (מחרוזת ריקה מנקה את התיבה מכולן)
   ------------------------------------------------------------

   ⚠ **התאמת שם מדויקת ולא חלקית.** `pay-keep.mjs` נשרף על זה:
     "ציונות" תפס גם את "איה - ציונות". שם שאינו נמצא **עוצר
     ומדפיס את הרשימה**, ואינו מנחש את הדומה לו.

   ⚠ **ומדווח כשיותר מוועדה אחת מסומנת.** `mayFlagged` מחזירה
     את **כל** המסומנות, כלומר שתיהן מקבלות את ההרשאה. זה מצב
     חוקי (מיזוג ועדות) אבל כמעט תמיד טעות, ולכן הוא נאמר.

   ⚠ **אימות בקריאה חוזרת ולא בקוד היציאה.** monday מחזירה
     הצלחה על כתיבה שלא נתפסה; מה שקובע הוא מה שחוזר בשליפה.
   ============================================================ */
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";
import { PLACEMENT_BOARDS, PLACEMENT_COLS } from "../shared/placements-ids.js";
import { FLAG } from "../api/_flag-team.js";

const GO = process.argv.includes("--go");

/** ⚠ `--content ""` הוא ניקוי מכוון, ולכן `undefined` ולא `""` כברירת מחדל. */
function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}

/* ⚠ מה כל תיבה פותחת — טקסט לאדם שמריץ את הכלי,
   ולכן הוא כאן. ⚠ תיבה בלי שורה כאן עדיין עובדת —
   הרשימה היא `FLAG`, וזו רק התיאור. */
const OPENS = {
  content: [
    "שיעורי חניך", "מליאות", "מאגר מרצים",
    "גיליונות המרצים שלה (קריאה וכתיבה)", "חוות דעת", "יומן השינויים",
  ],
  army: [
    "פניות גיוס", "מיונים ושיבוצים של כל החניכים",
  ],
  /* ⚠ ולא חוות הדעת: הן לוח נפרד שאינו מצומצם לפי
     גיליון, ופתיחתן הייתה מוציאה את כל שמות המרצים
     והטלפונים שלהם (עיקרון 4). */
  community: [
    "לוח השיעורים, גיליונות המרצים, תקנים ושינויים",
    "— וכולם מצומצמים לגיליונות שלה בלבד",
  ],
};

/* ⚠ המפתחות מ-`FLAG` ולא מרשימה שנייה — ראו ראש הקובץ. */
const FLAGS = Object.fromEntries(Object.entries(FLAG).map(([k, cfg]) =>
  [k, { label: cfg.label, opens: OPENS[k] || [] }]));

/* ⚠⚠ **`ensureCycle` לפני שנוגעים ב-PLACEMENT_BOARDS.** הוא
   אובייקט שנדרס בזמן ריצה (4ל); כלי שקורא אותו כמות שהוא
   כותב ללוח של המחזור **שכתוב בקוד** — ואחרי מעבר מחזור זה
   הלוח הלא-נכון, בשקט. */
try {
  await ensureCycle();
} catch (e) {
  console.error("✗ טעינת המחזור נכשלה: " + e.message);
  console.error("  לא ממשיכים — הכתיבה עלולה ללכת ללוח של מחזור אחר.");
  process.exit(1);
}

const board = PLACEMENT_BOARDS.definitions;
if (!board) {
  console.error("✗ לוח הגדרות השיבוצים אינו מוגדר. הריצו npm run seed:placements");
  process.exit(1);
}

const cols = Object.fromEntries(
  Object.keys(FLAGS).map((f) => [f, PLACEMENT_COLS.definitions[f]]));

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

async function load() {
  const ids = JSON.stringify(Object.values(cols).filter(Boolean));
  const d = await gql(
    `{ boards(ids:[${board}]){ items_page(limit:200){ items {
         id name column_values(ids:${ids}){ id text } } } } }`);
  return (d.boards?.[0]?.items_page?.items || []).map((i) => {
    /* ⚠ על פני כל התיבות שב-`FLAG`, ולא שתיים מקובעות:
       תיבה שלא הייתה כאן נקראת תמיד `false`, כלומר הכלי
       היה מסמן מחדש מה שכבר מסומן, ומדווח "אף ועדה". */
    const row = { id: String(i.id), name: String(i.name || "").trim() };
    for (const f of Object.keys(FLAGS)) {
      row[f] = cols[f] ? val(i, cols[f]) === "v" : false;
    }
    return row;
  });
}

const rows = await load();

/* ---------- מצב קיים ---------- */
console.log("מצב כרגע:\n");
for (const f of Object.keys(FLAGS)) {
  if (!cols[f]) { console.log(`  ${f}: העמודה טרם הוקמה`); continue; }
  const on = rows.filter((r) => r[f]);
  console.log(`  ${f}  (${FLAGS[f].label}): `
    + (on.length ? on.map((r) => r.name).join(" · ") : "אף ועדה"));
}

/* ---------- מה התבקש ---------- */
const wanted = {};
for (const f of Object.keys(FLAGS)) {
  const v = arg(f);
  if (v === undefined) continue;
  if (!cols[f]) {
    console.error(`\n✗ אי אפשר לסמן ${f} — העמודה טרם הוקמה.`);
    process.exit(1);
  }
  wanted[f] = v.trim();
}

if (!Object.keys(wanted).length) {
  console.log("\nלא התבקש שינוי. דוגמה:");
  console.log('  node --env-file=.env tools/flag-team.mjs --go \\');
  console.log('    --content "ועדת קבוצה ותוכן"');
  process.exit(0);
}

/* ⚠ שם שאינו נמצא **עוצר ומדפיס את הרשימה**. */
for (const [f, name] of Object.entries(wanted)) {
  if (!name) continue;
  if (!rows.some((r) => r.name === name)) {
    console.error(`\n✗ לא נמצאה ועדה בשם "${name}".`);
    console.error("  השמות בלוח, בתו:");
    for (const r of rows) console.error("    " + r.name);
    process.exit(1);
  }
}

/* ---------- מה ישתנה ---------- */
const plan = [];
for (const [f, name] of Object.entries(wanted)) {
  for (const r of rows) {
    const next = Boolean(name) && r.name === name;
    if (next !== r[f]) plan.push({ row: r, flag: f, next });
  }
}

console.log("\nמה ישתנה:\n");
if (!plan.length) console.log("  כלום — התיבות כבר במצב המבוקש.");
for (const p of plan) {
  console.log(`  ${p.next ? "✓ מסמן  " : "✗ מנקה  "}${p.flag}  →  ${p.row.name}`);
}

for (const [f, name] of Object.entries(wanted)) {
  if (!name) continue;
  console.log(`\n  "${name}" תקבל:`);
  for (const o of FLAGS[f].opens) console.log("    · " + o);
}

if (!GO) {
  console.log("\nהרצה יבשה. להוספת --go כדי לבצע.");
  process.exit(0);
}
if (!plan.length) process.exit(0);

/* ---------- ביצוע ---------- */
console.log();
let failed = 0;
for (const p of plan) {
  try {
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                       create_labels_if_missing:false){ id } }`,
      { b: board, i: p.row.id, v: JSON.stringify({ [cols[p.flag]]: { checked: p.next ? "true" : "false" } }) });
    console.log(`  נכתב: ${p.flag} = ${p.next} על ${p.row.name}`);
  } catch (e) {
    console.error(`  ✗ ${p.row.name} (${p.flag}): ${e.message}`);
    failed++;
  }
}

/* ---------- אימות ---------- */
console.log("\nאימות בקריאה חוזרת:\n");
const after = await load();
let bad = 0;
for (const [f, name] of Object.entries(wanted)) {
  const on = after.filter((r) => r[f]).map((r) => r.name);
  const want = name ? [name] : [];
  const ok = on.length === want.length && on.every((n) => want.includes(n));
  console.log(`  ${ok ? "✓" : "✗"} ${f}: ` + (on.length ? on.join(" · ") : "אף ועדה"));
  if (!ok) bad++;
  /* ⚠ יותר מאחת = שתיהן מקבלות את ההרשאה. חוקי, וכמעט תמיד טעות. */
  if (on.length > 1) {
    console.log(`     ⚠ שתי ועדות מסומנות — שתיהן מקבלות את ההרשאה.`);
  }
}

if (bad || failed) {
  console.error("\n✗ לא הכול נכתב. לבדוק בלוח.");
  process.exit(1);
}

/* ⚠ מטמון ההגדרות בשרת הוא 30 שניות ויושב בתהליך אחר — כלי
   אינו יכול לנקות אותו. נאמר, כדי שלא ייראה כאילו לא עבד. */
console.log("\n✓ הכול נכתב ואומת.");
console.log("  ⚠ מטמון ההגדרות בשרת הוא 30 שניות — לרענן את המסך אחרי דקה.");
