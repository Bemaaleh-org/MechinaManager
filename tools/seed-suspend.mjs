/* ============================================================
   השעיה — הסוג הרביעי בהיעדרויות, וההרשאה עליו
   ------------------------------------------------------------
     npm run seed:suspend

   הבקשה (ראש המכינה, 23.9.2026): *"בסימון נוכחות יהיה אפשר
   להוסיף אופציה של השעייה בנוסף לאופציות הקיימות, כאשר סימון
   אופציה זו תינתן אך ורק לראש מכינה, נועם או שירה."*

   שני שינויים, בשני לוחות:
     1. התווית **השעיה** בעמודת "סוג" שבלוח ההיעדרויות.
     2. תיבת **רשאי להשעות** בלוח ההרשאות.

   ⚠⚠ **ואינו מסמן לאיש את התיבה.** מי שרשאי להשעות הוא החלטה
     של ראש המכינה, וניחוש לפי שם היה נותן את ההרשאה לאדם
     הלא-נכון — אותו נימוק בדיוק שבגללו `seed:stulesson` יוצר
     את תיבת הוועדה ואינו מסמן ועדה (5לא). הסימון נעשה
     ב-`npm run flag:suspend` או ביד בלוח.

   ⚠ **אידמפוטנטי** — תווית ועמודה שכבר קיימות אינן נוצרות שוב.

   ⚠ **מדלג על מפתח 5** — המשבצת הריקה של monday (5ז).
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gql, allItems } from "../api/_monday.js";
import COLOR_MAP from "./monday-colors.json" with { type: "json" };
import { ensureCycle } from "../api/_cycle.js";
import { MECHINA_BOARDS, MECHINA_COLS, ABSENCE } from "../shared/mechina-boards.js";
import { AUTH_BOARD, AUTH_COLS } from "../shared/auth-board.js";

const PATH = "shared/auth-board.js";
const PERM_TITLE = "רשאי להשעות";
const WANT = Object.values(ABSENCE);

/* ⚠ מזהי הלוחות נדרסים בזמן ריצה (4ל). לוח ההרשאות אינו במחזור,
   לוח ההיעדרויות כן. */
await ensureCycle();

const board = MECHINA_BOARDS.absence;
const colId = MECHINA_COLS.absence.type;
if (!board || !colId) {
  console.error("\n✗ לוח ההיעדרויות טרם הוקם.\n");
  process.exit(1);
}

const colsOf = async (b) => (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title type settings_str revision } } }`,
  { b: [b] },
)).boards[0];

/* ⚠ צבעי enum פנויים לתווית חדשה. ראו 4כד ו-5ז. */
const POOL = ["dark_red", "blackish", "dark_purple", "berry", "brown", "navy",
  "indigo", "teal", "dark_orange", "lipstick", "american_gray", "sofia_pink"];

/* ============================================================
   1. התווית "השעיה"
   ------------------------------------------------------------
   הדפוס של `seed-army` / `seed-fault-kind` (5ו, 5לז): קוראים
   מי יושב על מה **לפני** שנוגעים, כל תווית קיימת חוזרת עם
   ה-id והצבע שלה עצמה, אף תווית אינה נמחקת, וווידוא בקריאה
   חוזרת. `update_status_column` **דורס את כל הרשימה**, ותווית
   שנעלמת ממנה מוחקת בשקט את הערך של כל שורה שיושבת עליה —
   כלומר את סיבת ההיעדרות של חניכים אמיתיים.
   ============================================================ */
const ab = await colsOf(board);
console.log(`\nלוח ההיעדרויות: ${ab.name}`);
const typeCol = ab.columns.find((c) => String(c.id) === String(colId));
if (!typeCol) {
  console.error(`\n✗ עמודת "סוג" (${colId}) אינה בלוח.\n`);
  process.exit(1);
}

const parsed = JSON.parse(typeCol.settings_str || "{}");
const old = parsed.labels || {};
const oldColors = parsed.labels_colors || {};
const have = Object.values(old).filter(Boolean);
console.log("  תוויות כיום: " + (have.join(" · ") || "אין"));

const missing = WANT.filter((k) => !have.includes(k));
if (!missing.length) {
  console.log("  אין מה להוסיף.");
} else {
  /* ⚠ `value === null` הוא המבחן לריק ולא `text === ""` — תא
     בלי בחירה מחזיר את שם התווית שעל מפתח 5 (5ז). */
  const used = new Set();
  for (const i of await allItems(board)) {
    const cell = i.column_values.find((x) => x.id === String(colId)) || {};
    const empty = cell.value === null || cell.value === undefined || cell.value === "null";
    if (!empty && cell.text) used.add(cell.text);
  }
  console.log("  בשימוש כרגע: " + ([...used].join(" · ") || "אף תווית"));

  const taken = new Set();
  /* ⚠ שם הצבע ב-`var_name` ולא ב-`color` (שהוא ההקס), ו-`color`
     הוא שדה **חובה**. נכשלים ברעש ולא מנחשים (4כד). */
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
    /* ⚠ **הכול נשמר פעיל** — גם תווית שאינה ב-ABSENCE, שמאחוריה
       עשויות לשבת שורות אמיתיות. */
    next.push({ id: Number(id), label, index: next.length,
      color: colorOf(id), is_deactivated: false });
  }
  for (const label of missing) {
    const c = POOL.find((x) => !taken.has(x));
    if (!c) throw new Error("נגמרו הצבעים הפנויים — להרחיב את POOL.");
    taken.add(c);
    /* ⚠ **בסוף הרשימה** — הזזת תווית קיימת היא שינוי index,
       ומונדיי דוחה שינוי בשלוש הראשונות (4כד). */
    next.push({ label, index: next.length, color: c, is_deactivated: false });
  }

  await gql(
    `mutation($b:ID!,$c:String!,$s:UpdateStatusColumnSettingsInput!,$r:String!){
       update_status_column(board_id:$b,id:$c,settings:$s,revision:$r){ id } }`,
    { b: board, c: String(colId), s: { labels: next }, r: String(typeCol.revision) });

  const after = (await colsOf(board)).columns.find((c) => String(c.id) === String(colId));
  const now = Object.values(JSON.parse(after.settings_str || "{}").labels || {}).filter(Boolean);
  console.log("  תוויות עכשיו: " + now.join(" · "));

  /* ⚠ **אבדן תווית שהייתה בשימוש הוא קוד יציאה 1** ולא הערה
     בפלט (5לז) — מחיקה של רשימה שלמה נראית בדיוק כמו הצלחה. */
  const lost = [...used].filter((u) => !now.includes(u));
  if (lost.length) {
    console.error("\n✗ תוויות שהיו בשימוש נעלמו: " + lost.join(" · ") + "\n");
    process.exit(1);
  }
  const still = WANT.filter((k) => !now.includes(k));
  if (still.length) {
    console.error("\n✗ לא נוספו: " + still.join(" · ") + "\n");
    process.exit(1);
  }
  console.log("  נוספו: " + missing.join(" · "));
}

/* ============================================================
   2. תיבת "רשאי להשעות" בלוח ההרשאות
   ------------------------------------------------------------
   ⚠ **ריק = אינו רשאי**, הקוטביות ההפוכה מ-`viewOnly` — ראו
     ההערה ב-shared/auth-board.js. לכן אין כאן מילוי למפרע:
     תיבה ריקה על כל שורה קיימת היא בדיוק ההתנהגות הרצויה.
   ============================================================ */
const au = await colsOf(AUTH_BOARD);
console.log(`\nלוח ההרשאות: ${au.name}`);
let permId = "";
const havePerm = au.columns.find((c) => String(c.title).trim() === PERM_TITLE);
if (havePerm) {
  permId = String(havePerm.id);
  console.log(`  קיימת: ${PERM_TITLE} → ${permId}`);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){
       create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: AUTH_BOARD, t: PERM_TITLE, c: "checkbox" },
  );
  permId = String(d.create_column.id);
  console.log(`  נוצרה: ${PERM_TITLE} → ${permId}`);
}

/* ---- המזהה לקובץ, בהחלפה כירורגית ----
   ⚠ `auth-board.js` אינו קובץ מחולל: הוא נכתב ביד ומלא בהערות
     שכתיבה מלאה הייתה מוחקת. רק מציין המקום הריק מוחלף, ושורה
     שכבר נושאת מזהה אינה נדרסת ומדווחת. */
const file = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)suspend: )""(,)/;
if (empty.test(file)) {
  writeFileSync(PATH, file.replace(empty, `$1"${permId}"$3`), "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = file.match(/\n\s*suspend: "([^"]+)"/);
  if (!filled) { console.error(`\n✗ לא נמצאה השורה suspend ב-${PATH}`); process.exit(1); }
  console.log(`  לא נגעתי — suspend כבר מוגדר: ${filled[1]}`);
}

/* ⚠⚠ **האימות בתהליך נפרד** — מחרוזת שאילתה מבטלת את המטמון של
   המודול שנטען ולא של מה שהוא מייבא, ותהליך שכבר טען את
   `auth-board.js` ריק ימשיך לראות אותו ריק לנצח (5כג). */
const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
  "import('./shared/auth-board.js').then(m=>process.exit(m.suspendReady()?0:1))"],
  { cwd: process.cwd(), encoding: "utf8" });
if (probe.status !== 0) {
  console.error("\n✗ suspendReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ suspendReady() = true");
console.log("\n⚠ shared/auth-board.js חייב להיכנס לקומיט.");
console.log("⚠ ואיש עדיין אינו מסומן — להריץ: npm run flag:suspend\n");
