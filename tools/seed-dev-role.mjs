/* ============================================================
   התפקיד "אחראי בינה"
   ------------------------------------------------------------
     node --env-file=.env tools/seed-dev-role.mjs          (יבש)
     node --env-file=.env tools/seed-dev-role.mjs --go     (מבצע)
     ... --go --to "עומר רוטמן"    משבץ גם את התפקיד

   ⚠⚠ **החריג החמישי ל-`create_labels_if_missing:false`.**

     ארבעת הקודמים מתועדים ב-CLAUDE.md: "סוג היום" בתקציב,
     "זרוע" בבוגרים, "תקציב" ו"לקנות" ברשומות הצוות. זה החמישי,
     ומאותו נימוק בדיוק: עמודת **dropdown** אינה ניתנת לעריכה
     דרך `update_status_column` (היא אינה status), והמסלול
     היחיד שעובד להוספת תווית הוא כתיבה עם הדגל (5ס).

     ⚠ **ואין כאן סכנת זבל:** הערך היחיד שנכתב הוא `ROLE_DEV`,
       קבוע בקוד, ונבדק מול `KNOWN_ROLES` שורה לפני הכתיבה.
       אין טקסט חופשי ואין דרך לייצר תווית שגויה.

   ⚠⚠ **והתווית נכתבת ישירות על מי שאמור לשאת אותה**, ולא על
     שורה זמנית ששוחזרת. שחזור שנכשל באמצע משאיר תפקיד על חניך
     אקראי — וזו בדיוק התקלה של `rating-test` ב-CLAUDE.md.

   ⚠ **אימות בקריאה חוזרת שכל התוויות הישנות שרדו** — כתיבה
     כזו דורסת את הרשימה, וקריאה שגויה מוחקת בשקט חמישה
     תפקידים ואיתם כל שיבוץ שיושב עליהם (5ז, 4כד).
   ============================================================ */
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { ROLES_COL, ROLE_DEV, KNOWN_ROLES } from "../shared/lessons-boards.js";

const GO = process.argv.includes("--go");
const ti = process.argv.indexOf("--to");
const TO = ti > -1 ? String(process.argv[ti + 1] || "").trim() : "";

console.log(GO ? "\n▶ מבצע\n" : "\n▶ הרצה יבשה — הוסיפו --go כדי לבצע\n");

/* ⚠ המזהים נדרסים בזמן ריצה (4ל). כלי שקורא אותם כמות שהם
   כותב ללוח של המחזור שכתוב בקוד. */
await ensureCycle();

if (!KNOWN_ROLES.includes(ROLE_DEV)) {
  console.error(`✗ ${ROLE_DEV} אינו ב-KNOWN_ROLES — יש לתקן בקוד תחילה`);
  process.exit(1);
}

const labelsOf = async () => {
  const d = await gql(
    `{ boards(ids:[${MECHINA_BOARDS.roster}]){ columns(ids:["${ROLES_COL}"]){ settings_str } } }`,
  );
  let s = {};
  try { s = JSON.parse(d.boards[0].columns[0].settings_str || "{}"); } catch { s = {}; }
  return (s.labels || []).map((l) => String(l.name));
};

const before = await labelsOf();
console.log("תוויות כרגע: " + before.join(" · "));

if (before.includes(ROLE_DEV)) {
  console.log(`\n✓ "${ROLE_DEV}" כבר קיים בעמודה.`);
} else if (!GO) {
  console.log(`\nתיווצר התווית: ${ROLE_DEV}`);
}

/* ---- מי מקבל ---- */
const rows = (await gql(
  `{ boards(ids:[${MECHINA_BOARDS.roster}]){ items_page(limit:500){ items{ id name
       column_values(ids:["${ROLES_COL}"]){ text } } } } }`,
)).boards[0].items_page.items;

let target = null;
if (TO) {
  const hits = rows.filter((r) => String(r.name).includes(TO));
  if (!hits.length) {
    console.error(`\n✗ לא נמצא חניך בשם "${TO}".`);
    console.error("  ⚠ התאמת שם היא הדרך היחידה כאן, ושם שאינו נמצא עוצר");
    console.error("    במקום לנחש — pay-keep נשרף בדיוק על זה.\n");
    process.exit(1);
  }
  if (hits.length > 1) {
    console.error(`\n✗ ${hits.length} חניכים מתאימים ל-"${TO}": ` +
      hits.map((h) => h.name).join(" · "));
    console.error("  יש למסור שם מלא יותר.\n");
    process.exit(1);
  }
  target = hits[0];
  const cur = String(target.column_values[0]?.text || "")
    .split(",").map((x) => x.trim()).filter(Boolean);
  if (cur.includes(ROLE_DEV)) {
    console.log(`\n✓ ל${target.name} כבר יש את התפקיד.`);
    target = null;
  } else {
    console.log(`\nיקבל את התפקיד: ${target.name}` +
      (cur.length ? `  (בנוסף ל: ${cur.join(" · ")})` : ""));
    target.next = [...cur, ROLE_DEV];
  }
}

if (!GO) { console.log("\n(יבש — לא נכתב דבר)\n"); process.exit(0); }

if (target) {
  /* ⚠ **הדגל כאן ורק כאן.** הערך היחיד שנכתב הוא ROLE_DEV
     שנבדק מול KNOWN_ROLES למעלה — אין טקסט חופשי. */
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
         create_labels_if_missing:true){ id } }`,
    {
      b: MECHINA_BOARDS.roster, i: target.id,
      v: JSON.stringify({ [ROLES_COL]: { labels: target.next } }),
    },
  );
  console.log(`  נכתב: ${target.name} → ${target.next.join(" · ")}`);
}

/* ⚠⚠ אימות בקריאה טרייה, ולא על סמך שהמוטציה יצאה 200. */
const after = await labelsOf();
const lost = before.filter((l) => !after.includes(l));
if (lost.length) {
  console.error(`\n✗✗ תוויות שאבדו: ${lost.join(" · ")}`);
  console.error("   יש להחזיר אותן בלוח מיד — שיבוצים שיושבים עליהן נמחקו.\n");
  process.exit(1);
}
console.log("\nתוויות אחרי: " + after.join(" · "));
if (!after.includes(ROLE_DEV)) {
  console.error(`\n✗ "${ROLE_DEV}" עדיין אינו בעמודה.`);
  console.error("  ⚠ התווית נוצרת רק בשיבוץ הראשון — הריצו עם --to <שם>.\n");
  process.exit(TO ? 1 : 0);
}
console.log(`✓ "${ROLE_DEV}" בעמודה, וכל התוויות הישנות שרדו.\n`);
