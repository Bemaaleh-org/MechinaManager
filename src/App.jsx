import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { CSS } from "./styles.js";
import { LOGO } from "./logo.js";
import { storage } from "./storage.js";
import { api, setUnauthorizedHandler } from "./api.js";
import Login from "./Login.jsx";
import { testDate } from "./testDate.js";
/* ============================================================
   מערכת ניהול מלאי — מטבח המכינה
   פרוטוטייפ עובד. נתונים נשמרים ומשותפים לכל מי שפותח את האפליקציה.
   ============================================================ */

/* ---------- icons ---------- */
const I = {
  home: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  day: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  count: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>,
  cart: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>,
  gear: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="6" rx="1.6"/><rect x="3" y="14" width="18" height="6" rx="1.6"/><path d="M7 7h.01M7 17h.01"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  x: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  clock: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/></svg>,
  download: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  edit: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
};

/* ---------- data ---------- */
const UNITS = { kg: "ק״ג", liter: "ליטר", unit: "יח׳" };
const CATS = ["בשר ועוף", "חלב וביצים", "ירקות ופירות", "לחם ומאפים", "יבשים", "שימורים ורטבים", "תבלינים ומשקאות", "חד״פ וניקיון"];
const SUPPLIERS = { super: "סופר – שבועי", wholesale: "סיטונאי – דו‑חודשי" };
const REASONS = ["רקוב", "פג תוקף", "עודף מבושל", "נשפך / נפגם", "אחר"];

let _sid = 0;
const P = (name, cat, unit, tracking, exp, min, target, sup, price, stock) =>
  ({ id: "p" + (++_sid), name, cat, unit, tracking, exp, min, target, sup, price, stock, order: _sid, expiryFlag: null, pending: false });

const SEED_PRODUCTS = [
  P("חזה עוף","בשר ועוף","kg","daily",1,10,40,"wholesale",38,22),
  P("שניצל עוף","בשר ועוף","kg","daily",1,8,30,"wholesale",42,15),
  P("בשר טחון","בשר ועוף","kg","daily",1,6,20,"wholesale",55,4),
  P("נקניקיות","בשר ועוף","kg","daily",1,4,12,"wholesale",35,5),
  P("חלב 3%","חלב וביצים","liter","daily",1,12,40,"super",6.5,9),
  P("גבינה לבנה 5%","חלב וביצים","kg","daily",1,3,10,"super",25,4),
  P("קוטג׳","חלב וביצים","unit","daily",1,10,30,"super",7,12),
  P("גבינה צהובה","חלב וביצים","kg","daily",1,3,10,"super",60,3.5),
  P("שמנת חמוצה","חלב וביצים","unit","daily",1,6,18,"super",6.5,7),
  P("לבנה","חלב וביצים","kg","daily",1,2,8,"super",30,2),
  P("ביצים","חלב וביצים","unit","daily",1,60,240,"super",1.2,90),
  P("עגבניות","ירקות ופירות","kg","daily",1,8,25,"super",8,11),
  P("מלפפונים","ירקות ופירות","kg","daily",1,8,25,"super",7,9),
  P("בצל","ירקות ופירות","kg","daily",0,6,20,"super",5,14),
  P("גזר","ירקות ופירות","kg","daily",0,5,15,"super",5,6),
  P("פלפל אדום","ירקות ופירות","kg","daily",1,4,12,"super",12,5),
  P("חסה","ירקות ופירות","unit","daily",1,6,20,"super",6,8),
  P("כרוב","ירקות ופירות","kg","daily",0,4,12,"super",5,5),
  P("תפוחי אדמה","ירקות ופירות","kg","daily",0,10,30,"super",5,16),
  P("לימון","ירקות ופירות","kg","daily",0,2,8,"super",10,3),
  P("פטרוזיליה","ירקות ופירות","unit","daily",1,3,10,"super",4,4),
  P("בננות","ירקות ופירות","kg","daily",1,6,20,"super",9,7),
  P("תפוחים","ירקות ופירות","kg","daily",0,6,20,"super",10,8),
  P("תפוזים","ירקות ופירות","kg","daily",0,6,20,"super",7,9),
  P("לחם פרוס","לחם ומאפים","unit","daily",1,6,20,"super",8,4),
  P("פיתות","לחם ומאפים","unit","daily",1,5,18,"super",10,6),
  P("חלה","לחם ומאפים","unit","daily",1,4,12,"super",12,0),
  P("אורז","יבשים","kg","weekly",0,10,40,"wholesale",8,8),
  P("פסטה","יבשים","kg","weekly",0,8,30,"wholesale",7,17),
  P("קוסקוס","יבשים","kg","weekly",0,6,20,"wholesale",9,11),
  P("בורגול","יבשים","kg","weekly",0,4,12,"wholesale",8,6),
  P("עדשים","יבשים","kg","weekly",0,4,12,"wholesale",10,7),
  P("חומוס יבש","יבשים","kg","weekly",0,4,12,"wholesale",10,5),
  P("שעועית יבשה","יבשים","kg","weekly",0,3,10,"wholesale",12,4),
  P("קמח","יבשים","kg","weekly",0,8,25,"wholesale",5,12),
  P("סוכר","יבשים","kg","weekly",0,6,20,"wholesale",6,9),
  P("מלח","יבשים","kg","weekly",0,2,8,"wholesale",3,3),
  P("שמן קנולה","יבשים","liter","weekly",0,6,20,"wholesale",12,8),
  P("שמן זית","יבשים","liter","weekly",0,2,6,"wholesale",45,2.5),
  P("חומץ","יבשים","liter","weekly",0,1,4,"wholesale",8,2),
  P("רסק עגבניות","שימורים ורטבים","unit","weekly",0,10,30,"wholesale",6,14),
  P("תירס משומר","שימורים ורטבים","unit","weekly",0,8,24,"wholesale",6,10),
  P("טונה","שימורים ורטבים","unit","weekly",0,12,40,"wholesale",8,9),
  P("זיתים","שימורים ורטבים","unit","weekly",0,4,12,"wholesale",12,6),
  P("מלפפון חמוץ","שימורים ורטבים","unit","weekly",0,4,12,"wholesale",10,5),
  P("קטשופ","שימורים ורטבים","unit","weekly",0,3,10,"wholesale",12,4),
  P("מיונז","שימורים ורטבים","unit","weekly",0,3,10,"wholesale",15,4),
  P("חרדל","שימורים ורטבים","unit","weekly",0,1,4,"wholesale",10,2),
  P("טחינה גולמית","שימורים ורטבים","kg","weekly",0,3,10,"wholesale",22,4),
  P("פפריקה","תבלינים ומשקאות","kg","weekly",0,.5,2,"wholesale",40,.8),
  P("כמון","תבלינים ומשקאות","kg","weekly",0,.4,1.5,"wholesale",45,.6),
  P("פלפל שחור","תבלינים ומשקאות","kg","weekly",0,.3,1.2,"wholesale",60,.5),
  P("אבקת מרק","תבלינים ומשקאות","kg","weekly",0,1,4,"wholesale",30,1.5),
  P("אורגנו","תבלינים ומשקאות","kg","weekly",0,.2,1,"wholesale",50,.3),
  P("קפה נמס","תבלינים ומשקאות","kg","weekly",0,1,4,"wholesale",90,1.6),
  P("תה","תבלינים ומשקאות","unit","weekly",0,4,12,"wholesale",15,5),
  P("צלחות חד״פ","חד״פ וניקיון","unit","weekly",0,200,800,"wholesale",.4,320),
  P("כוסות חד״פ","חד״פ וניקיון","unit","weekly",0,300,1200,"wholesale",.2,450),
  P("סכו״ם חד״פ","חד״פ וניקיון","unit","weekly",0,200,800,"wholesale",.3,280),
  P("מגבות נייר","חד״פ וניקיון","unit","weekly",0,6,24,"wholesale",8,9),
  P("שקיות אשפה","חד״פ וניקיון","unit","weekly",0,4,16,"wholesale",15,6),
  P("סבון כלים","חד״פ וניקיון","liter","weekly",0,3,10,"wholesale",12,4),
  P("אקונומיקה","חד״פ וניקיון","liter","weekly",0,3,10,"wholesale",8,5),
  P("כפפות חד״פ","חד״פ וניקיון","unit","weekly",0,3,10,"wholesale",20,4),
];

// Demo: mark a couple of fresh items as "use within 3 days" so the trainee sees
// the immediate-use state on the home screen exactly as it would appear in the morning.
["גבינה לבנה 5%", "קוטג׳"].forEach((name) => {
  const p = SEED_PRODUCTS.find((x) => x.name === name);
  if (p) p.expiryFlag = "soon";
});

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/* ---------- helpers ---------- */
const KEY = "mechina-kitchen-v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const dkey = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
const sameDay = (ts, d = new Date()) => dkey(ts) === dkey(d);
const nfmt = (n) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(r * 10 % 1 === 0 ? 1 : 2);
};
const shek = (n) => "₪" + Math.round(n).toLocaleString("he-IL");
const stepOf = (u) => (u === "unit" ? 1 : 0.5);
const hebDate = (d = new Date()) =>
  DAYS[d.getDay()] + ", " + d.getDate() + " ב" + ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][d.getMonth()];

const normHe = (s) =>
  (s || "").trim().replace(/[ְ-ׇ]/g, "")
    .replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ץ/g,"צ").replace(/ף/g,"פ").replace(/ך/g,"כ")
    .replace(/[׳'"״.,\-]/g, "").replace(/\s+/g, " ").toLowerCase();

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function similar(a, b) {
  const x = normHe(a), y = normHe(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;
  return 1 - lev(x, y) / Math.max(x.length, y.length);
}
function findSimilar(name, products, exclude) {
  return products
    .filter((p) => p.id !== exclude)
    .map((p) => ({ p, s: similar(name, p.name) }))
    .filter((r) => r.s >= 0.62)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
}

/* דיווח שבוטל נשאר ביומן כעקבה, אבל אסור שייכנס לשום חישוב —
   לא לצ'ק ליסט, לא לדוח ולא לאחוזי הפחת. */
const live = (moves) => (moves || []).filter((m) => !m.cancelled);

const weekStart = (d = new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; };

/* ---------- storage ---------- */
async function loadRemote() {
  try { const r = await storage.get(KEY); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function saveRemote(s) {
  try { await storage.set(KEY, JSON.stringify(s)); } catch {}
}

/* הצבירה האוטומטית של חוסרים לרשימות עברה לשרת (api/lists-sync.js).
   היא חייבת לרוץ במקום אחד: כשכל מכשיר הריץ אותה בעצמו, שני תורנים
   שפותחים את האפליקציה בו-זמנית היו יוצרים שתי רשימות כפולות לאותו ספק.

   הפונקציה נשארת כאן כמעבר שקוף, כדי שכל מקום שקרא לה ימשיך לעבוד
   בלי שינוי — הרשימות פשוט מגיעות מוכנות מ-monday. */
const syncLiveLists = (products, lists) => lists || [];

const freshState = () => {
  const products = SEED_PRODUCTS.map((p) => ({ ...p, stockStatus: p.stock < p.min ? "low" : "ok" }));
  return {
    v: 1,
    products,
    moves: [],
    lists: syncLiveLists(products, [], "אוטומטי"),
    countDraft: null,
    lastCountAt: null,
  };
};

/* ============================================================ */
/* ============================================================
   שער הכניסה
   ------------------------------------------------------------
   בודק מול השרת מי מחובר. אין סשן — מסך כניסה. השרת ניתק
   באמצע העבודה — חזרה למסך הכניסה עם ההסבר שהשרת נתן.

   הזהות מגיעה מהסשן בלבד — גם בשרת וגם על המסך. אין יותר
   רשימת משתמשים בקוד.
   ============================================================ */
export default function App() {
  const [auth, setAuth] = useState(undefined); // undefined=בודק, null=לא מחובר
  const [notice, setNotice] = useState(null);

  const check = useCallback(() => {
    api.me()
      .then((m) => { setAuth(m); setNotice(null); })
      .catch(() => setAuth(null));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((msg) => { setAuth(null); setNotice(msg); });
    check();
    return () => setUnauthorizedHandler(null);
  }, [check]);

  if (auth === undefined) {
    return (<><style>{CSS}</style><div className="kx">
      <div className="empty" style={{ paddingTop: 100 }}><div className="e1">רגע…</div></div>
    </div></>);
  }

  if (auth === null || auth.needsName) {
    return (<><style>{CSS}</style>
      <Login notice={notice} onDone={check} />
    </>);
  }

  return <Kitchen auth={auth} onSignedOut={() => { setAuth(null); setNotice("התנתקת בהצלחה."); }} />;
}

function Kitchen({ auth, onSignedOut }) {
  const [st, setSt] = useState(null);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const saveT = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await loadRemote();
      if (!live) return;
      if (r && r.products) {
        // migrate older saved state: ensure stockStatus + live draft lists exist
        // סימון התוקף מגיע עכשיו מ-monday. עזר התצוגה של הפרוטוטייפ הוסר:
        // הוא סימן "פחות מ-3 ימים" לפי שם מוצר, ומרגע שהמוצרים אמיתיים
        // זה היה מסמן להם תוקף שקרי.
        const products = r.products.map((p) => ({ ...p, stockStatus: p.stock < p.min ? "low" : "ok" }));
        setSt({ ...r, products, lists: syncLiveLists(products, r.lists || [], "אוטומטי") });
      } else {
        setSt(freshState());
      }
    })();
    return () => { live = false; };
  }, []);

  // Load SheetJS for real .xlsx export (falls back to CSV if it doesn't load)
  useEffect(() => {
    if (window.XLSX || document.getElementById("sheetjs-cdn")) return;
    const s = document.createElement("script");
    s.id = "sheetjs-cdn";
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!st) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => saveRemote(st), 450);
  }, [st]);

  const say = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2400); }, []);

  if (!st) return (<><style>{CSS}</style><div className="kx"><div className="empty" style={{ paddingTop: 100 }}><div className="e1">טוען מלאי…</div></div></div></>);

  /* הזהות מגיעה מהסשן בלבד. בורר המשתמשים הוסר — הוא נראה
     כאילו הוא מחליף זהות ולא החליף דבר מרגע שהאכיפה עברה לשרת. */
  const user = {
    id: auth.itemId || "session",
    name: auth.name || "תורן",
    role: auth.isManager ? "manager" : "trainee",
  };
  /* ⚠ התפקיד מגיע מהסשן בשרת, לא מבחירת המשתמש במסך. בחירת
     המשתמש נשארה לתצוגה עד שתוחלף בחלק הבא, אבל היא כבר לא
     קובעת מה מותר — לא כאן ובוודאי לא בשרת. */
  const isMgr = auth.isManager;
  const today = new Date();

  /* --- derived --- */
  const lowStock = st.products.filter((p) => !p.pending && p.stock < p.min);
  const soonList = st.products.filter((p) => p.expiryFlag === "soon");
  const pendingProducts = st.products.filter((p) => p.pending);
  const receiptDone = live(st.moves).some((m) => m.type === "receipt" && sameDay(m.ts));
  const eveningDone = live(st.moves).some((m) => (m.type === "usage" || m.type === "waste") && sameDay(m.ts));
  const countedThisWeek = st.lastCountAt && new Date(st.lastCountAt) >= weekStart();
  const isTue = today.getDay() === 2;
  const isWed = today.getDay() === 3;
  const afterSix = today.getHours() >= 18;
  const openLists = st.lists.filter((l) => l.status !== "purchased" && l.status !== "missed");
  const needsApproval = st.lists.filter((l) => l.status === "pending");

  const navBadge = lowStock.length + (isMgr ? needsApproval.length : 0);

  /* --- actions --- */
  /* כל שינוי מלאי עשוי להכניס מוצר לחוסר או להוציא אותו ממנו.
     השרת מעדכן את הרשימות החיות, ואנחנו מושכים את התוצאה.
     נכשל? הרשימות פשוט יישארו כפי שהן עד הטעינה הבאה. */
  const refreshLists = () => {
    api.syncLists()
      .then(() => api.getLists())
      .then((res) => setSt((s) => ({ ...s, lists: res.lists || [] })))
      .catch((e) => console.error("[lists] רענון נכשל:", e.message));
  };

  /* מתעדכן על המסך מיד, ונשלח ל-monday ברקע. אם השמירה נכשלת,
     המצב חוזר לקדמותו והתורן מקבל הודעה — עדיף מאשר מסך שמראה
     דיווח שלא נשמר באמת. */
  const commitMoves = (entries, type) => {
    const now = Date.now();
    const moves = entries.map((e) => ({
      id: uid(), pid: e.pid, type, qty: e.qty, reason: e.reason || null,
      user: user.name, uid: user.id, ts: now, saving: true,
    }));
    const tempIds = new Set(moves.map((m) => m.id));
    const snapshot = st;

    setSt((s) => {
      const products = s.products.map((p) => {
        const e = entries.find((x) => x.pid === p.id);
        if (!e) return p;
        const delta = type === "receipt" ? e.qty : -e.qty;
        const stock = Math.max(0, Math.round((p.stock + delta) * 100) / 100);
        return { ...p, stock, stockStatus: stock < p.min ? "low" : "ok" };
      });
      return { ...s, moves: [...s.moves, ...moves], products, lists: syncLiveLists(products, s.lists) };
    });

    api.commitMoves({ type, user: user.name, entries })
      .then((res) => {
        // מאמצים את מה שהשרת מדווח בפועל, לא את החישוב המקומי
        const byPid = Object.fromEntries((res.results || []).map((r) => [String(r.pid), r]));
        const realIds = (res.results || []).map((r) => r.moveId);
        let i = 0;
        setSt((s) => {
          const products = s.products.map((p) => {
            const r = byPid[String(p.id)];
            return r ? { ...p, stock: r.stockAfter, stockStatus: r.statusAfter } : p;
          });
          const movesFixed = s.moves.map((m) =>
            tempIds.has(m.id) ? { ...m, id: realIds[i++] || m.id, saving: false } : m);
          return { ...s, products, moves: movesFixed, lists: syncLiveLists(products, s.lists) };
        });
        refreshLists();
      })
      .catch((e) => {
        setSt(snapshot);
        say("הדיווח לא נשמר: " + e.message);
      });
  };

  /* ביטול דיווח: הדיווח מסומן כמבוטל ונשאר ביומן כעקבה, והמלאי מוחזר.
     כמו בדיווח — המסך מגיב מיד, ואם השמירה נכשלת חוזרים אחורה. */
  const undoMove = (moveId) => {
    const snapshot = st;
    setSt((s) => {
      const mv = s.moves.find((x) => x.id === moveId);
      if (!mv || mv.cancelled) return s;
      const products = s.products.map((p) => {
        if (p.id !== mv.pid) return p;
        // receipt added stock, so undo subtracts; usage/waste subtracted, so undo adds back
        const delta = mv.type === "receipt" ? -mv.qty : mv.qty;
        const stock = Math.max(0, Math.round((p.stock + delta) * 100) / 100);
        return { ...p, stock, stockStatus: stock < p.min ? "low" : "ok" };
      });
      const moves = s.moves.map((x) => (x.id === moveId ? { ...x, cancelled: true } : x));
      return { ...s, moves, products, lists: syncLiveLists(products, s.lists) };
    });

    api.cancelMove(moveId)
      .then((res) => {
        setSt((s) => {
          const products = s.products.map((p) =>
            String(p.id) === String(res.pid)
              ? { ...p, stock: res.stockAfter, stockStatus: res.statusAfter } : p);
          return { ...s, products, lists: syncLiveLists(products, s.lists) };
        });
        refreshLists();
      })
      .catch((e) => {
        setSt(snapshot);
        say("הביטול לא נשמר: " + e.message);
      });
  };

  const finishCount = (draft) => {
    const now = Date.now();
    const snapshot = st;

    // רק מוצרים שהוזנה להם כמות נחשבים כנספרים
    const entries = st.products
      .filter((p) => { const d = draft[p.id]; return d && d.qty !== "" && d.qty != null; })
      .map((p) => ({ pid: p.id, counted: Number(draft[p.id].qty), exp: p.exp ? draft[p.id].exp || null : null }));

    setSt((s) => {
      const moves = [];
      const products = s.products.map((p) => {
        const d = draft[p.id];
        if (!d || d.qty === "" || d.qty == null) return p;
        const counted = Number(d.qty);
        const diff = Math.round((counted - p.stock) * 100) / 100;
        if (diff !== 0) moves.push({ id: uid(), pid: p.id, type: "count", qty: diff, user: user.name, uid: user.id, ts: now, saving: true });
        return { ...p, stock: counted, stockStatus: counted < p.min ? "low" : "ok", expiryFlag: p.exp ? (d.exp || null) : null };
      });
      return { ...s, products, moves: [...s.moves, ...moves], lists: syncLiveLists(products, s.lists), lastCountAt: now, countDraft: null };
    });

    if (!entries.length) return;

    api.finishCount({ user: user.name, entries })
      .then((res) => {
        // מאמצים את מה שהשרת קבע בפועל
        const byPid = Object.fromEntries((res.results || []).map((r) => [String(r.pid), r]));
        setSt((s) => {
          const products = s.products.map((p) => {
            const r = byPid[String(p.id)];
            return r ? { ...p, stock: r.stockAfter, stockStatus: r.statusAfter, expiryFlag: r.expiryFlag } : p;
          });
          return { ...s, products, lists: syncLiveLists(products, s.lists), lastCountAt: res.ts };
        });
        refreshLists();
      })
      .catch((e) => {
        setSt(snapshot);
        say("הספירה לא נשמרה: " + e.message);
      });
  };

  // Opens (or focuses) the live draft list for a supplier. Never creates duplicates.
  /* פותח את רשימת הטיוטה של הספק. קיימת — מחזיר אותה מיד;
     לא קיימת — השרת יוצר אחת, כי רשימה מקומית עם מזהה מומצא
     לא הייתה קיימת ב-monday ושום שורה לא הייתה נשמרת אליה. */
  const makeList = (sup) => {
    const draft = st.lists.find((l) => l.sup === sup && l.status === "draft");
    if (draft) return Promise.resolve(draft.id);

    return api.createList({ sup, user })
      .then((res) => api.getLists().then((r) => {
        setSt((s) => ({ ...s, lists: r.lists || [] }));
        return res.listId;
      }))
      .catch((e) => { say("לא ניתן לפתוח רשימה: " + e.message); return null; });
  };

  const patchLocal = (id, patch) =>
    setSt((s) => ({ ...s, lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  /* מעבר סטטוס: המסך מגיב מיד, השרת מכריע. הוא אוכף מי רשאי
     ואילו מעברים חוקיים, ולכן דחייה משם מחזירה את המצב אחורה. */
  const setListStatus = (id, to) => {
    const snapshot = st;
    const stamp =
      to === "approved" ? { approvedBy: user.name, approvedAt: Date.now() }
      : to === "draft" ? { approvedBy: null, approvedAt: null }
      : {};
    patchLocal(id, { status: to, ...stamp });

    api.setListStatus({ listId: id, to, user })
      .then(() => refreshLists())
      .catch((e) => {
        setSt(snapshot);
        say(e.message);
      });
  };

  /* patchList נשאר הדלת היחידה לשינוי רשימה, כדי שכל מקום
     שקרא לו ימשיך לעבוד. שינוי סטטוס מנותב לשרת; "נקנה" עדיין
     מקומי עד שקבלת הסחורה תחובר. */
  const patchList = (id, patch) => {
    if (patch.status && patch.status !== "purchased") return setListStatus(id, patch.status);
    patchLocal(id, patch);
  };

  /* עריכה ידנית של שורה. שלוש הפעולות עוברות דרך אותו נתיב:
     עדכון אופטימי, קריאה לשרת, ורענון מהמקור. */
  const editRow = (body, optimistic) => {
    const snapshot = st;
    if (optimistic) setSt(optimistic);
    api.editRow(body)
      .then(() => refreshLists())
      .catch((e) => {
        setSt(snapshot);
        say(e.message);
      });
  };

  const rowSetQty = (list, it, qty) =>
    editRow({ action: "setQty", rowId: it.rowId, qty }, (s) => ({
      ...s,
      lists: s.lists.map((l) => (l.id === list.id
        ? { ...l, items: l.items.map((x) => (x.rowId === it.rowId ? { ...x, qty } : x)) } : l)),
    }));

  const rowRemove = (list, it) =>
    editRow({ action: "remove", rowId: it.rowId }, (s) => ({
      ...s,
      lists: s.lists.map((l) => (l.id === list.id
        ? { ...l, items: l.items.filter((x) => x.rowId !== it.rowId) } : l)),
    }));

  const rowAdd = (listId, product, qty) =>
    editRow({ action: "add", listId, pid: product.id, qty }, (s) => ({
      ...s,
      lists: s.lists.map((l) => (l.id === listId
        ? { ...l, items: [...l.items, { pid: product.id, qty, got: null, auto: false }] } : l)),
    }));

  /* מושך מחדש את שלושת המקורות מ-monday. משמש אחרי פעולה
     שנוגעת ביותר מלוח אחד, כמו קבלת סחורה. */
  const refreshAll = () =>
    Promise.all([api.getCatalog(), api.getMoves(), api.getLists()])
      .then(([c, m, l]) =>
        setSt((s) => ({ ...s, products: c.products || s.products, moves: m.moves || s.moves, lists: l.lists || s.lists })));

  /* קבלת סחורה. המסך שולח כמויות לפי מוצר, והשרת עובד לפי שורה —
     ולכן ההמרה כאן. שורה בלי ערך נחשבת כאילו הגיעה במלואה, כי כך
     המסך מאתחל אותה. */
  const receiveList = (list, received) => {
    const snapshot = st;
    const byRow = {};
    for (const it of list.items) {
      const raw = received[it.pid];
      byRow[it.rowId] = raw === "" || raw === undefined || raw === null ? it.qty : Number(raw);
    }

    patchLocal(list.id, { status: "purchased", purchasedAt: Date.now() });

    api.receiveList({ listId: list.id, user, received: byRow })
      .then(() => refreshAll())
      .then(() => say("המלאי עודכן לפי מה שהגיע"))
      .catch((e) => {
        setSt(snapshot);
        say("הקבלה לא נשמרה: " + e.message);
      });
  };

  const upsertProduct = (p) =>
    setSt((s) => {
      const ex = s.products.some((x) => x.id === p.id);
      return { ...s, products: ex ? s.products.map((x) => (x.id === p.id ? p : x)) : [...s.products, p] };
    });

  const ctx = { st, setSt, user, isMgr, say, setModal, auth, onSignedOut, commitMoves, undoMove, finishCount, makeList, patchList, receiveList,
    rowSetQty, rowRemove, rowAdd,
    upsertProduct, lowStock, soonList, pendingProducts, receiptDone, eveningDone, countedThisWeek, isTue, isWed,
    afterSix, needsApproval, openLists, setTab };

  return (
    <>
      <style>{CSS}</style>
      <div className="kx">
        <header className="top">
          <div className="top-row">
            <div>
              <h1>מטבח המכינה</h1>
              <div className="sub">{hebDate(today)}</div>
            </div>
            <div className="brand-coin" aria-label="במעלה הדרך">
              <img src={LOGO} alt="לוגו במעלה הדרך" />
            </div>
            <button className="who" onClick={() => setModal({ t: "user" })}>
              <span className="dot" />{user.name.split(" ")[0]}
            </button>
          </div>
        </header>

        <main className="wrap">
          {tab === "home" && <Home ctx={ctx} />}
          {tab === "daily" && <Daily ctx={ctx} modes={["usage", "waste"]} title="שימוש במצרכים" />}
          {tab === "receive" && <Receive ctx={ctx} />}
          {tab === "count" && <Count ctx={ctx} />}
          {tab === "shop" && <Shop ctx={ctx} />}
          {tab === "manage" && (isMgr ? <Manage ctx={ctx} /> : <Home ctx={ctx} />)}
        </main>

        <nav className="nav">
          {(isMgr
            ? [["home", "בית", I.home], ["shop", "קניות", I.cart], ["manage", "ניהול", I.gear]]
            : [["home", "בית", I.home], ["daily", "שימוש", I.day], ["receive", "קבלה", I.download],
               ["count", "ספירה", I.count], ["shop", "קניות", I.cart]]
          ).map(([k, label, Icon]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              <Icon />
              <span>{label}</span>
              {k === "home" && navBadge > 0 && <span className="bdg">{navBadge}</span>}
            </button>
          ))}
        </nav>

        {toast && <div className="toast">{toast}</div>}
        {modal && <Modal ctx={ctx} modal={modal} close={() => setModal(null)} />}
      </div>
    </>
  );
}

/* ============================ HOME ============================ */
function Home({ ctx }) {
  const { st, lowStock, soonList, receiptDone, eveningDone, countedThisWeek, isTue, isWed, afterSix,
    setTab, isMgr, needsApproval, openLists, pendingProducts } = ctx;
  const h = new Date().getHours();
  const [openPanel, setOpenPanel] = useState(null);

  /* שיבוץ התורנויות מגיע מלוח ייעודי ב-monday, לא מהקוד.
     כישלון או היעדר שיבוץ משאירים רשימה ריקה — ואז שורת התורן
     לא מוצגת כלל. המשימות בכרטיס אינן תלויות בזה. */
  const [duty, setDuty] = useState([]);
  useEffect(() => {
    let live = true;
    api.getDutyToday(testDate() || undefined)
      .then((d) => live && setDuty(d.names || []))
      .catch(() => live && setDuty([]));
    return () => { live = false; };
  }, []);

  const listApprovedToday = st.lists.some((l) =>
    (l.status === "approved" || (l.status === "purchased" && l.purchasedAt && sameDay(l.purchasedAt))) &&
    l.approvedAt && sameDay(l.approvedAt));
  const anyApproved = st.lists.some((l) => l.status === "approved" || l.status === "purchased");

  const rows = [
    { k: "r", when: "בוקר", t: "קבלת מצרכים", s: receiptDone ? "עודכן היום" : "מה הגיע היום למחסן", done: receiptDone,
      due: !receiptDone && h >= 9, go: () => setTab("receive") },
    { k: "e", when: "ערב", t: "שימוש במצרכים", s: eveningDone ? "עודכן היום" : "מוצרים טריים בלבד – דקה וחצי", done: eveningDone,
      due: !eveningDone && afterSix, go: () => setTab("daily") },
    { k: "c", when: "שלישי", t: "ספירת מלאי שבועית", s: countedThisWeek ? "בוצעה השבוע" : (isTue ? "היום – כולל סימון תוקף" : "בשלישי בערב"),
      done: !!countedThisWeek, due: isTue && !countedThisWeek, go: () => setTab("count") },
    { k: "s", when: isWed ? "היום" : "רביעי", t: "רשימת קניות",
      s: anyApproved ? "הרשימה אושרה על ידי המנהל" : (openLists.length ? statusText(openLists[0]) : "נוצרת אחרי הספירה"),
      done: anyApproved, due: !anyApproved && ((isTue && countedThisWeek) || isWed), go: () => setTab("shop") },
  ];

  return (
    <>
      {/* Managers: low stock stays open — they must see shortages the moment they open the app (sef 6) */}
      {isMgr && lowStock.length > 0 && (
        <div className="alert a-clay">
          <span style={{ marginTop: 1 }}><I.warn /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">{lowStock.length} מוצרים מתחת למינימום</div>
            <div className="chips">
              {lowStock.slice(0, 6).map((p) => (
                <span className="chip" key={p.id}>{p.name} – {nfmt(p.stock)} {UNITS[p.unit]}</span>
              ))}
              {lowStock.length > 6 && <span className="chip">ועוד {lowStock.length - 6}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Trainees: only the immediate-use panel — shortages are a management concern, not the trainee's */}
      {!isMgr && soonList.length > 0 && (
        <div className="rows" style={{ marginBottom: 14 }}>
          <button className="row" style={{ width: "100%", textAlign: "right" }}
            onClick={() => setOpenPanel(openPanel === "soon" ? null : "soon")}>
            <span style={{ color: "var(--amber)", flex: "0 0 auto" }}><I.clock /></span>
            <div className="r-main">
              <div className="r-name">לשימוש מיידי</div>
              <div className="r-meta">תוקף המוצר עומד לפוג</div>
            </div>
            <span className="pill" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>{soonList.length}</span>
            <span className="chev" style={{ transform: openPanel === "soon" ? "rotate(-90deg)" : "none" }}><I.chev /></span>
          </button>
          {openPanel === "soon" && (
            <div style={{ padding: "4px 14px 14px", background: "#FDFBF5" }}>
              <div className="chips">
                {soonList.map((p) => (
                  <span className="chip" key={p.id}>{p.name} – {nfmt(p.stock)} {UNITS[p.unit]}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Managers also see soon-to-expire as an open note */}
      {isMgr && soonList.length > 0 && (
        <div className="alert a-amber">
          <span style={{ marginTop: 1 }}><I.clock /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">לשימוש מיידי – פחות מ‑3 ימים</div>
            <div className="bd">סומנו בספירה האחרונה. לשלב אותם בתפריט של מחר.</div>
            <div className="chips">{soonList.map((p) => <span className="chip" key={p.id}>{p.name}</span>)}</div>
          </div>
        </div>
      )}

      {isMgr && needsApproval.length > 0 && (
        <button className="alert a-amber" style={{ width: "100%", textAlign: "right" }} onClick={() => setTab("shop")}>
          <span style={{ marginTop: 1 }}><I.clock /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">{needsApproval.length} רשימות ממתינות לאישור שלך</div>
            <div className="bd">בלי אישור אי אפשר לצאת לקניות</div>
          </div>
        </button>
      )}

      {isMgr && pendingProducts.length > 0 && (
        <button className="alert a-amber" style={{ width: "100%", textAlign: "right" }} onClick={() => setTab("manage")}>
          <span style={{ marginTop: 1 }}><I.warn /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">{pendingProducts.length} מוצרים חדשים ממתינים לאישור</div>
            <div className="bd">אשרו או מזגו כדי לשמור על קטלוג נקי</div>
          </div>
        </button>
      )}

      <div className="sec-label">משימות היום</div>
      <div className="ledger">
        <div className="led-head">
          <span className="d">{DAYS[new Date().getDay()]}</span>
          {/* אין שיבוץ להיום — השורה פשוט לא קיימת. בלי מציין מקום. */}
          {duty.length > 0 && (
            <span className="duty">{duty.length === 1 ? "תורן: " : "תורנים: "}{duty.join(", ")}</span>
          )}
        </div>
        {rows.map((r) => (
          <button key={r.k} className={"led-item" + (r.done ? " done" : "")} onClick={r.go}>
            <span className={"tick" + (r.done ? " on" : r.due ? (afterSix && !r.done ? " late" : " due") : "")}>
              {r.done && <span style={{ color: "#fff" }}><I.check /></span>}
              {!r.done && r.due && afterSix && <span style={{ color: "#fff" }}><I.warn width="13" height="13" /></span>}
            </span>
            <span className="when">{r.when}</span>
            <span className="led-txt">
              <span className="t">{r.t}</span>
              <span className="s">{r.s}</span>
            </span>
            <span className="chev"><I.chev /></span>
          </button>
        ))}
      </div>

      {/* משימות הניקיון של היום — למסך החניך בלבד */}
      {!isMgr && <TodayTasks />}

      {isMgr && (
        <>
          <div className="sec-label">תמונת מצב</div>
          <div className="stats">
            <div className="stat">
              <div className="k">שווי מלאי</div>
              <div className="v">{shek(st.products.reduce((a, p) => a + p.stock * p.price, 0))}</div>
              <div className="n">{st.products.length} מוצרים בקטלוג</div>
            </div>
            <div className="stat clay">
              <div className="k">פחת החודש</div>
              <div className="v">{shek(live(st.moves).filter((m) => m.type === "waste" && new Date(m.ts).getMonth() === new Date().getMonth())
                .reduce((a, m) => { const p = st.products.find((x) => x.id === m.pid); return a + m.qty * (p ? p.price : 0); }, 0))}</div>
              <div className="n">לפי מחירי תקן</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ============ סיכום משימות ניקיון — למנהל, קריאה בלבד ============ */
/* מציג ביצוע ברמת יום לשבוע הנוכחי בלבד.
   ⚠ בכוונה אין כאן: שמות, מי סימן, ולא אפשרות לסמן או לבטל.
   האחריות היומית משותפת, והסיכום נועד לראות אם היום נסגר —
   לא מי סגר אותו. למי שרוצה לרדת לרזולוציה או אחורה בזמן,
   הלוח ב-monday פתוח. */
function TasksWeekSummary() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api.getTasksSummary(testDate() || undefined)
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);

  if (failed) return null; // לא מפילים את הדוח בגלל הסיכום
  if (!data) {
    return (
      <>
        <div className="sec-label">משימות ניקיון – השבוע</div>
        <div className="card"><div className="led-empty">טוען…</div></div>
      </>
    );
  }
  if (!data.days.length) {
    return (
      <>
        <div className="sec-label">משימות ניקיון – השבוע</div>
        <div className="card"><div className="led-empty">אין משימות מוגדרות לשבוע {data.week}.</div></div>
      </>
    );
  }

  const allDone = data.total > 0 && data.done === data.total;

  return (
    <>
      <div className="sec-label">משימות ניקיון – השבוע</div>
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="tsum-head">
          <span className="tsum-week">שבוע {data.week}</span>
          <span className={"tsum-total" + (allDone ? " ok" : "")}>
            {data.done} מתוך {data.total} בוצעו
          </span>
        </div>
        {data.days.map((d) => {
          const full = d.done === d.total;
          return (
            <div className={"tsum-row" + (full ? " full" : "")} key={d.day}>
              <span className="tsum-day">
                {full && <span className="tsum-v"><I.check /></span>}
                יום {d.day}
              </span>
              <span className="tsum-count">{d.done} מתוך {d.total} בוצעו</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, margin: "0 4px 18px", lineHeight: 1.5 }}>
        האחריות היומית משותפת לכל תורני היום. לפירוט ברמת משימה — הלוח ב-monday.
      </div>
    </>
  );
}

/* ==================== משימות ניקיון היום ==================== */
/* כרטיס נפרד בעמוד הבית של החניך. הנתונים חיים בלוח משלהם
   ולא ב-st, ולכן הרכיב מנהל את הטעינה שלו — אבל לפי אותו דפוס
   שכבר קיים בדיווחי המלאי: עדכון אופטימי, קריאה לשרת, ואז
   משיכה מחדש מהמקור. אם השרת דוחה — חוזרים אחורה.

   כל תורני היום אחראים יחד. אין חלוקה אישית ואין רישום של מי
   סימן, וזו החלטה ולא השמטה. */
function TodayTasks() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(null);

  /* פרמטר בדיקה: ?date=YYYY-MM-DD מציג את משימות אותו יום.
     תצוגה בלבד — הסימון נכתב לשורות האמיתיות של אותו יום ושבוע. */
  const testAt = useMemo(() => testDate(), []);

  const load = useCallback(
    () => api.getTodayTasks(testAt).then(setData).catch((e) => setErr(e.message)),
    [testAt]
  );

  useEffect(() => {
    let live = true;
    // יצירת השבוע אם חסר, ואז טעינה. כישלון ביצירה לא חוסם —
    // ייתכן ששבוע כבר קיים ורק הקריאה נכשלה.
    api.ensureWeek()
      .catch(() => {})
      .then(() => live && load());
    return () => { live = false; };
  }, [load]);

  const toggle = (t) => {
    if (busy) return;
    const next = !t.done;
    setBusy(t.rowId);
    // אופטימי
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.rowId === t.rowId ? { ...x, done: next } : x)),
      doneCount: d.doneCount + (next ? 1 : -1),
    }));
    api.setTaskDone(t.rowId, next)
      .then(() => load()) // מושכים מחדש — כך גם סימון של תורן אחר נכנס
      .catch(() => {
        setData((d) => ({
          ...d,
          tasks: d.tasks.map((x) => (x.rowId === t.rowId ? { ...x, done: t.done } : x)),
          doneCount: d.doneCount + (next ? -1 : 1),
        }));
        setErr("הסימון לא נשמר");
      })
      .finally(() => setBusy(null));
  };

  /* חיווי בולט, כדי שאף תורן לא יעבוד במצב בדיקה בלי לדעת */
  const banner = testAt ? (
    <div className="test-banner">
      <I.warn />
      <span>מצב בדיקה — מציג את יום {data?.day || testAt}
        {data?.week ? ` (שבוע ${data.week})` : ""}. הסרת ‎?date‎ מהכתובת מחזירה להיום.</span>
    </div>
  ) : null;

  if (err && !data) return null; // לא מפילים את עמוד הבית בגלל המשימות
  if (!data) {
    return (
      <>
        <div className="sec-label">משימות ניקיון</div>
        {banner}
        <div className="ledger"><div className="led-empty">טוען…</div></div>
      </>
    );
  }

  if (data.restDay || !data.tasks.length) {
    return (
      <>
        <div className="sec-label">משימות ניקיון</div>
        {banner}
        <div className="ledger">
          <div className="led-empty">
            {data.restDay ? "שבת — אין משימות ניקיון היום. שבת שלום." : "אין משימות ניקיון מוגדרות ליום הזה."}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sec-label">משימות ניקיון</div>
      {banner}
      <div className="ledger">
        <div className="led-head">
          <span className="d">{data.day}</span>
          <span className="duty">{data.doneCount} מתוך {data.total}</span>
        </div>

        {data.tasks.map((t) => (
          <div key={t.rowId} className={"task-row" + (t.done ? " done" : "")}>
            <div className="task-main">
              <button className="task-tick" aria-pressed={t.done} disabled={busy === t.rowId}
                onClick={() => toggle(t)}>
                <span className={"tick" + (t.done ? " on" : "")}>
                  {t.done && <span style={{ color: "#fff" }}><I.check /></span>}
                </span>
              </button>

              <button className="task-txt" onClick={() => setOpen(open === t.rowId ? null : t.rowId)}>
                <span className="t">{t.name}</span>
                <span className="s">{t.focus}</span>
              </button>

              {t.detail && (
                <button className="task-more" onClick={() => setOpen(open === t.rowId ? null : t.rowId)}
                  aria-label="פירוט">
                  <span style={{ display: "inline-block", transform: open === t.rowId ? "rotate(90deg)" : "rotate(-90deg)" }}>
                    <I.chev />
                  </span>
                </button>
              )}
            </div>

            {open === t.rowId && t.detail && <div className="task-detail">{t.detail}</div>}
          </div>
        ))}
      </div>
      {err && <div style={{ fontSize: 12.5, color: "var(--clay)", fontWeight: 700, margin: "6px 4px 0" }}>{err}</div>}
    </>
  );
}

const statusText = (l) => ({
  draft: "טיוטה – לשלוח לאישור", pending: "ממתינה לאישור מנהל", approved: "מאושרת – אפשר לצאת לקנות",
  purchased: "נקנתה", missed: "התפספסה",
}[l.status] || "");

/* ============================ DAILY ============================ */
/* modes קובע אילו מצבים זמינים במסך. ברירת המחדL היא שלושתם,
   כדי שמסלול המנהל (ניהול ← תיקון מלאי) יישאר כפי שהיה.
   הלוגיקה עצמה — commitMoves והמצבים — לא השתנתה. */
function Daily({ ctx, modes = ["receipt", "usage", "waste"], title }) {
  const { st, commitMoves, undoMove, say, user } = ctx;
  const [mode, setMode] = useState(modes.includes("usage") ? "usage" : modes[0]);
  const [vals, setVals] = useState({});
  const [reasons, setReasons] = useState({});
  const [confirm, setConfirm] = useState(null);

  const list = st.products.filter((p) => p.tracking === "daily" && !p.pending)
    .sort((a, b) => a.order - b.order);
  const groups = CATS.map((c) => [c, list.filter((p) => p.cat === c)]).filter(([, a]) => a.length);

  useEffect(() => { setVals({}); setReasons({}); }, [mode]);

  const entries = Object.entries(vals).map(([pid, q]) => ({ pid, qty: Number(q), reason: reasons[pid] }))
    .filter((e) => e.qty > 0);
  const missingReason = mode === "waste" && entries.some((e) => !e.reason);

  const doSave = () => {
    const odd = entries.find((e) => {
      const p = st.products.find((x) => x.id === e.pid);
      return p && e.qty > Math.max(p.target * 2, 12);
    });
    if (odd && !confirm) {
      const p = st.products.find((x) => x.id === odd.pid);
      setConfirm({ p, qty: odd.qty });
      return;
    }
    commitMoves(entries, mode);
    setVals({}); setReasons({}); setConfirm(null);
    say(({ receipt: "נקלטו מצרכים", usage: "נרשם שימוש", waste: "נרשם פחת" }[mode]) + " – " + entries.length + " מוצרים");
  };

  return (
    <>
      {title && <h2 className="screen-title">{title}</h2>}

      {modes.length > 1 && (
        <div className="seg">
          {modes.includes("receipt") && (
            <button className={mode === "receipt" ? "on" : ""} onClick={() => setMode("receipt")}>קבלה</button>
          )}
          {modes.includes("usage") && (
            <button className={mode === "usage" ? "on" : ""} onClick={() => setMode("usage")}>שימוש</button>
          )}
          {modes.includes("waste") && (
            <button className={mode === "waste" ? "on clay" : ""} onClick={() => setMode("waste")}>פחת</button>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          {mode === "receipt" && "מה הגיע היום למחסן. אם זו אספקה מול הזמנה מאושרת – עדיף לעדכן דרך מסך הקניות."}
          {mode === "usage" && "רק מוצרים טריים. היבשים נספרים בשלישי ולא צריך לדווח עליהם."}
          {mode === "waste" && "חובה לציין סיבה לכל פריט. זה מה שמאפשר לזהות דפוסי בזבוז בסוף החודש."}
        </div>
      </div>

      {groups.map(([cat, items]) => (
        <div className="grp" key={cat}>
          <div className="grp-h"><span>{cat}</span><span>{items.length}</span></div>
          <div className="rows">
            {items.map((p) => {
              const v = vals[p.id] ?? "";
              const active = Number(v) > 0;
              return (
                <div key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <div className="row" style={{ borderBottom: "none" }}>
                    <div className="r-main">
                      <div className="r-name">{p.name}</div>
                      <div className="r-meta">
                        <span className="num">{nfmt(p.stock)} {UNITS[p.unit]} במלאי</span>
                        {p.stock < p.min && <span className="pill p-low">נמוך</span>}
                      </div>
                    </div>
                    <Stepper value={v} unit={p.unit} onChange={(x) => setVals((s) => ({ ...s, [p.id]: x }))} />
                  </div>
                  {mode === "waste" && active && (
                    <div className="reasons" style={{ padding: "0 13px 13px" }}>
                      {REASONS.map((r) => (
                        <button key={r} className={reasons[p.id] === r ? "on" : ""}
                          onClick={() => setReasons((s) => ({ ...s, [p.id]: r }))}>{r}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <MyTodayReports ctx={ctx} />

      <div style={{ height: 60 }} />
      <div className="sticky">
        <button className={"btn " + (mode === "waste" ? "btn-clay" : "btn-primary")}
          disabled={!entries.length || missingReason} onClick={doSave}>
          {!entries.length ? "לא הוזן כלום עדיין"
            : missingReason ? "חסרה סיבת פחת"
            : "שמור – " + entries.length + " מוצרים"}
        </button>
      </div>

      {confirm && (
        <div className="scrim" onClick={() => setConfirm(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-h"><h3>לוודא רגע</h3>
              <button onClick={() => setConfirm(null)}><I.x /></button></div>
            <div className="sheet-b">
              <div className="alert a-amber" style={{ marginBottom: 14 }}>
                <span style={{ marginTop: 1 }}><I.warn /></span>
                <div>
                  <div className="ttl">{nfmt(confirm.qty)} {UNITS[confirm.p.unit]} של {confirm.p.name}</div>
                  <div className="bd">זה הרבה מעל הכמות הרגילה. אם זה נכון – המשיכו.</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={doSave} style={{ marginBottom: 9 }}>נכון, לשמור</button>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>חזרה לתיקון</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Sef 6: lets a trainee review the reports they entered today and undo a mistaken one.
   Scope is deliberately "today" only — not editing history from days ago. Undo restores stock. */
function MyTodayReports({ ctx }) {
  const { st, undoMove, say, user } = ctx;
  const prod = (pid) => st.products.find((x) => x.id === pid);
  const mine = live(st.moves)
    .filter((m) => sameDay(m.ts) && (m.type === "receipt" || m.type === "usage" || m.type === "waste"))
    .sort((a, b) => b.ts - a.ts);
  if (!mine.length) return null;
  const typeLabel = { receipt: "קבלה", usage: "שימוש", waste: "פחת" };
  return (
    <>
      <div className="sec-label">הדיווחים של היום</div>
      <div className="rows">
        {mine.map((m) => {
          const p = prod(m.pid);
          return (
            <div className="row" key={m.id}>
              <div className="r-main">
                <div className="r-name">{p ? p.name : "מוצר"} <span className="pill" style={{
                  background: m.type === "waste" ? "var(--clay-soft)" : "var(--bg)",
                  color: m.type === "waste" ? "var(--clay)" : "var(--muted)" }}>{typeLabel[m.type]}</span></div>
                <div className="r-meta num">{nfmt(m.qty)} {p ? UNITS[p.unit] : ""}{m.reason ? " • " + m.reason : ""} • {m.user}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
                onClick={() => { undoMove(m.id); say("הדיווח בוטל והמלאי הוחזר"); }}>
                בטל
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, margin: "8px 4px 0", lineHeight: 1.5 }}>
        אפשר לבטל דיווח שהוזן היום. ביטול מחזיר את המלאי למצב שלפני הדיווח.
      </div>
    </>
  );
}

function Stepper({ value, unit, onChange, wide }) {
  const s = stepOf(unit);
  const n = value === "" ? 0 : Number(value);
  const set = (x) => onChange(x <= 0 ? "" : String(Math.round(x * 100) / 100));
  return (
    <div className={"step" + (n > 0 ? " filled" : "")} style={wide ? { flex: 1 } : undefined}>
      <button onClick={() => set(n - s)} disabled={n <= 0}>−</button>
      <input type="number" inputMode="decimal" value={value} placeholder="0"
        style={wide ? { flex: 1, width: "auto" } : undefined}
        onChange={(e) => onChange(e.target.value)} />
      <button onClick={() => set(n + s)}>+</button>
    </div>
  );
}

/* ============================ COUNT ============================ */
function Count({ ctx }) {
  const { st, setSt, finishCount, say, setTab, isTue, isMgr } = ctx;
  const [draft, setDraft] = useState(() => st.countDraft || {});
  const [done, setDone] = useState(false);

  const list = [...st.products].filter((p) => !p.pending).sort((a, b) => a.order - b.order);
  const groups = CATS.map((c) => [c, list.filter((p) => p.cat === c)]).filter(([, a]) => a.length);

  const filled = list.filter((p) => draft[p.id] && draft[p.id].qty !== "" && draft[p.id].qty != null);
  const missingExp = filled.filter((p) => p.exp && !draft[p.id].exp);
  const pct = Math.round((filled.length / list.length) * 100);

  const upd = (pid, patch) => {
    const next = { ...draft, [pid]: { ...(draft[pid] || {}), ...patch } };
    setDraft(next);
    setSt((s) => ({ ...s, countDraft: next }));
  };

  const diffs = useMemo(() => filled.map((p) => ({
    p, counted: Number(draft[p.id].qty), diff: Math.round((Number(draft[p.id].qty) - p.stock) * 100) / 100,
  })).filter((d) => Math.abs(d.diff) > 0.01).sort((a, b) =>
    Math.abs(b.diff * b.p.price) - Math.abs(a.diff * a.p.price)), [draft, filled]);

  if (done) {
    const soon = filled.filter((p) => draft[p.id].exp === "soon");
    const loss = diffs.filter((d) => d.diff < 0).reduce((a, d) => a + Math.abs(d.diff) * d.p.price, 0);
    return (
      <>
        <div className="alert a-ok" style={{ marginBottom: 14 }}>
          <span style={{ marginTop: 1 }}><I.check /></span>
          <div><div className="ttl">הספירה נשמרה</div>
            <div className="bd">המלאי עודכן לפי מה שנספר בפועל.</div></div>
        </div>
        <div className="stats" style={{ marginBottom: 16 }}>
          {isMgr ? (
            <div className="stat clay"><div className="k">פער לא מדווח</div><div className="v">{shek(loss)}</div>
              <div className="n">חוסר מול הרישום</div></div>
          ) : (
            <div className="stat clay"><div className="k">פערים מול הרישום</div>
              <div className="v">{diffs.length}</div><div className="n">מוצרים עם פער</div></div>
          )}
          <div className="stat"><div className="k">לשימוש מיידי</div><div className="v">{soon.length}</div>
            <div className="n">פחות מ‑3 ימים</div></div>
        </div>
        {diffs.length > 0 && (<>
          <div className="sec-label">הפערים הגדולים</div>
          <div className="card" style={{ marginBottom: 16 }}>
            {diffs.slice(0, 6).map((d) => (
              <div className="bar" key={d.p.id}>
                <span className="bn">{d.p.name}</span>
                <span className="bv num" style={{ color: d.diff < 0 ? "var(--clay)" : "var(--ok)", flex: 1, textAlign: "left" }}>
                  {d.diff > 0 ? "+" : ""}{nfmt(d.diff)} {UNITS[d.p.unit]}
                </span>
                {isMgr && <span className="bv num" style={{ color: "var(--muted)" }}>{shek(Math.abs(d.diff) * d.p.price)}</span>}
              </div>
            ))}
          </div>
        </>)}
        <button className="btn btn-primary" onClick={() => setTab("shop")}>המשך לרשימת קניות</button>
      </>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, fontSize: 15.5 }}>ספירה שבועית</span>
          <span className="num" style={{ fontWeight: 800, color: "var(--accent)" }}>{filled.length}/{list.length}</span>
        </div>
        <div className="prog"><i style={{ width: pct + "%" }} /></div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 9, fontWeight: 600, lineHeight: 1.5 }}>
          {isTue ? "ספירה מלאה, לפי סדר המדפים. " : "לא שלישי, אבל אפשר לספור. "}
          מה שמוזן נשמר תוך כדי – אפשר לעצור ולחזור.
        </div>
      </div>

      {groups.map(([cat, items]) => (
        <div className="grp" key={cat}>
          <div className="grp-h">
            <span>{cat}</span>
            <span>{items.filter((p) => draft[p.id] && draft[p.id].qty !== "").length}/{items.length}</span>
          </div>
          <div className="rows">
            {items.map((p) => {
              const d = draft[p.id] || {};
              const has = d.qty !== "" && d.qty != null;
              return (
                <div className={"crow" + (has ? " done" : "")} key={p.id}>
                  <div className="crow-top">
                    <div className="r-main">
                      <div className="r-name">{p.name}</div>
                      <div className="r-meta">
                        <span className="num">רשום: {nfmt(p.stock)} {UNITS[p.unit]}</span>
                        {has && Math.abs(Number(d.qty) - p.stock) > 0.01 && (
                          <span className="pill" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                            {Number(d.qty) - p.stock > 0 ? "+" : ""}{nfmt(Number(d.qty) - p.stock)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Stepper value={d.qty ?? ""} unit={p.unit} onChange={(x) => upd(p.id, { qty: x })} />
                  </div>
                  {p.exp && has && (
                    <div className="exp">
                      <button className={d.exp === "ok" ? "on-ok" : ""} onClick={() => upd(p.id, { exp: "ok" })}>
                        מעל 3 ימים
                      </button>
                      <button className={d.exp === "soon" ? "on-soon" : ""} onClick={() => upd(p.id, { exp: "soon" })}>
                        פחות מ‑3 ימים
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ height: 60 }} />
      <div className="sticky">
        <button className="btn btn-primary" disabled={!filled.length || missingExp.length > 0}
          onClick={() => { finishCount(draft); setDone(true); }}>
          {!filled.length ? "עדיין לא נספר כלום"
            : missingExp.length ? "חסר סימון תוקף ב‑" + missingExp.length + " מוצרים"
            : "סיים ספירה – " + filled.length + " מוצרים"}
        </button>
      </div>
    </>
  );
}

/* ============================ SHOP ============================ */
function Shop({ ctx }) {
  const { st, makeList, patchList, isMgr, user, say, setModal } = ctx;
  const [sup, setSup] = useState("super");
  const [open, setOpen] = useState(null);
  // מונע לחיצה שנייה לפני שהראשונה חזרה — שתי בקשות במקביל
  // היו יוצרות שתי רשימות טיוטה לאותו ספק
  const [opening, setOpening] = useState(false);

  const lists = st.lists.filter((l) => l.sup === sup);
  const active = lists.find((l) => l.status !== "purchased" && l.status !== "missed");

  if (open) {
    const l = st.lists.find((x) => x.id === open);
    if (l) return <ListDetail ctx={ctx} list={l} back={() => setOpen(null)} />;
  }

  return (
    <>
      <div className="seg">
        <button className={sup === "super" ? "on" : ""} onClick={() => setSup("super")}>סופר</button>
        <button className={sup === "wholesale" ? "on" : ""} onClick={() => setSup("wholesale")}>סיטונאי</button>
      </div>

      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          {sup === "super"
            ? "מוצרים שיורדים מתחת למינימום נכנסים לרשימה אוטומטית. בשלישי סוקרים, משלימים ידנית ושולחים לאישור."
            : "הזמנה אחת לחודשיים. מוצרים בחוסר נכנסים אוטומטית – שווה לוודא שהכמויות מספיקות לכל התקופה."}
        </div>
      </div>

      {!active && (
        <div className="card"><div className="empty" style={{ padding: "28px 12px" }}>
          <div className="e1">אין רשימה פתוחה כרגע</div>
          <div className="e2">כשמוצר יורד מתחת למינימום הוא ייכנס לכאן אוטומטית.
            אפשר גם לפתוח רשימה ריקה ולהוסיף ידנית.</div>
          <button className="btn btn-ghost" style={{ marginTop: 16 }} disabled={opening}
            onClick={() => {
              if (opening) return;
              setOpening(true);
              Promise.resolve(makeList(sup))
                .then((id) => { if (id) setOpen(id); })
                .finally(() => setOpening(false));
            }}>
            <I.plus /> {opening ? "פותח…" : "פתח רשימה ריקה"}
          </button>
        </div></div>
      )}

      {active && (
        <>
          <div className="sec-label">רשימה פעילה</div>
          <button className="card" style={{ width: "100%", textAlign: "right", marginBottom: 6 }} onClick={() => setOpen(active.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{active.items.length} מוצרים</div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{statusText(active)}</div>
                <div style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 600, marginTop: 2 }}>
                  {active.createdBy === "אוטומטי" ? "נאספה אוטומטית מחוסרים" : "נוצרה על ידי " + active.createdBy}
                </div>
              </div>
              <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
            </div>
          </button>
        </>
      )}

      {lists.filter((l) => l.status === "purchased" || l.status === "missed").length > 0 && (
        <>
          <div className="sec-label">היסטוריה</div>
          <div className="rows">
            {lists.filter((l) => l.status === "purchased" || l.status === "missed").slice(0, 8).map((l) => (
              <button className="row" key={l.id} style={{ width: "100%", textAlign: "right" }} onClick={() => setOpen(l.id)}>
                <div className="r-main">
                  <div className="r-name">{new Date(l.createdAt).toLocaleDateString("he-IL")}</div>
                  <div className="r-meta">{l.items.length} מוצרים • {statusText(l)}</div>
                </div>
                <span className={"pill " + (l.status === "purchased" ? "p-ok" : "p-low")}>
                  {l.status === "purchased" ? "נקנתה" : "התפספסה"}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* receiveOnly: נפתח ישירות ממסך הקבלה. המסך נכנס מיד למצב קבלה,
   וחזרה ממנו מחזירה לטאב הקבלה ולא לתצוגת הרשימה. */
/* ============================ RECEIVE ============================ */
/* מסך קבלת סחורה. שני מסלולים במקום אחד:
   למעלה — רשימות מאושרות שממתינות לסחורה, שנפתחות למסך הקבלה
   הקיים ב-ListDetail. מתחת — קליטה חופשית, שהיא מצב receipt של
   Daily. שני הרכיבים משומשים כמו שהם; אין כאן לוגיקת נתונים. */
function Receive({ ctx }) {
  const { st } = ctx;
  const [open, setOpen] = useState(null);

  const awaiting = st.lists.filter((l) => l.status === "approved");

  if (open) {
    const l = st.lists.find((x) => x.id === open);
    if (l) return <ListDetail ctx={ctx} list={l} back={() => setOpen(null)} receiveOnly />;
  }

  return (
    <>
      <h2 className="screen-title">קבלת מצרכים</h2>

      {awaiting.length > 0 ? (
        <>
          <div className="sec-label">ממתינות למצרכים</div>
          <div className="rows" style={{ marginBottom: 18 }}>
            {awaiting.map((l) => (
              <button className="row" key={l.id} style={{ width: "100%", textAlign: "right" }}
                onClick={() => setOpen(l.id)}>
                <span style={{ color: "var(--accent)", flex: "0 0 auto" }}><I.cart /></span>
                <div className="r-main">
                  <div className="r-name">{SUPPLIERS[l.sup]}</div>
                  <div className="r-meta">{l.items.length} מוצרים{l.approvedBy ? " • אושרה על ידי " + l.approvedBy : ""}</div>
                </div>
                <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card" style={{ marginBottom: 18, padding: "12px 14px" }}>
          <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
            אין כרגע רשימה מאושרת שממתינה למצרכים. אפשר לקלוט מצרכים שהגיעו בלי הזמנה, למטה.
          </div>
        </div>
      )}

      <div className="sec-label">קליטה חופשית – בלי רשימה</div>
      <Daily ctx={ctx} modes={["receipt"]} />
    </>
  );
}

function ListDetail({ ctx, list, back, receiveOnly = false }) {
  const { st, patchList, isMgr, user, say, receiveList, setModal, setTab } = ctx;
  const [receiving, setReceiving] = useState(receiveOnly);
  const [got, setGot] = useState(() => {
    const o = {}; list.items.forEach((it) => (o[it.pid] = String(it.qty))); return o;
  });

  const prod = (pid) => st.products.find((p) => p.id === pid);
  const total = list.items.reduce((a, it) => { const p = prod(it.pid); return a + it.qty * (p ? p.price : 0); }, 0);
  const editable = list.status === "draft";

  /* עריכת שורה נשמרת ב-monday. כמות אפס אינה שינוי כמות אלא
     הסרה — השרת דוחה אפס, ובלי זה הכפתור היה נראה כאילו לא הגיב. */
  const setQty = (pid, q) => {
    const it = list.items.find((x) => x.pid === pid);
    if (!it) return;
    const qty = Number(q) || 0;
    if (qty <= 0) return ctx.rowRemove(list, it);
    ctx.rowSetQty(list, it, qty);
  };
  const remove = (pid) => {
    const it = list.items.find((x) => x.pid === pid);
    if (it) ctx.rowRemove(list, it);
  };

  if (receiving) {
    const diffs = list.items.filter((it) => Number(got[it.pid]) !== it.qty);
    return (
      <>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}
          onClick={() => (receiveOnly ? back() : setReceiving(false))}>
          <I.chev /> חזרה
        </button>
        <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
            כמה באמת הגיע? ברירת המחדל היא מה שהוזמן – תקנו רק את מה ששונה.
          </div>
        </div>
        <div className="rows" style={{ marginBottom: 14 }}>
          {list.items.map((it) => {
            const p = prod(it.pid); if (!p) return null;
            const diff = Number(got[it.pid] ?? it.qty) - it.qty;
            return (
              <div className="row" key={it.pid}>
                <div className="r-main">
                  <div className="r-name">{p.name}</div>
                  <div className="r-meta num">
                    הוזמן {nfmt(it.qty)} {UNITS[p.unit]}
                    {Math.abs(diff) > 0.01 && (
                      <span className="pill p-low">{diff > 0 ? "+" : ""}{nfmt(diff)}</span>
                    )}
                  </div>
                </div>
                <Stepper value={got[it.pid] ?? String(it.qty)} unit={p.unit}
                  onChange={(x) => setGot((s) => ({ ...s, [it.pid]: x }))} />
              </div>
            );
          })}
        </div>
        {diffs.length > 0 && (
          <div className="alert a-amber">
            <span style={{ marginTop: 1 }}><I.warn /></span>
            <div><div className="ttl">{diffs.length} פערים מול ההזמנה</div>
              <div className="bd">שווה לתעד מול הספק – זה מקור מרכזי לחוסרים בהמשך השבוע.</div></div>
          </div>
        )}
        <button className="btn btn-ok" onClick={() => { receiveList(list, got); back(); }}>
          קלוט למלאי וסגור רשימה
        </button>
      </>
    );
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={back}><I.chev /> חזרה</button>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{SUPPLIERS[list.sup]}</span>
          {isMgr
            ? <span className="num" style={{ fontWeight: 900, fontSize: 20 }}>{shek(total)}</span>
            : <span className="num" style={{ fontWeight: 900, fontSize: 20, color: "var(--muted)" }}>{list.items.length} מוצרים</span>}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>
          {statusText(list)} • {list.createdBy}
        </div>
        {list.approvedBy && (
          <div style={{ fontSize: 12.5, color: "var(--ok)", fontWeight: 700, marginTop: 3 }}>
            אושרה על ידי {list.approvedBy}
          </div>
        )}
      </div>

      <div className="rows" style={{ marginBottom: 14 }}>
        {list.items.map((it) => {
          const p = prod(it.pid); if (!p) return null;
          return (
            <div className="row" key={it.pid}>
              <div className="r-main">
                <div className="r-name">{p.name}</div>
                <div className="r-meta num">יש {nfmt(p.stock)} • יעד {nfmt(p.target)} {UNITS[p.unit]}{isMgr ? " • " + shek(it.qty * p.price) : ""}</div>
              </div>
              {editable
                ? <Stepper value={String(it.qty)} unit={p.unit} onChange={(x) => setQty(it.pid, x)} />
                : <div className="num" style={{ fontWeight: 900, fontSize: 17 }}>{nfmt(it.qty)} <span style={{ fontSize: 12, color: "var(--muted)" }}>{UNITS[p.unit]}</span></div>}
              {editable && <button onClick={() => remove(it.pid)} style={{ color: "var(--faint)", padding: 4 }}><I.x /></button>}
            </div>
          );
        })}
        {!list.items.length && <div className="empty"><div className="e1">הרשימה ריקה</div></div>}
      </div>

      {editable && (
        <button className="btn btn-ghost" style={{ marginBottom: 10 }}
          onClick={() => setModal({ t: "addItem", listId: list.id })}>
          <I.plus /> הוסף מוצר לרשימה
        </button>
      )}

      {list.status === "draft" && (isMgr ? (
        <button className="btn btn-ok" disabled={!list.items.length}
          onClick={() => { patchList(list.id, { status: "approved", approvedBy: user.name, approvedAt: Date.now() }); say("אושר – אפשר לצאת לקנות"); }}>
          אשר רשימה
        </button>
      ) : (
        <button className="btn btn-primary" disabled={!list.items.length}
          onClick={() => { patchList(list.id, { status: "pending" }); say("נשלחה לאישור המנהל"); }}>
          שלח לאישור מנהל
        </button>
      ))}

      {list.status === "pending" && (isMgr ? (
        <>
          <button className="btn btn-ok" style={{ marginBottom: 9 }}
            onClick={() => { patchList(list.id, { status: "approved", approvedBy: user.name, approvedAt: Date.now() }); say("אושר – אפשר לצאת לקנות"); }}>
            אשר רשימה
          </button>
          <button className="btn btn-ghost" onClick={() => { patchList(list.id, { status: "draft" }); say("הוחזרה לתיקון"); }}>
            החזר לתיקון
          </button>
        </>
      ) : (
        <>
          <div className="alert a-amber" style={{ marginBottom: 10 }}><span style={{ marginTop: 1 }}><I.clock /></span>
            <div><div className="ttl">ממתינה לאישור</div>
              <div className="bd">אפשר לצאת לקנות רק אחרי אישור סגן או מנהל המכינה. עדיין אפשר לתקן עד שתאושר.</div></div></div>
          <button className="btn btn-ghost"
            onClick={() => { patchList(list.id, { status: "draft" }); say("הרשימה נפתחה לעריכה – התיקון יחליף את מה שנשלח"); }}>
            <I.edit /> ערוך את הרשימה
          </button>
        </>
      ))}

      {list.status === "approved" && (
        <>
          {/* פעולת הקבלה עברה לטאב ייעודי. כאן נשארת רק הפניה אליו,
              כדי שלא יהיו שני מקומות שמתחילים את אותה פעולה. */}
          <button className="btn btn-primary" style={{ marginBottom: 9 }}
            onClick={() => setTab("receive")}>
            המצרכים הגיעו? עברו למסך קבלת מצרכים
          </button>
          <div style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 600, margin: "0 4px 12px", lineHeight: 1.5 }}>
            עדכון מה שהגיע בפועל מתבצע במסך “קבלה” בשורת הניווט.
          </div>
          <button className="btn btn-ghost"
            onClick={() => { ctx.patchList(list.id, { status: "missed" }); say("סומן שהקנייה התפספסה"); back(); }}>
            הקנייה התפספסה
          </button>
        </>
      )}
    </>
  );
}

/* ============================ MANAGE ============================ */
function Manage({ ctx }) {
  const [sub, setSub] = useState("dash");
  const tabs = [["dash", "עלויות"], ["report", "דוח תקופתי"], ["catalog", "קטלוג"], ["stock", "תיקון מלאי"], ["team", "תורנויות"]];
  return (
    <>
      <div className="seg seg-scroll">
        {tabs.map(([k, label]) => (
          <button key={k} className={sub === k ? "on" : ""} onClick={() => setSub(k)}>{label}</button>
        ))}
      </div>
      {sub === "dash" && <PurchaseDash ctx={ctx} />}
      {sub === "report" && <Report ctx={ctx} />}
      {sub === "catalog" && <Catalog ctx={ctx} />}
      {sub === "stock" && <StockFix ctx={ctx} />}
      {sub === "team" && <Team ctx={ctx} />}
    </>
  );
}

/* Manager access to stock actions — kept out of the main nav for a clean day-to-day view,
   but available here so a manager can correct a mistaken count or receipt when needed. */
function StockFix({ ctx }) {
  const [mode, setMode] = useState(null);
  if (mode === "daily") return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setMode(null)}><I.chev /> חזרה לניהול</button>
      <Daily ctx={ctx} />
    </>
  );
  if (mode === "count") return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setMode(null)}><I.chev /> חזרה לניהול</button>
      <Count ctx={ctx} />
    </>
  );
  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          התורנים מבצעים את העדכונים היומיים והספירה. כאן אפשר להיכנס במקרה שצריך לתקן טעות – למשל ספירה שגויה או קבלה שלא נרשמה נכון.
        </div>
      </div>
      <div className="rows">
        <button className="row" style={{ width: "100%", textAlign: "right" }} onClick={() => setMode("daily")}>
          <span style={{ color: "var(--accent)", flex: "0 0 auto" }}><I.day /></span>
          <div className="r-main">
            <div className="r-name">קבלה / שימוש / פחת</div>
            <div className="r-meta">תיקון עדכון יומי</div>
          </div>
          <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
        </button>
        <button className="row" style={{ width: "100%", textAlign: "right" }} onClick={() => setMode("count")}>
          <span style={{ color: "var(--accent)", flex: "0 0 auto" }}><I.count /></span>
          <div className="r-main">
            <div className="r-name">ספירת מלאי / תיקון כמויות</div>
            <div className="r-meta">עדכון המלאי הרשום לפי הנספר בפועל</div>
          </div>
          <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
        </button>
      </div>
    </>
  );
}

/* Purchasing status since start of month. Entry point is APPROVAL:
   a list enters the dashboard the moment a manager approves it (planning + cost),
   independent of whether the goods have physically arrived yet (which updates stock separately). */
function PurchaseDash({ ctx }) {
  const { st } = ctx;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prod = (pid) => st.products.find((x) => x.id === pid);

  // approved this month = any list a manager approved since the 1st, including ones already received
  const approvedLists = st.lists.filter((l) => l.approvedAt && new Date(l.approvedAt) >= monthStart);
  const pulses = approvedLists.length;
  const superPulses = approvedLists.filter((l) => l.sup === "super").length;
  const wholePulses = approvedLists.filter((l) => l.sup === "wholesale").length;

  // cost is the ordered/approved value — what the manager committed to, by standard prices
  const lineValue = (l) => l.items.reduce((a, it) => { const p = prod(it.pid); return a + it.qty * (p ? p.price : 0); }, 0);
  const totalCost = approvedLists.reduce((a, l) => a + lineValue(l), 0);
  const totalItems = approvedLists.reduce((a, l) => a + l.items.length, 0);

  const pending = st.lists.filter((l) => l.status === "pending").length;
  const awaitingReceipt = st.lists.filter((l) => l.status === "approved").length;
  const missed = st.lists.filter((l) => l.status === "missed" && l.createdAt && new Date(l.createdAt) >= monthStart).length;

  const mName = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][now.getMonth()];

  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          סטטוס הקניות מתחילת {mName}. כל רשימה שאושרה נכנסת לכאן. העלות היא לפי מה שאושר; המלאי בפועל מתעדכן בקבלת המצרכים.
        </div>
      </div>

      <div className="stats" style={{ marginBottom: 10 }}>
        <div className="stat"><div className="k">פעימות קנייה</div><div className="v">{pulses}</div>
          <div className="n">{superPulses} סופר • {wholePulses} סיטונאי</div></div>
        <div className="stat"><div className="k">עלות מאושרת</div><div className="v">{shek(totalCost)}</div>
          <div className="n">לפי מחירי תקן</div></div>
        <div className="stat"><div className="k">שורות שאושרו</div><div className="v">{totalItems}</div>
          <div className="n">סך פריטים</div></div>
        <div className="stat clay"><div className="k">קניות שהתפספסו</div><div className="v">{missed}</div>
          <div className="n">החודש</div></div>
      </div>

      {(pending > 0 || awaitingReceipt > 0) && (
        <>
          <div className="sec-label">בתהליך כרגע</div>
          <div className="rows" style={{ marginBottom: 14 }}>
            {pending > 0 && (
              <div className="row">
                <div className="r-main"><div className="r-name">ממתינות לאישור</div>
                  <div className="r-meta">דורש אישור סגן או מנהל</div></div>
                <span className="pill p-new">{pending}</span>
              </div>
            )}
            {awaitingReceipt > 0 && (
              <div className="row">
                <div className="r-main"><div className="r-name">אושרו – ממתינות לקבלת מצרכים</div>
                  <div className="r-meta">המלאי יתעדכן כשהחניך יסמן מה הגיע</div></div>
                <span className="pill p-ok">{awaitingReceipt}</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="sec-label">רשימות שאושרו החודש</div>
      {approvedLists.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: "24px 8px" }}>
          <div className="e1">עדיין לא אושרה אף רשימה החודש</div>
          <div className="e2">כל רשימה שהמנהל יאשר תופיע כאן עם התאריך והעלות המאושרת.</div></div></div>
      ) : (
        <div className="rows">
          {approvedLists.map((l) => (
            <div className="row" key={l.id}>
              <div className="r-main">
                <div className="r-name">{SUPPLIERS[l.sup]}
                  {l.status === "purchased" && <span className="pill p-ok" style={{ marginRight: 6 }}>נקלטה</span>}
                  {l.status === "approved" && <span className="pill p-new" style={{ marginRight: 6 }}>ממתינה למצרכים</span>}
                </div>
                <div className="r-meta num">
                  {new Date(l.approvedAt).toLocaleDateString("he-IL")} • {l.items.length} שורות • אישר {l.approvedBy || "—"}
                </div>
              </div>
              <span className="num" style={{ fontWeight: 800 }}>{shek(lineValue(l))}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Catalog({ ctx }) {
  const { st, setModal, isMgr, setSt, say } = ctx;
  const [q, setQ] = useState("");
  const pending = st.products.filter((p) => p.pending);
  const shown = st.products.filter((p) => !p.pending && (!q || normHe(p.name).includes(normHe(q))))
    .sort((a, b) => a.order - b.order);
  const groups = CATS.map((c) => [c, shown.filter((p) => p.cat === c)]).filter(([, a]) => a.length);

  return (
    <>
      <input className="search" placeholder="חיפוש מוצר…" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setModal({ t: "product", p: null })}>
        <I.plus /> מוצר חדש
      </button>

      {pending.length > 0 && (
        <>
          <div className="sec-label">ממתינים לאישור</div>
          <div className="rows" style={{ marginBottom: 14 }}>
            {pending.map((p) => (
              <div className="row hot" key={p.id}>
                <div className="r-main">
                  <div className="r-name">{p.name} <span className="pill p-new">חדש</span></div>
                  <div className="r-meta">{p.cat} • {UNITS[p.unit]}</div>
                </div>
                {isMgr ? (
                  <button className="btn btn-ok btn-sm"
                    onClick={() => { setSt((s) => ({ ...s, products: s.products.map((x) => x.id === p.id ? { ...x, pending: false } : x) })); say("אושר לקטלוג"); }}>
                    אשר
                  </button>
                ) : <span className="pill p-new">ממתין</span>}
                <button style={{ color: "var(--faint)", padding: 4 }} onClick={() => setModal({ t: "product", p })}>
                  <I.chev style={{ transform: "scaleX(-1)" }} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {groups.map(([cat, items]) => (
        <div className="grp" key={cat}>
          <div className="grp-h"><span>{cat}</span><span>{items.length}</span></div>
          <div className="rows">
            {items.map((p) => (
              <button className="row" key={p.id} style={{ width: "100%", textAlign: "right" }}
                onClick={() => setModal({ t: "product", p })}>
                <div className="r-main">
                  <div className="r-name">{p.name}</div>
                  <div className="r-meta num">
                    {nfmt(p.stock)} {UNITS[p.unit]} • מינ׳ {nfmt(p.min)} • יעד {nfmt(p.target)}
                    {p.stock < p.min && <span className="pill p-low">נמוך</span>}
                  </div>
                </div>
                <span className="pill" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                  {p.tracking === "daily" ? "יומי" : "שבועי"}
                </span>
                <span className="chev"><I.chev /></span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Report({ ctx }) {
  const { st } = ctx;

  /* שיבוץ התורנויות מגיע מלוח ב-monday, לא מקבוע בקוד.
     כישלון או היעדר שורה משאירים תאים ריקים, והדוח מציג "—". */
  const [dutyWeek, setDutyWeek] = useState(null);
  useEffect(() => {
    let live = true;
    api.getDutyWeek(testDate() || undefined)
      .then((d) => live && setDutyWeek(d))
      .catch(() => live && setDutyWeek({ days: [[], [], [], [], [], [], []], found: false }));
    return () => { live = false; };
  }, []);
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return d; });
  const [mi, setMi] = useState(0);
  const m = months[mi];

  const inMonth = live(st.moves).filter((x) => { const d = new Date(x.ts); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); });
  const price = (pid) => { const p = st.products.find((x) => x.id === pid); return p ? p.price : 0; };
  const pname = (pid) => { const p = st.products.find((x) => x.id === pid); return p ? p.name : "–"; };

  const sum = (t) => inMonth.filter((x) => x.type === t).reduce((a, x) => a + Math.abs(x.qty) * price(x.pid), 0);
  const buy = sum("receipt"), use = sum("usage"), waste = sum("waste");
  const shrink = inMonth.filter((x) => x.type === "count" && x.qty < 0).reduce((a, x) => a + Math.abs(x.qty) * price(x.pid), 0);
  const wasteRate = use + waste > 0 ? (waste / (use + waste)) * 100 : 0;

  const byReason = REASONS.map((r) => ({
    r, v: inMonth.filter((x) => x.type === "waste" && x.reason === r).reduce((a, x) => a + x.qty * price(x.pid), 0),
  })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);

  const maxR = Math.max(1, ...byReason.map((x) => x.v));

  const MON = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const label = MON[m.getMonth()] + " " + m.getFullYear();

  /* Weekly task-compliance board — one status per day for the selected month's current week.
     A day is "done" if every task DUE that day was completed, "missed" if a past day left one
     undone, and "future" if the day hasn't arrived yet. */
  const ws = weekStart();
  const todayKeyStr = dkey();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const dk = dkey(d);
    const isFuture = dk > todayKeyStr;
    const isToday = dk === todayKeyStr;
    const dayMoves = live(st.moves).filter((x) => dkey(x.ts) === dk);
    const gotReceipt = dayMoves.some((x) => x.type === "receipt");
    const gotDailyCount = dayMoves.some((x) => x.type === "usage" || x.type === "waste");
    const gotWeeklyCount = dayMoves.some((x) => x.type === "count");
    const gotApproval = st.lists.some((l) => l.approvedAt && dkey(l.approvedAt) === dk);
    // tasks due this day
    const due = [];
    due.push(gotReceipt);       // receipt — every day
    due.push(gotDailyCount);    // daily count — every day
    if (d.getDay() === 2) due.push(gotWeeklyCount);  // weekly count — Tuesday
    if (d.getDay() === 3) due.push(gotApproval);     // shopping approval — Wednesday
    const allDone = due.every(Boolean);
    const names = dutyWeek?.days?.[d.getDay()] || [];
    return { d, dk, isFuture, isToday, allDone,
      status: isFuture ? "future" : (allDone ? "done" : "missed"),
      duty: names,
      dutyName: names.length ? names.join(", ") : "—" };
  });

  const exportExcel = () => {
    const rows = [
      ["דוח תקופתי – מטבח המכינה", label],
      [],
      ["סיכום", "₪"],
      ["נקנה", Math.round(buy)],
      ["נצרך (שימוש)", Math.round(use)],
      ["פחת", Math.round(waste)],
      ["פער ספירה (חוסר לא מדווח)", Math.round(shrink)],
      ["אחוז פחת מהצריכה", wasteRate.toFixed(1) + "%"],
      [],
      ["פחת לפי סיבה", "₪"],
      ...byReason.map((x) => [x.r, Math.round(x.v)]),
      [],
      ["ביצוע משימות – השבוע", "", ""],
      ["יום", "תורן", "סטטוס"],
      ...week.map((w) => [
        DAYS[w.d.getDay()] + " " + w.d.getDate() + "/" + (w.d.getMonth() + 1),
        w.dutyName,
        w.status === "future" ? "טרם" : (w.status === "done" ? "בוצע" : "לא בוצע"),
      ]),
      [],
      ["פירוט תנועות", "", "", "", ""],
      ["תאריך", "סוג", "מוצר", "כמות", "סיבת פחת"],
      ...inMonth.map((x) => [
        new Date(x.ts).toLocaleDateString("he-IL"),
        ({ receipt: "קבלה", usage: "שימוש", waste: "פחת", count: "ספירה" }[x.type] || x.type),
        pname(x.pid), Math.abs(x.qty), x.reason || "",
      ]),
    ];
    const fname = "דוח-מטבח-" + label.replace(" ", "-");
    const XLSX = window.XLSX;
    if (XLSX) {
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "דוח");
      XLSX.writeFile(wb, fname + ".xlsx");
    } else {
      const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = fname + ".csv"; a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          סיכום ההתנהלות בתקופה הנבחרת. אפשר להוריד כקובץ להפצה בהנהלה.
        </div>
      </div>

      <div className="fld">
        <label>תקופה</label>
        <select value={mi} onChange={(e) => setMi(Number(e.target.value))}>
          {months.map((d, i) => (
            <option key={i} value={i}>{MON[d.getMonth()]} {d.getFullYear()}</option>
          ))}
        </select>
      </div>

      <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={exportExcel}>
        <I.download /> הורד דוח כקובץ אקסל
      </button>

      <div className="sec-label">ביצוע משימות – השבוע</div>
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="wk">
          {week.map((w) => (
            <div className={"wk-day" + (w.isToday ? " is-today" : "")} key={w.dk}>
              <div className="dn">{DAYS[w.d.getDay()].slice(0, 3)}</div>
              <div className="dd">{w.d.getDate()}/{w.d.getMonth() + 1}</div>
              {w.status === "future"
                ? <div className="wk-mark fut" />
                : <div className={"wk-mark " + (w.status === "done" ? "done" : "miss")}>
                    <span style={{ color: "#fff" }}>{w.status === "done" ? <I.check /> : <I.x width="15" height="15" />}</span>
                  </div>}
              {/* התא צר — שם ראשון, ומונה כשיש יותר מתורן אחד */}
              <div className="who2">
                {w.duty.length === 0 ? "—"
                  : w.duty[0].split(" ")[0] + (w.duty.length > 1 ? ` +${w.duty.length - 1}` : "")}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, margin: "0 4px 18px", lineHeight: 1.5 }}>
        ✓ כל המשימות של היום בוצעו &nbsp;•&nbsp; ✗ יום עם משימה שלא בוצעה &nbsp;•&nbsp; פס אפור – יום שטרם הגיע
      </div>

      {/* נוסף מתחת ללוח הקיים, לא במקומו */}
      <TasksWeekSummary />

      {inMonth.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="e1">אין עדיין תנועות בחודש הזה</div>
          <div className="e2">הדוח מתמלא מעצמו מהעדכונים היומיים ומהספירות.</div></div></div>
      ) : (<>
        <div className="stats" style={{ marginBottom: 10 }}>
          <div className="stat"><div className="k">נקנה</div><div className="v">{shek(buy)}</div><div className="n">קבלות מצרכים</div></div>
          <div className="stat ok"><div className="k">נצרך</div><div className="v">{shek(use)}</div><div className="n">שימוש מדווח</div></div>
          <div className="stat clay"><div className="k">פחת</div><div className="v">{shek(waste)}</div>
            <div className="n">{wasteRate.toFixed(1)}% מהצריכה</div></div>
          <div className="stat clay"><div className="k">פער ספירה</div><div className="v">{shek(shrink)}</div>
            <div className="n">חוסר לא מדווח</div></div>
        </div>

        {byReason.length > 0 && (<>
          <div className="sec-label">פחת לפי סיבה</div>
          <div className="card" style={{ marginBottom: 6 }}>
            {byReason.map((x) => (
              <div className="bar" key={x.r}>
                <span className="bn">{x.r}</span>
                <span className="bt"><i style={{ width: (x.v / maxR) * 100 + "%" }} /></span>
                <span className="bv">{shek(x.v)}</span>
              </div>
            ))}
          </div>
        </>)}

      </>)}
    </>
  );
}

/* ⚠ המסך הזה היה עורך: בורר לכל יום ששמר למצב מקומי בלבד ונעלם
   ברענון. מסך שנראה כמו עורך ולא שומר לשום מקום הוא באג, לא
   פשרה — ולכן הבוררים הוסרו.

   השיבוץ נערך בלוח ב-monday, וכאן רק מוצג. */
function Team({ ctx }) {
  const [duty, setDuty] = useState(null);
  const [users, setUsers] = useState(null);

  useEffect(() => {
    let live = true;
    api.getDutyWeek(testDate() || undefined)
      .then((d) => live && setDuty(d))
      .catch(() => live && setDuty({ days: [[], [], [], [], [], [], []], found: false }));
    api.getUsers()
      .then((r) => live && setUsers(r.users || []))
      .catch(() => live && setUsers([]));
    return () => { live = false; };
  }, []);

  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          שיבוץ התורנויות נערך בלוח <strong>“מלאי מטבח – שיבוץ תורנויות”</strong> ב-monday.
          כאן הוא מוצג בלבד. שינוי בלוח מופיע כאן תוך כחצי דקה.
        </div>
      </div>

      <div className="sec-label" style={{ marginTop: 0 }}>
        {duty?.week ? `שיבוץ לשבוע ${duty.week}` : "שיבוץ השבוע"}
      </div>

      {duty && !duty.found ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="led-empty">אין שורת שיבוץ לשבוע הזה בלוח.</div>
        </div>
      ) : (
        <div className="rows" style={{ marginBottom: 16 }}>
          {DAYS.map((d, i) => {
            const names = duty?.days?.[i] || [];
            return (
              <div className="row" key={i}>
                <div className="r-main"><div className="r-name">יום {d}</div></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: names.length ? "var(--ink)" : "var(--faint)" }}>
                  {duty ? (names.length ? names.join(", ") : "—") : "…"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="sec-label">משתמשים</div>
      <div className="card" style={{ marginBottom: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          המשתמשים וההרשאות נערכים בלוח <strong>“מלאי מטבח – משתמשים והרשאות”</strong> ב-monday.
          כאן הם מוצגים בלבד. קודי הכניסה אינם מוצגים ואינם יוצאים מהשרת.
        </div>
      </div>

      {!users ? (
        <div className="card"><div className="led-empty">טוען…</div></div>
      ) : (
        <div className="rows">
          {users.map((u) => (
            <div className="row" key={u.id} style={u.active ? undefined : { opacity: .55 }}>
              <div className="r-main">
                <div className="r-name">{u.name}</div>
                <div className="r-meta">{u.active ? "פעיל" : "כובה"}</div>
              </div>
              <span className={"pill " + (u.kind === "מנהל" ? "p-ok" : "")}
                style={u.kind !== "מנהל" ? { background: "var(--bg)", color: "var(--muted)" } : undefined}>
                {u.kind}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================ MODALS ============================ */
function Modal({ ctx, modal, close }) {
  if (modal.t === "user") return <UserModal ctx={ctx} close={close} />;
  if (modal.t === "product") return <ProductModal ctx={ctx} close={close} p={modal.p} />;
  if (modal.t === "addItem") return <AddItemModal ctx={ctx} close={close} listId={modal.listId} />;
  if (modal.t === "newProduct") return <NewProductModal ctx={ctx} close={close} listId={modal.listId} sup={modal.sup} name0={modal.name0} />;
  return null;
}

/* ⚠ כאן היה בורר משתמשים: רשימת שמות שכל לחיצה עליה "החליפה
   זהות". מרגע שהאכיפה עברה לשרת הוא לא החליף דבר — אותו באג
   בדיוק שהיה בטאב התורנויות. הוסר.

   הזהות מגיעה מהסשן. תורן יכול להחליף את השם שבחר; מנהל לא —
   שמו נקבע לפי הקוד האישי שאיתו נכנס. */
function UserModal({ ctx, close }) {
  const { auth, onSignedOut, say } = ctx;
  const [out, setOut] = useState(false);
  const [picking, setPicking] = useState(false);
  const [roster, setRoster] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const signOut = () => {
    if (out) return;
    setOut(true);
    api.logout().finally(() => onSignedOut());
  };

  const openPicker = () => {
    setErr(null);
    api.me()
      .then((m) => { setRoster(m.roster || []); setPicking(true); })
      .catch((e) => setErr(e.message));
  };

  const choose = (name) => {
    if (busy) return;
    setBusy(true); setErr(null);
    api.setMyName(name)
      .then(() => { say("השם עודכן ל" + name); close(); window.location.reload(); })
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>הזהות שלי</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <div className="card" style={{ marginBottom: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 700, marginBottom: 3 }}>
              {auth?.isManager ? "מנהל" : "תורן"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-.3px" }}>
              {auth?.name || "תורן"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>
              {auth?.isManager
                ? "השם נקבע לפי הקוד האישי שאיתו נכנסת."
                : "השם משמש לתיעוד הדיווחים. אפשר להחליף אותו."}
            </div>
          </div>

          {err && <div className="login-err" style={{ marginBottom: 12 }}>{err}</div>}

          {!auth?.isManager && !picking && (
            <button className="btn btn-ghost" style={{ marginBottom: 9 }} onClick={openPicker}>
              שינוי שם
            </button>
          )}

          {picking && (
            <>
              <div className="sec-label" style={{ marginTop: 0 }}>בחרו שם</div>
              <div className="login-roster" style={{ marginBottom: 14 }}>
                {roster.map((r) => (
                  <button key={r.id} className="login-name" disabled={busy}
                    onClick={() => choose(r.name)}>
                    {r.name}
                    {r.name === auth?.name && <span style={{ color: "var(--ok)", marginRight: 8 }}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          <button className="btn btn-ghost" disabled={out} onClick={signOut}>
            {out ? "מתנתק…" : "התנתקות"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ ctx, close, p }) {
  const { st, upsertProduct, say, isMgr, setSt } = ctx;
  const isNew = !p;
  const [f, setF] = useState(() => p ? { ...p } : {
    id: "p" + uid(), name: "", cat: CATS[0], unit: "kg", tracking: "weekly", exp: 0,
    min: 0, target: 0, sup: "super", price: 0, stock: 0, order: 999, expiryFlag: null, pending: !isMgr,
  });
  const sims = useMemo(() => (f.name.length >= 2 ? findSimilar(f.name, st.products, f.id) : []), [f.name, st.products, f.id]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>{isNew ? "מוצר חדש" : f.name}</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <div className="fld">
            <label>שם המוצר</label>
            <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="לדוגמה: עגבניות שרי" />
          </div>

          {isNew && sims.length > 0 && (
            <div className="alert a-amber" style={{ marginBottom: 14 }}>
              <span style={{ marginTop: 1 }}><I.warn /></span>
              <div style={{ flex: 1 }}>
                <div className="ttl">כבר קיים משהו דומה</div>
                <div className="bd">אולי אחד מאלה הוא אותו מוצר. עדיף להשתמש בקיים.</div>
                <div className="chips">{sims.map((s) => <span className="chip" key={s.p.id}>{s.p.name}</span>)}</div>
              </div>
            </div>
          )}

          <div className="fld">
            <label>קטגוריה</label>
            <select value={f.cat} onChange={(e) => set("cat", e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="fld">
            <label>יחידת מדידה</label>
            <div className="pick">
              {Object.entries(UNITS).map(([k, v]) => (
                <button key={k} className={f.unit === k ? "on" : ""} onClick={() => set("unit", k)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <label>מעקב</label>
            <div className="pick">
              <button className={f.tracking === "daily" ? "on" : ""} onClick={() => set("tracking", "daily")}>יומי – טרי</button>
              <button className={f.tracking === "weekly" ? "on" : ""} onClick={() => set("tracking", "weekly")}>שבועי – יבש</button>
            </div>
          </div>

          <div className="fld">
            <label>תוקף</label>
            <div className="pick">
              <button className={f.exp ? "on" : ""} onClick={() => set("exp", 1)}>לעקוב אחרי תוקף</button>
              <button className={!f.exp ? "on" : ""} onClick={() => set("exp", 0)}>לא רלוונטי</button>
            </div>
          </div>

          <div className="fld">
            <label>ספק</label>
            <div className="pick">
              <button className={f.sup === "super" ? "on" : ""} onClick={() => set("sup", "super")}>סופר</button>
              <button className={f.sup === "wholesale" ? "on" : ""} onClick={() => set("sup", "wholesale")}>סיטונאי</button>
            </div>
          </div>

          <div className="three">
            <div className="fld"><label>מינימום</label>
              <input type="number" inputMode="decimal" value={f.min} onChange={(e) => set("min", Number(e.target.value))} /></div>
            <div className="fld"><label>יעד</label>
              <input type="number" inputMode="decimal" value={f.target} onChange={(e) => set("target", Number(e.target.value))} /></div>
            <div className="fld"><label>מחיר ליח׳</label>
              <input type="number" inputMode="decimal" value={f.price} onChange={(e) => set("price", Number(e.target.value))} /></div>
          </div>

          {!isNew && (
            <div className="fld"><label>מלאי נוכחי</label>
              <input type="number" inputMode="decimal" value={f.stock} onChange={(e) => set("stock", Number(e.target.value))} /></div>
          )}

          {f.target <= f.min && f.target > 0 && (
            <div className="alert a-amber" style={{ marginBottom: 14 }}>
              <span style={{ marginTop: 1 }}><I.warn /></span>
              <div><div className="ttl">היעד צריך להיות גבוה מהמינימום</div>
                <div className="bd">אחרת כל קנייה מחזירה אתכם מיד לסף ההתראה.</div></div>
            </div>
          )}

          <button className="btn btn-primary" style={{ marginTop: 4 }}
            disabled={!f.name.trim() || f.target <= f.min}
            onClick={() => { upsertProduct({ ...f, name: f.name.trim() }); say(isNew ? (f.pending ? "נוצר – ממתין לאישור מנהל" : "המוצר נוסף") : "עודכן"); close(); }}>
            {isNew ? "צור מוצר" : "שמור שינויים"}
          </button>

          {!isNew && (
            <button className="btn btn-ghost" style={{ marginTop: 9, color: "var(--clay)" }}
              onClick={() => { setSt((s) => ({ ...s, products: s.products.filter((x) => x.id !== f.id) })); say("המוצר הוסר"); close(); }}>
              הסר מהקטלוג
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddItemModal({ ctx, close, listId }) {
  const { st, patchList, setModal } = ctx;
  const [q, setQ] = useState("");
  const list = st.lists.find((l) => l.id === listId);
  const inList = new Set(list ? list.items.map((i) => i.pid) : []);
  const res = st.products.filter((p) => !inList.has(p.id) && (!q || normHe(p.name).includes(normHe(q))))
    .slice(0, 40);
  const sims = q.length >= 2 ? findSimilar(q, st.products, null) : [];

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>הוספה לרשימה</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <input className="search" autoFocus placeholder="חפשו לפני שיוצרים חדש…"
            value={q} onChange={(e) => setQ(e.target.value)} />
          {q && res.length === 0 && (
            <>
              {sims.length > 0 && (
                <div className="alert a-amber">
                  <span style={{ marginTop: 1 }}><I.warn /></span>
                  <div style={{ flex: 1 }}>
                    <div className="ttl">אולי התכוונתם לאחד מאלה</div>
                    <div className="chips">{sims.map((s) => <span className="chip" key={s.p.id}>{s.p.name}</span>)}</div>
                  </div>
                </div>
              )}
              <button className="btn btn-ghost" onClick={() => { close(); setModal({ t: "newProduct", listId, sup: list ? list.sup : "super", name0: q }); }}>
                <I.plus /> צור מוצר חדש בשם “{q}”
              </button>
            </>
          )}
          <div className="rows">
            {res.map((p) => (
              <button className="row" key={p.id} style={{ width: "100%", textAlign: "right" }}
                onClick={() => {
                  ctx.rowAdd(listId, p, Math.max(1, Math.ceil(p.target - p.stock)));
                  close();
                }}>
                <div className="r-main">
                  <div className="r-name">{p.name}</div>
                  <div className="r-meta num">יש {nfmt(p.stock)} {UNITS[p.unit]} • {p.sup === "super" ? "סופר" : "סיטונאי"}</div>
                </div>
                <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Simple new-product creator for trainees: name + unit + qty.
   Creates a product marked pending (awaits manager approval into catalog),
   and immediately adds it to the current shopping list so the trainee isn't blocked. */
function NewProductModal({ ctx, close, listId, sup, name0 }) {
  const { st, setSt, patchList, say, user } = ctx;
  const [name, setName] = useState(name0 || "");
  const [unit, setUnit] = useState("unit");
  const [qty, setQty] = useState("1");
  const sims = useMemo(() => (name.trim().length >= 2 ? findSimilar(name, st.products, null) : []), [name, st.products]);

  const create = () => {
    const clean = name.trim();
    const id = "p" + uid();
    const prod = {
      id, name: clean, cat: "יבשים", unit, tracking: "weekly", exp: 0,
      min: 0, target: 0, sup: sup || "super", price: 0, stock: 0,
      order: 999, expiryFlag: null, pending: true, createdBy: user.name,
    };
    setSt((s) => ({ ...s, products: [...s.products, prod] }));
    if (listId) {
      const list = st.lists.find((l) => l.id === listId);
      if (list) patchList(listId, { items: [...list.items, { pid: id, qty: Number(qty) || 1, got: null }] });
    }
    say("נוסף לרשימה • ממתין לאישור מנהל לקטלוג");
    close();
  };

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>מוצר שלא ברשימה</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
              המוצר יתווסף לרשימת הקניות עכשיו. הוא ייכנס לקטלוג הקבוע רק אחרי אישור מנהל.
            </div>
          </div>

          <div className="fld">
            <label>שם המוצר</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: שוקולד לבן" />
          </div>

          {sims.length > 0 && (
            <div className="alert a-amber" style={{ marginBottom: 14 }}>
              <span style={{ marginTop: 1 }}><I.warn /></span>
              <div style={{ flex: 1 }}>
                <div className="ttl">אולי כבר קיים משהו דומה</div>
                <div className="bd">עדיף לחזור אחורה ולהוסיף מהקיים, כדי לא ליצור כפילות.</div>
                <div className="chips">{sims.map((s) => <span className="chip" key={s.p.id}>{s.p.name}</span>)}</div>
              </div>
            </div>
          )}

          <div className="fld">
            <label>יחידת מדידה</label>
            <div className="pick">
              {Object.entries(UNITS).map(([k, v]) => (
                <button key={k} className={unit === k ? "on" : ""} onClick={() => setUnit(k)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <label>כמה להוסיף לרשימה</label>
            <Stepper value={qty} unit={unit} onChange={setQty} wide />
          </div>

          <button className="btn btn-primary" style={{ marginTop: 4 }}
            disabled={!name.trim()} onClick={create}>
            הוסף לרשימה
          </button>
        </div>
      </div>
    </div>
  );
}
