/* ============================================================
   סריקה שנייה — הלוחות שהחניכים רואים מחוץ לתחום הנוכחות
   ⚠ קריאה בלבד.
   ============================================================ */
import { allItems } from "../api/_monday.js";
import { FAULTS, FAULTS_COLS } from "../shared/faults-ids.js";
import { SAFETY, SAFETY_COLS } from "../shared/safety-ids.js";
import { CHORE_BOARDS, CHORE_COLS } from "../shared/chores-ids.js";
import { TEAM_BOARDS, TEAM_COLS } from "../shared/team-ids.js";
import { DUTY_BOARDS } from "../shared/duty-ids.js";

const CUT = process.argv[2] || "2026-08-31";
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const day = (i) => String(i.created_at || "").slice(0, 10);
const mark = (i) => (day(i) < CUT ? "  ⚠ לפני " + CUT : "");

async function dump(title, board, cols) {
  console.log("\n" + "=".repeat(58) + "\n" + title + "\n" + "=".repeat(58));
  if (!board) { console.log("(לוח לא מוקם)"); return; }
  let items;
  try { items = await allItems(board, "created_at"); }
  catch (e) { console.log("שגיאה: " + e.message); return; }
  items.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  for (const i of items) {
    const extra = cols.map((c) => val(i, c)).filter(Boolean).join(" · ");
    console.log(day(i) + " | " + i.name.slice(0, 46).padEnd(46) + " | " +
      extra.slice(0, 46) + " | " + i.id + mark(i));
  }
  console.log("סה״כ " + items.length + " · לפני " + CUT + ": " +
    items.filter((i) => day(i) < CUT).length);
}

const F = FAULTS_COLS;
await dump("תקלות ובעיות (כל חניך רואה)", FAULTS.board,
  [F.status, F.place, F.urgency, F.reporter]);

const S = SAFETY_COLS;
await dump("בטיחות (צוות)", SAFETY.board, Object.values(S).slice(0, 4));

await dump("תורניות – גזרות", CHORE_BOARDS.sectors,
  [CHORE_COLS.sectors.kind, CHORE_COLS.sectors.cap]);
await dump("תורניות – שיבוץ", CHORE_BOARDS.roster,
  [CHORE_COLS.roster.studentName, CHORE_COLS.roster.sectorName,
   CHORE_COLS.roster.weekName, CHORE_COLS.roster.date]);
await dump("תורניות – התאמות", CHORE_BOARDS.adjust,
  [CHORE_COLS.adjust.studentName, CHORE_COLS.adjust.delta, CHORE_COLS.adjust.reason]);
await dump("תורניות – ביצוע", CHORE_BOARDS.done, []);

await dump("צוותים – משימות", TEAM_BOARDS.tasks, Object.values(TEAM_COLS.tasks).slice(0, 4));
await dump("הצפות", DUTY_BOARDS.notes, []);
await dump("משימות אישיות (מרכז התפקיד)", DUTY_BOARDS.tasks, []);
