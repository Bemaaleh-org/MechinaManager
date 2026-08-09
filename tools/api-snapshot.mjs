/* ============================================================
   תיעוד חוזה נקודות הקצה — לפני ואחרי האיחוד
   ------------------------------------------------------------
   מריץ כל נקודת קצה בשלושה הקשרים — ללא סשן, כתורן, וכמנהל —
   ורושם חתימה יציבה: קוד HTTP, הודעת שגיאה, ומבנה התשובה.

   ⚠ ערכים משתנים (מזהים, חותמות זמן, מלאי) לא נרשמים — רק
     המבנה. אחרת כל ריצה הייתה נראית שונה והשוואה הייתה חסרת ערך.

   ⚠ בקשות POST נשלחות עם גוף ריק כדי לתעד את מסלול האימות
     ולא לשנות נתונים. שני חריגים אידמפוטנטיים מסומנים למטה.

   הרצה:
     node --env-file=.env tools/api-snapshot.mjs <קובץ-פלט>

   להשוואת סביבת פרודקשן, להריץ מול שרת שהופעל עם VERCEL=1.
   ============================================================ */

import fs from "node:fs";
import { authRows } from "../api/_session.js";

const BASE = "http://localhost:5173";
const OUT = process.argv[2] || "tools/snapshot.txt";

/* ---------- כלים ---------- */
const jar = {};
async function call(path, { method = "GET", body, as = null } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (as && jar[as]) headers.Cookie = jar[as];

  const r = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = r.headers.get("set-cookie");
  if (set && as) jar[as] = set.split(";")[0];

  let data = null;
  try { data = await r.json(); } catch { data = "(לא JSON)"; }
  return { status: r.status, data };
}

/** חתימת מבנה — מפתחות וסוגים, בלי ערכים */
function shape(v, depth = 0) {
  if (v === null) return "null";
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return `[${v.length}× ${depth > 1 ? "…" : shape(v[0], depth + 1)}]`;
  }
  if (typeof v === "object") {
    const keys = Object.keys(v).sort();
    if (depth > 1) return `{${keys.join(",")}}`;
    return `{ ${keys.map((k) => `${k}:${shape(v[k], depth + 1)}`).join(", ")} }`;
  }
  return typeof v;
}

/** מה שנרשם לתיעוד: קוד, שגיאה מילולית, ומבנה */
function signature({ status, data }) {
  if (data && typeof data === "object" && data.error) {
    return `${status}  שגיאה: "${data.error}"`;
  }
  return `${status}  ${shape(data)}`;
}

/* ---------- נקודות הקצה ---------- */
/* body: undefined = GET. אובייקט = POST.
   note: הערה שנרשמת לתיעוד. */
const ENDPOINTS = [
  { p: "/api/catalog" },
  { p: "/api/lists" },
  { p: "/api/moves" },
  { p: "/api/users" },
  { p: "/api/duty-today" },
  { p: "/api/duty-week" },
  { p: "/api/tasks-today" },
  { p: "/api/tasks-summary" },

  { p: "/api/login", body: {}, note: "בלי קוד" },
  { p: "/api/logout", body: {} },
  { p: "/api/me", body: {}, note: "בלי שם" },

  { p: "/api/moves", body: {}, note: "בלי סוג תנועה" },
  { p: "/api/move-cancel", body: {}, note: "בלי מזהה" },
  { p: "/api/count", body: {}, note: "בלי ספירות" },
  { p: "/api/list-create", body: {}, note: "בלי ספק" },
  { p: "/api/list-row", body: {}, note: "בלי פעולה" },
  { p: "/api/list-status", body: {}, note: "בלי רשימה" },
  { p: "/api/list-receive", body: {}, note: "בלי רשימה" },
  { p: "/api/task-toggle", body: {}, note: "בלי משימה" },
  { p: "/api/lists-sync", body: {}, note: "⚠ אידמפוטנטי — מסנכרן בפועל" },
  { p: "/api/tasks-week", body: {}, note: "⚠ אידמפוטנטי — השבוע כבר קיים" },
];

/* ---------- הרצה ---------- */
const lines = [];
const say = (s = "") => { lines.push(s); console.log(s); };

const rows = await authRows({ force: true });
const sharedCode = rows.find((r) => r.kind === "קוד משותף").code;
const managerCode = rows.find((r) => r.kind === "מנהל").code;

say("=".repeat(78));
say("תיעוד חוזה נקודות הקצה");
say(`סביבה: ${process.env.VERCEL ? `VERCEL (${process.env.VERCEL_ENV || "?"})` : "פיתוח מקומי"}`);
say("=".repeat(78));

/* --- כניסה --- */
say("\n### כניסה");
const t1 = await call("/api/login", { method: "POST", body: { code: sharedCode }, as: "trainee" });
say(`  תורן  — קוד משותף        ${signature(t1)}`);
const roster = t1.data.roster || [];
if (roster.length) {
  const pick = await call("/api/me", { method: "POST", body: { name: roster[0].name }, as: "trainee" });
  say(`  תורן  — בחירת שם         ${signature(pick)}`);
}
const m1 = await call("/api/login", { method: "POST", body: { code: managerCode }, as: "manager" });
say(`  מנהל  — קוד אישי         ${signature(m1)}`);
const bad = await call("/api/login", { method: "POST", body: { code: "___שגוי___" } });
say(`  קוד שגוי                 ${signature(bad)}`);

/* --- כל נקודת קצה בשלושה הקשרים --- */
for (const label of ["ללא סשן", "תורן", "מנהל"]) {
  const as = label === "ללא סשן" ? null : label === "תורן" ? "trainee" : "manager";
  say(`\n### ${label}`);
  for (const e of ENDPOINTS) {
    if (as === null && (e.p === "/api/login" || e.p === "/api/logout")) continue;
    if (as && (e.p === "/api/login" || e.p === "/api/logout")) continue; // לא לנתק את הסשן
    const method = e.body === undefined ? "GET" : "POST";
    const r = await call(e.p, { method, body: e.body, as });
    const tag = `${method} ${e.p}${e.note ? ` (${e.note})` : ""}`;
    say(`  ${tag.padEnd(52)} ${signature(r)}`);
  }
}

/* --- סינון מחירים --- */
say("\n### סינון מחירים");
for (const [label, as] of [["תורן", "trainee"], ["מנהל", "manager"]]) {
  const c = await call("/api/catalog", { as });
  const l = await call("/api/lists", { as });
  const hasPrice = (c.data.products || []).some((p) => "price" in p);
  const hasCost = (l.data.lists || []).some((x) => "cost" in x);
  say(`  ${label.padEnd(6)} catalog.price=${hasPrice ? "קיים" : "מסונן"}   lists.cost=${hasCost ? "קיים" : "מסונן"}`);
}

/* --- פרמטר התאריך --- */
say("\n### פרמטר ?date=");
for (const [q, label] of [["", "ללא"], ["?date=2026-08-16", "תקין"], ["?date=2026-02-31", "פסול"]]) {
  for (const p of ["/api/tasks-today", "/api/duty-today", "/api/tasks-summary", "/api/duty-week"]) {
    const r = await call(p + q, { as: "manager" });
    const w = r.data && r.data.week;
    const tm = r.data && r.data.testMode;
    say(`  ${label.padEnd(6)} ${p.padEnd(22)} ${String(r.status).padEnd(4)} week=${String(w).padEnd(16)} testMode=${tm === true}`);
  }
}

say("\n" + "=".repeat(78));
fs.writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
console.log(`\nנשמר: ${OUT}  (${lines.length} שורות)`);
