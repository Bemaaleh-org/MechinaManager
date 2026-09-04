/* ============================================================
   ניקוי נתוני הרצה לפני הפיילוט
   ------------------------------------------------------------
   ⚠ **מוחק לפי מזהה מפורש בלבד**, ואף פעם לא לפי סינון ערכים.
     סינון לפי ערך תופס גם שורות אמיתיות — זה כבר קרה כאן.

   ⚠ **וכל מזהה מאומת מול הלוח שהוא אמור לשבת בו לפני
     המחיקה.** `delete_item` של monday נשלחת **בלי board_id**,
     כלומר מזהה שגוי ימחק שורה אקראית בלוח אקראי (4ס).

   הרצה: `node --env-file=.env tools/pilot-clean.mjs` — יבש.
         הוסיפו `--go` כדי למחוק באמת.
   ============================================================ */
import { gql, allItems } from "../api/_monday.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { SAFETY } from "../shared/safety-ids.js";
import { DUTY_BOARDS } from "../shared/duty-ids.js";

const GO = process.argv.includes("--go");

/* מה נמחק, ומאיזה לוח כל מזהה חייב להגיע */
const PLAN = [
  {
    /* ⚠ שארית מהרצת בדיקה שנקטעה: produce-test יוצר שורת
       "בדיקה — פטריות שמפיניון" ומוחק אותה בסוף, והרצה שנפלה
       באמצע השאירה אותה. השורה חוסמת את ההרצה הבאה ב-409. */
    board: (await import("../shared/kitchen-ids.js")).KITCHEN_BOARDS.produce,
    what: "שארית של produce-test בלוח ההמרות",
    ids: ["3206841964"],
  },
  {
    board: MECHINA_BOARDS.requests,
    what: "בקשות יציאה שנבדקו בהרצה",
    ids: ["3171947074", "3172925894", "3172944476", "3185467550"],
  },
  {
    board: SAFETY.board,
    what: 'שורת ברירת המחדל של monday ("Task 1")',
    ids: ["3183177985"],
  },
  {
    board: DUTY_BOARDS.tasks,
    /* ⚠ הבעלים 3188666655 אינו קיים לא במצבה ולא בלוח ההרשאות —
       חשבון שנמחק. המשימות האלה אינן מוצגות לאיש. */
    what: "משימות דוגמה של בעלים שאינו קיים",
    ids: ["3192794705", "3192777617", "3192776946", "3192785516", "3192793777"],
  },
  {
    board: DUTY_BOARDS.notes,
    what: "הצפת דוגמה",
    ids: ["3192776887"],
  },
];

let removed = 0;
for (const step of PLAN) {
  console.log("\n■ " + step.what);
  const live = new Set((await allItems(step.board)).map((i) => String(i.id)));

  for (const id of step.ids) {
    if (!live.has(String(id))) {
      console.log("  · " + id + " — אינו בלוח הזה. מדלג.");
      continue;
    }
    if (!GO) { console.log("  · " + id + " — יימחק"); continue; }
    await gql(`mutation{ delete_item(item_id:${Number(id)}){ id } }`);
    console.log("  ✓ " + id + " נמחק");
    removed++;
  }
}

console.log("\n" + (GO ? "נמחקו " + removed + " שורות." : "הרצה יבשה. --go למחיקה."));
