/* ============================================================
   תוויות עמודת סטטוס — קריאה אחת, ולא שלוש
   ------------------------------------------------------------
   ⚠⚠ **היו כאן שתי מימושים זהים־כמעט של אותו דבר.**
     `activeLabels` ב-_tryouts.js ו-`branchLabels` ב-_alumni.js
     שניהם קוראים `settings_str`, מסננים את המושבתות ומחזירים
     רשימת שמות. שני מימושים של אותה שאלה מתפצלים בתיקון
     הראשון — וכאן זה קריטי במיוחד, כי **שתי הרשימות אמורות
     להיות זהות**: "לאיזה חיל" היא אותה שאלה על חניך ועל בוגר,
     והסטטיסטיקה של הבוגרים חייבת להתיישב עם השיבוצים.

   ⚠ **מושבתת אינה נעלמת — היא יורדת מהבורר.** הדרך היחידה
     להוריד תווית מ-monday בלי למחוק נתונים היא להשבית אותה:
     `update_status_column` דורס את כל הרשימה, ותווית שנעלמת
     ממנה מוחקת **בשקט** את הערך של כל שורה שיושבת עליה.
     מי שקורא רק את `labels` ממשיך להציע בדיוק את מה שמישהו
     הוריד ביד, בלי שום סימן.

   ⚠ **וההשבתה יושבת ב-`deactivated_labels`** (מערך מזהים)
     ולא בתוך `labels_colors`. קורא שמסתכל במקום הלא-נכון
     מדפיס תמיד "לא קרה כלום" — וזה בדיוק הדיווח שמסתיר
     כישלון אמיתי בפעם הבאה (5ז).
   ============================================================ */
import { gql } from "./_monday.js";

/** שמות התוויות הפעילות (לא מושבתות) מתוך settings_str. */
export function activeLabels(settingsStr) {
  let st = {};
  /* ⚠ settings_str פגום אינו מפיל מסך — הוא מחזיר רשימה ריקה,
     והמסך אומר "אין חילות להציג" במקום 502 (עיקרון 6). */
  try { st = JSON.parse(settingsStr || "{}"); } catch { return []; }
  const off = new Set((st.deactivated_labels || []).map(String));
  return Object.entries(st.labels || {})
    .filter(([id, t]) => t && !off.has(String(id)))
    .map(([, t]) => String(t));
}

/** התוויות הפעילות של עמודה אחת בלוח אחד. */
export async function labelsOf(boardId, columnId) {
  if (!boardId || !columnId) return [];
  const d = await gql(`{ boards(ids:[${boardId}]){ columns{ id settings_str } } }`);
  const col = ((d.boards[0] || {}).columns || []).find((c) => c.id === columnId);
  return col ? activeLabels(col.settings_str) : [];
}

/**
 * ההפרש בין שתי רשימות תוויות.
 * ⚠ מחזיר **שני כיוונים**. "חסר אצל החניכים" ו"קיים רק אצלם"
 *   הם שני מצבים שונים: הראשון פירושו שאי אפשר לשבץ לחיל
 *   שבוגר כבר שירת בו, והשני שהשיבוצים יצרו קטגוריה
 *   שהסטטיסטיקה של הבוגרים לא תדע לספור.
 */
export function labelDrift(alumni, students) {
  const a = new Set(alumni), s = new Set(students);
  return {
    missingInStudents: [...a].filter((x) => !s.has(x)).sort((x, y) => x.localeCompare(y, "he")),
    extraInStudents: [...s].filter((x) => !a.has(x)).sort((x, y) => x.localeCompare(y, "he")),
    same: a.size === s.size && [...a].every((x) => s.has(x)),
  };
}
