/* ============================================================
   נקודת בדיקה ידנית — שבוע המשימות
   ------------------------------------------------------------
   הרצה:
     node --env-file=.env api/tasks-week.manual.mjs           מצב בלבד, בלי לכתוב
     node --env-file=.env api/tasks-week.manual.mjs --create   יוצר את השבוע אם חסר
     node --env-file=.env api/tasks-week.manual.mjs --race     שתי ריצות במקביל, בדיקת המנגנון

   אין צורך לפתוח את האפליקציה.
   ============================================================ */

import { ensureWeek, dedupeWeek } from "./tasks-week.js";
import { gql } from "./_monday.js";
import { TASK_BOARDS, TASK_COLS, DONE } from "../shared/tasks-boards.js";
import { weekId, weekBounds } from "../shared/week.js";

const E = TASK_COLS.execution;
const args = process.argv.slice(2);
const week = weekId();

const rows = async () => {
  const d = await gql(
    `{ boards(ids:[${TASK_BOARDS.execution}]){ items_page(limit:500){ items { id name column_values { id text } } } } }`
  );
  const v = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
  return d.boards[0].items_page.items
    .map((i) => ({ id: String(i.id), name: i.name, week: v(i, E.week), day: v(i, E.day),
                   focus: v(i, E.focus), done: v(i, E.done), order: Number(v(i, E.order)) || 0,
                   templateId: v(i, E.templateId) }))
    .filter((r) => r.week === week);
};

const show = async (label) => {
  const rs = await rows();
  console.log(`\n── ${label} ──`);
  console.log(`   שבוע ${week}: ${rs.length} שורות`);
  const byDay = {};
  for (const r of rs) (byDay[r.day] ||= []).push(r);
  for (const d of ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"]) {
    const g = (byDay[d] || []).sort((a, b) => a.order - b.order);
    if (!g.length) continue;
    console.log(`   ${d}`);
    for (const r of g) console.log(`      ${String(r.order).padStart(2)}. ${r.name}  ·  ${r.focus}  ·  ${r.done}`);
  }
  // מפתחות כפולים — מה שרשת הביטחון אמורה למנוע
  const seen = new Map();
  for (const r of rs) seen.set(r.templateId, (seen.get(r.templateId) || 0) + 1);
  const dups = [...seen].filter(([, n]) => n > 1);
  console.log(`   כפילויות לפי מזהה תבנית: ${dups.length ? dups.map(([k, n]) => `${k}×${n}`).join(", ") : "אין ✅"}`);
  return rs;
};

const b = weekBounds();
console.log("═".repeat(58));
console.log(`מזהה השבוע: ${week}`);
console.log(`טווח: ${b.sunday.toISOString().slice(0, 10)} (ראשון) עד ${b.saturday.toISOString().slice(0, 10)} (שבת), שעון ישראל`);
console.log("═".repeat(58));

await show("מצב נוכחי");

if (args.includes("--race")) {
  console.log("\n── בדיקת ריצה מקבילה: שתי קריאות בו-זמנית ──");
  const [a, c] = await Promise.all([ensureWeek(), ensureWeek()]);
  console.log("   ריצה 1:", JSON.stringify(a));
  console.log("   ריצה 2:", JSON.stringify(c));
  const after = await show("אחרי");
  const ok = after.length > 0 && new Set(after.map((r) => r.templateId)).size === after.length;
  console.log(`\n   ${ok ? "✅ שורה אחת לכל משימה — המנגנון עמד" : "❌ נשארו כפילויות"}`);
} else if (args.includes("--create")) {
  console.log("\n── יצירת השבוע ──");
  const r = await ensureWeek();
  console.log("   " + JSON.stringify(r));
  await show("אחרי");
} else {
  console.log("\n(קריאה בלבד. להוספת השבוע: --create · לבדיקת המנגנון: --race)");
}
