/* ============================================================
   מתן שם כן למשבצת הריקה (אינדקס 5) בעמודת סטטוס
   ------------------------------------------------------------
   ⚠⚠⚠ **אינדקס 5 הוא המשבצת הריקה של monday, ואי אפשר לפנות
     אותה.** תא בלי בחירה מחזיר `value: null` אבל מוצג — גם
     ב-API וגם **בלוח עצמו** — עם התווית שיושבת על 5.

     כך קרה שכל 35 החניכים הופיעו בלוח כמשובצים ל"חיל האוויר"
     ברגע שנוצרה עמודת החילות, ושכל מיון בלי מצב נקרא
     "לא הגיע".

   ⚠ **ניסינו לפנות אותה, ואי אפשר.** מחיקת התווית שעל 5
     ויצירתה מחדש מחזירה אותה **בדיוק ל-5** — monday נותנת
     תמיד את המפתח הפנוי הנמוך ביותר; ושליחת `id` חדש נדחית
     ב-"For new labels no id should be provided".

   לכן במקום לפנות — **קוראים לה בשמה**: התווית שעל 5 מקבלת
   נוסח שאומר "אין כאן בחירה", ומושבתת כדי שלא תופיע בבורר;
   והתווית שישבה שם קודם נוצרת מחדש על מפתח פנוי, פעילה.

   התוצאה: מי שפותח את הלוח רואה "טרם שובץ" ולא טענה שגויה,
   הבורר מציע בדיוק את מה שצריך, והקוד ממילא נשען על
   `value === null` (ראו api/_student-rows.js).

   ⚠ **מסרב לרוץ אם תא אחד באמת בחר בתווית שעל 5.** המבחן הוא
     `value` ולא `text` — `text` משקר כאן, וזו כל הסיבה.

   הרצה:
     node --env-file=.env tools/name-slot5.mjs <board> <column> "<נוסח>" [--go]
   ============================================================ */
import { gql } from "../api/_monday.js";
import COLOR_MAP from "./monday-colors.json" with { type: "json" };

const [board, column, blankText] = process.argv.slice(2);
const GO = process.argv.includes("--go");
if (!board || !column || !blankText) {
  console.log('שימוש: node --env-file=.env tools/name-slot5.mjs <board> <column> "<נוסח>" [--go]');
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
const pos = st.labels_positions_v2 || {};

console.log(`עמודה: ${col.title}`);
const sitting = labels["5"] ? String(labels["5"]) : null;
if (sitting === blankText) { console.log("כבר מוגדר. אין מה לעשות."); process.exit(0); }
console.log(`על אינדקס 5 יושבת כרגע: ${sitting ? `"${sitting}"` : "כלום"}`);

/* ⚠ מי באמת בחר בה — `value` ולא `text`. */
const items = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ items_page(limit:500){ items{ id name
     column_values(ids:["${column}"]){ value } } } } }`, { b: [board] }))
  .boards[0].items_page.items;
const real = items.filter((i) => {
  const v = i.column_values[0].value;
  if (v === null) return false;
  try { return JSON.parse(v)?.index === 5; } catch { return false; }
});
if (real.length) {
  console.log(`\n⚠⚠ ${real.length} שורות באמת בחרו ב"${sitting}": ` +
    real.map((r) => r.name).join(", "));
  console.log("לא בוצע שינוי — צריך להעביר אותן קודם.");
  process.exit(1);
}
console.log(`(${items.length} שורות בלוח, כולן ריקות בעמודה — ונראות מלאות.)`);

const colorOf = (id) => {
  const varName = (colors[id] || {}).var_name || "";
  const c = COLOR_MAP[varName];
  /* ⚠ נכשלים ברעש ולא מנחשים — צבע שגוי על אחת משלוש התוויות
     הראשונות מפיל את כל הקריאה (4כד). */
  if (!c) throw new Error(`אין מיפוי לצבע "${varName}" (תווית ${id}). להוסיף ל-monday-colors.json.`);
  return c;
};

const taken = new Set(Object.keys(labels).map((id) => colorOf(id)));
const POOL = Object.values(COLOR_MAP);

const next = Object.entries(labels).filter(([, t]) => t).map(([id, text]) => ({
  id: Number(id),
  /* ⚠ **התווית שעל 5 מקבלת את הנוסח החדש ומושבתת.** ההשבתה
     מורידה אותה מהבורר; היא עדיין מה שמוצג לתא ריק, וזו
     בדיוק הכוונה. */
  label: id === "5" ? blankText : String(text),
  index: Number(pos[id] ?? Number(id)),
  color: colorOf(id),
  is_deactivated: id === "5" ? true : off.has(id),
}));

/* ⚠ **בלי id** — כך monday יוצרת אותה על מפתח פנוי.
   ⚠ **ומחזירים אותה במצב שבו הייתה.** תווית שהייתה מושבתת
     לפני כן (סטטוס ישן שהוצא משימוש) לא אמורה לחזור לחיים
     רק מפני שהיא במקרה ישבה על המשבצת הריקה. */
if (sitting) {
  const c = POOL.find((x) => !taken.has(x));
  if (!c) throw new Error("נגמרו הצבעים הפנויים.");
  next.push({ label: sitting, index: next.length, color: c, is_deactivated: off.has("5") });
}

next.sort((a, b) => a.index - b.index);
next.forEach((r, i) => { r.index = i; });

console.log("\nהרשימה החדשה:");
for (const r of next) {
  console.log(`  ${r.id ?? "חדש"}\t${r.label}${r.is_deactivated ? "  (מושבתת)" : ""}`);
}
if (!GO) { console.log("\nהרצה יבשה. להוספת --go כדי לבצע."); process.exit(0); }

await gql(
  `mutation($b:ID!,$c:String!,$s:UpdateStatusColumnSettingsInput!,$r:String!){
     update_status_column(board_id:$b,id:$c,settings:$s,revision:$r){ id } }`,
  { b: board, c: column, s: { labels: next }, r: String(col.revision) });

/* ---- ווידוא ---- */
const after = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ columns{ id settings_str } } }`,
  { b: [board] })).boards[0].columns.find((c) => c.id === column);
const st2 = JSON.parse(after.settings_str || "{}");
const now = Object.values(st2.labels || {}).filter(Boolean);
const lost = Object.values(labels).filter(Boolean)
  .filter((t) => t !== sitting && !now.includes(t));
console.log(`\nאינדקס 5: "${st2.labels?.["5"] || "—"}"`);
console.log("תוויות עכשיו: " + now.join(" · "));
console.log("מושבתות: " + ((st2.deactivated_labels || [])
  .map((k) => st2.labels[String(k)]).filter(Boolean).join(" · ") || "—"));
if (sitting) {
  console.log(now.includes(sitting)
    ? `"${sitting}" חזרה${off.has("5") ? " (מושבתת, כפי שהייתה)" : " כתווית פעילה"}.`
    : `⚠⚠ "${sitting}" אבדה!`);
}
console.log(lost.length ? "⚠⚠ אבדו תוויות: " + lost.join(" · ") : "אף תווית אחרת לא אבדה.");

const probe = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ items_page(limit:3){ items{ name
     column_values(ids:["${column}"]){ text value } } } } }`, { b: [board] }))
  .boards[0].items_page.items;
console.log("\nכך ייראה תא ריק:");
for (const i of probe) {
  const c = i.column_values[0];
  console.log(`  ${i.name}: text=${JSON.stringify(c.text)} value=${JSON.stringify(c.value)}`);
}
