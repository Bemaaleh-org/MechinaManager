/* ============================================================
   ערימת הניווט — חץ חזרה שיודע לאן
   ------------------------------------------------------------
   הבקשה: *"אני רוצה שתמיד יהיה חץ חזרה באפליקציה לדף הקודם
   שהייתי בו — לדוגמה בועדת קבוצה ותוכן נכנסתי למסך, אני רוצה
   שיהיה חץ אחורה לחזור לאיפה שהייתי."*

   עד היום `section` (ושכמותו `tab`) היה `useState` אחד: מעבר
   למסך **דורס** את הקודם ואין שום זכר לאיפה היינו. מי שנכנס
   למליאה מכרטיס הוועדה היה צריך לפתוח את המגירה ולחפש שוב
   מאיפה בא — ולרוב לנחש.

   ------------------------------------------------------------
   ⚠⚠ **חתימה תואמת ל-`useState`, ובכוונה.** `go` מקבל ערך
     (או פונקציה, כמו setter) ולכן **כל 80 הקריאות הקיימות
     ל-`setSection` / `setTab` עובדות בלי שינוי**. החלפה של
     שמונים קריאות ביד היא שמונים הזדמנויות לשגות, ומסך אחד
     שיישאר על ה-setter הישן ישבור את הערימה בשקט.

   ⚠⚠ **התווית נחתמת בזמן העזיבה ולא בזמן החזרה.** החץ צריך
     לומר **לאן** הוא מחזיר ("מסך הבית"), ואי אפשר לגזור זאת
     ממפתח המסך: במעטפת הצוות מפתחות המגירה אינם שמות המסכים
     (`a-teams` מול `teams`, `k-all` מול `kitchen`). לכן
     המעטפת קוראת ל-`stamp()` בכל רינדור עם שם המסך הנוכחי —
     שהוא ממילא מחושב מהמגירה (`activeLabel`) ולא מרשימה
     שנייה (4מד) — והערימה חותמת אותו על הרשומה שנעזבת.

   ⚠ **וכפתור המכשיר עובד.** כל מעבר דוחף רשומה ל-
     `history`, ו-`popstate` מקלף אחת מהערימה. בלי זה כפתור
     "חזור" באנדרואיד יוצא מהאפליקציה באמצע עבודה — וב-PWA
     מותקן זה נראה כמו קריסה.

   ⚠ **ומהשורש יוצאים.** כשאין לאן לחזור הערימה אינה מגיבה,
     וכפתור המכשיר עושה מה שהוא תמיד עשה. חץ חזרה שנשאר
     דלוק במסך הבית ואינו עושה דבר הוא כפתור שמלמד לא ללחוץ.
   ============================================================ */

import { useState, useRef, useCallback, useEffect } from "react";

/* ⚠ תקרה לערימה. מי שמדלג בין עשרים מסכים אינו מתכוון לחזור
   דרך כולם, וערימה שגדלה בלי גבול היא דליפה שקטה. */
const MAX = 25;

/* ============================================================
   מסך בתוך מסך — "ועדת קבוצה ותוכן" ולא "ניהול צוותים"
   ------------------------------------------------------------
   הדוגמה של הבקשה נכשלה בגרסה הראשונה: ועדה → מליאות → חזרה
   החזירה **לרשימת הצוותים**, והכפתור אמר "ניהול צוותים". הסיבה:
   הוועדה הפתוחה היא state פנימי של מסך הצוותים, והיא נמחקת
   ברגע שהמסך מתפרק. הערימה ידעה לאיזה *מסך* לחזור, ולא
   **לאיזה מקום בתוכו**.

   שני חריצים ברמת המודול, ולא context: רק מעטפת אחת פעילה
   בכל רגע, ומסך שרוצה לומר "אני בתוך X" לא צריך לקבל prop
   משתי מעטפות שונות (4יט).

   ⚠ `setNavDetail(name)` — המסך אומר איפה הוא בתוך עצמו.
     `go` מעדיף אותו על שם המגירה כשהוא חותם את הרשומה.
   ⚠ `arrivedBack()` — האם המסך הזה נטען כתוצאה מחזרה. מסך
     שזוכר את המקום הפנימי שלו משחזר אותו **רק** אז: מי שנכנס
     לצוותים מהמגירה מצפה לרשימה, ולא לוועדה שפתח לפני שעה.
   ============================================================ */
let detail = "";
let backArrival = false;

/** המסך מצהיר על המקום שבתוכו ("ועדת קבוצה ותוכן"). ריק = אין. */
export function setNavDetail(label) { detail = label || ""; }
/** האם הגענו למסך הנוכחי בחזרה אחורה, ולא בניווט רגיל */
export function arrivedBack() { return backArrival; }

/**
 * @param {string} initial מסך הפתיחה — שורש הערימה
 * @returns {[string, Function, object]} [המסך, go (כמו setter), nav]
 */
export function useNavStack(initial) {
  const [stack, setStack] = useState(() => [{ key: initial, label: "" }]);
  /* ⚠ מראה ב-ref: `go` צריך לקרוא את הערימה **לפני** שהוא
     מחליט אם לדחוף ל-history, ו-state בתוך closure מיושן. */
  const ref = useRef(stack);
  /* שם המסך הנוכחי, כפי שהמעטפת מחשבת אותו בכל רינדור */
  const here = useRef("");
  /* כמה רשומות דחפנו ל-history — כדי לא לקלף pop שאינו שלנו */
  const pushed = useRef(0);

  const apply = useCallback((next) => { ref.current = next; setStack(next); }, []);

  const popOne = useCallback(() => {
    const s = ref.current;
    if (s.length <= 1) return;
    /* ⚠ לפני apply: המסך שייטען קורא את הדגל בזמן ההרכבה. */
    backArrival = true;
    detail = "";
    apply(s.slice(0, -1));
  }, [apply]);

  /* ⚠ `popstate` שאינו שלנו אינו מקלף. הדפדפן מפעיל אותו גם
     על רשומות שלא דחפנו, וקילוף כזה היה מזיז את המסך בלי
     שאיש ניווט. */
  useEffect(() => {
    const onPop = () => {
      if (pushed.current <= 0) return;
      pushed.current -= 1;
      popOne();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [popOne]);

  const go = useCallback((next) => {
    const s = ref.current;
    const at = s[s.length - 1];
    /* ⚠ תאימות ל-setter: `setSection((p) => …)` ממשיך לעבוד. */
    const key = typeof next === "function" ? next(at.key) : next;
    if (!key || key === at.key) return;

    /* ⚠ התווית נחתמת כאן — זה הרגע היחיד שבו היא ידועה.
       ⚠ `detail` קודם: "ועדת קבוצה ותוכן" אומר לאן החץ יחזיר,
         "ניהול צוותים" אומר רק באיזה מסך היא יושבת. */
    const label = detail || here.current || at.label;
    const before = s.slice(0, -1).concat([{ ...at, label }]);
    const out = before.concat([{ key, label: "" }]);
    backArrival = false;
    detail = "";
    apply(out.length > MAX ? out.slice(out.length - MAX) : out);

    try {
      window.history.pushState({ kx: 1 }, "");
      pushed.current += 1;
    } catch { /* דפדפן שחוסם pushState — החץ שבמסך עדיין עובד */ }
  }, [apply]);

  const back = useCallback(() => {
    if (ref.current.length <= 1) return;
    /* ⚠ דרך ה-history כשיש רשומה שלנו, כדי ששני הכפתורים —
       זה שבמסך וזה של המכשיר — יישארו מסונכרנים. */
    if (pushed.current > 0) {
      try { window.history.back(); return; } catch { /* נופלים לקילוף ישיר */ }
    }
    popOne();
  }, [popOne]);

  /* ⚠ קפיצה לשורש בלי לצבור רשומות — למי שלוחץ "בית". */
  const home = useCallback(() => {
    const s = ref.current;
    if (s.length <= 1) return;
    backArrival = false;
    detail = "";
    apply([s[0]]);
  }, [apply]);

  const stamp = useCallback((label) => { here.current = label || ""; }, []);

  const prev = stack.length > 1 ? stack[stack.length - 2] : null;
  return [stack[stack.length - 1].key, go, {
    canBack: stack.length > 1,
    /* ⚠ **ברירת המחדל היא "אחורה" ולא ריק.** מסך שלא נמצא
       במגירה (למשל כזה שנפתח מקיצור דרך) לא ישאיר את הכפתור
       בלי מילה (4יא). */
    backLabel: prev ? (prev.label || "אחורה") : "",
    backKey: prev ? prev.key : null,
    depth: stack.length,
    back, home, stamp,
  }];
}

/* ============================================================
   שם המסך הנוכחי — מהמגירה, ולא ממפה שנייה
   ------------------------------------------------------------
   ⚠⚠ **נגזר מ-`active` שהמגירה ממילא מחשבת.** מפה של
     `מסך → שם` הייתה רשימה שנייה שמתפצלת בתוספת הראשונה
     (4מד), והיא גם הייתה חוזרת על עצמה: `active` הוא בדיוק
     התשובה לשאלה "איפה אני".

   ⚠ **ופריט שנושא `active:false` קבוע אינו מסומן** — זו
     בדיוק התקלה שתועדה במעטפת הצוות ("הסימון היה קיים
     בעיצוב ולא בנתונים"), והיא תופיע כאן כמסך בלי שם.
   ============================================================ */
export function activeLabel(groups) {
  for (const g of groups || []) {
    for (const it of (g && g.items) || []) {
      if (it && it.active) return it.label || "";
    }
  }
  return "";
}
