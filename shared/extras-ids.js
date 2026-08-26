/* ============================================================
   מזהי הלוחות הנוספים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-more.mjs.
   להקמה:  node --env-file=.env tools/seed-more.mjs
   ============================================================ */

export const EXTRA = {
  "alumni": {
    "board": "5102967552",
    "cols": {
      "cycle": "color_mm6k70p6",
      "unit": "text_mm6kqq69",
      "branch": "color_mm6kc3ey",
      "command": "color_mm6k985s",
      "officer": "color_mm6kbz9w",
      "enlist": "date_mm6kep8v",
      "birthday": "date_mm6kwmyw",
      "city": "text_mm6k5dgp",
      "note": "text_mm6k6kap"
    }
  },
  "hosting": {
    "board": "5102967572",
    "cols": {
      "org": "text_mm6kdpe0",
      "contact": "text_mm6kh16y",
      "phone": "text_mm6k5e98",
      "from": "date_mm6kfjrd",
      "to": "date_mm6k6w87",
      "people": "numeric_mm6kytjm",
      "sleeping": "color_mm6kpp4r",
      "buildings": "text_mm6kaqa2",
      "meals": "text_mm6kbar0",
      "status": "color_mm6k7mqk",
      "briefed": "color_mm6kvsc0",
      "handback": "color_mm6kpvkx",
      "paid": "color_mm6k7c1n",
      "amount": "numeric_mm6k5f1a",
      "note": "long_text_mm6kjhsy",
      "by": "text_mm6kfczg"
    }
  },
  "loans": {
    "board": "5102967585",
    "cols": {
      "party": "text_mm6kqqy8",
      "direction": "color_mm6kzbd0",
      "items": "long_text_mm6kaywv",
      "lines": "long_text_mm6kcjwn",
      "out": "date_mm6kw93n",
      "due": "date_mm6kj0n5",
      "back": "date_mm6kwyn0",
      "contact": "text_mm6kmr7k",
      "note": "text_mm6km60f",
      "by": "text_mm6kw6dr"
    }
  },
  "dishes": {
    "board": "5102967598",
    "cols": {
      "baseHeads": "numeric_mm6ktzd1",
      "kind": "color_mm6k6bdn",
      "items": "long_text_mm6k14dn",
      "how": "long_text_mm6kd9vc",
      "active": "boolean_mm6kf2zs"
    }
  },
  "menus": {
    "board": "5102967601",
    "cols": {
      "date": "date_mm6ksc0",
      "meal": "color_mm6k7101",
      "heads": "numeric_mm6kygs3",
      "dishes": "long_text_mm6k1jqr",
      "note": "text_mm6k9zv0"
    }
  }
};

export const extrasReady = () => Boolean(EXTRA.alumni && EXTRA.alumni.board);
