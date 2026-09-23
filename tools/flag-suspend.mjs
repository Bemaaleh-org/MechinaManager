/* ============================================================
   מי רשאי להשעות — סימון התיבה בלוח ההרשאות
   ------------------------------------------------------------
   הבקשה (ראש המכינה, 23.9.2026): *"סימון אופציה זו תינתן אך
   ורק לראש מכינה, נועם או שירה."*

   ⚠⚠ **השמות אינם בקוד, וזו כל הסיבה שהכלי הזה קיים.** נועם
     יוצא לחופשה, שירה מסיימת תפקיד, והמכינה ממנה מישהו אחר —
     והדבר היחיד שצריך להשתנות הוא תיבה בלוח. אותו נימוק בדיוק
     של `AUTH_COLS.role` (4מ), של ועדת הגיוסים (5כו) ושל
     `flag-team.mjs`.

   ⚠ **ראש המכינה אינו זקוק לסימון** — `maySuspend` פותח לו
     ממילא, והחלפת ראש מכינה לא תדרוש לזכור לסמן גם כאן.

   ------------------------------------------------------------
     הרצה יבשה:  node --env-file=.env tools/flag-suspend.mjs
     ביצוע:      node --env-file=.env tools/flag-suspend.mjs --go \
                   --on "נועם" --on "שירה"
     הסרה:       --off "נועם"
     רשימה:      בלי ארגומנטים — מדפיס מי מסומן היום
   ------------------------------------------------------------

   ⚠ **התאמת שם מדויקת או חד-משמעית.** `pay-keep.mjs` נשרף על
     התאמה חלקית: "ציונות" תפס גם את "איה - ציונות". כאן שם
     שמתאים ליותר משורה אחת **עוצר ומדפיס את המועמדות** במקום
     לבחור אחת.

   ⚠ **אימות בקריאה חוזרת ולא בקוד היציאה** — monday מחזירה
     הצלחה על כתיבה שלא נתפסה.
   ============================================================ */
import { gql } from "../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS, suspendReady } from "../shared/auth-board.js";

const GO = process.argv.includes("--go");
const argsOf = (flag) => {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === flag && process.argv[i + 1]) out.push(process.argv[i + 1]);
  }
  return out;
};
const ON = argsOf("--on");
const OFF = argsOf("--off");

if (!suspendReady()) {
  console.error("\n✗ עמודת \"רשאי להשעות\" טרם הוקמה. הריצו: npm run seed:suspend\n");
  process.exit(1);
}

const cols = JSON.stringify([AUTH_COLS.kind, AUTH_COLS.role,
  AUTH_COLS.active, AUTH_COLS.suspend]);
const load = async () => (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:500){ items {
       id name column_values(ids:${cols}){ id text } } } } }`
)).boards[0].items_page.items.map((i) => {
  const v = (c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
  return {
    id: String(i.id), name: i.name, kind: v(AUTH_COLS.kind),
    role: v(AUTH_COLS.role), active: v(AUTH_COLS.active) === "v",
    on: v(AUTH_COLS.suspend) === "v",
  };
});

let rows = await load();

console.log("\nמי רשאי להשעות היום:");
const heads = rows.filter((r) => r.role === "ראש מכינה");
for (const h of heads) console.log(`  · ${h.name} — ראש מכינה (אינו זקוק לתיבה)`);
const flagged = rows.filter((r) => r.on);
for (const f of flagged) console.log(`  · ${f.name} — מסומן בתיבה`);
if (!heads.length && !flagged.length) console.log("  (איש)");

if (!ON.length && !OFF.length) {
  console.log("\nלסימון:  --go --on \"<שם>\"      להסרה:  --go --off \"<שם>\"\n");
  process.exit(0);
}

/* ⚠ התאמה מדויקת קודמת; רק אם אין — התאמה חלקית, ורק כשהיא
   חד-משמעית. שם שמתאים לשתי שורות עוצר. */
const pick = (name) => {
  const exact = rows.filter((r) => r.name.trim() === name.trim());
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    console.error(`\n✗ "${name}" מתאים ל-${exact.length} שורות זהות — לתקן בלוח.\n`);
    process.exit(1);
  }
  const part = rows.filter((r) => r.name.includes(name.trim()));
  if (part.length === 1) return part[0];
  if (part.length > 1) {
    console.error(`\n✗ "${name}" מתאים ליותר משורה אחת:`);
    for (const p of part) console.error(`    ${p.name}`);
    console.error("  לכתוב את השם המלא.\n");
    process.exit(1);
  }
  console.error(`\n✗ "${name}" אינו בלוח ההרשאות. הרשומים:`);
  for (const r of rows) console.error(`    ${r.name}${r.active ? "" : "  (כבוי)"}`);
  console.error("");
  process.exit(1);
};

const plan = [];
for (const n of ON) plan.push({ row: pick(n), want: true });
for (const n of OFF) plan.push({ row: pick(n), want: false });

console.log("\nמה ישתנה:");
let any = false;
for (const p of plan) {
  if (p.row.on === p.want) { console.log(`  = ${p.row.name} — כבר ${p.want ? "מסומן" : "לא מסומן"}`); continue; }
  any = true;
  console.log(`  ${p.want ? "+" : "-"} ${p.row.name}${p.row.kind === "חניך" ? "  ⚠ חניך — maySuspend יחסום אותו ממילא" : ""}`);
  if (!p.row.active) console.log(`      ⚠ השורה כבויה — ההרשאה לא תעבוד עד שתופעל`);
}
if (!any) { console.log("\n(אין מה לשנות)\n"); process.exit(0); }

if (!GO) { console.log("\nהרצה יבשה. להוסיף --go כדי לבצע.\n"); process.exit(0); }

for (const p of plan) {
  if (p.row.on === p.want) continue;
  await gql(
    `mutation($b:ID!,$i:ID!,$c:String!,$v:JSON!){
       change_column_value(board_id:$b,item_id:$i,column_id:$c,value:$v){ id } }`,
    { b: String(AUTH_BOARD), i: p.row.id, c: AUTH_COLS.suspend,
      v: JSON.stringify({ checked: p.want ? "true" : "false" }) });
}

/* ⚠ אימות בקריאה חוזרת. */
rows = await load();
let bad = 0;
for (const p of plan) {
  const now = rows.find((r) => r.id === p.row.id);
  const okNow = Boolean(now && now.on) === p.want;
  console.log(`  ${okNow ? "V" : "X"} ${p.row.name} → ${now && now.on ? "רשאי" : "אינו רשאי"}`);
  if (!okNow) bad++;
}
console.log("");
process.exit(bad ? 1 : 0);
