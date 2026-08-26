/* ============================================================
   פעולות פריט גנריות ב-monday — צד שרת בלבד
   ------------------------------------------------------------
   ארבע מוטציות שאינן יודעות דבר על התחום שקורא להן: יצירה,
   עריכת עמודות, שינוי שם ומחיקה. ציוד המכולה וציוד המטבח
   משתמשים בשתיהן, ולכן הן יושבות כאן ולא בשכבת הנתונים של
   אחד מהם.

   ⚠ create_labels_if_missing נשאר false כברירת מחדל. תווית
     שלא קיימת בלוח פירושה טעות בקוד או שינוי בלוח — ועדיף
     שהקריאה תיכשל ברעש מאשר שייווצרו תוויות כפולות בשקט.

     החריג הוא { labels: true }, ומותר להשתמש בו רק כשהתווית
     הגיעה מהמנהל **במפורש** דרך מסך שנועד להוסיף אותה. ראו
     CLAUDE.md סעיף 4טז. אסור להעביר את הדגל בנתיב שבו התווית
     מגיעה מקוד, מייבוא או מטופס רגיל — שם כישלון רועש הוא
     בדיוק ההתנהגות הרצויה.
   ============================================================ */

import { gql } from "./_monday.js";

export async function setColumns(board, itemId, cols, { labels = false } = {}) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:${labels ? "true" : "false"}){ id } }`,
    { b: board, i: String(itemId), v: JSON.stringify(cols) }
  );
}

export async function renameItem(board, itemId, name) {
  await gql(
    `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
    { i: String(itemId), b: board, n: name }
  );
}

export async function createItem(board, name, cols, { labels = false } = {}) {
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:${labels ? "true" : "false"}){ id } }`,
    { b: board, n: name, v: JSON.stringify(cols) }
  );
  return String(d.create_item.id);
}

export async function deleteItem(itemId) {
  await gql(`mutation{ delete_item(item_id:${Number(itemId)}){ id } }`);
}
