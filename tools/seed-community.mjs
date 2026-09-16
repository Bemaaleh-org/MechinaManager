/* ============================================================
   ועדת קהילה — התיבה בוועדות, והתיבה על הגיליונות
   ------------------------------------------------------------
     npm run seed:community          (יבש)
     npm run seed:community -- --go  (מבצע)

   הבקשה (16.9.2026): *"גליונות זמן קהילה וגיליון משפחות מאמצות
   יהיה באחריות קהילה, כמו הגיליון שיש לקבוצה ותוכן רק עם
   הדברים הרלוונטים."*

   שתי עמודות, ושתיהן תיבות סימון:

   1. **`community` בלוח הגדרות השיבוצים** — איזו ועדה היא ועדת
      הקהילה. ⚠ **הסקריפט אינו מסמן ועדה**, בדיוק כמו
      `seed:stulesson` (5כח): במכינה עשויות להיות כמה ועדות
      שנשמעות כמו קהילה, וניחוש לפי שם היה נותן את הגיליונות
      לוועדה הלא-נכונה. הסימון הוא החלטה של ראש המכינה —
      `npm run flag:team -- --go --community "<שם הוועדה>"`.

   2. **`communityTeam` בלוח הגיליונות** — אילו גיליונות
      באחריותה. ⚠ **את אלה כן מסמנים**, כי ראש המכינה נקב
      בשמותיהם במפורש.

   ⚠ **`עשייה קהילתית` קיים בלוח ואינו מסומן.** הוא לא נמסר
     ברשימה, וסימון של גיליון שלא נתבקש נותן לוועדה אחריות
     שאיש לא החליט עליה. מי שירצה — שורה ב-`SHEETS` כאן, או
     תיבה ביד בלוח.

   ⚠ אידמפוטנטי — עמודה או סימון שכבר קיימים אינם נכתבים שוב.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gql, allItems } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";
import { PLACEMENT_BOARDS, PLACEMENT_COLS } from "../shared/placements-ids.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";

const GO = process.argv.includes("--go");

/** ⚠ הגיליונות שראש המכינה נקב בשמם, תו בתו. */
const SHEETS = ["זמן קהילה", "משפחות מאמצות"];

/* ⚠⚠ `ensureCycle()` **לפני** שנוגעים במזהי הלוחות — הם
   אובייקטים שנדרסים בזמן ריצה (4ל), וכלי שקורא אותם כמות שהם
   כותב ללוח של המחזור שכתוב בקוד, בשקט. */
try {
  await ensureCycle();
} catch (e) {
  console.error("\n✗ טעינת המחזור נכשלה — לא נגעתי בכלום.");
  console.error("  " + (e && e.message) + "\n");
  process.exit(1);
}

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ name columns{ id title type } } }`,
    { b: [board] })).boards[0];

/** יוצר עמודת תיבה אם אינה קיימת, ומחזיר את המזהה. */
const checkbox = async (board, title) => {
  const b = await cols(board);
  const have = b.columns.find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  if (!GO) { console.log(`  תיווצר: ${title}  (checkbox)`); return null; }
  const d = await gql(
    `mutation($b:ID!,$t:String!){
       create_column(board_id:$b,title:$t,column_type:checkbox){ id } }`,
    { b: board, t: title });
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

console.log(`\n=== 1 · תיבת הוועדה בלוח ההגדרות ===`);
const flagId = await checkbox(PLACEMENT_BOARDS.definitions, "ועדת קהילה");

console.log(`\n=== 2 · תיבת הגיליונות ===`);
const sheetCol = await checkbox(LESSON_BOARDS.sheets, "ועדת קהילה");

/* ---- סימון שני הגיליונות ---- */
console.log(`\n=== 3 · הגיליונות ===`);
const items = await allItems(LESSON_BOARDS.sheets);
const byName = new Map(items.map((i) => [String(i.name || "").trim(), i]));
const marked = (i) => Boolean(sheetCol
  && (i.column_values.find((x) => x.id === sheetCol) || {}).text === "v");

const pick = [];
const gone = [];
for (const name of SHEETS) {
  const it = byName.get(name);
  if (!it) { gone.push(name); continue; }
  if (marked(it)) { console.log(`  כבר מסומן: ${name}`); continue; }
  pick.push(it);
}
/* ⚠ שם שלא נמצא **נאמר ואינו נבלע** — גיליון שלא סומן ואיש לא
   יודע עליו הוא בדיוק ההבדל בין "אין הרשאה" ל"שכחנו" (4ט). */
if (gone.length) {
  console.log(`\n  ⚠ לא נמצאו בלוח: ${gone.join(" · ")}`);
  console.log("    העמודה נוצרת בכל מקרה; לסמן אותם כשייווצרו.");
}
for (const p of pick) console.log(`  ${GO ? "מסומן" : "יסומן"}: ${p.name}`);
if (!pick.length && !gone.length) console.log("  אין מה לסמן — הכול כבר מסומן.");

if (!GO) {
  console.log("\n(יבש — לא נכתב דבר. להוספת --go כדי לבצע)\n");
  process.exit(0);
}

for (const p of pick) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.sheets, i: p.id, v: JSON.stringify({ [sheetCol]: { checked: "true" } }) },
  );
}

/* ============================================================
   המזהים לקבצים — בהחלפה **כירורגית** ולא כתיבה מחדש.
   ⚠ שני הקבצים נכתבים ביד ומלאים בהערות; סקריפט שיכתוב אותם
     מחדש ימחק אותן (5לב). רק מציין המקום הריק מוחלף.
   ============================================================ */
const put = (path, key, id) => {
  let src = readFileSync(path, "utf8");
  /* ⚠ המפתח עשוי להיות מצוטט — `placements-ids.js` הוא
     קובץ מחולל, ושורה שנוספה לו ביד עשויה לשאת מרכאות.
     רגע שהביטוי לא תופס, ה-seed כותב ל-monday **ונופל אחרי
     זה** — כלומר העמודה נוצרה והמזהה לא נשמר. */
  const empty = new RegExp(`(\\n(\\s*)"?${key}"?: )""(,)`);
  if (empty.test(src)) {
    writeFileSync(path, src.replace(empty, `$1"${id}"$3`), "utf8");
    console.log(`✓ נכתב ${key} ל-${path}`);
    return;
  }
  const filled = src.match(new RegExp(`\\n\\s*"?${key}"?: "([^"]+)"`));
  if (!filled) {
    console.error(`\n✗ לא נמצאה השורה ${key} ב-${path}`);
    process.exit(1);
  }
  console.log(`  לא נגעתי — ${key} כבר מוגדר: ${filled[1]}`);
};

console.log("");
put("shared/placements-ids.js", "community", flagId);
put("shared/lessons-boards.js", "communityTeam", sheetCol);

/* ============================================================
   ⚠⚠ **אימות ב**תהליך נפרד** ולא ב-`import(...?v=)`.**

   מחרוזת השאילתה מבטלת את המטמון של המודול שנטען
   ולא של מה שהוא מייבא: `shared/placements.js` קורא את
   המזהה מ-`placements-ids.js`, וזה הקובץ שזה עתה נכתב.
   התהליך שכבר טען אותו ריק בראש הסקריפט ממשיך
   לראות אותו ריק **לנצח** — והסקריפט נופל על שלב
   שהצליח באמת. זה בדיוק מה שקרה כאן בהרצה השנייה,
   וזה הנימוק של `tools/ready-probe.mjs`.
   ============================================================ */
const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `
  const a = await import("../shared/lessons-boards.js");
  const b = await import("../shared/placements.js");
  process.stdout.write(JSON.stringify(
    { sheets: a.communitySheetsReady(), flag: b.communityFlagReady() }));
`.replace(/\.\.\//g, new URL("../", import.meta.url).href)], { encoding: "utf8" });
let ready = null;
try { ready = JSON.parse(probe.stdout); } catch { /* נאמר מיד */ }
if (!ready || !ready.sheets || !ready.flag) {
  console.error("\n✗ אחת מפונקציות המוכנות עדיין false.");
  console.error("  " + (probe.stderr || JSON.stringify(ready) || "").split("\n")[0] + "\n");
  process.exit(1);
}
console.log("✓ communitySheetsReady() ו-communityFlagReady() = true");
console.log("\n⚠ שני קבצי המזהים חייבים להיכנס לקומיט.");

/* ============================================================
   ⚠⚠ **והשאלה האחרונה: האם ועדה בכלל מסומנת.**

   העמודה קיימת והגיליונות מסומנים — וכל עוד אף
   ועדה אינה נושאת את התיבה, `mayFlagged` מחזירה
   `setup:true` ואיש אינו מקבל דבר. סקריפט שמסתיים
   ב-"✓ הכול נכתב" ומשאיר את המצב הזה הוא בדיוק
   התקלה של "שתי התיבות שנשכחו סבב שלם" (CLAUDE.md).

   ⚠ והסקריפט אינו מסמן בעצמו — זו החלטה של ראש
     המכינה, וניחוש לפי שם היה נותן את הגיליונות לועדה
     הלא-נכונה. מה שהוא כן עושה הוא **לומר שזה חסר**.
   ============================================================ */
const flagged = (await allItems(PLACEMENT_BOARDS.definitions))
  .filter((i) => (i.column_values.find((x) => x.id === flagId) || {}).text === "v")
  .map((i) => String(i.name).trim());
if (flagged.length) {
  console.log(`✓ מסומנת כועדת הקהילה: ${flagged.join(" · ")}`);
  /* ⚠ יותר מאחת = כולן מקבלות. חוקי, וכמעט תמיד טעות. */
  if (flagged.length > 1) console.log("  ⚠ יותר מאחת — כולן מקבלות את ההרשאה.");
} else {
  console.log("\n⚠ אף ועדה אינה מסומנת עדיין — ובלעדיה איש אינו מקבל דבר:");
  console.log('   npm run flag:team -- --go --community "<שם ועדת הקהילה>"');
}
console.log("");
