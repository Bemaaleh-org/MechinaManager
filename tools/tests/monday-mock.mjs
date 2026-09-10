/* ============================================================
   monday מזויף — לבדיקה יבשה של סקריפטי ההקמה
   ------------------------------------------------------------
   מחליף את api/_monday.js בעותק זמני של המאגר, ומדמה את
   שמונה הפעולות שסקריפטי ה-seed באמת שולחים.

   ⚠ **המצב נשמר בקובץ ולא בזיכרון.** setup-boards מריץ כל
     סקריפט כתהליך נפרד, ולכן לוח שנוצר בשלב 3 חייב להימצא
     בשלב 9. משתנה מודול היה נעלם בין התהליכים, וכל שלב היה
     מוצא לוח ריק — כלומר הבדיקה הייתה "עוברת" בלי לבדוק
     אידמפוטנטיות בכלל.

   ⚠ **זה אינו מדמה את הסמנטיקה של monday** — לא תוויות
     כפולות, לא מפתח 5, ולא הרשאות. הוא בודק את מה שאפשר
     לבדוק בלי רשת: שהשאילתות תקינות, שהמשתנים מגיעים, שקבצי
     המזהים נכתבים ונטענים, ושהרצה חוזרת אינה יוצרת כפילות.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
/* ⚠⚠ **הנתיב יחסי למקום שבו הקובץ הזה **רץ**, לא למקום שבו
   הוא יושב.** seed-dry מעתיק אותו אל `api/_monday.js` שבעותק
   הזמני, ולכן `../tools/…` ולא `../…`. נתיב שנראה נכון בעץ
   המקור הפיל כאן את **כל** חמישה־עשר הסקריפטים בבת אחת. */
import COLOR_MAP from "../tools/monday-colors.json" with { type: "json" };

/* ⚠ **enum → var_name, ההפך של הטבלה.** monday מחזירה ב-
   `settings_str` את השם הישן ("green-shadow") ומקבלת ב-API את
   שם ה-enum ("done_green"), ואין ביניהם כלל המרה (4כד). סקריפט
   שכותב רשימת תוויות **קורא** את הצבעים הקיימים כדי להחזיר
   אותם כמות שהם — ולכן מוק שאינו מחזיר `labels_colors` מפיל
   אותו בהרצה השנייה על "אין מיפוי לצבע", שהיא תקלה של המוק
   ולא של הסקריפט. */
const VAR_OF = Object.fromEntries(Object.entries(COLOR_MAP).map(([v, e]) => [e, v]));
const VAR_POOL = Object.keys(COLOR_MAP);
const colorEntry = (enumName, i) => {
  const varName = VAR_OF[enumName] || VAR_POOL[i % VAR_POOL.length];
  return { color: "#000000", border: "#000000", var_name: varName };
};

/* ⚠ **לא זורקים בטעינת המודול.** הנתבים מייבאים את הקובץ הזה
   רק כדי לוודא שהשרשרת נטענת, ובלי לקרוא לו. זריקה בטעינה
   הייתה מפילה את כולם ומדווחת על באג שאינו קיים. */
const FILE = process.env.MONDAY_MOCK;
const need = () => {
  if (!FILE) throw new Error("MONDAY_MOCK לא הוגדר — זהו מוק בדיקה בלבד");
  return FILE;
};

const load = () => (existsSync(need()) ? JSON.parse(readFileSync(FILE, "utf8")) : { boards: {}, seq: 1000, calls: [] });
const save = (s) => writeFileSync(need(), JSON.stringify(s, null, 2), "utf8");
const next = (s) => String(++s.seq);

/* לוח שנשאל עליו לפי מזהה ואינו קיים — נוצר. הסקריפטים של
   העמודות (ערר, ימי חופש, חד״א, תוכן המפגשים) פונים ללוחות
   שכבר קיימים אצל המכינה. */
function board(s, id, name) {
  const k = String(id);
  if (!s.boards[k]) s.boards[k] = { id: k, name: name || "לוח קיים " + k, columns: [], items: [] };
  return s.boards[k];
}

/** מוסיף `labels_colors` ל-defaults של עמודת סטטוס, כמו monday. */
function withColors(defaults) {
  let d;
  try { d = JSON.parse(defaults); } catch { return defaults; }
  if (!d || !d.labels) return defaults;
  const colors = {};
  Object.keys(d.labels).forEach((k, i) => { colors[k] = colorEntry(null, i); });
  return JSON.stringify({ ...d, labels_colors: colors, deactivated_labels: [] });
}

const asItem = (it) => ({
  id: it.id, name: it.name,
  column_values: Object.entries(it.values || {}).map(([id, v]) => ({
    id, text: typeof v === "string" ? v : JSON.stringify(v), value: JSON.stringify(v ?? null),
  })),
});

export async function gql(query, vars = {}) {
  const s = load();
  const q = String(query);
  const has = (re) => new RegExp(re).test(q);
  s.calls.push(q.replace(/\s+/g, " ").trim().slice(0, 120));

  try {
    if (has("\\bme\\s*\\{")) return { me: { id: "1", name: "mock" } };

    if (has("create_board")) {
      const b = { id: next(s), name: String(vars.n || vars.name || "לוח"), columns: [], items: [] };
      /* ⚠ monday יוצרת כל לוח חדש עם שורות דמה (5יב). */
      b.items = ["Task 1", "Task 2", "Task 3"].map((n) => ({ id: next(s), name: n, values: {} }));
      s.boards[b.id] = b;
      return { create_board: { id: b.id } };
    }

    if (has("create_column")) {
      const b = board(s, vars.b);
      const title = String(vars.t);
      /* ⚠ הטיפוס עשוי לבוא כמשתנה ($c) או כליטרל בשאילתה. */
      const lit = q.match(/column_type:\s*([a-z_]+)\b/);
      const type = vars.c || (lit && lit[1] !== "$c" ? lit[1] : "text");
      const dup = b.columns.find((c) => c.title === title);
      if (dup) return { create_column: { id: dup.id } };
      const col = { id: type + "_mk" + next(s), title, type,
        settings_str: withColors(String(vars.s || "{}")), revision: "1" };
      b.columns.push(col);
      return { create_column: { id: col.id } };
    }

    if (has("create_item")) {
      const b = board(s, vars.b);
      const it = { id: next(s), name: String(vars.n), values: JSON.parse(vars.v || "{}") };
      b.items.push(it);
      return { create_item: { id: it.id } };
    }

    if (has("change_multiple_column_values")) {
      const b = board(s, vars.b);
      const it = b.items.find((x) => String(x.id) === String(vars.i));
      if (it) Object.assign(it.values, JSON.parse(vars.v || "{}"));
      return { change_multiple_column_values: { id: String(vars.i) } };
    }

    if (has("delete_item")) {
      for (const b of Object.values(s.boards)) b.items = b.items.filter((x) => String(x.id) !== String(vars.i));
      return { delete_item: { id: String(vars.i) } };
    }

    /* ⚠ **מיושם ולא מחזיר "בסדר" בלבד.** `update_status_column`
       דורס את כל הרשימה, וזו בדיוק הפעולה שאסור לה למחוק
       תווית בשימוש (5ו). מוק שרק מאשר אותה אינו יכול לבדוק
       שהרצה חוזרת אינה מכפילה תווית ואינה מאבדת אחת.
       ⚠ הקצאת המפתחות כאן אינה זו של monday (שנותנת תמיד את
         הפנוי הנמוך ביותר) — רק מדלגת על 5, כמו שהמאגר דורש. */
    if (has("update_status_column")) {
      const b = board(s, vars.b);
      const col = b.columns.find((c) => String(c.id) === String(vars.c));
      if (col) {
        const list = (vars.s && vars.s.labels) || [];
        const used = new Set(list.filter((l) => l.id != null).map((l) => String(l.id)));
        let n = 0;
        const alloc = () => {
          do { n++; } while (n === 5 || used.has(String(n)));
          used.add(String(n));
          return String(n);
        };
        const lbl = {}, colors = {}, off = [];
        list.forEach((l, i) => {
          const k = l.id != null ? String(l.id) : alloc();
          lbl[k] = String(l.label);
          colors[k] = colorEntry(l.color, i);
          if (l.is_deactivated) off.push(Number(k));
        });
        col.settings_str = JSON.stringify({ labels: lbl, labels_colors: colors, deactivated_labels: off });
        col.revision = String(Number(col.revision || 1) + 1);
      }
      return { update_status_column: { id: String(vars.c || "") } };
    }

    if (has("boards\\(limit")) {
      return { boards: Object.values(s.boards).map((b) => ({ id: b.id, name: b.name })) };
    }

    if (has("boards\\(ids")) {
      const ids = (Array.isArray(vars.b) ? vars.b : [vars.b]).map(String);
      return {
        boards: ids.map((id) => {
          const b = board(s, id);
          const out = { id: b.id, name: b.name };
          if (has("columns")) {
            out.columns = b.columns.map((c) => ({
              id: c.id, title: c.title, type: c.type, settings_str: c.settings_str,
              /* ⚠ `revision` הוא נעילת גרסה ואינו יושב ב-settings_str
                 (4כד) — מי שכותב רשימת תוויות חייב לשאול אותו. */
              revision: c.revision || "1",
            }));
          }
          if (has("items_page")) out.items_page = { cursor: null, items: b.items.map(asItem) };
          return out;
        }),
      };
    }

    throw new Error("המוק אינו מכיר את השאילתה: " + q.replace(/\s+/g, " ").trim().slice(0, 90));
  } finally { save(s); }
}

export async function allItems(boardId) {
  const s = load();
  return board(s, boardId).items.map(asItem);
}

/* ⚠ **החתימה זהה ל-api/_monday.js.** ייצוא חסר נופל בטעינת
   הנתב ונראה בדיוק כמו באג במאגר — קרה כאן עם uploadFile. */
export async function uploadFile(itemId, columnId, fileName) {
  return { add_file_to_column: { id: "mock-file", name: String(fileName || "") } };
}

export default { gql, allItems, uploadFile };
