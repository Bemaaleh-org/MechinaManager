/* ============================================================
   POST /api/students?action=placements-setup — הקמה בלחיצה
   ------------------------------------------------------------
   יוצר את לוחות השיבוצים ב-monday, זורע את ההגדרות, מוסיף את
   התווית "אב בית" לתפקידים, וכותב את המזהים ל-
   shared/placements-ids.js — הכול מכפתור במסך, בלי טרמינל.

   ⚠ פיתוח מקומי בלבד. הכתיבה לקובץ אפשרית רק כששרת הפיתוח רץ
     על מחשב עם עותק של המאגר; ב-Vercel מערכת הקבצים אינה
     המאגר, ולכן שם הפעולה חסומה לחלוטין — כמו ?date=.

   ⚠ מנהל בלבד, ומסרב לרוץ אם הלוחות כבר קיימים — אותה הגנה
     מלוחות כפולים שיש לסקריפט.

   הסקריפט tools/seed-placements.mjs נשאר — הוא אותה הקמה
   בדיוק בשביל מי שמקים עמדה מהטרמינל.
   ============================================================ */

import fs from "node:fs";
import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { placementsReady, CATEGORY, PERIOD } from "../shared/placements.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { ROLES_COL } from "../shared/lessons-boards.js";

const SEEDS = [
  [CATEGORY.branch, PERIOD.perSemester, ["נוי", "גד״ש", "רפת", "חינוך", "פרויקטים"]],
  [CATEGORY.branch, PERIOD.yearly, ["חד״א", "כולבו"]],
  [CATEGORY.series, PERIOD.yearly, ["סדרת איושלים", "סדרת חתול בשק", "סדרת חינוך", "סדרה מסכמת"]],
  [CATEGORY.committee, PERIOD.perSemester, [
    "ועדת תרבות", "ועדת קבוצה ותוכן", "ועדת קהילה",
    "ועדת הכנה לצה״ל וידיעת הארץ", "ועדת לוגיסטיקה ושפ״ה",
  ]],
  [CATEGORY.committee, PERIOD.secondOnly, ["ועדת גיוסים"]],
  [CATEGORY.group, PERIOD.yearly, ["קבוצת שירה", "קבוצת נעם"]],
];

const labels = (...names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(i), n])) });

async function createBoard(name) {
  const d = await gql(`mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`, { n: name });
  return String(d.create_board.id);
}
async function createColumn(board, title, type, defaults = null) {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$d:JSON){
       create_column(board_id:$b, title:$t, column_type:$c, defaults:$d){ id } }`,
    { b: board, t: title, c: type, d: defaults });
  return String(d.create_column.id);
}
async function createItem(board, name, cols) {
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
    { b: board, n: name, v: JSON.stringify(cols) });
  return String(d.create_item.id);
}

async function handler(req, res, session) {
  /* ⚠ אותו שער כמו ?date= — בכל דיפלוי הפעולה אינה קיימת */
  if (process.env.VERCEL) return res.status(404).json({ error: "פעולה לא מוכרת: placements-setup" });
  if (req.method !== "POST") return res.status(405).json({ error: "רק POST נתמך כאן" });
  if (placementsReady()) return res.status(409).json({ error: "הלוחות כבר הוקמו" });

  try {
    const defsBoard = await createBoard("שיבוצים – הגדרות");
    const asgnBoard = await createBoard("שיבוצים – שיבוץ");

    const D = {
      category: await createColumn(defsBoard, "קטגוריה", "status",
        labels(CATEGORY.branch, CATEGORY.series, CATEGORY.committee, CATEGORY.group)),
      period: await createColumn(defsBoard, "תקופה", "status",
        labels(PERIOD.perSemester, PERIOD.yearly, PERIOD.firstOnly, PERIOD.secondOnly)),
      capacity: await createColumn(defsBoard, "מכסה", "numbers"),
      /* ⚠ ארבע העמודות האלה נוספו ללוח אחרי ההקמה הראשונה ולא
      נוספו לכאן, והמחולל היה מוחק אותן מקובץ המזהים בהרצה
      הבאה — `lead` ריקה פירושה `guideMap` ריקה, כלומר כל בקשת
      יציאה מדלגת על המדריך **בלי שגיאה ובלי שאיש ישים לב**. */
      desc: await createColumn(defsBoard, "תיאור", "long_text"),
      hours: await createColumn(defsBoard, "שעות פעילות", "text"),
      needs: await createColumn(defsBoard, "מה נדרש", "long_text"),
      lead: await createColumn(defsBoard, "אחראי", "text"),
      /* יו״ר ועדה או סדרה — חניך, ולא המדריך המלווה */
      chair: await createColumn(defsBoard, "מזהה יו״ר", "text"),
      chairName: await createColumn(defsBoard, "יו״ר", "text"),
      /* ⚠ תיבה בלוח ולא שם מקובע — ראו shared/placements-ids.js */
      army: await createColumn(defsBoard, "ועדת גיוסים", "checkbox"),
      /* ⚠ ריק = פעיל. ראו shared/placements-ids.js */
      archived: await createColumn(defsBoard, "מוארכב", "checkbox"),
    };
    const A = {
      student: await createColumn(asgnBoard, "מזהה חניך", "text"),
      studentName: await createColumn(asgnBoard, "חניך", "text"),
      placement: await createColumn(asgnBoard, "מזהה שיבוץ", "text"),
      placementName: await createColumn(asgnBoard, "שיבוץ", "text"),
      semester: await createColumn(asgnBoard, "סמסטר", "status",
        labels("סמסטר א׳", "סמסטר ב׳", "שנתי")),
    };

    /* המזהים נכתבים לפני הזריעה — אם היא תיפול באמצע, הלוחות
       לא יהפכו ליתומים והמסך כבר יעבוד. */
    fs.writeFileSync(new URL("../shared/placements-ids.js", import.meta.url),
`/* ============================================================
   מזהי לוחות ועמודות של שיבוצי החניכים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נוצר מכפתור ההקמה שבמסך השיבוצים
     (api/_placements-setup.js). חייב להיכנס לקומיט.
   ============================================================ */

export const PLACEMENT_BOARDS = {
  definitions: "${defsBoard}",
  assignments: "${asgnBoard}",
};

export const PLACEMENT_COLS = {
  definitions: {
    category: "${D.category}", period: "${D.period}", capacity: "${D.capacity}",
    desc: "${D.desc}", hours: "${D.hours}", needs: "${D.needs}", lead: "${D.lead}",
    chair: "${D.chair}", chairName: "${D.chairName}",
    army: "${D.army}",
    archived: "${D.archived}",
  },
  assignments: { student: "${A.student}", studentName: "${A.studentName}", placement: "${A.placement}", placementName: "${A.placementName}", semester: "${A.semester}" },
};
`);

    let seeded = 0; const failed = [];
    for (const [category, period, names] of SEEDS) {
      for (const name of names) {
        try {
          await createItem(defsBoard, name, {
            [D.category]: { label: category },
            [D.period]: { label: period },
          });
          seeded++;
        } catch (e) { failed.push(name); }
      }
    }

    /* התווית "אב בית": כתיבה לשורה קיימת עם create_labels ושחזור מיידי */
    let roleAdded = false;
    try {
      const d = await gql(`{ boards(ids:[${MECHINA_BOARDS.roster}]) {
        items_page(limit:1) { items { id column_values(ids:["${ROLES_COL}"]) { text } } } } }`);
      const row = d.boards[0].items_page.items[0];
      if (row) {
        const current = (row.column_values[0]?.text || "").split(",").map((s) => s.trim()).filter(Boolean);
        const write = (roles, create) => gql(
          `mutation($b:ID!,$i:ID!,$v:JSON!){
             change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:${create}){ id } }`,
          { b: MECHINA_BOARDS.roster, i: row.id,
            v: JSON.stringify({ [ROLES_COL]: roles.length ? { labels: roles } : null }) });
        await write([...current, "אב בית"], true);
        await write(current, false);
        roleAdded = true;
      }
    } catch { /* לא קריטי — אפשר להוסיף את התווית ידנית בלוח */ }

    res.status(200).json({ ok: true, seeded, failed, roleAdded, boards: { defsBoard, asgnBoard } });
  } catch (e) {
    console.error("[placements-setup]", e);
    res.status(502).json({ error: "ההקמה נכשלה: " + e.message });
  }
}

export default withAuth(handler, { manager: true });
