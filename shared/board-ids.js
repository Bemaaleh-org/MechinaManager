/* ============================================================
   מזהי לוח המודעות, הסקרים והמשוב — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-board.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).

   ⚠⚠ **BOARD_COLS.feedback אינו מחזיק עמודת כותב, ולא יחזיק.**
     ראו ההערה ב-tools/seed-board.mjs ו-api/_board.js.
   ============================================================ */


export const BOARD_BOARDS = {
  "notices": "5103616233",
  "comments": "5103616237",
  "polls": "5103616240",
  "votes": "5103616245",
  "feedback": "5103616250"
};

export const BOARD_COLS = {
  "notices": {
    "kind": "color_mm6xrsh",
    "body": "long_text_mm6xargz",
    "to": "color_mm6x2ecv",
    "date": "date_mm6xhv2p",
    "until": "date_mm6x51b0",
    "pinned": "boolean_mm6xeyqd",
    "by": "text_mm6xzdt4",
    "byId": "text_mm6xpvgc",
    "link": "text_mm6xcpp4"
  },
  "comments": {
    "post": "text_mm6x88ny",
    "date": "date_mm6x3z80",
    "by": "text_mm6xseb1",
    "byId": "text_mm6xr1ej"
  },
  "polls": {
    "options": "long_text_mm6xtygm",
    "to": "color_mm6x3zgs",
    "closes": "date_mm6xfvx5",
    "closed": "boolean_mm6xrf8f",
    "by": "text_mm6xc9d6"
  },
  "votes": {
    "poll": "text_mm6xs7k0",
    "choice": "text_mm6xmz6w",
    "voter": "text_mm6xkayj"
  },
  "feedback": {
    "topic": "text_mm6xym43",
    "date": "date_mm6xftk2"
  }
};

export const NOTICE_KIND = [
  "הודעה",
  "אירוע",
  "אבידה ומציאה",
  "בקשה",
  "המלצה"
];

export const NOTICE_TO = [
  "כולם",
  "חניכים",
  "צוות"
];

/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const boardReady = () =>
  Boolean(BOARD_BOARDS.notices && BOARD_BOARDS.comments
    && BOARD_BOARDS.polls && BOARD_BOARDS.votes && BOARD_BOARDS.feedback);
