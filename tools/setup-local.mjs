/* ============================================================
   הקמת עמדת פיתוח מקומית — התקנה ואבחון
   ------------------------------------------------------------
   מריצים פעם אחת אחרי שכפול המאגר, ושוב בכל פעם שמשהו לא עובד:

     node tools/setup-local.mjs

   מה הוא עושה:
     1. מוודא גרסת Node
     2. יוצר .env אם חסר, ומייצר SESSION_SECRET אקראי
     3. בודק שהטוקן של monday עובד ושכל הלוחות נגישים
     4. מוודא שיש זהות גיט ושהענף אינו main

   ⚠ הסקריפט לעולם אינו מדפיס את הטוקן ואינו כותב אותו לשום
     מקום מלבד .env, שחסום ב-.gitignore. הוא גם לא דורס ערך
     קיים — רק משלים מה שחסר.
   ============================================================ */

import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

import { AUTH_BOARD } from "../shared/auth-board.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { CONTAINER_BOARDS } from "../shared/container-boards.js";
import { KITCHEN_BOARDS } from "../shared/kitchen-ids.js";
import { PLACEMENT_BOARDS } from "../shared/placements-ids.js";

const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const step = (m) => console.log(`\n${m}`);

let blocked = false;

/* ---------- 1. גרסת Node ---------- */
step("1. גרסת Node");
const major = Number(process.versions.node.split(".")[0]);
if (major >= 20) ok(`Node ${process.versions.node}`);
else {
  bad(`Node ${process.versions.node} — נדרשת 20 ומעלה. nodejs.org`);
  blocked = true;
}

/* ---------- 2. קובץ הסודות ---------- */
step("2. קובץ .env");

/* פענוח פשוט של KEY=VALUE. לא משתמשים ב---env-file כי הקובץ
   עשוי עדיין לא להתקיים, ואז Node נופלת לפני שנספיק לעזור. */
const parse = (text) =>
  Object.fromEntries(
    text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return i < 0 ? null : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
      .filter(Boolean),
  );

if (!fs.existsSync(".env")) {
  fs.copyFileSync(".env.example", ".env");
  ok("נוצר .env מתוך .env.example");
}

let text = fs.readFileSync(".env", "utf8");
let env = parse(text);

if (!env.SESSION_SECRET) {
  const secret = crypto.randomBytes(48).toString("base64url");
  text = /^SESSION_SECRET=\s*$/m.test(text)
    ? text.replace(/^SESSION_SECRET=\s*$/m, `SESSION_SECRET=${secret}`)
    : `${text.replace(/\n*$/, "\n")}SESSION_SECRET=${secret}\n`;
  fs.writeFileSync(".env", text);
  env = parse(text);
  ok("נוצר SESSION_SECRET חדש");
} else if (env.SESSION_SECRET.length < 32) {
  bad("SESSION_SECRET קצר מ-32 תווים — למחוק את השורה ולהריץ שוב");
  blocked = true;
} else {
  ok("SESSION_SECRET קיים (שינוי שלו מנתק את כל המחוברים)");
}

if (!env.MONDAY_TOKEN) {
  warn("MONDAY_TOKEN ריק — הדביקו את הערך מרועי בשורה MONDAY_TOKEN= שב-.env");
  warn("הערך מגיע בערוץ פרטי בלבד. לא במייל, לא בצ׳אט, לא בקומיט.");
  blocked = true;
} else {
  ok("MONDAY_TOKEN מוגדר");
}

/* ---------- 3. חיבור ללוחות ---------- */
step("3. חיבור ל-monday");
if (!env.MONDAY_TOKEN) {
  warn("דילוג — אין טוקן");
} else {
  process.env.MONDAY_TOKEN = env.MONDAY_TOKEN;
  const { gql } = await import("../api/_monday.js");

  /* ⚠ לוחות מחוללים (מטבח, שיבוצים) נבדקים רק אם הוקמו —
     מזהה ריק פירושו שסקריפט ההקמה שלהם עוד לא רץ, וזו אינה
     תקלה של העמדה. */
  const boards = {
    auth: AUTH_BOARD,
    ...LESSON_BOARDS,
    ...MECHINA_BOARDS,
    ...CONTAINER_BOARDS,
    ...Object.fromEntries(Object.entries({
      kitchenEquip: KITCHEN_BOARDS.equipment,
      kitchenShop: KITCHEN_BOARDS.shopping,
      placeDefs: PLACEMENT_BOARDS.definitions,
      placeAsgn: PLACEMENT_BOARDS.assignments,
    }).filter(([, id]) => id)),
  };

  try {
    const me = await gql("{ me { name } }");
    ok(`מחובר כ-${me.me.name}`);

    const ids = Object.values(boards);
    const data = await gql(`{ boards(ids:[${ids.join(",")}]) { id name } }`);
    const found = new Set(data.boards.map((b) => String(b.id)));
    const missing = Object.entries(boards).filter(([, id]) => !found.has(String(id)));

    if (missing.length === 0) ok(`כל ${ids.length} הלוחות נגישים`);
    else {
      missing.forEach(([key, id]) => bad(`לוח לא נגיש: ${key} (${id})`));
      warn("הטוקן תקף אך חסרה לו הרשאה ללוחות האלה — לבדוק מול רועי");
      blocked = true;
    }
  } catch (e) {
    bad(e.message);
    warn("טוקן שגוי, פג תוקף, או חסימת רשת. מסך הכניסה יראה 'ההתחברות נכשלה'.");
    blocked = true;
  }
}

/* ---------- 4. גיט ---------- */
step("4. גיט");
const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};

const branch = git("rev-parse --abbrev-ref HEAD");
if (branch === "main") {
  bad("אתם על main — הענף שרץ במטבח. git checkout lessons");
  blocked = true;
} else ok(`ענף: ${branch}`);

if (git("config user.email")) ok(`זהות: ${git("config user.name")} <${git("config user.email")}>`);
else {
  warn('חסרה זהות גיט:  git config user.name "..."  &&  git config user.email "..."');
}

/* ---------- סיכום ---------- */
step(blocked ? "לא מוכן — לטפל בסימונים למעלה ולהריץ שוב." : "מוכן. להרצה:  npm run dev");
console.log("");
process.exit(blocked ? 1 : 0);
