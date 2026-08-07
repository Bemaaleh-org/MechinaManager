/* ============================================================
   מזהי הלוחות והעמודות ב-monday — מקור אמת יחיד
   ------------------------------------------------------------
   זה הקובץ היחיד בפרויקט שמכיר מזהי עמודות. אם עמודה מוחלפת
   או נוצרת מחדש ב-monday, משנים כאן שורה אחת וזהו.

   התיעוד המלא, כולל מלכודות ה-API של monday: מיפוי-לוחות.md
   ============================================================ */

export const BOARDS = {
  catalog: "5101009573", // מלאי מטבח – קטלוג מוצרים
  moves: "5101009681", // מלאי מטבח – יומן תנועות
  lists: "5101009698", // מלאי מטבח – רשימות קניות
  rows: "5101307336", // מלאי מטבח – שורות רשימת קניות
};

export const COLS = {
  catalog: {
    cat: "color_mm5knrh5",
    unit: "color_mm5k92a6",
    tracking: "color_mm5kppve",
    sup: "color_mm5khc07",
    exp: "boolean_mm5kkcmv",
    stock: "numeric_mm5k9a93",
    min: "numeric_mm5kx89e",
    target: "numeric_mm5kz9f5",
    price: "numeric_mm5k5j4z",
    stockStatus: "color_mm5kvr1a",
    expiryFlag: "color_mm5mg6jn",
    pending: "boolean_mm5mwjw7",
  },
  moves: {
    type: "color_mm5kvcap",
    productName: "text_mm5kcy1z", // שם קריא, לתצוגה ב-monday בלבד
    product: "board_relation_mm5m5x2s", // הקישור האמיתי לקטלוג
    qty: "numeric_mm5ky86h",
    reason: "color_mm5ksxw1",
    user: "text_mm5kshe",
    value: "numeric_mm5kdzjh",
    ts: "date_mm5mhx77",
    cancelled: "boolean_mm5sdza2", // דיווח שבוטל — נשאר ביומן כעקבה
  },
  lists: {
    sup: "color_mm5kmt6g",
    status: "color_mm5k3ffc",
    createdBy: "text_mm5k5hkc",
    cost: "numeric_mm5k42t7",
    approvedBy: "text_mm5kcah",
    dueDate: "date_mm5kjce5",
    approvedAt: "date_mm5mexba",
    purchasedAt: "date_mm5mtgc3",
  },
  rows: {
    list: "board_relation_mm5rv6c",
    product: "board_relation_mm5rzhc6",
    qty: "numeric_mm5rhj8m",
    got: "numeric_mm5r6xbh",
    source: "color_mm5rsq8q",
  },
};

/* ------------------------------------------------------------
   תרגום ערכי סטטוס: הצד של האפליקציה ← → התווית ב-monday.
   התוויות כאן חייבות להיות זהות בתו לתוויות שבלוחות. כל סטייה
   נתפסת על ידי הבדיקה ב-shared/mapper.test.mjs.
   ------------------------------------------------------------ */
export const LABELS = {
  cat: {
    "בשר ועוף": "בשר ועוף",
    "חלב וביצים": "חלב וביצים",
    "ירקות ופירות": "ירקות ופירות",
    "לחם ומאפים": "לחם ומאפים",
    יבשים: "יבשים",
    "שימורים ורטבים": "שימורים ורטבים",
    "תבלינים ומשקאות": "תבלינים ומשקאות",
    // שים לב: בפרוטוטייפ גרשיים עבריים (״), ב-monday גרשיים רגילים (")
    'חד״פ וניקיון': 'חד"פ וניקיון',
  },
  unit: {
    kg: 'ק"ג', // בפרוטוטייפ: ק״ג
    liter: "ליטר",
    unit: "יח'", // בפרוטוטייפ: יח׳
  },
  tracking: {
    daily: "יומי - טרי",
    weekly: "שבועי - יבש",
  },
  sup: {
    super: "סופר",
    wholesale: "סיטונאי",
  },
  stockStatus: {
    ok: "תקין",
    low: "מתחת למינימום",
  },
  expiryFlag: {
    ok: "מעל 3 ימים",
    soon: "פחות מ-3 ימים",
  },
  moveType: {
    receipt: "קבלה",
    usage: "שימוש",
    waste: "פחת",
    count: "ספירה",
  },
  listStatus: {
    draft: "טיוטה",
    pending: "ממתין לאישור",
    approved: "מאושר",
    purchased: "נקנה",
    missed: "התפספס",
  },
  rowSource: {
    auto: "אוטומטי",
    manual: "ידני",
  },
};

/** הופך מפת תוויות לכיוון ההפוך: תווית monday → הערך באפליקציה */
export const invert = (map) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
