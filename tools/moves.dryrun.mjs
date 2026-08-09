/* ============================================================
   הרצה יבשה של דיווח יומי — לא כותבת דבר ל-monday.
   קוראת את מצב המוצר ומדפיסה בדיוק מה הייתה כותבת.

   הרצה:  node --env-file=.env tools/moves.dryrun.mjs
   ============================================================ */

import { commitEntry } from "../api/_moves.js";
import { moveColumns, productColumns } from "../shared/mapper.js";
import { COLS } from "../shared/boards.js";

const SCENARIOS = [
  { type: "usage", user: "אורי לוי", entry: { pid: "3113285084", qty: 3 } }, // חזה עוף
  { type: "waste", user: "נועה כהן", entry: { pid: "3113379095", qty: 2, reason: "רקוב" } }, // עגבניות
  { type: "receipt", user: "אורי לוי", entry: { pid: "3113296013", qty: 10 } }, // בשר טחון
];

const ts = Date.UTC(2026, 6, 31, 12, 0, 0);

for (const s of SCENARIOS) {
  const plan = await commitEntry({ ...s, ts, dryRun: true });
  const arrow = plan.stockAfter > plan.stockBefore ? "▲" : "▼";

  console.log("=".repeat(62));
  console.log(`${plan.type.toUpperCase().padEnd(8)} ${plan.product}   (${plan.qty} יח׳)`);
  console.log(`  מלאי:   ${plan.stockBefore}  ${arrow}  ${plan.stockAfter}`);
  console.log(`  סטטוס:  ${plan.statusBefore}  →  ${plan.statusAfter}`);
  if (plan.reason) console.log(`  סיבה:   ${plan.reason}`);
  console.log(`  שווי:   ₪${plan.value}`);

  console.log("  — כתיבה 1: שורה חדשה ביומן התנועות —");
  const cols = moveColumns(
    { pid: plan.pid, type: plan.type, qty: plan.qty, reason: plan.reason, user: s.user, ts },
    { productName: plan.product, price: plan.value / plan.qty }
  );
  for (const [k, v] of Object.entries(cols)) {
    const name = Object.entries(COLS.moves).find(([, id]) => id === k)?.[0] ?? k;
    console.log(`      ${name.padEnd(14)} ${JSON.stringify(v)}`);
  }

  console.log("  — כתיבה 2: עדכון המוצר בקטלוג —");
  const pc = productColumns({ stock: plan.stockAfter, min: 0 });
  console.log(`      stock          ${JSON.stringify(pc[COLS.catalog.stock])}`);
  console.log(`      stockStatus    ${JSON.stringify({ label: plan.statusAfter === "low" ? "מתחת למינימום" : "תקין" })}`);
}

console.log("=".repeat(62));
console.log("הרצה יבשה בלבד — לא נכתב דבר ל-monday.");
