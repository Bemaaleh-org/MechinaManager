/* ============================================================
   מנות ומצרכים — הפרסור וההכפלה
   ------------------------------------------------------------
   משותף ללקוח ולשרת, כדי שהתצוגה המקדימה במסך והחישוב שקובע
   בשרת יהיו אותו חישוב. שני עותקים היו נפרדים זה מזה בתיקון
   הראשון שנעשה רק באחד מהם.

   ⚠ המצרכים נכתבים כטקסט חופשי, שורה לכל מצרך:

       חזה עוף 6 קילו
       פירורי לחם 2 קילו
       ביצים 20

     זו החלטה: אחראי מטבח כותב רשימה, לא ממלא טופס. הפרסור
     תופס את המספר הראשון בשורה כמות, ואת השאר כשם ויחידה.
   ============================================================ */

/** כמה אנשים מנה מכסה כברירת מחדל, אם לא נכתב אחרת */
export const DEFAULT_BASE = 35;

/**
 * שורת מצרך אחת → { name, qty, unit, raw }
 *   "חזה עוף 6 קילו"  → { name:"חזה עוף", qty:6, unit:"קילו" }
 *   "ביצים 20"        → { name:"ביצים",  qty:20, unit:"" }
 *   "מלח"             → { name:"מלח",    qty:null }
 *
 * ⚠ qty === null פירושו "לפי הטעם" ולא אפס. מצרך כזה לא
 *   מוכפל ולא נבדק מול המלאי — אין מה להכפיל בו.
 */
export function parseItem(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;
  const m = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return { name: raw, qty: null, unit: "", raw };

  const qty = Number(String(m[1]).replace(",", "."));
  const before = raw.slice(0, m.index).trim();
  const after = raw.slice(m.index + m[1].length).trim();
  /* השם הוא מה שלפני המספר; אם אין — מה שאחריו הוא השם */
  const name = before || after;
  const unit = before ? after : "";
  return { name: name.trim(), qty, unit: unit.trim(), raw };
}

/** גוש טקסט → רשימת מצרכים */
export const parseItems = (text) =>
  String(text || "").split(/\r?\n/).map(parseItem).filter(Boolean);

/**
 * הכפלת מנה למספר אנשים.
 * ⚠ עיגול כלפי מעלה לשתי ספרות: 6 קילו ל-35 איש הם 2.91 ל-17,
 *   ולא 2.9 — במטבח עדיף קצת יותר מקצת פחות.
 */
export function scaleItems(items, base, heads) {
  const b = Number(base) > 0 ? Number(base) : DEFAULT_BASE;
  const f = Number(heads) > 0 ? Number(heads) / b : 1;
  return items.map((it) => ({
    ...it,
    qty: it.qty == null ? null : Math.ceil(it.qty * f * 100) / 100,
  }));
}

/**
 * איחוד מצרכים מכמה מנות לרשימה אחת.
 * ⚠ האיחוד לפי שם **ויחידה** ביחד. "עגבניות 3 קילו" ו-"עגבניות
 *   5 יחידות" אינם אותו דבר, וחיבור שלהם היה מייצר מספר חסר
 *   פשר. שם זהה ביחידות שונות נשאר בשתי שורות.
 */
export function mergeItems(lists) {
  const out = new Map();
  for (const list of lists) {
    for (const it of list) {
      const key = `${it.name}|${it.unit || ""}`;
      const cur = out.get(key);
      if (!cur) { out.set(key, { ...it }); continue; }
      if (cur.qty == null || it.qty == null) cur.qty = cur.qty ?? it.qty;
      else cur.qty = Math.round((cur.qty + it.qty) * 100) / 100;
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name, "he"));
}

/**
 * ⚠ התאמה בין שם מצרך לשם פריט במלאי, בשני הכיוונים.
 *   "חזה עוף" מול "עוף" — כל אחד עשוי להכיל את השני, ותלוי
 *   איך נכתב הפריט בלוח. התאמה חלקית עדיפה כאן על התאמה
 *   מדויקת: מצרך שלא נמצא מדווח כ"לא במלאי", וזו אזהרת שווא
 *   מטרידה יותר מהתאמה רחבה מדי.
 */
export function matchStock(name, equipment) {
  const n = String(name || "").trim();
  if (!n) return null;
  const exact = equipment.find((e) => String(e.name || "").trim() === n);
  if (exact) return exact;
  return equipment.find((e) => {
    const en = String(e.name || "").trim();
    return en && (en.includes(n) || n.includes(en));
  }) || null;
}
