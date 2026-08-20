/* ============================================================
   POST /api/list-receive   { listId, user, received: { <rowId>: qty } }
   קבלת סחורה — סוגרת את מחזור החיים של רשימת קניות.

   ארבע קבוצות כתיבה, בסדר הזה:
     1. כמות שהתקבלה בכל שורה   ← התיעוד: מה באמת הגיע
     2. שורת קבלה ביומן התנועות ← לכל מוצר שהגיע ממנו משהו
     3. המלאי בקטלוג             ← התוצאה (נעשה יחד עם 2)
     4. סטטוס "נקנה" + תאריך     ← הדגל שאומר "הסתיים"

   הסטטוס אחרון במכוון. אם משהו נכשל באמצע, הרשימה נשארת
   "מאושרת" — גלוי שלא הושלמה, במקום להיראות סגורה כשחציה חסר.

   monday לא מאפשרת לבצע את הארבעה כיחידה אטומית אחת. לכן
   התשובה מפרטת בדיוק מה הצליח, כדי שמצב חלקי יהיה גלוי.

   כמות 0 נרשמת בשורה כ-0 ("הוזמן ולא הגיע") ולא יוצרת תנועה.
   ============================================================ */

import { BOARDS, COLS, LABELS } from "../shared/boards.js";
import { withAuth, actorName } from "./_session.js";
import { gql } from "./_monday.js";
import { commitEntry } from "./_moves.js";
import { loadLists } from "./_lists.js";
import { loadCatalog } from "./_catalog.js";

export async function planReceive(body) {
  const { listId, received } = body || {};
  if (!listId) throw new Error("לא צוינה רשימה");
  if (!received || typeof received !== "object") throw new Error("לא צוינו כמויות שהתקבלו");

  const [{ lists }, products] = await Promise.all([loadLists(), loadCatalog()]);
  const list = lists.find((l) => l.id === String(listId));
  if (!list) throw new Error("הרשימה לא נמצאה");
  if (list.status !== "approved") {
    throw new Error(`רק רשימה מאושרת ניתנת לקבלה. הרשימה בסטטוס ${LABELS.listStatus[list.status]}`);
  }
  if (!list.items.length) throw new Error("הרשימה ריקה");

  const rows = [];
  for (const it of list.items) {
    const raw = received[it.rowId];
    if (raw === undefined || raw === null || raw === "") {
      throw new Error(`לא צוינה כמות שהתקבלה עבור שורה ${it.rowId}`);
    }
    const got = Math.round(Number(raw) * 100) / 100;
    if (!(got >= 0)) throw new Error("כמות שהתקבלה לא תקינה");

    const product = products.find((p) => p.id === it.pid);
    rows.push({
      rowId: it.rowId,
      pid: it.pid,
      name: product?.name ?? it.pid,
      ordered: it.qty,
      got,
      diff: Math.round((got - it.qty) * 100) / 100,
      stockBefore: product?.stock ?? 0,
      stockAfter: Math.round(((product?.stock ?? 0) + got) * 100) / 100,
    });
  }

  return { list, rows, user: body.user, arriving: rows.filter((r) => r.got > 0).length };
}

export async function applyReceive(plan) {
  const { list, rows, user } = plan;
  const ts = Date.now();
  const done = { rowsMarked: 0, moves: [], statusSet: false };

  // 1. מה הגיע בפועל, שורה שורה
  for (const r of rows) {
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
      { b: BOARDS.rows, i: String(r.rowId), v: JSON.stringify({ [COLS.rows.got]: String(r.got) }) }
    );
    done.rowsMarked++;
  }

  // 2+3. תנועת קבלה ועדכון מלאי, רק למה שבאמת הגיע
  for (const r of rows) {
    if (r.got <= 0) continue;
    const res = await commitEntry({
      type: "receipt",
      user: user?.name || "—",
      entry: { pid: r.pid, qty: r.got },
      ts,
      dryRun: false,
    });
    done.moves.push({ product: res.product, qty: res.qty, stockAfter: res.stockAfter, moveId: res.moveId });
  }

  // 4. הדגל שאומר "הסתיים"
  const d = new Date(ts);
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
    { b: BOARDS.lists, i: String(list.id), v: JSON.stringify({
        [COLS.lists.status]: { label: LABELS.listStatus.purchased },
        [COLS.lists.purchasedAt]: { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 19) },
      }) }
  );
  done.statusSet = true;

  return done;
}

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    // הזהות מהסשן, לא מגוף הבקשה
    const plan = await planReceive({ ...body, user: { name: actorName(session) } });
    const done = await applyReceive(plan);
    res.status(200).json({
      ok: true,
      listId: plan.list.id,
      rows: plan.rows.map(({ name, ordered, got, diff, stockAfter }) => ({ name, ordered, got, diff, stockAfter })),
      done,
    });
  } catch (e) {
    console.error("[list-receive]", e.message);
    const bad = /לא נמצא|לא צוינ|לא תקינה|ריקה|רק רשימה/.test(e.message);
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
