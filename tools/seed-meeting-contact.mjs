/* ============================================================
   פרטי הקשר של המרצה — על המפגש
   ------------------------------------------------------------
     npm run seed:meeting-contact          (יבש)
     npm run seed:meeting-contact -- --go  (מבצע)

   הבקשה (17.9.2026): *"הפרטי יצירת קשר שיוכנסו כבר בשלב הכנסת
   שם המרצה, לדוגמא אני מביא מרצה שמגיע עוד 3 חודשים אבל כבר
   תיאמתי איתו תאריך ויש לי את הפרטים שלו אז אני מוסיף את
   הפרטים שלו אבל אין צורך בחוות דעת שתופיע."*

   שתי עמודות טקסט בלוח המפגשים: טלפון ואימייל. הן יושבות על
   המפגש ולא על חוות הדעת, כי חוות דעת נפתחת רק כשמבקשים —
   ומרצה שתואם לעוד שלושה חודשים צריך להיות רשום עכשיו.

   ⚠ אידמפוטנטי — עמודה שכבר קיימת אינה נוצרת שוב.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";

const GO = process.argv.includes("--go");

/* ⚠⚠ `ensureCycle()` לפני שנוגעים במזהי הלוחות — הם אובייקטים
   שנדרסים בזמן ריצה (4ל), וכלי שקורא אותם כמות שהם כותב ללוח
   של המחזור שכתוב בקוד, בשקט. */
try {
  await ensureCycle();
} catch (e) {
  console.error("\n✗ טעינת המחזור נכשלה — לא נגעתי בכלום.");
  console.error("  " + (e && e.message) + "\n");
  process.exit(1);
}

const WANT = [
  { key: "phone", title: "טלפון המרצה", type: "text" },
  { key: "mail", title: "אימייל המרצה", type: "text" },
];

const board = LESSON_BOARDS.meetings;
const cols = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title type } } }`,
  { b: [board] })).boards[0];
console.log(`\nלוח: ${cols.name}\n`);

const out = {};
for (const w of WANT) {
  const have = cols.columns.find((c) => String(c.title).trim() === w.title);
  if (have) { console.log(`  קיימת: ${w.title} → ${have.id}`); out[w.key] = String(have.id); continue; }
  if (!GO) { console.log(`  תיווצר: ${w.title}  (${w.type})`); continue; }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){
       create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: board, t: w.title, c: w.type });
  console.log(`  נוצרה: ${w.title} → ${d.create_column.id}`);
  out[w.key] = String(d.create_column.id);
}

if (!GO) {
  console.log("\n(יבש — לא נכתב דבר. להוספת --go כדי לבצע)\n");
  process.exit(0);
}

/* ============================================================
   המזהים לקובץ — בהחלפה **כירורגית** ולא כתיבה מחדש.
   ⚠ `shared/lessons-boards.js` נכתב ביד ומלא בהערות; סקריפט
     שיכתוב אותו מחדש ימחק אותן (5לב). רק מציין המקום הריק
     מוחלף, ושורה שכבר נושאת מזהה אינה נדרסת.
   ============================================================ */
const PATH = "shared/lessons-boards.js";
let src = readFileSync(PATH, "utf8");
for (const [key, id] of Object.entries(out)) {
  /* ⚠ `;\r?\n` ולא `\n` — עץ שנבדק ב-CRLF בווינדוס אינו נתפס
     אחרת, וההחלפה מוסיפה הצהרה שנייה במקום להחליף (5כג). */
  const empty = new RegExp(`(\\n(\\s*)${key}: )""(,)`);
  if (empty.test(src)) {
    src = src.replace(empty, `$1"${id}"$3`);
    console.log(`✓ נכתב ${key} → ${id}`);
  } else {
    console.log(`  לא נגעתי — ${key} כבר מוגדר`);
  }
}
writeFileSync(PATH, src, "utf8");

/* ⚠⚠ אימות ב**תהליך נפרד** ולא ב-`import(...?v=)`: מחרוזת
   השאילתה מבטלת את המטמון של המודול שנטען ולא של מה שהוא
   מייבא, וזה בדיוק מה שהפיל את seed:community (5כג). */
const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `
  const m = await import("../shared/lessons-boards.js");
  process.stdout.write(JSON.stringify({ ready: m.meetingContactReady() }));
`.replace(/\.\.\//g, new URL("../", import.meta.url).href)], { encoding: "utf8" });
let ready = null;
try { ready = JSON.parse(probe.stdout); } catch { /* נאמר מיד */ }
if (!ready || !ready.ready) {
  console.error("\n✗ meetingContactReady() עדיין false.");
  console.error("  " + (probe.stderr || "").split("\n")[0] + "\n");
  process.exit(1);
}
console.log("\n✓ meetingContactReady() = true");
console.log("⚠ shared/lessons-boards.js חייב להיכנס לקומיט.\n");
