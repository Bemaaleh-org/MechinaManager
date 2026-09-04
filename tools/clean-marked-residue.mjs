/* ============================================================
   ניקוי ימי סימון ריקים שנוצרו בהרצת בדיקה
   ------------------------------------------------------------
   ⚠ **מוחק רק יום שאין בו אף נוכח.** יום עם נוכחים הוא נתון
     של המכינה, גם אם נראה חשוד — ומחיקה שלו אינה ניתנת לתיקון.

   ⚠ **ורק מזהים שנמסרים במפורש.** סינון לפי ערך תופס גם שורות
     שלא יצרנו (CLAUDE.md).

   הרצה יבשה כברירת מחדל; `--go` מוחק.
   ============================================================ */
import { gql } from "../api/_monday.js";
import { loadMarked, invalidateAttendance } from "../api/_attendance-data.js";

const GO = process.argv.includes("--go");
const ids = process.argv.filter((a) => /^\d{6,}$/.test(a));

if (!ids.length) {
  console.log("שימוש: node --env-file=.env tools/clean-marked-residue.mjs <מזהה> [--go]");
  console.log("\nימי סימון בלוח:");
  const m = await loadMarked({ force: true });
  for (const [d, st] of [...m.entries()].sort()) {
    console.log(`  ${d}  ${String(st.present.size).padStart(3)} נוכחים  ${st.id}  ע״י ${st.by}`);
  }
  process.exit(0);
}

const marked = await loadMarked({ force: true });
const byId = new Map([...marked.entries()].map(([d, st]) => [String(st.id), { date: d, ...st }]));

for (const id of ids) {
  const hit = byId.get(String(id));
  if (!hit) { console.log(id + " — אינו בלוח ימי הסימון. מדלג."); continue; }
  if (hit.present.size > 0) {
    console.log(`${hit.date} (${id}) — ${hit.present.size} נוכחים. **לא נמחק.**`);
    continue;
  }
  if (!GO) { console.log(`${hit.date} (${id}) — ריק, יימחק`); continue; }
  await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: id });
  console.log(`${hit.date} (${id}) — נמחק`);
}
invalidateAttendance();
if (!GO) console.log("\nהרצה יבשה. --go למחיקה.");
