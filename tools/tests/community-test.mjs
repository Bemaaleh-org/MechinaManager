/* ============================================================
   ועדת קהילה — הגיליונות שלה, ושהמנגנון נגזר ולא הוקלד
   ------------------------------------------------------------
     npm test -- community

   הבקשה (16.9.2026): *"גליונות זמן קהילה וגיליון משפחות
   מאמצות יהיה באחריות קהילה, כמו הגיליון שיש לקבוצה ותוכן
   רק עם הדברים הרלוונטים."*

   ⚠⚠ **מה הבדיקה הזו באמת שומרת עליו.** ועדה רביעית תיכנס
     יום אחד, והדרך הנכונה להוסיף אותה היא **שורה אחת
     ב-`FLAG`**. אם מישהו יחזיר רשימה מקובעת ל-`_lesson-rights.js`
     או ל-`_me.js`, שלוש הטענות של חלק 2 נופלות — לפני
     שמישהו יגלה שוועדה מקבלת הרשאה בלי מסלול (5לא, 5לב).

   ⚠ **אינה כותבת דבר.** קריאה בלבד: הלוח, המודולים, והמפה.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { FLAG } from "../../api/_flag-team.js";
import { lessonRights } from "../../api/_lesson-rights.js";
import {
  LESSON_BOARDS, LESSON_COLS, communitySheetsReady, contentSheetsReady,
} from "../../shared/lessons-boards.js";
import { PLACEMENT_COLS } from "../../shared/placements-ids.js";
import { communityFlagReady, TEAM_FLAGS } from "../../shared/placements.js";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};

/* ⚠ הגיליונות שראש המכינה נקב בשמם, תו בתו. */
const WANT = ["זמן קהילה", "משפחות מאמצות"];

/* ============ 1 · ההקמה ============ */
console.log("=== ההקמה ===");
ok("עמודת התיבה בגיליונות קיימת", communitySheetsReady(),
  LESSON_COLS.sheets.communityTeam || "—");
ok("ותיבת הוועדה בלוח ההגדרות", communityFlagReady(),
  PLACEMENT_COLS.definitions.community || "—");

/* ============================================================
   2 · המנגנון נגזר מ-`FLAG` ואינו מוקלד בשלושה מקומות
   ============================================================ */
console.log("=== נגזר, לא מוקלד ===");
ok("ל-community יש שורה ב-FLAG", Boolean(FLAG.community),
  FLAG.community?.label || "—");
ok("ועמודת הגיליונות שלה מוצהרת שם",
  FLAG.community?.sheetCol === "communityTeam", String(FLAG.community?.sheetCol));
/* ⚠ שתי ועדות נוגעות בגיליונות; `army` אינה, וההיעדר הוא ההצהרה. */
const withSheets = Object.entries(FLAG).filter(([, c]) => c.sheetCol).map(([k]) => k);
ok("שתי ועדות נושאות גיליונות, ו-army אינה",
  withSheets.length === 2 && withSheets.includes("content")
  && withSheets.includes("community") && !withSheets.includes("army"),
  withSheets.join(" · "));
/* ⚠ כל `sheetCol` חייבת להיות עמודה אמיתית — שם שגוי בתו אחד
   נקרא `undefined`, כלומר `scoped()` מחזירה false על הכול
   והוועדה מאבדת את הגיליונות שלה **בלי שגיאה**. */
const badCol = withSheets.filter((k) => !LESSON_COLS.sheets[FLAG[k].sheetCol]);
ok("וכל sheetCol מצביעה על עמודה קיימת", badCol.length === 0, badCol.join(" · "));
/* ============================================================
   ⚠⚠⚠ **הטענה החשובה ביותר כאן.**

   `api/_placements.js` קורא את עמודות התיבות מ-`TEAM_FLAGS`,
   ו-`FLAG` מחזיק את המידע על כל אחת. תיבה שתהיה
   ב-`FLAG` ולא ב-`TEAM_FLAGS` **לעולם לא תיקרא מהלוח** —
   `mayFlagged` תחזיר `setup:true` לנצח, והמסך יאמר "אף
   ועדה אינה מסומנת" גם כשהועדה מסומנת מצוין.

   זה קרה בדיוק כך כשנוספה `community`, והודעת השגיאה
   נראית כמו הערת הקמה ולא כמו באג.
   ============================================================ */
const aKeys = Object.keys(FLAG).slice().sort();
const bKeys = TEAM_FLAGS.slice().sort();
const same = aKeys.length === bKeys.length && aKeys.every((k, i) => k === bKeys[i]);
ok("מפתחות FLAG זהים ל-TEAM_FLAGS", same,
  same ? aKeys.join(" · ") : `FLAG=${aKeys.join(",")}  TEAM_FLAGS=${bKeys.join(",")}`);
/* ⚠ וכל תיבה חייבת עמודה בלוח ההגדרות, אחרת
   `loadDefinitions` קוראת אותה `false` לכולן. */
const noCol = TEAM_FLAGS.filter((f) => !PLACEMENT_COLS.definitions[f]);
ok("ולכל תיבה יש עמודה בלוח ההגדרות", noCol.length === 0, noCol.join(" · "));
/* ⚠ הדגל ב-`?action=me` נגזר מהמפתח — `content` → `isContentTeam`. */
const flagKey = (f) => "is" + f[0].toUpperCase() + f.slice(1) + "Team";
ok("ושם הדגל נגזר מהמפתח",
  flagKey("community") === "isCommunityTeam" && flagKey("content") === "isContentTeam");

/* ============ 3 · מה מסומן בלוח ============ */
console.log("=== הגיליונות בלוח ===");
if (!communitySheetsReady() || !contentSheetsReady()) {
  console.log("  (דילוג — הריצו npm run seed:community -- --go)");
} else {
  const cols = [LESSON_COLS.sheets.communityTeam, LESSON_COLS.sheets.contentTeam];
  const items = (await gql(
    `query($b:[ID!],$c:[String!]){ boards(ids:$b){ items_page(limit:500){ items{
       id name column_values(ids:$c){ id text } } } } }`,
    { b: [LESSON_BOARDS.sheets], c: cols },
  )).boards[0].items_page.items;
  const on = (i, c) => {
    const t = String((i.column_values.find((x) => x.id === c) || {}).text || "").trim();
    return t === "v" || t === "✓";
  };
  const mine = items.filter((i) => on(i, cols[0])).map((i) => String(i.name).trim());
  console.log("  מסומנים לקהילה: " + (mine.join(" · ") || "—"));
  for (const w of WANT) ok(`"${w}" באחריות הקהילה`, mine.includes(w));
  /* ⚠ **ולא יותר מזה.** גיליון שנוסף בטעות נותן לוועדה אחריות
     שאיש לא החליט עליה, וזה בדיוק מה שהסקריפט נמנע מלנחש. */
  ok("ולא סומן דבר מעבר לכך", mine.length === WANT.length, String(mine.length));
  /* ⚠⚠ **שתי הוועדות אינן חולקות גיליון.** שיתוף אינו שגיאה
     טכנית — הוא פשוט אומר ששתיהן עורכות את אותו גיליון, וזה
     מצב שכדאי לראות ולא לגלות. */
  const both = items.filter((i) => on(i, cols[0]) && on(i, cols[1]))
    .map((i) => String(i.name).trim());
  ok("ואין גיליון של שתי הוועדות יחד", both.length === 0, both.join(" · "));
}

/* ============================================================
   ⚠⚠ והועדה עצמה — מסומנת, ו**נקראת**
   ------------------------------------------------------------
   שתי טענות ולא אחת: שהתיבה מסומנת בלוח, וש-
   `loadDefinitions` באמת מחזירה אותה. הראשונה לבדה
   עברה ירוק בדיוק כשהעמודה לא נקראה בכלל.
   ============================================================ */
console.log("=== הועדה בלוח ===");
{
  const { ensureCycle } = await import("../../api/_cycle.js");
  await ensureCycle().catch(() => {});
  const { loadDefinitions } = await import("../../api/_placements.js");
  const defs = await loadDefinitions({ force: true });
  const mineTeams = defs.filter((d) => d.community && !d.archived);
  ok("ועדה אחת מסומנת כועדת קהילה", mineTeams.length === 1,
    mineTeams.map((d) => d.name).join(" · ") || "אף אחת");
  /* ⚠ והתיבות אינן על אותה שורה — חוקי, וכמעט תמיד טעות. */
  const dual = defs.filter((d) => d.community && d.content).map((d) => d.name);
  ok("ואינה גם ועדת קבוצה ותוכן", dual.length === 0, dual.join(" · "));
}

/* ============================================================
   4 · הצמצום — `mayRead`/`mayWrite` מקבלות גיליון
   ------------------------------------------------------------
   ⚠ בלי סשן אמיתי של חברת ועדה אי אפשר לבדוק כאן "היא רואה",
     ואת זה עושה `content-scope-test` מול השרת. מה שכן נבדק:
     **הצורה** — שהפונקציות מקבלות גיליון ומחזירות תשובה לכל
     אחד. גרסה שתחזיר בוליאני אחד לכל הלוח היא בדיוק הבאג
     שתוקן ב-15.9.
   ============================================================ */
console.log("=== צורת ההרשאה ===");
const g = await lessonRights({ isManager: false, isStudent: true, itemId: "0" });
ok("mayRead ו-mayWrite הן פונקציות",
  typeof g.mayRead === "function" && typeof g.mayWrite === "function");
/* ⚠ **גיליון שאינו נמסר נחשב "לא מסומן"** — הכיוון הבטוח. */
ok("וגיליון שלא נמסר אינו נפתח", g.mayRead(null) === false && g.mayWrite(null) === false);
/* ⚠ ההודעה נוקבת בשמות שתי הוועדות ולא ב"ועדה" סתם. */
ok("וההודעה נוקבת בשם ועדת הקהילה",
  String(g.hint).includes("ועדת קהילה"), String(g.hint).slice(0, 80));

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
