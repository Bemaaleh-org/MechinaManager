/* ============================================================
   תקלה או שדרוג — עמודת הסוג בלוח התקלות
   ------------------------------------------------------------
     npm run seed:fault-kind

   הבקשה: *"בתקלות תוסיף אופציה לשידרוגים ותקרא לזה תקלות
   ושידרוגים, וגם שתיהיה בחירה האם זה תקלה או שדרוג."*

   ⚠ **אידמפוטנטי** — עמודה בשם הזה אינה נוצרת שוב.

   ⚠⚠ **ואינו ממלא את 40 השורות הקיימות.** הן נכתבו בעולם שבו
     כל שורה היא תקלה, ו"ריק = תקלה" בקוד (`shared/faults-board.js`)
     נותן להן בדיוק את המשמעות הנכונה. מילוי למפרע היה מסווג
     כשדרוג או כתקלה שורות שאיש לא סיווג — ומוחק את המספר
     שההבחנה קיימת בשבילו.

   ⚠ **מדלג על מפתח 5** — המשבצת הריקה של monday (5ז). בלעדיו
     שורה בלי בחירה הייתה נקראת בטקסט כשם התווית שנפלה שם, וכל
     40 השורות היו מופיעות כ"שדרוג".
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql, allItems } from "../api/_monday.js";
import COLOR_MAP from "./monday-colors.json" with { type: "json" };
import { ensureCycle } from "../api/_cycle.js";
import { FAULTS } from "../shared/faults-ids.js";
import { KINDS } from "../shared/faults-board.js";

const PATH = "shared/faults-ids.js";
const TITLE = "סוג";

/* ⚠ המזהים נדרסים בזמן ריצה (4ל). */
await ensureCycle();
const board = FAULTS.board;
if (!board) {
  console.error("\n✗ לוח התקלות טרם הוקם — להקים אותו מהמסך.\n");
  process.exit(1);
}

const cols = async () => (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title settings_str revision } } }`,
  { b: [board] },
)).boards[0];
const b = await cols();
console.log(`\nלוח: ${b.name}`);

/* ⚠ מפתחות 1,2 — ומדלגים על 5 (5ז). כאן יש שתי תוויות בלבד
   ולכן 5 לא בסכנה, אבל הדפוס נשמר כדי שהוספה שלישית מחר לא
   תיפול עליו. */
const labels = () => {
  const out = {};
  let k = 1;
  for (const name of KINDS) { if (k === 5) k = 6; out[String(k)] = name; k++; }
  return out;
};

/* ⚠ צבעי enum פנויים לתווית חדשה. ראו 4כד ו-5ז. */
const POOL = ["dark_blue", "purple", "grass_green", "bright_blue", "dark_red",
  "sofia_pink", "egg_yolk", "blackish", "american_gray", "brown", "dark_orange",
  "saladish", "lipstick", "dark_purple", "berry", "navy", "teal", "indigo"];

let colId = "";
const have = b.columns.find((c) => String(c.title).trim() === TITLE);
if (have) {
  colId = String(have.id);
  console.log(`  קיימת: ${TITLE} → ${colId}`);
  await syncLabels(have);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: TITLE, c: "status",
      s: JSON.stringify({ labels: labels() }) },
  );
  colId = String(d.create_column.id);
  console.log(`  נוצרה: ${TITLE} → ${colId}  (${KINDS.join(" · ")})`);
}

/* ============================================================
   ⚠⚠⚠ **סנכרון רשימת התוויות על עמודה שכבר קיימת.**

   עד 22.9.2026 הסקריפט **יצר** את העמודה ולא נגע בה יותר,
   ולכן סוג שלישי ב-`KINDS` לא היה מגיע ללוח לעולם — כל
   ניסיון לשמור "המלצה על ציוד" היה נופל ב-502 גנרי. זה
   בדיוק המוקש של 4מו ושל "צוות מזדמן" (הקטגוריה החמישית).

   הדפוס הוא זה של `seed-army.mjs` ו-`seed-buy-food.mjs` (5ו):

   1. **קוראים מי יושב על מה לפני שנוגעים.** `value === null`
      הוא המבחן לריק ולא `text === ""` — תא בלי בחירה מחזיר
      את שם התווית שעל מפתח 5 (5ז).
   2. **כל תווית קיימת חוזרת עם ה-id והצבע שלה עצמה.**
      `update_status_column` **דורס את כל הרשימה**, ותווית
      שנעלמת ממנה מוחקת בשקט את הערך של כל שורה שיושבת עליה.
   3. **אף תווית אינה נמחקת** — גם אחת שאינה ב-`KINDS` נשארת
      (ולכל היותר תושבת, וכאן אפילו לא: היא עשויה להיות
      תווית שמישהו הוסיף ביד בלוח).
   4. **ווידוא בקריאה חוזרת**, ו**אבדן תווית שהייתה בשימוש
      הוא קוד יציאה 1** ולא הערה בפלט (5לז).

   ⚠ שם הצבע יושב ב-`var_name` ולא ב-`color` (שהוא ההקס),
     ו-`color` הוא שדה **חובה**. נכשלים ברעש ולא מנחשים (4כד).
   ============================================================ */
async function syncLabels(col) {
  const parsed = JSON.parse(col.settings_str || "{}");
  const old = parsed.labels || {};
  const oldColors = parsed.labels_colors || {};
  const have = Object.values(old).filter(Boolean);
  console.log("  תוויות כיום: " + (have.join(" · ") || "אין"));

  const missing = KINDS.filter((k) => !have.includes(k));
  if (!missing.length) { console.log("  אין מה להוסיף."); return; }

  /* מי בשימוש — לפני שנוגעים. */
  const used = new Set();
  for (const i of await allItems(board)) {
    const cell = i.column_values.find((x) => x.id === String(col.id)) || {};
    const empty = cell.value === null || cell.value === undefined || cell.value === "null";
    if (!empty && cell.text) used.add(cell.text);
  }
  console.log("  בשימוש כרגע: " + ([...used].join(" · ") || "אף תווית"));

  const taken = new Set();
  const colorOf = (id) => {
    const varName = (oldColors[id] || {}).var_name || "";
    const enumName = COLOR_MAP[varName];
    if (!enumName) {
      throw new Error(`אין מיפוי לצבע "${varName}" (תווית ${id}). `
        + "להוסיף אותו ל-tools/monday-colors.json ולהריץ שוב.");
    }
    taken.add(enumName);
    return enumName;
  };

  const next = [];
  for (const [id, text] of Object.entries(old)) {
    const label = String(text || "");
    if (!label) continue;
    /* ⚠ **הכול נשמר פעיל.** גם תווית שאינה ב-KINDS — היא
       עשויה להיות משהו שמישהו הוסיף בלוח, ומאחוריה שורות. */
    next.push({ id: Number(id), label, index: next.length,
      color: colorOf(id), is_deactivated: false });
  }
  for (const label of missing) {
    const c = POOL.find((x) => !taken.has(x));
    if (!c) throw new Error("נגמרו הצבעים הפנויים — להרחיב את POOL.");
    taken.add(c);
    /* ⚠ **בסוף הרשימה ולא במקומה ב-KINDS** — הזזת תווית קיימת
       היא שינוי index, ומונדיי דוחה שינוי בשלוש הראשונות
       (4כד). במסך הסדר הוא זה שבקוד ממילא. */
    next.push({ label, index: next.length, color: c, is_deactivated: false });
  }

  await gql(
    `mutation($b:ID!,$c:String!,$s:UpdateStatusColumnSettingsInput!,$r:String!){
       update_status_column(board_id:$b,id:$c,settings:$s,revision:$r){ id } }`,
    { b: board, c: String(col.id), s: { labels: next }, r: String(col.revision) });

  const after = (await cols()).columns.find((c) => String(c.id) === String(col.id));
  const now = Object.values(JSON.parse(after.settings_str || "{}").labels || {}).filter(Boolean);
  console.log("  תוויות עכשיו: " + now.join(" · "));

  const lost = [...used].filter((u) => !now.includes(u));
  if (lost.length) {
    console.error("\n✗ תוויות שהיו בשימוש נעלמו: " + lost.join(" · ") + "\n");
    process.exit(1);
  }
  const still = KINDS.filter((k) => !now.includes(k));
  if (still.length) {
    console.error("\n✗ לא נוספו: " + still.join(" · ") + "\n");
    process.exit(1);
  }
  console.log("  נוספו: " + missing.join(" · "));
}

/* ---- המזהה לקובץ, בהחלפה כירורגית ---- */
let file = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)kind: )""(,)/;
if (empty.test(file)) {
  writeFileSync(PATH, file.replace(empty, `$1"${colId}"$3`), "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = file.match(/\n\s*kind: "([^"]+)"/);
  if (!filled) { console.error(`\n✗ לא נמצאה השורה kind ב-${PATH}`); process.exit(1); }
  console.log(`  לא נגעתי — kind כבר מוגדר: ${filled[1]}`);
}

/* ============================================================
   ⚠⚠⚠ **האימות בתהליך נפרד, ולא ב-`import(...?v=)`.**

   מחרוזת השאילתה מבטלת את המטמון של המודול שנטען
   — **ולא של מה שהוא מייבא.** `faults-board.js` מייבא את
   `faults-ids.js`, והסקריפט כותב לשני — כלומר התהליך
   שכבר טען אותו ריק ממשיך לראות אותו ריק לנצח.

   זה קרה כאן בהרצה הראשונה: העמודה נוצרה, המזהה נכתב
   נכון, והסקריפט דיווח כישלון. זה בדיוק הלקח של
   `tools/ready-probe.mjs`, וכל סקריפט שכותב לקובץ ids
   ומאמת דרך קובץ אחר חייב אותו.
   ============================================================ */
const { spawnSync } = await import("node:child_process");
const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
  "import('./shared/faults-board.js').then(m=>process.exit(m.faultKindReady()?0:1))"],
  { cwd: process.cwd(), encoding: "utf8" });
if (probe.status !== 0) {
  console.error("\n✗ faultKindReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ faultKindReady() = true");
console.log("⚠ shared/faults-ids.js חייב להיכנס לקומיט.\n");
