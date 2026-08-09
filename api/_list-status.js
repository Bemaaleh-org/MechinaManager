/* ============================================================
   POST /api/list-status   { listId, to, user: { name, role } }
   מעברי סטטוס של רשימת קניות.

        טיוטה ──→ ממתין לאישור ──→ מאושר ──→ נקנה
          ↑              │            │  ↘
          └──────────────┴────────────┘   התפספס

   כללים:
     • חניך יכול רק לשלוח לאישור
     • כל שאר המעברים — מנהל בלבד
     • אישור רושם מי אישר ומתי
     • חזרה לטיוטה מנקה את פרטי האישור, כדי שלא יישאר
       אישור ישן על רשימה שנפתחה מחדש לעריכה
     • רשימה ריקה לא נשלחת לאישור

   ⚠ התפקיד נקבע מהסשן בשרת. מה שהדפדפן שולח בגוף הבקשה
     אינו משפיע — בקשה שמצהירה "מנהל" בלי סשן של מנהל תידחה.
   ============================================================ */

import { BOARDS, COLS, LABELS } from "../shared/boards.js";
import { withAuth, actorName } from "./_session.js";
import { gql } from "./_monday.js";
import { loadLists } from "./_lists.js";

const ALLOWED = {
  draft: ["pending", "approved"],
  pending: ["approved", "draft"],
  approved: ["draft", "missed", "purchased"],
  purchased: [],
  missed: [],
};

/** המעבר היחיד שחניך רשאי לבצע */
const TRAINEE_ALLOWED = [["draft", "pending"]];

export async function planStatusChange({ listId, to, user, isManager }) {
  if (!listId) throw new Error("לא צוינה רשימה");
  if (!LABELS.listStatus[to]) throw new Error(`סטטוס לא מוכר: ${to}`);

  const { lists } = await loadLists();
  const list = lists.find((l) => l.id === String(listId));
  if (!list) throw new Error("הרשימה לא נמצאה");

  const from = list.status;
  if (from === to) throw new Error(`הרשימה כבר בסטטוס ${LABELS.listStatus[to]}`);

  const allowed = ALLOWED[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`מעבר לא חוקי: ${LABELS.listStatus[from]} ← ${LABELS.listStatus[to]}`);
  }

  const traineeMay = TRAINEE_ALLOWED.some(([f, t]) => f === from && t === to);
  if (!isManager && !traineeMay) {
    throw new Error("רק מנהל רשאי לבצע את המעבר הזה");
  }

  if (to === "pending" && list.items.length === 0) {
    throw new Error("אי אפשר לשלוח רשימה ריקה לאישור");
  }

  return { list, from, to, user, isManager,
           describe: `${list.name}: ${LABELS.listStatus[from]} ← ${LABELS.listStatus[to]}` };
}

export async function applyStatusChange(plan) {
  const { list, to, user } = plan;
  const now = Date.now();
  const stamp = (ms) => {
    const d = new Date(ms);
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 19) };
  };

  const cols = { [COLS.lists.status]: { label: LABELS.listStatus[to] } };

  if (to === "approved") {
    cols[COLS.lists.approvedBy] = user?.name || "";
    cols[COLS.lists.approvedAt] = stamp(now);
  } else if (to === "draft") {
    // הרשימה נפתחה מחדש — אישור קודם כבר לא רלוונטי
    cols[COLS.lists.approvedBy] = "";
    cols[COLS.lists.approvedAt] = {};
  } else if (to === "purchased") {
    cols[COLS.lists.purchasedAt] = stamp(now);
  }

  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
    { b: BOARDS.lists, i: String(list.id), v: JSON.stringify(cols) }
  );

  return {
    listId: String(list.id),
    from: plan.from,
    to,
    approvedBy: to === "approved" ? user?.name || null : to === "draft" ? null : list.approvedBy,
    at: to === "approved" || to === "purchased" ? now : null,
  };
}

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    // ⚠ התפקיד נקבע מהסשן. הצהרת הדפדפן אינה נבדקת ואינה משפיעה.
    const plan = await planStatusChange({
      listId: body?.listId, to: body?.to,
      user: { name: actorName(session) }, isManager: session.isManager,
    });
    const result = await applyStatusChange(plan);
    res.status(200).json({ ok: true, describe: plan.describe, ...result });
  } catch (e) {
    console.error("[list-status]", e.message);
    const bad = /לא נמצא|לא צוינ|לא מוכר|לא חוקי|רק מנהל|כבר בסטטוס|אי אפשר/.test(e.message);
    res.status(bad ? 400 : 502).json({ error: e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler);
