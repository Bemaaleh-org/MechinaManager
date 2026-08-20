/* ============================================================
   ייצוא לאקסל — עזר משותף לכל המסכים
   ------------------------------------------------------------
   הנתונים כבר נמצאים במסך; הקובץ נבנה בדפדפן. SheetJS נטען
   מ-CDN פעם אחת (אותו דפוס כמו בדוח החודשי של השיעורים ובדוח
   התקופתי של המטבח). אם הספרייה לא נטענה — CSV עם BOM,
   שאקסל פותח עם עברית תקינה.
   ============================================================ */

import { useEffect } from "react";

/** לקרוא פעם אחת בכל מסך שיש בו כפתור ייצוא — טוען את SheetJS מראש */
export function useExcel() {
  useEffect(() => {
    if (window.XLSX || document.getElementById("sheetjs-cdn")) return;
    const s = document.createElement("script");
    s.id = "sheetjs-cdn";
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.body.appendChild(s);
  }, []);
}

/**
 * מוריד טבלה אחת כקובץ אקסל (או CSV אם SheetJS לא נטען).
 *   file    שם הקובץ בלי סיומת
 *   sheet   שם הגיליון
 *   title   שורת כותרת מעל הטבלה (לא חובה)
 *   header  מערך כותרות העמודות
 *   rows    מערך שורות; כל שורה מערך תאים
 *   widths  רוחבי עמודות בתווים (לא חובה)
 */
export function downloadTable({ file, sheet = "גיליון", title = null, header, rows, widths = null }) {
  const aoa = [...(title ? [[title], []] : []), header, ...rows];
  const XLSX = window.XLSX;
  if (XLSX) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (widths) ws["!cols"] = widths.map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, file + ".xlsx");
  } else {
    const csv = "﻿" + aoa
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = file + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

/**
 * שיתוף טקסט — לרשימת קניות ודומיו. בטלפון נפתח חלון השיתוף של
 * המערכת (וואטסאפ וכו'); במחשב הטקסט מועתק ללוח.
 * מחזיר "shared" | "copied" כדי שהמסך יגיד מה קרה.
 */
export async function shareText({ title, text }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      /* המשתמש ביטל את חלון השיתוף — לא נחשב כשל */
      if (e && e.name === "AbortError") return "cancelled";
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
