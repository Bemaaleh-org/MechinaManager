/* ============================================================
   פריטי ההשאלה — שורה לכל פריט, עם כמה יצא וכמה חזר
   ------------------------------------------------------------
   ⚠ עד כה כל הציוד של השאלה נכתב לתיבת טקסט אחת. זה נראה
     חסכוני והתברר כלא שמיש: אי אפשר לענות "מה עוד לא חזר"
     על גוש טקסט. כל פריט הוא עכשיו שורה משלו עם כמות שיצאה
     וכמות שחזרה, בדיוק כמו שורה ברשימת הציוד של המכולה.

   ⚠ החזרה היא **חלקית מטבעה**. הושאלו 20 כיסאות וחזרו 15 —
     זה המצב הרגיל, לא חריג. לכן `back` הוא מספר ולא סימון,
     וסטטוס ההשאלה נגזר מסכום השורות ולא נשמר בנפרד.

   ⚠ הפורמט בלוח קריא לאדם, כי הלוח הוא מסד הנתונים ומישהו
     יסתכל בו:

       כיסאות פלסטיק × 20 · חזרו 15
       שולחנות × 4
       מקרן × 1 · חזרו 1

     JSON היה נוח לי יותר ולא היה נקרא על ידי איש.
   ============================================================ */

/** שורה אחת → { name, qty, unit, back } או null */
export function parseLoanItem(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;

  /* החלק שאחרי הנקודה־האמצעית הוא ההחזרה */
  const parts = raw.split("·");
  const head = String(parts[0] || "").trim();
  const tail = parts.slice(1).join("·");

  const bm = tail.match(/(\d+(?:[.,]\d+)?)/);
  const back = bm ? Number(String(bm[1]).replace(",", ".")) : 0;

  const m = head.match(/^(.*?)\s*[×xX*]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) {
    /* ⚠ בלי "×" — שורה שנכתבה ביד. הפריט קיים, כמותו אחת.
       עדיף פריט אחד מאשר לאבד את השורה. */
    return head ? { name: head, qty: 1, unit: "", back: Math.min(back, 1) } : null;
  }
  const name = m[1].trim();
  const qty = Number(String(m[2]).replace(",", "."));
  const unit = m[3].trim();
  if (!name) return null;
  return { name, qty: qty > 0 ? qty : 1, unit, back: Math.max(0, Math.min(back, qty)) };
}

/** גוש טקסט → רשימת פריטים */
export const parseLoanItems = (text) =>
  String(text || "").split(/\r?\n/).map(parseLoanItem).filter(Boolean);

/** פריט → שורה */
export function formatLoanItem(it) {
  const name = String(it?.name || "").trim();
  if (!name) return "";
  const qty = Number(it.qty) > 0 ? Number(it.qty) : 1;
  const unit = String(it.unit || "").trim();
  const back = Math.max(0, Math.min(Number(it.back) || 0, qty));
  const head = `${name} × ${qty}${unit ? " " + unit : ""}`;
  /* ⚠ "חזרו 0" לא נכתב. שורה בלי זנב היא שורה שלא חזרה,
     וזה גם מה שהיא נראית. */
  return back > 0 ? `${head} · חזרו ${back}` : head;
}

/** רשימה → גוש טקסט */
export const formatLoanItems = (items) =>
  (items || []).map(formatLoanItem).filter(Boolean).join("\n");

/**
 * מצב ההשאלה מתוך השורות.
 *   "" (אין פריטים) · "בחוץ" · "חזר חלקית" · "הוחזר"
 *
 * ⚠ נגזר ואינו נשמר. שדה שמור היה מתיישן ברגע שמישהו יעדכן
 *   שורה בלוח עצמו במקום במסך.
 */
export function loanState(items) {
  const list = items || [];
  if (!list.length) return "";
  let out = 0, back = 0;
  for (const it of list) {
    const q = Number(it.qty) > 0 ? Number(it.qty) : 1;
    out += q;
    back += Math.max(0, Math.min(Number(it.back) || 0, q));
  }
  if (back <= 0) return "בחוץ";
  if (back >= out) return "הוחזר";
  return "חזר חלקית";
}

/** { out, back, left } — לסרגל ההתקדמות */
export function loanTotals(items) {
  let out = 0, back = 0;
  for (const it of items || []) {
    const q = Number(it.qty) > 0 ? Number(it.qty) : 1;
    out += q;
    back += Math.max(0, Math.min(Number(it.back) || 0, q));
  }
  return { out, back, left: Math.max(0, out - back) };
}
