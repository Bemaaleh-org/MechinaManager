/* ============================================================
   מסך ציוד — משותף לשני התחומים בפרויקט
   ------------------------------------------------------------
   ציוד המכינה (מכולה · ניקיון) וציוד המטבח (אוכל · חד״פ) הם
   אותה טבלה בדיוק: פריט, כמות, סוג, מפתח ורשימת קניות. הם
   נבדלים רק בלוח שממנו הם נקראים ובניסוחים — ולכן יש כאן מסך
   אחד שמקבל את התחום כפרמטר.

   ⚠ שני עותקים של המסך היו נפרדים זה מזה בתיקון הראשון שנעשה
     רק באחד מהם. זו בדיוק הסיבה שמכולה וניקיון חלקו מסך אחד
     מלכתחילה, והיא לא השתנתה כשנוסף המטבח.

   כל תחום מספק אובייקט domain אחד: הניסוחים ושבע קריאות
   השרת שלו. הקומפוננטה לא יודעת דבר מעבר לזה — ראו
   Container.jsx ו-Kitchen.jsx, ששניהם קבצי הגדרה בלבד.

   שלושה חלקים: הציוד עצמו (מתכלה / תמידי, עריכה, הוספה
   ומחיקה), המפתח — כמה צריך להיות מכל פריט — ורשימת קניות
   שנבנית ידנית או אוטומטית מהחוסרים ביחס למפתח.
   ============================================================ */

import React, { useState, useEffect, useCallback, useContext, createContext } from "react";
import { useExcel, downloadTable, shareText } from "./excel.js";
import { missingFor } from "../shared/par.js";
import { produceList, kgPerUnit, unitsToKg, kgToUnits } from "../shared/produce.js";

/* ============================================================
   הקשר התחום — הניסוחים וקריאות השרת של המכולה או של המטבח.
   ------------------------------------------------------------
   ⚠ דרך הקשר ולא דרך props, כי הקריאות נחוצות גם בעומק העץ —
     שורת ציוד, בונה הרשימה ולשונית המפתח. השחלה ידנית הייתה
     מוסיפה פרמטר לכל קומפוננטה בלי להוסיף שום מידע.
   ============================================================ */
const DomainCtx = createContext(null);
const useDomain = () => useContext(DomainCtx);

/**
 * מספר לתצוגה.
 * ⚠ בלי אפסים מיותרים: 1.4 ולא 1.40, אבל 1.44 נשאר 1.44.
 *   מחיר של 12 אינו "12.00" — הדיוק המדומה הזה סותר את ה-≈
 *   שמופיע לידו.
 *
 * ⚠ **מספרים קטנים דורשים יותר ספרות.** שתי ספרות עיגלו את
 *   עגבניית השרי מ-0.012 ל-0.01 — שגיאה של 20% — והשורה
 *   סתרה את עצמה: "0.01 ק״ג ליחידה" מול "83 יחידות בק״ג".
 */
const fmt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const digits = Math.abs(v) < 0.1 ? 3 : 2;
  return v.toLocaleString("he-IL", { maximumFractionDigits: digits });
};

const CI = {
  box: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
  check: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  cart: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  dl: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  share: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="m8.3 10.8 7.4-3.6M8.3 13.2l7.4 3.6"/></svg>,
};

function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);
  const run = useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

const Loading = ({ what }) => (
  <div className="empty" style={{ paddingTop: 60 }}><div className="e1">{what}…</div></div>
);

/* ---------- הקמה חסרה — מצב מתוכנן, לא תקלה ----------
   ⚠ מסך נפרד מ-LoadFail בכוונה: "עוד לא חובר" ו"נשבר"
     דורשים תגובה שונה מהמשתמש, ואסור שייראו אותו דבר. */
function SetupNeeded({ msg }) {
  return (
    <div className="card" style={{ padding: "22px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}><CI.box /></div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
        המסך הזה עדיין לא חובר ל-monday
      </div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
        {msg}
      </div>
    </div>
  );
}

function LoadFail({ msg, onRetry }) {
  return (
    <div className="alert a-clay">
      <CI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הנתונים</div>
        <div className="bd">{msg} — מה שמוצג כאן אינו מעודכן ואסור להסתמך עליו.</div>
        {onRetry && <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>נסו שוב</button>}
      </div>
    </div>
  );
}

/* ---------- שורת ציוד — עריכה במקום ---------- */
function EquipRow({ item, say, onChanged }) {
  const d = useDomain();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: item.name, qty: item.qty, kind: item.kind,
    par: item.par == null ? "" : String(item.par),
    price: item.price == null ? "" : String(item.price),
    kgPer: item.kgPer == null ? "" : String(item.kgPer),
  });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [add, setAdd] = useState("");
  const [stepping, setStepping] = useState(false);
  const missing = missingFor(item);

  /* ⚠ שולח כמה נוסף, לא כמה יש. שני אנשים שמכניסים סחורה
     באותה דקה מקבלים סכום ולא דריסה זה של זה. */
  const bump = (delta) => {
    if (stepping) return;
    setStepping(true);
    d.addQty({ itemId: item.id, delta })
      .then(() => onChanged())
      .catch((e) => say(e.message))
      .finally(() => setStepping(false));
  };

  const applyAdd = (sign) => {
    const n = Number(add);
    if (!Number.isFinite(n) || n === 0) { say("הזינו כמה נוסף"); return; }
    if (stepping) return;
    setStepping(true);
    d.addQty({ itemId: item.id, delta: n * sign })
      .then(() => { setAdd(""); say(sign > 0 ? "נוסף למלאי" : "ירד מהמלאי"); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setStepping(false));
  };

  const save = () => {
    if (busy || !f.name.trim()) return;
    setBusy(true);
    d.editEquip({
      itemId: item.id, name: f.name.trim(), qty: f.qty, kind: f.kind,
      par: f.par,
      ...(d.money ? { price: f.price, kgPer: f.kgPer } : {}),
    })
      .then(() => { say("נשמר"); setOpen(false); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const remove = () => {
    if (busy) return;
    setBusy(true);
    d.deleteEquip(item.id)
      .then(() => { say("הפריט נמחק"); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button className="st-row" style={{ borderBottom: "none" }} onClick={() => setOpen(!open)}>
        <div className="st-main">
          <div className="st-n">{item.name}</div>
          <div className="st-m">
            <span className={"pill " + (item.kind === "מתכלה" ? "p-new" : "p-ok")}>{item.kind}</span>
            {item.par != null && <span>מפתח {item.par}</span>}
            {missing > 0 && <span className="pill p-low">חסר {missing}</span>}
            {/* ⚠ תמיד עם ≈. המחיר הוא סדר גודל ולא מחיר חוזה,
                ומספר בלי הסימן הזה נקרא כאילו נספר בקופה. */}
            {item.cost != null && <span>≈ ₪{fmt(item.cost)}</span>}
            {item.kgTotal != null && <span>≈ {fmt(item.kgTotal)} ק״ג</span>}
          </div>
          {/* ⚠ כמות מול מפתח כפס. "18 · מפתח 30 · חסר 12" מחייב
              חישוב בראש; פס באורך 60% נקרא במבט אחד. פריט בלי
              מפתח אין מה למדוד מולו ולכן אין לו פס. */}
          {item.par > 0 && (
            <div className={"mini-bar" + (missing > 0 ? " low" : "")}>
              <div className="mini-fill"
                style={{ width: Math.min(100, ((item.qty || 0) / item.par) * 100) + "%" }} />
            </div>
          )}
        </div>
        <CI.chev style={{ transform: open ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
      </button>

      {/* ⚠ המד יושב מחוץ לכפתור הפתיחה ולא בתוכו. כפתור בתוך
          כפתור אינו חוקי, והלחיצה על פלוס הייתה פותחת גם את
          העריכה. */}
      {/* ⚠ הפלוס מימין והמינוס משמאל, גם בממשק עברי. הסימנים
          האלה מתמטיים ולא טקסטואליים — משתמש מצפה שהמינוס יהיה
          בצד שבו מספרים קטנים, ובכל מקום בעולם זה השמאל.
          בסדר ה-DOM זה אומר שהפלוס ראשון. */}
      <div className="qstep">
        <button className="qs-btn" disabled={stepping} aria-label="הוספה"
          onClick={() => bump(1)}>+</button>
        <span className="qs-n num">{item.qty || "—"}</span>
        <button className="qs-btn" disabled={stepping} aria-label="הורדה"
          onClick={() => bump(-1)}>−</button>
      </div>

      {open && (
        <div style={{ padding: "0 13px 13px" }}>
          {/* ---------- כמה נוסף ----------
              ⚠ זה השדה שמשמש ביום-יום: מגיעה סחורה, רושמים כמה
                הגיעה. השדות למטה הם לתיקון ולעריכה, לא לקבלה. */}
          <div className="fld qadd">
            <label>כמה נוסף או ירד</label>
            <div className="qadd-row">
              <input value={add} disabled={stepping} inputMode="decimal" placeholder="0"
                onChange={(e) => setAdd(e.target.value)} />
              <button className="qa-plus" disabled={stepping || !add}
                onClick={() => applyAdd(1)}>הוספה</button>
              <button className="qa-minus" disabled={stepping || !add}
                onClick={() => applyAdd(-1)}>הורדה</button>
            </div>
            <div className="qadd-hint">
              המלאי כרגע <b>{item.qty || "—"}</b> · המספר כאן מתווסף אליו ולא מחליף אותו
            </div>
          </div>

          <div className="two">
            <div className="fld">
              <label>שם</label>
              <input value={f.name} disabled={busy}
                onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div className="fld">
              <label>תיקון כמות (דורס)</label>
              <input value={f.qty} disabled={busy}
                onChange={(e) => setF({ ...f, qty: e.target.value })} />
            </div>
          </div>
          <div className="two">
            <div className="fld">
              <label>סוג</label>
              <div className="pick">
                {["מתכלה", "תמידי"].map((k) => (
                  <button type="button" key={k} className={f.kind === k ? "on" : ""} disabled={busy}
                    onClick={() => setF({ ...f, kind: k })}>{k}</button>
                ))}
              </div>
            </div>
            <div className="fld">
              <label>מפתח — כמה צריך להיות</label>
              <input value={f.par} disabled={busy} inputMode="numeric" placeholder="ריק = ללא מפתח"
                onChange={(e) => setF({ ...f, par: e.target.value })} />
            </div>
          </div>

          {d.money && (
          <>
          {/* ---------- מחיר ומשקל ----------
              ⚠ שניהם רשות. רוב הפריטים לא ימולאו, וזה בסדר —
                המסך מודיע כמה פריטים אין להם מחיר במקום להציג
                סכום שנראה שלם ואינו. */}
          <div className="two">
            <div className="fld">
              <label>מחיר ליחידה (₪)</label>
              <input value={f.price} disabled={busy} inputMode="decimal" placeholder="ריק = לא ידוע"
                onChange={(e) => setF({ ...f, price: e.target.value })} />
            </div>
            <div className="fld">
              <label>ק״ג ליחידה</label>
              <input value={f.kgPer} disabled={busy} inputMode="decimal"
                placeholder={item.kgSource === "table" ? `לפי הטבלה ≈ ${item.kgEach}` : "ריק = לא ידוע"}
                onChange={(e) => setF({ ...f, kgPer: e.target.value })} />
              {/* ⚠ אומר מאיפה הגיע המספר. "0.12" בלי מקור נראה
                  כמו מדידה, וזו הערכה מטבלה. */}
              {item.kgSource === "table" && !f.kgPer.trim() && (
                <div className="fld-hint">ממולא מטבלת ההמרה. מספר כאן גובר עליה.</div>
              )}
            </div>
          </div>
          </>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy} onClick={save}>
              {busy ? "…" : "שמירה"}
            </button>
            {confirmDel ? (
              <button className="btn btn-clay btn-sm" style={{ flex: 1 }} disabled={busy} onClick={remove}>
                למחוק לצמיתות?
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: "var(--clay)" }}
                onClick={() => setConfirmDel(true)}>מחיקה</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   טבלת המרה — כמות ↔ ק״ג
   ------------------------------------------------------------
   ⚠ **הערכה מוצהרת.** עגבנייה שוקלת בין 80 ל-180 גרם, וכל
     מספר כאן הוא ממוצע. לכן ≈ בכל מקום ומשפט פתיחה שאומר
     את זה במילים — טבלה שנראית מדויקת ואינה, מסוכנת מטבלה
     שמצהירה על עצמה.

   ⚠ ההמרה עובדת **לשני הכיוונים**, כי שתי השאלות אמיתיות:
     "כמה ק״ג זה 12 מלפפונים" בבוקר של קניות, ו"כמה עגבניות
     יוצאות מ-5 ק״ג" כשמחלקים עבודה למטבח.
   ============================================================ */
function ProduceTable() {
  const [q, setQ] = useState("");
  const [pick, setPick] = useState("");
  const [amount, setAmount] = useState("");
  const [dir, setDir] = useState("toKg");   /* toKg | toUnits */

  const rows = produceList();
  const shown = q.trim()
    ? rows.filter((x) => x.name.includes(q.trim()) || kgPerUnit(q.trim()) === x.kg)
    : rows;

  const per = pick ? kgPerUnit(pick) : null;
  const out = !pick || !amount.trim() ? null
    : dir === "toKg" ? unitsToKg(amount, pick) : kgToUnits(amount, pick);

  return (
    <>
      {/* ⚠ ההסתייגות לפני הכלי ולא אחריו. מי שיקרא רק את השורה
          הראשונה יקרא בדיוק את מה שחשוב. */}
      <div className="alert a-amber">
        <div style={{ flex: 1 }}>
          <div className="ttl">המספרים כאן הם ממוצעים</div>
          <div className="bd">
            עגבנייה שוקלת בין 80 ל-180 גרם. הטבלה עונה על "כמה ק״ג להזמין",
            ולא מתאימה לחישוב עלות מדויק. פריט שהוזן לו ק״ג ליחידה בציוד — הערך שלו גובר.
          </div>
        </div>
      </div>

      {/* ---------- המחשבון ---------- */}
      <div className="sec-label">המרה מהירה</div>
      <div className="card lift" style={{ marginBottom: 14 }}>
        <div className="fld">
          <label>מה ממירים</label>
          <input value={pick} placeholder="עגבניות, מלפפונים, תפוחים…"
            onChange={(e) => setPick(e.target.value)} />
          {pick.trim() && per == null
            ? <div className="fld-bad">הפריט אינו בטבלה. אפשר להזין לו ק״ג ליחידה במסך הציוד.</div>
            : per != null && <div className="fld-hint">יחידה אחת ≈ {fmt(per)} ק״ג</div>}
        </div>
        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={dir === "toKg" ? "on" : ""} onClick={() => setDir("toKg")}>
            יחידות ← ק״ג
          </button>
          <button className={dir === "toUnits" ? "on" : ""} onClick={() => setDir("toUnits")}>
            ק״ג ← יחידות
          </button>
        </div>
        <div className="fld">
          <label>{dir === "toKg" ? "כמה יחידות" : "כמה ק״ג"}</label>
          <input value={amount} inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)} />
        </div>
        {out != null && (
          <div className="valbar" style={{ marginBottom: 0 }}>
            <div>
              <span className="val-n">≈ {fmt(out)} {dir === "toKg" ? "ק״ג" : "יחידות"}</span>
              <span className="val-l">
                {fmt(amount)} {dir === "toKg" ? "יחידות" : "ק״ג"} של {pick.trim()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ---------- הטבלה ---------- */}
      <div className="sec-label">הטבלה המלאה</div>
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש בטבלה" />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="conv">
          <thead>
            <tr>
              <th>פריט</th>
              <th className="num">ק״ג ליחידה</th>
              {/* ⚠ גם הכיוון ההפוך בטבלה עצמה. "כמה עגבניות בק״ג"
                  היא השאלה שנשאלת בקנייה, ובלעדיה כל שורה
                  דורשת חילוק בראש. */}
              <th className="num">יחידות בק״ג</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.name}>
                <td>{x.name}</td>
                <td className="num">≈ {fmt(x.kg)}</td>
                {/* ⚠ "0.2 אבטיחים בק״ג" הוא נכון וחסר תועלת.
                    פריט ששוקל יותר מק״ג נמדד ביחידות ולא בק״ג,
                    והעמודה הראשונה כבר עונה עליו. */}
                <td className="num">
                  {x.perKg < 1 ? "—" : "≈ " + Math.round(x.perKg)}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={3} style={{ color: "var(--ink3)" }}>אין התאמה</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}

/* ---------- בניית רשימת קניות ----------
   preset — כמויות שכבר מולאו מראש (id → כמות). כך "רשימה
   מהחוסרים" נכנסת לאותו מסך במקום להיות מסלול שני משלה. */
function ShoppingBuilder({ equipment, area, say, onDone, onCancel, preset = null, title }) {
  const d = useDomain();
  const [picked, setPicked] = useState(preset || {}); // id → qty
  const [extra, setExtra] = useState([]); // {name, qty}
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const list = equipment.filter((x) => !q.trim() || x.name.includes(q.trim()));
  const count = Object.keys(picked).length + extra.filter((x) => x.name.trim()).length;

  const submit = () => {
    if (busy || !count) return;
    setBusy(true);
    const items = [
      ...Object.entries(picked).map(([id, qty]) => ({
        name: (equipment.find((x) => x.id === id) || {}).name, qty,
      })),
      ...extra.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), qty: x.qty })),
    ];
    d.addShopping(items, area)
      .then((r) => { say(`נוצרה רשימה — ${r.created} פריטים`); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <CI.chev style={{ transform: "rotate(180deg)" }} />ביטול
      </button>
      <div className="screen-title">{title || "רשימת קניות חדשה"}</div>

      <div className="sec-label">מהציוד הקיים · הקלידו כמות לבחירה</div>
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש ציוד" />
      <div className="rows" style={{ maxHeight: "40vh", overflowY: "auto" }}>
        {list.map((x) => (
          <div className="st-row" key={x.id}>
            <div className="st-main">
              <div className="st-n">{x.name}</div>
              <div className="st-m">
                <span>במלאי: {x.qty || "—"}</span>
                {x.par != null && <span>· מפתח {x.par}</span>}
              </div>
            </div>
            <input value={picked[x.id] || ""} placeholder="כמות" inputMode="numeric"
              style={{ width: 76, minHeight: 40, background: "var(--bg)",
                       border: "1px solid var(--line2)", borderRadius: 9,
                       padding: "0 10px", fontSize: 14, textAlign: "center" }}
              onChange={(e) => {
                const v = e.target.value;
                setPicked((p) => {
                  const n = { ...p };
                  if (v.trim()) n[x.id] = v; else delete n[x.id];
                  return n;
                });
              }} />
          </div>
        ))}
      </div>

      <div className="sec-label">פריטים חדשים</div>
      {extra.map((x, i) => (
        <div className="two" key={i} style={{ marginBottom: 8 }}>
          <input placeholder="שם המוצר" value={x.name}
            style={{ minHeight: 46, background: "var(--surface)", border: "1px solid var(--line2)",
                     borderRadius: 11, padding: "0 13px", fontSize: 15 }}
            onChange={(e) => setExtra((p) => p.map((y, j) => j === i ? { ...y, name: e.target.value } : y))} />
          <input placeholder="כמות" value={x.qty}
            style={{ minHeight: 46, background: "var(--surface)", border: "1px solid var(--line2)",
                     borderRadius: 11, padding: "0 13px", fontSize: 15 }}
            onChange={(e) => setExtra((p) => p.map((y, j) => j === i ? { ...y, qty: e.target.value } : y))} />
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 14 }}
        onClick={() => setExtra((p) => [...p, { name: "", qty: "" }])}>
        <CI.plus />שורה חדשה
      </button>

      <button className="btn btn-primary" disabled={busy || !count} onClick={submit}>
        {busy ? "יוצר…" : `יצירת הרשימה (${count === 1 ? "פריט אחד" : count + " פריטים"})`}
      </button>
    </>
  );
}

/* ---------- מפתח: כמה צריך להיות מכל פריט ----------
   ⚠ המפתח נשמר בלוח ולא בקוד — המכינה משנה אותו מדי חודש בלי
     דיפלוי. שמירה קורית ביציאה מהשדה, כדי שאפשר יהיה למלא
     עשרות שורות ברצף בלי ללחוץ "שמירה" בכל אחת. */
function ParTab({ equipment, short, say, onChanged }) {
  const d = useDomain();
  const [draft, setDraft] = useState({}); // id → מה שהוקלד וטרם נשמר
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState("");

  const valueOf = (x) => (x.id in draft ? draft[x.id] : (x.par == null ? "" : String(x.par)));

  const commit = (x) => {
    const v = draft[x.id];
    if (v === undefined) return;
    const same = v.trim() === (x.par == null ? "" : String(x.par));
    if (same) { setDraft((d) => { const n = { ...d }; delete n[x.id]; return n; }); return; }
    setBusyId(x.id);
    d.editEquip({ itemId: x.id, par: v.trim() })
      .then(() => { setDraft((d) => { const n = { ...d }; delete n[x.id]; return n; }); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  const list = equipment.filter((x) => !q.trim() || x.name.includes(q.trim()));
  const totalMissing = short.reduce((s, x) => s + x.missing, 0);

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          המפתח הוא הכמות שצריכה להיות במלאי. מה שחסר ביחס אליו הופך
          לרשימת קניות בלחיצה אחת — בסוף כל חודש.
        </div>
      </div>

      {short.length > 0 ? (
        <div className="alert a-amber" style={{ marginBottom: 12 }}>
          <CI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">
              {short.length === 1 ? "פריט אחד מתחת למפתח" : `${short.length} פריטים מתחת למפתח`}
            </div>
            <div className="bd">
              {short.slice(0, 3).map((s) => `${s.item.name} (${s.missing})`).join(" · ")}
              {short.length > 3 ? ` ועוד ${short.length - 3}` : ""}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 12, textAlign: "center",
                                       fontSize: 13.5, fontWeight: 700, color: "var(--muted)" }}>
          {equipment.some((x) => x.par != null)
            ? "אין חוסרים — כל הפריטים במפתח או מעליו"
            : "עדיין לא הוגדר מפתח לאף פריט"}
        </div>
      )}

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש פריט" />

      <div className="grp-h">
        <span>כמות במלאי · מפתח</span>
        <span>{totalMissing ? `סה״כ חסר: ${totalMissing}` : "הקלידו מפתח"}</span>
      </div>

      <div className="rows">
        {list.map((x) => {
          const miss = missingFor(x);
          return (
            <div className="st-row" key={x.id}>
              <div className="st-main">
                <div className="st-n">{x.name}</div>
                <div className="st-m">
                  <span>במלאי: {x.qty || "—"}</span>
                  {miss > 0 && <span className="pill p-low">חסר {miss}</span>}
                  {miss === 0 && x.par != null && <span className="pill p-ok">מלא</span>}
                </div>
              </div>
              <input value={valueOf(x)} inputMode="numeric" placeholder="מפתח"
                disabled={busyId === x.id}
                style={{ width: 78, minHeight: 40, background: "var(--bg)",
                         border: "1px solid var(--line2)", borderRadius: 9,
                         padding: "0 10px", fontSize: 14, textAlign: "center" }}
                onChange={(e) => setDraft((d) => ({ ...d, [x.id]: e.target.value }))}
                onBlur={() => commit(x)}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- הדף המלא ----------
   domain — הגדרת התחום: { look, areas, ...שבע קריאות השרת }.
   area  — התחום המוצג כרגע, אחד מ-domain.areas.               */
/* ⚠ area === null פירושו "כל התחומים יחד". השרת כבר תמך בזה —
   ?action=equip בלי area מחזיר את הלוח כולו עם עמודת area לכל
   פריט — ורק המסך הכריח לבחור אחד. */
export function EquipmentPage({ say, domain, area }) {
  return (
    <DomainCtx.Provider value={domain}>
      <EquipmentScreen say={say} domain={domain}
        area={area === null ? null : area || domain.areas[0]} />
    </DomainCtx.Provider>
  );
}

function EquipmentScreen({ say, domain: d, area }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => d.load(area), [area]);
  const [sub, setSub] = useState("equip");
  const [kindFilter, setKindFilter] = useState(null);
  /* ⚠ רק במצב המאוחד. ראו ההערה ליד הבורר. */
  const [areaFilter, setAreaFilter] = useState(null);
  /* מזהה → סטטוס, עד לטעינה הבאה. ראו setStatus. */
  const [patch, setPatch] = useState({});
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [building, setBuilding] = useState(null); // null | "manual" | "missing"
  const [nf, setNf] = useState({ name: "", qty: "", kind: d.defaultKind, par: "", price: "" });
  const [savingNew, setSavingNew] = useState(false);

  const look = (area === null ? d.look.all : d.look[area]) || d.look[d.areas[0]];

  /* ⚠ המסך מוחלף כשעוברים בין תחום לתחום — הסינון והחיפוש
     של הקודם היו נשארים ומסתירים חצי מהרשימה. */
  useEffect(() => {
    setSub("equip"); setKindFilter(null); setQ("");
    setAdding(false); setBuilding(null);
  }, [area]);

  if (busy && !data) return <Loading what={look.loading} />;
  if (err?.setupRequired) return <SetupNeeded msg={err.message} />;
  if (err) return <LoadFail msg={err.message || "הטעינה נכשלה"} onRetry={reload} />;
  if (!data) return null;

  /* פריטים שחסרים ביחס למפתח, ובכמה */
  const short = data.equipment
    .map((x) => ({ item: x, missing: missingFor(x) }))
    .filter((x) => x.missing > 0);

  if (building) {
    const preset = building === "missing"
      ? Object.fromEntries(short.map((s) => [s.item.id, String(s.missing)]))
      : null;
    return <ShoppingBuilder equipment={data.equipment} area={area} say={say} preset={preset}
      title={building === "missing" ? "רשימת חוסרים לפי מפתח" : "רשימת קניות חדשה"}
      onCancel={() => setBuilding(null)}
      onDone={() => { setBuilding(null); setSub("shop"); reload(); }} />;
  }

  const addNew = () => {
    if (savingNew || !nf.name.trim()) return;
    setSavingNew(true);
    /* ⚠ במצב המאוחד אין "התחום הנוכחי", ולכן הפריט נכנס לתחום
       שנבחר במסנן — ואם לא נבחר, לתחום הראשון. פריט בלי תחום
       לא היה מופיע באף מסנן. */
    d.addEquip({ name: nf.name.trim(), qty: nf.qty, kind: nf.kind, par: nf.par,
      ...(d.money ? { price: nf.price } : {}),
      area: area || areaFilter || d.areas[0] })
      .then(() => { say("הציוד נוסף"); setAdding(false); setNf({ name: "", qty: "", kind: d.defaultKind, par: "", price: "" }); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setSavingNew(false));
  };

  const equipment = data.equipment
    .filter((x) => !areaFilter || x.area === areaFilter)
    .filter((x) => !kindFilter || x.kind === kindFilter)
    .filter((x) => !q.trim() || x.name.includes(q.trim()));
  /* ⚠ ה-patch גובר על מה שהגיע מהשרת, עד לטעינה הבאה. */
  const shopping = data.shopping
    .filter((x) => !areaFilter || x.area === areaFilter)
    .map((x) => (patch[x.id] ? { ...x, status: patch[x.id] } : x));
  const open = shopping.filter((x) => x.status === "פתוח");
  const bought = shopping.filter((x) => x.status !== "פתוח");

  /* ---------- סימון קנייה ----------
     ⚠ אופטימי. הסימון מוצג מיד, והבקשה נשלחת ברקע — לחיצה
       שממתינה לתשובת monday ואז טוענת מחדש את כל הרשימה לקחה
       שנייה וחצי, וזה מרגיש כאילו הלחיצה לא נקלטה.

     ⚠ ובכישלון חוזרים אחורה ואומרים את זה. סימון אופטימי
       שנשאר על המסך אחרי שהשרת דחה אותו הוא שקר, לא נוחות. */
  const setStatus = (item, status) => {
    setPatch((p2) => ({ ...p2, [item.id]: status }));
    d.setShoppingStatus({ itemId: item.id, status })
      .catch((e) => {
        say(e.message);
        setPatch((p2) => { const n = { ...p2 }; delete n[item.id]; return n; });
      });
  };

  /* ⚠ כולם בבת אחת ובמקביל. ברשימה של ארבעים פריטים, ארבעים
     לחיצות אחת-אחרי-השנייה הן הסיבה שאיש לא סימן. */
  const markAll = (items, status) => {
    if (!items.length) return;
    setPatch((p2) => {
      const n = { ...p2 };
      for (const x of items) n[x.id] = status;
      return n;
    });
    Promise.allSettled(items.map((x) => d.setShoppingStatus({ itemId: x.id, status })))
      .then((rs) => {
        const bad = rs.filter((r) => r.status === "rejected").length;
        if (bad) { say(`${bad} פריטים לא נשמרו`); reload(); }
        else say(status === "נקנה" ? "הכול סומן כנקנה" : "הכול הוחזר לרשימה");
      });
  };

  return (
    <>
      {look.photo ? (
        /* המכולה האמיתית — הציור שעל הדופן שלה, כרקע הכותרת */
        <div className="photo-head" style={{ backgroundImage: `url(${look.photo})` }}>
          <div className="pht">{look.title}</div>
        </div>
      ) : (
        <div className="screen-title">{look.title}</div>
      )}

      <div className="seg">
        <button className={sub === "equip" ? "on" : ""} onClick={() => setSub("equip")}>
          ציוד ({data.counts.total})
        </button>
        <button className={sub === "par" ? "on" : ""} onClick={() => setSub("par")}>
          מפתח{short.length ? ` (${short.length})` : ""}
        </button>
        <button className={sub === "shop" ? "on" : ""} onClick={() => setSub("shop")}>
          קניות{data.counts.openShopping ? ` (${data.counts.openShopping})` : ""}
        </button>
        {/* ⚠ במטבח בלבד. במכולה אין ירקות להמיר. */}
        {d.money && (
          <button className={sub === "conv" ? "on" : ""} onClick={() => setSub("conv")}>
            המרה
          </button>
        )}
      </div>

      {sub === "conv" && <ProduceTable />}

      {sub === "equip" && (
        <>
          {/* ---------- התמונה הגדולה ----------
              ⚠ לפני הרשימה הארוכה: כמה פריטים יש, כמה מהם מתחת
                למפתח וכמה כבר בדרך. מי שנכנס למסך רוצה לדעת
                אם יש בעיה, לא לספור שורות. */}
          <div className="band">
            <div className="band-h">{look.title}</div>
            <div className="band-grid">
              <div className="band-c">
                <div className="band-n">{data.equipment.length}</div>
                <div className="band-l">פריטים</div>
              </div>
              <div className="band-c">
                <div className={"band-n" + (short.length ? " warn" : " ok")}>{short.length}</div>
                <div className="band-l">מתחת למפתח</div>
              </div>
              <div className="band-c">
                <div className="band-n">{(data.shopping || []).filter((x) => x.status === "פתוח").length}</div>
                <div className="band-l">ברשימת הקניות</div>
              </div>
            </div>
          </div>

          {/* ---------- שווי המלאי ----------
              ⚠ מוצג רק כשיש **בכלל** מחירים. פס שכתוב בו ₪0
                נראה כמו מחסן ריק ולא כמו מחסן בלי מחירים.

              ⚠ תמיד עם ≈ ותמיד עם מספר הפריטים שלא נספרו.
                "₪1,240" לבד נקרא כשווי המחסן כשהוא שווי של
                החלק שמולא, וזו טעות של פי שלושה. */}
          {d.money && data.value && data.value.counted > 0 && (
            <div className="valbar">
              <div>
                <span className="val-n">≈ ₪{fmt(data.value.total)}</span>
                <span className="val-l">שווי מוערך של המלאי</span>
              </div>
              {data.value.unpriced > 0 && (
                <span className="pill p-new">{data.value.unpriced} פריטים בלי מחיר</span>
              )}
            </div>
          )}

          {/* ⚠ מסנן התחום מוצג רק במצב המאוחד. במסך של תחום
              יחיד הוא היה שורה שלמה עם תשובה אחת. */}
          {area === null && d.areas.length > 1 && (
            <div className="seg">
              <button className={!areaFilter ? "on" : ""}
                onClick={() => setAreaFilter(null)}>הכול</button>
              {d.areas.map((a) => (
                <button key={a} className={areaFilter === a ? "on" : ""}
                  onClick={() => setAreaFilter(a)}>{a}</button>
              ))}
            </div>
          )}

          <div className="seg">
            <button className={!kindFilter ? "on" : ""} onClick={() => setKindFilter(null)}>הכול</button>
            <button className={kindFilter === "מתכלה" ? "on" : ""} onClick={() => setKindFilter("מתכלה")}>
              מתכלה ({data.counts.consumable})
            </button>
            <button className={kindFilter === "תמידי" ? "on" : ""} onClick={() => setKindFilter("תמידי")}>
              תמידי ({data.counts.permanent})
            </button>
          </div>

          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש ציוד" />

          <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
            onClick={() => {
              downloadTable({
                file: look.file,
                sheet: "ציוד",
                title: `${look.title} — מכינת ניר עוז`,
                /* ⚠ עמודות המחיר נוספות רק במטבח. במכולה הן
                   היו נשארות ריקות לכל אורך הקובץ. */
                header: ["פריט", "כמות", "סוג", "מפתח", "חסר",
                  ...(d.money ? ["מחיר ליחידה", "ק״ג ליחידה", "שווי מוערך"] : [])],
                rows: data.equipment.map((x) => {
                  const m = missingFor(x);
                  return [x.name, x.qty || "", x.kind || "", x.par ?? "", m > 0 ? m : "",
                    ...(d.money ? [x.price ?? "", x.kgEach ?? "", x.cost ?? ""] : [])];
                }),
                widths: [28, 12, 10, 9, 8, ...(d.money ? [12, 12, 12] : [])],
              });
              say("הקובץ ירד");
            }}><CI.dl />הורדת כל הציוד לאקסל</button>

          {adding && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="two">
                <div className="fld">
                  <label>שם הציוד</label>
                  <input value={nf.name} autoFocus disabled={savingNew}
                    onChange={(e) => setNf({ ...nf, name: e.target.value })} />
                </div>
                <div className="fld">
                  <label>כמות</label>
                  <input value={nf.qty} disabled={savingNew}
                    onChange={(e) => setNf({ ...nf, qty: e.target.value })} />
                </div>
              </div>
              <div className="two">
                <div className="fld">
                  <label>סוג</label>
                  <div className="pick">
                    {["מתכלה", "תמידי"].map((k) => (
                      <button type="button" key={k} className={nf.kind === k ? "on" : ""}
                        onClick={() => setNf({ ...nf, kind: k })}>{k}</button>
                    ))}
                  </div>
                </div>
                <div className="fld">
                  <label>מפתח (לא חובה)</label>
                  <input value={nf.par} disabled={savingNew} inputMode="numeric"
                    onChange={(e) => setNf({ ...nf, par: e.target.value })} />
                </div>
              </div>
              {/* ⚠ מחיר בלבד בהוספה. ק״ג ליחידה נגזר מהטבלה
                  ברוב המקרים, ושדה שכמעט תמיד נשאר ריק בטופס
                  קצר גורם לדלג גם על מה שכן חשוב. */}
              {d.money && (
                <div className="fld">
                  <label>מחיר ליחידה (₪) — לא חובה</label>
                  <input value={nf.price} disabled={savingNew} inputMode="decimal"
                    onChange={(e) => setNf({ ...nf, price: e.target.value })} />
                </div>
              )}
              <button className="btn btn-primary" disabled={savingNew || !nf.name.trim()} onClick={addNew}>
                {savingNew ? "מוסיף…" : "הוספת הציוד"}
              </button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setAdding(false)}>ביטול</button>
            </div>
          )}

          <div className="rows">
            {equipment.map((x) => <EquipRow key={x.id} item={x} say={say} onChanged={reload} />)}
            {equipment.length === 0 && (
              <div className="empty">
                <div className="e-ico"><CI.box /></div>
                <div className="e1">אין ציוד תואם</div>
                <div className="e2">נסו סינון אחר או חיפוש אחר.</div>
              </div>
            )}
          </div>

          <div className="sticky">
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <CI.plus />ציוד חדש
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}

      {sub === "par" && (
        <>
          <ParTab equipment={data.equipment} short={short} say={say} onChanged={reload} />

          <div className="sticky">
            <button className="btn btn-primary" disabled={!short.length}
              onClick={() => setBuilding("missing")}>
              <CI.cart />{short.length
                ? `רשימת קניות מהחוסרים (${short.length})`
                : "אין חוסרים לרשימה"}
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}

      {sub === "shop" && (
        <>
          {open.length === 0 ? (
            <div className="empty">
              <div className="e1">אין רשימת קניות פתוחה</div>
              <div className="e2">בנו רשימה מהציוד הקיים או מפריטים חדשים.</div>
            </div>
          ) : (
            <>
              {/* שיתוף הוא הדרך הנוחה לרשימת קניות — נפתח ישר
                  בוואטסאפ בטלפון; במחשב הטקסט מועתק. אקסל לצידו. */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={async () => {
                    const today = new Date().toLocaleDateString("he-IL");
                    const heading = `רשימת קניות — ${area} (${today})`;
                    const text = heading + "\n" +
                      open.map((x) => `· ${x.name}${x.qty ? " — " + x.qty : ""}`).join("\n");
                    try {
                      const how = await shareText({ title: heading, text });
                      if (how === "copied") say("הרשימה הועתקה — הדביקו בוואטסאפ");
                    } catch { say("השיתוף נכשל"); }
                  }}><CI.share />שיתוף הרשימה</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={() => {
                    downloadTable({
                      file: look.shopFile,
                      sheet: "רשימת קניות",
                      title: `רשימת קניות — ${area}`,
                      header: ["פריט", "כמות", "ביקש"],
                      rows: open.map((x) => [x.name, x.qty || "", x.by || ""]),
                      widths: [26, 12, 16],
                    });
                    say("הקובץ ירד");
                  }}><CI.dl />אקסל</button>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
                onClick={() => markAll(open, "נקנה")}>
                <CI.check />סימון הכול כנקנה ({open.length})
              </button>
              <div className="grp-h"><span>{open.length} פריטים לקנייה</span><span>לחיצה = נקנה</span></div>
              <div className="rows">
                {open.map((x) => (
                  <button className="st-row" key={x.id} onClick={() => setStatus(x, "נקנה")}>
                    <div className="tick" />
                    <div className="st-main">
                      <div className="st-n">{x.name}</div>
                      <div className="st-m"><span>{x.qty || ""}</span>{x.by && <span>· {x.by}</span>}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {bought.length > 0 && (
            <>
              <div className="sec-label">נקנו</div>
              <div className="rows">
                {bought.slice(0, 20).map((x) => (
                  <button className="st-row" key={x.id} onClick={() => setStatus(x, "פתוח")}>
                    <div className="tick on"><span style={{ color: "#fff", fontWeight: 900 }}>✓</span></div>
                    <div className="st-main">
                      <div className="st-n" style={{ color: "var(--faint)", textDecoration: "line-through" }}>
                        {x.name}
                      </div>
                      <div className="st-m"><span>{x.qty || ""}</span></div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="sticky">
            <button className="btn btn-primary" onClick={() => setBuilding("manual")}>
              <CI.cart />רשימת קניות חדשה
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}
    </>
  );
}
