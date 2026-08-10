/* ============================================================
   POST /api/tasks-week
   מוודא שקיימות שורות ביצוע לשבוע הנוכחי. אם קיימות — לא נוגע.

   ============================================================
   על נכונות מול ריצה מקבילה — לקרוא לפני שינוי
   ------------------------------------------------------------
   ל-monday אין טרנזקציות ואין אילוץ ייחודיות. "בדוק אם השבוע
   קיים" ו"צור אותו" הן שתי קריאות נפרדות, ולכן שני חניכים
   שנכנסים באותה שנייה עלולים ליצור 44 שורות במקום 22.

   ⚠ מה שמבטיח נכונות הוא רשת הביטחון בלבד — הניקוי לפי המפתח
     הטבעי (שבוע + מזהה משימה בתבנית) שרץ בסוף כל ריצה. הוא
     מתכנס לשורה אחת לכל משימה גם אם הכל השתבש לפניו.

   ⚠ העוגן ובחירת המנהיג הם אופטימיזציה בלבד. הם מקטינים את
     ההסתברות להגיע למצב שדורש ניקוי — הם לא מבטיחים אותה.
     אם תסיר את רשת הביטחון, המערכת תישבר; אם תסיר את העוגן,
     היא רק תעבוד קשה יותר.

   כלל עליון בניקוי: שורה שכבר סומנה "בוצע" לעולם לא נמחקת,
   גם אם המזהה שלה גבוה יותר. עדיף כפילות גלויה מאשר סימון
   של חניך שנעלם.
   ============================================================ */

import { gql } from "./_monday.js";
import { withAuth } from "./_session.js";
import { TASK_BOARDS, TASK_COLS, DONE } from "../shared/tasks-boards.js";
import { weekId } from "../shared/week.js";

const T = TASK_COLS.template;
const E = TASK_COLS.execution;

/** שהייה בין יצירת העוגן לקריאת ההכרעה, כדי ששתי ריצות יראו זו את זו */
const SETTLE_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const val = (item, colId) => (item.column_values.find((c) => c.id === colId) || {}).text || "";

async function items(boardId) {
  const out = [];
  let cursor = null;
  do {
    const page = cursor
      ? `next_items_page(limit:500, cursor:${JSON.stringify(cursor)}){ cursor items { id name column_values { id text } } }`
      : `boards(ids:[${boardId}]){ items_page(limit:500){ cursor items { id name column_values { id text } } } }`;
    const data = await gql(`{ ${page} }`);
    const p = cursor ? data.next_items_page : data.boards[0].items_page;
    out.push(...p.items);
    cursor = p.cursor;
  } while (cursor);
  return out;
}

/** שורות התבנית שמסומנות "פעיל", בסדר דטרמיניסטי */
async function activeTemplate() {
  const rows = await items(TASK_BOARDS.template);
  return rows
    .filter((r) => val(r, T.active) === "v")
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      day: val(r, T.day),
      focus: val(r, T.focus),
      order: Number(val(r, T.order)) || 0,
    }))
    // הסדר חייב להיות זהה בכל ריצה, אחרת שתי ריצות יבחרו עוגן שונה
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** שורות הביצוע של שבוע מסוים */
async function executionFor(week) {
  const rows = await items(TASK_BOARDS.execution);
  return rows
    .filter((r) => val(r, E.week) === week)
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      templateId: val(r, E.templateId),
      done: val(r, E.done) === DONE.yes,
    }));
}

async function createRow(task, week) {
  const cols = {
    [E.day]: { label: task.day },
    [E.focus]: { label: task.focus },
    [E.done]: { label: DONE.no },
    [E.week]: week,
    [E.templateId]: task.id,
    // נכתב לקריאוּת בלוח בלבד — אף מסך לא קורא אותו. ראה ההערה
    // ליד E.order ב-shared/tasks-boards.js.
    [E.order]: String(task.order),
  };
  const r = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
    { b: TASK_BOARDS.execution, n: task.name, v: JSON.stringify(cols) }
  );
  return String(r.create_item.id);
}

/* ------------------------------------------------------------
   רשת הביטחון. זה מה שמבטיח נכונות.
   מפתח טבעי: (שבוע, מזהה משימה בתבנית).

   סדר העדיפות בבחירת השורה שנשארת:
     1. שורה שסומנה "בוצע" — תמיד מנצחת, גם אם מזהה גבוה
     2. אחרת, המזהה הנמוך ביותר
   שורה מסומנת לעולם לא נמחקת.
   ------------------------------------------------------------ */
export async function dedupeWeek(week) {
  const rows = await executionFor(week);
  const groups = new Map();
  for (const r of rows) {
    if (!r.templateId) continue; // בלי מפתח אין מה להשוות — לא נוגעים
    if (!groups.has(r.templateId)) groups.set(r.templateId, []);
    groups.get(r.templateId).push(r);
  }

  const removed = [];
  for (const [templateId, group] of groups) {
    if (group.length < 2) continue;

    const marked = group.filter((r) => r.done);
    if (marked.length > 1) {
      // יותר משורה מסומנת אחת — לא מכריעים בשביל החניך
      removed.push({ templateId, skipped: true, reason: "יותר משורה מסומנת אחת" });
      continue;
    }
    const keep = marked[0] || [...group].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))[0];

    for (const r of group) {
      if (r.id === keep.id || r.done) continue; // מסומנת לא נמחקת בשום מקרה
      await gql(`mutation{ delete_item(item_id:${Number(r.id)}){ id } }`);
      removed.push({ templateId, deleted: r.id, kept: keep.id, keptBecause: marked[0] ? "מסומנת בוצע" : "מזהה נמוך" });
    }
  }
  return removed;
}

/** הפעולה המרכזית. מחזיר תיאור של מה שקרה, בלי לזרוק על מצב תקין. */
export async function ensureWeek(at = new Date()) {
  const week = weekId(at);

  // 1. קיים כבר?
  const existing = await executionFor(week);
  if (existing.length) {
    return { week, created: 0, reason: "השבוע כבר קיים", existing: existing.length };
  }

  // 2. תבנית
  const template = await activeTemplate();
  if (!template.length) {
    return { week, created: 0, reason: "אין שורות פעילות בתבנית" };
  }

  // 3. עוגן — שורה אחת בלבד, לפני שמשקיעים ביצירת כל השאר
  const anchorTask = template[0];
  const anchorId = await createRow(anchorTask, week);

  // 4. שהייה, כדי ששתי ריצות מקבילות יספיקו לראות זו את העוגן של זו
  await sleep(SETTLE_MS);

  // 5. הכרעה דטרמיניסטית: מי שיצר את העוגן בעל המזהה הנמוך — ממשיך
  const anchors = (await executionFor(week)).filter((r) => r.templateId === anchorTask.id);
  const winner = [...anchors].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))[0];

  if (winner.id !== anchorId) {
    // ריצה אחרת הקדימה. מנקים אחרינו ויוצאים; היא תשלים את השבוע.
    await gql(`mutation{ delete_item(item_id:${Number(anchorId)}){ id } }`);
    return { week, created: 0, reason: "ריצה מקבילה הקדימה", yieldedTo: winner.id };
  }

  // 6. שאר המשימות
  let created = 1;
  for (const task of template.slice(1)) {
    await createRow(task, week);
    created++;
  }

  // 7. רשת הביטחון — כאן מובטחת הנכונות
  const removed = await dedupeWeek(week);

  return { week, created, tasks: template.length, cleaned: removed };
}

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }
  try {
    res.status(200).json({ ok: true, ...(await ensureWeek()) });
  } catch (e) {
    console.error("[tasks-week]", e);
    res.status(502).json({ error: e.message });
  }
}

export default withAuth(handler);
