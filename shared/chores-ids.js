/* ============================================================
   מזהי לוחות התורניות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-chores.mjs.

   ⚠ **אובייקטים ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign, ומחרוזת מיוצאת נקבעת פעם אחת
     בטעינת המודול.

   ⚠ **`texts` אינו שייך למחזור.** נוסח נוהל הוא ידע מוסדי
     שעובר בין מחזורים, כמו מסמכי החפיפה ולוח המנות (4מז).
     הגזרות, השיבוץ, ההתאמות והביצוע **כן** במחזור.
   ============================================================ */

export const CHORE_BOARDS = {
  sectors: "5103159208",
  roster: "5103159209",
  adjust: "5103159213",
  checklist: "5103159218",
  done: "5103159220",
  texts: "5103159221",
};

export const CHORE_COLS = {
  sectors: {
      "kind": "color_mm6p3250",
      "cap": "numeric_mm6pwsw1",
      "detail": "long_text_mm6pdgzy",
      "order": "numeric_mm6pk5d9",
      "archived": "boolean_mm6p6s67"
  },
  roster: {
      "student": "text_mm6pr92",
      "studentName": "text_mm6ps24z",
      "sector": "text_mm6pw3x9",
      "sectorName": "text_mm6p50jn",
      "week": "text_mm6pshz",
      "weekName": "text_mm6pdw9d",
      "date": "date_mm6pm9jd",
      "by": "text_mm6p1qm6",
      "at": "text_mm6p3v31"
  },
  adjust: {
      "student": "text_mm6pa82m",
      "studentName": "text_mm6p3bde",
      "sector": "text_mm6pmk6n",
      "sectorName": "text_mm6petxf",
      "delta": "numeric_mm6p92k",
      "reason": "text_mm6pptga",
      "by": "text_mm6pek2f",
      "at": "text_mm6pkkw5"
  },
  checklist: {
      "day": "color_mm6pzanv",
      "area": "text_mm6p3fw",
      "order": "numeric_mm6p98e",
      "archived": "boolean_mm6ps5qg"
  },
  done: {
      "date": "date_mm6pp28m",
      "item": "text_mm6pvtgy",
      "itemName": "text_mm6pzj5v",
      "by": "text_mm6pk7ep",
      "byId": "text_mm6pcbbg",
      "at": "text_mm6p2050"
  },
  texts: {
      "title": "text_mm6pne7",
      "body": "long_text_mm6p3fek",
      "by": "text_mm6p11zk",
      "at": "text_mm6pcd8a"
  },
};
