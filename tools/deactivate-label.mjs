/* ============================================================
   השבתת תווית בעמודת סטטוס — כלי כללי
   ------------------------------------------------------------
   ⚠⚠ **משבית ואינו מוחק.** `update_status_column` דורס את כל
     רשימת התוויות, ותווית שנעלמת ממנה **מוחקת בשקט את הערך של
     כל שורה שיושבת עליה**. השבתה מורידה אותה מרשימת הבחירה,
     שומרת על הנתון, והיא הפיכה בקליק בלוח.

   ⚠ **וכל צבע נשלח בחזרה כפי שהוא.** monday דוחה שינוי צבע של
     שלוש התוויות הראשונות (אלה שירשו את Working on it / Done /
     Stuck), **ודחייה כזו מפילה את כל הקריאה** — כלומר גם
     ההשבתה לא תקרה. שם הצבע יושב ב-`var_name` ולא ב-`color`,
     שהוא הקס; המיפוי ב-`tools/monday-colors.json` נבנה בניסוי.

   ⚠ **ומדווח כמה שורות יושבות על התווית לפני שהוא נוגע.**
     השבתה של תווית שיש מאחוריה נתונים היא החלטה, ולא תופעת
     לוואי — היא מותרת (הנתון נשמר), אבל היא צריכה להיראות.

   הרצה:
     node --env-file=.env tools/deactivate-label.mjs <board> <column> "<תווית>"
     ...ומוסיפים --go כדי לבצע. בלעדיו זו הרצה יבשה.
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import COLOR_MAP from "./monday-colors.json" with { type: "json" };

const [board, column, wanted] = process.argv.slice(2);
const GO = process.argv.includes("--go");

if (!board || !column || !wanted) {
  console.log('שימוש: node --env-file=.env tools/deactivate-label.mjs <board> <column> "<תווית>" [--go]');
  process.exit(1);
}

const col = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ columns{ id title settings_str revision } } }`,
  { b: [board] })).boards[0].columns.find((c) => c.id === column);
if (!col) { console.log("העמודה לא נמצאה."); process.exit(1); }

const st = JSON.parse(col.settings_str || "{}");
const labels = st.labels || {};
const colors = st.labels_colors || {};
const off = new Set((st.deactivated_labels || []).map(String));

const hit = Object.entries(labels).find(([, t]) => String(t || "") === wanted);
if (!hit) {
  console.log(`"${wanted}" אינה ברשימה. התוויות: ${Object.values(labels).filter(Boolean).join(" · ")}`);
  process.exit(1);
}
if (off.has(hit[0])) { console.log(`"${wanted}" כבר מושבתת.`); process.exit(0); }

/* ⚠ כמה שורות יושבות עליה — לפני, ולא אחרי. */
const items = await allItems(board);
const users = items.filter(
  (i) => ((i.column_values.find((x) => x.id === column) || {}).text || "") === wanted);
console.log(`עמודה: ${col.title}`);
console.log(`תווית: "${wanted}"  ·  שורות שיושבות עליה: ${users.length}`);
if (users.length) console.log("  " + users.map((u) => u.name).join(", "));
console.log("  (הנתון נשמר — התווית יורדת מרשימת הבחירה בלבד.)");

const next = Object.entries(labels).filter(([, t]) => t).map(([id, text], index) => {
  const varName = (colors[id] || {}).var_name || "";
  const color = COLOR_MAP[varName];
  /* ⚠ נכשלים ברעש ולא מנחשים — ניחוש מפיל את כל הקריאה. */
  if (!color) throw new Error(`אין מיפוי לצבע "${varName}" (תווית ${id}). להוסיף ל-monday-colors.json.`);
  return {
    id: Number(id), label: String(text), index, color,
    is_deactivated: off.has(id) || id === hit[0],
  };
});

if (!GO) { console.log("\nהרצה יבשה. להוספת --go כדי לבצע."); process.exit(0); }

await gql(
  `mutation($b:ID!,$c:String!,$s:UpdateStatusColumnSettingsInput!,$r:String!){
     update_status_column(board_id:$b,id:$c,settings:$s,revision:$r){ id } }`,
  { b: board, c: column, s: { labels: next }, r: String(col.revision) });

/* ⚠ ווידוא בקריאה חוזרת: כתיבה שמוחקת רשימה שלמה נראית בדיוק
   כמו הצלחה (4ס). */
const after = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ columns{ id settings_str } } }`,
  { b: [board] })).boards[0].columns.find((c) => c.id === column);
const st2 = JSON.parse(after.settings_str || "{}");
const now = Object.values(st2.labels || {}).filter(Boolean);
const lost = Object.values(labels).filter(Boolean).filter((t) => !now.includes(t));
console.log("\nתוויות עכשיו: " + now.join(" · "));
console.log("מושבתות: " + ((st2.deactivated_labels || [])
  .map((k) => st2.labels[String(k)]).filter(Boolean).join(" · ") || "—"));
console.log(lost.length ? "⚠⚠ אבדו תוויות: " + lost.join(" · ") : "אף תווית לא אבדה.");
