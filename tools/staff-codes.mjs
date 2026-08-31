/* ============================================================
   קודי הכניסה של הצוות — הדפסה מקומית
   ------------------------------------------------------------
     node --env-file=.env tools/staff-codes.mjs
     node --env-file=.env tools/staff-codes.mjs נעם

   מדפיס שם, סוג, תפקיד וקוד לכל שורות הצוות בלוח ההרשאות.
   ארגומנט אופציונלי מסנן לפי שם.

   למה קיים: קוד של איש צוות הוא קוד תפעולי שצריך למסור —
   ולכן הוא שמור כטקסט גלוי בלוח (ראו CLAUDE.md 4כח). הכלי
   הזה רק חוסך פתיחה של monday.

   ⚠ רץ מקומית בלבד, עם .env. אין נקודת קצה שמחזירה קודים
     ולא תהיה: העיקרון הוא שהקוד לעולם אינו יוצא מהשרת, גם
     לא למנהל.

   ⚠ חניכים אינם מודפסים כאן. הסיסמה שלהם היא גיבוב scrypt
     ואינה ניתנת לשחזור — רק לאיפוס.

   ⚠ הפלט מכיל סודות. לא לשמור לקובץ, לא להעתיק לצ׳אט.
   ============================================================ */

import { AUTH_BOARD, AUTH_COLS, KIND, STAFF_ROLE } from "../shared/auth-board.js";

const TOKEN = process.env.MONDAY_TOKEN;
if (!TOKEN) {
  console.error("\n✗ MONDAY_TOKEN לא מוגדר. הריצו עם --env-file=.env\n");
  process.exit(1);
}

const filter = process.argv[2] || "";

const r = await fetch("https://api.monday.com/v2", {
  method: "POST",
  headers: { Authorization: TOKEN, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `{ boards(ids:[${AUTH_BOARD}]) { items_page(limit:200) { items {
      name column_values(ids:["${AUTH_COLS.kind}","${AUTH_COLS.code}","${AUTH_COLS.active}","${AUTH_COLS.role}","${AUTH_COLS.viewOnly}"]) { id text }
    } } } }`,
  }),
});
const json = await r.json();
if (json.errors) { console.error("\n✗ monday:", JSON.stringify(json.errors), "\n"); process.exit(1); }

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const rows = json.data.boards[0].items_page.items
  .map((i) => ({
    name: String(i.name || "").trim(),
    kind: val(i, AUTH_COLS.kind),
    code: val(i, AUTH_COLS.code),
    active: val(i, AUTH_COLS.active) === "v",
    role: val(i, AUTH_COLS.role),
    viewOnly: val(i, AUTH_COLS.viewOnly) === "v",
  }))
  /* ⚠ חניכים מסוננים: אין להם קוד, יש להם סיסמה מגובבת */
  .filter((x) => x.name && x.kind !== KIND.trainee)
  .filter((x) => !filter || x.name.includes(filter));

if (!rows.length) {
  console.log(filter ? `\nלא נמצא איש צוות בשם "${filter}"\n` : "\nאין שורות צוות בלוח\n");
  process.exit(0);
}

const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - String(s).length));
console.log("\n" + pad("שם", 22) + pad("סוג", 12) + pad("תפקיד", 12) + pad("קוד", 14) + "מצב");
console.log("─".repeat(72));
for (const x of rows) {
  const state = [
    x.active ? "פעיל" : "כבוי",
    x.viewOnly ? "צפייה בלבד" : "",
    x.role === STAFF_ROLE.head ? "מכריע בבקשות" : "",
  ].filter(Boolean).join(" · ");
  console.log(pad(x.name, 22) + pad(x.kind, 12) + pad(x.role || "—", 12) + pad(x.code || "—", 14) + state);
}
console.log(`\n${rows.length} שורות. ⚠ הפלט מכיל קודי כניסה — לא להעתיק לצ׳אט.\n`);
