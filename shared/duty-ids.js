/* ============================================================
   מזהי לוחות האחריות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-duties.mjs.

   ⚠ **אובייקט ולא מחרוזות.** מזהה שמיוצא כמחרוזת נקבע פעם
     אחת בטעינת המודול ואי אפשר להחליף אותו בזמן ריצה — וזו
     בדיוק הסיבה ש-FAULTS_BOARD ו-SAFETY_BOARD הומרו בעבר
     ל-FAULTS.board ו-SAFETY.board. `api/_cycle.js` מחליף את
     המחזור הפעיל עם `Object.assign` על האובייקט הזה.

   ⚠ **`handover` אינו שייך למחזור.** מסמך חפיפה הוא ידע
     מוסדי שעובר בין מחזורים — זה כל מה שהוא. `tasks`
     ו-`notes` כן שייכים למחזור, והם היחידים שמופיעים
     ב-shared/cycles.js.
   ============================================================ */

export const DUTY_BOARDS = {
  tasks: "5103114330",
  notes: "5103114335",
  handover: "5103114338",
};

export const DUTY_COLS = {
  tasks: {
    duty: "text_mm6nftzz",
    /* ⚠ **מזהה בלבד ולא שם.** הלוח נקרא כ"רשימת המשימות של
       אחראי המטבח" ולא כ"היומן של יוני" — ההפחתה הזו עולה
       אפס והיא הדבר היחיד שאפשר לעשות מול מי שיש לו גישה
       ישירה ל-monday. */
    owner: "text_mm6nm8f0",
    done: "boolean_mm6nmcr8",
    due: "date_mm6nj3m6",
    note: "long_text_mm6ng2hf",
    at: "text_mm6nhwyd",
  },
  notes: {
    duty: "text_mm6nwccw",
    by: "text_mm6nttr6",
    at: "text_mm6n9kkx",
    body: "long_text_mm6n4xv2",
    /* התשובה היא הדבר היחיד שזורם מהחניך אל הצוות, והוא בוחר
       לשלוח אותה. ראו api/_duty-notes.js. */
    reply: "long_text_mm6nw25p",
    replyAt: "text_mm6n748d",
  },
  handover: {
    by: "text_mm6ngcm8",
    phone: "text_mm6n4jhx",
    cycle: "text_mm6n6t16",
    doing: "long_text_mm6nxsvq",
    challenges: "long_text_mm6n8d7r",
    keep: "long_text_mm6nvcy5",
    improve: "long_text_mm6ntnxt",
    extra: "long_text_mm6nwwes",
    at: "text_mm6n9fxt",
  },
};
