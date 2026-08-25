/* ============================================================
   תקציב המטבח — כמה עולה להאכיל את המכינה
   ------------------------------------------------------------
   שני ראשים: קייטרינג (מה שמזמינים מבחוץ) וקניות (כל השאר).
   התקציב נקבע מסוגי הימים; הקניות בפועל יורדות מתקציב
   הקניות, וההפרש אומר אם חרגנו.

   עמוד לכל חודש. סוג היום נגזר מהלו״ז, ומי שרוצה אחרת כופה
   ליום בודד — כפייה מסומנת וניתנת לניקוי.

   ⚠ מנהל ואחראי מטבח. השרת אוכף; כאן זו תצוגה.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable } from "./excel.js";
import { monthLabel, ORDER_KIND } from "../shared/budget-boards.js";

const BI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  dl: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
};

const DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const dowOf = (iso) => DOW[new Date(iso + "T12:00:00Z").getUTCDay()];
const dm = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const shekel = (n) => Math.round(n || 0).toLocaleString("he-IL");

function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);
  const run = React.useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

/* ---------- עריכת יום אחד ---------- */
function DayEditor({ day, types, headcount, say, onDone, onCancel }) {
  const [type, setType] = useState(day.type);
  const [cost, setCost] = useState("");
  const [note, setNote] = useState(day.note || "");
  const [busy, setBusy] = useState(false);

  const chosen = types.find((t) => t.name === type);
  const per = cost.trim() !== "" ? Number(cost) : null;
  const preview = per != null
    ? { catering: 0, purchases: per * headcount }
    : chosen
      ? {
          catering: (chosen.cateringFixed || 0) + (chosen.catering || 0) * headcount,
          purchases: (chosen.purchases || 0) * headcount,
        }
      : { catering: 0, purchases: 0 };

  const save = () => {
    if (busy) return;
    setBusy(true);
    api.setBudgetDay({ date: day.date, type, cost: cost.trim(), note: note.trim() })
      .then(() => { say("היום עודכן"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const clear = () => {
    if (busy) return;
    setBusy(true);
    api.setBudgetDay({ date: day.date, type: null, cost: "", note: "" })
      .then(() => { say("היום חזר ללו״ז"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <BI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">יום {dowOf(day.date)}׳ · {dm(day.date)}</div>

      <div className="card">
        <div className="fld">
          <label>סוג היום</label>
          <div className="pick pick-wrap">
            {types.map((t) => (
              <button type="button" key={t.name} className={type === t.name ? "on" : ""}
                disabled={busy} onClick={() => setType(t.name)}>{t.name}</button>
            ))}
          </div>
        </div>

        <div className="fld">
          <label>סכום מיוחד לאדם (לא חובה)</label>
          <input value={cost} onChange={(e) => setCost(e.target.value)} disabled={busy}
            inputMode="numeric" placeholder="ריק = לפי סוג היום" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            סכום מיוחד נזקף כולו לקניות — הוא הוצאה נקודתית ולא שינוי בהסכם הקייטרינג.
          </div>
        </div>

        <div className="fld">
          <label>הערה</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} disabled={busy}
            placeholder="למשל: ארוחת חג, אירוח קבוצה" />
        </div>

        <div className="bg-calc">
          <span>קייטרינג {shekel(preview.catering)} · קניות {shekel(preview.purchases)}</span>
          <b className="num">{shekel(preview.catering + preview.purchases)} ₪</b>
        </div>

        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {day.overridden && (
          <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={busy} onClick={clear}>
            ביטול הכפייה — חזרה ללו״ז
          </button>
        )}
      </div>
    </>
  );
}

/* ---------- קנייה חדשה ----------
   ⚠ הקנייה יורדת מהתקציב ואינה מוסיפה לו. שבועית נזקפת כולה
     לחודש שבו נעשתה; רבעונית מתחלקת לשלושה חודשים. */
function OrderForm({ months, defaultMonth, today, say, onDone, onCancel }) {
  const [kind, setKind] = useState(ORDER_KIND.weekly);
  const [f, setF] = useState({ name: "", amount: "", startMonth: defaultMonth, date: today, note: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const quarterly = kind === ORDER_KIND.quarterly;
  const ok = f.name.trim() && Number(f.amount) > 0 && (quarterly ? f.startMonth : f.date);
  const amount = Number(f.amount) || 0;

  const save = () => {
    if (busy || !ok) return;
    setBusy(true);
    api.addPurchase({
      name: f.name.trim(), amount, kind,
      ...(quarterly ? { startMonth: f.startMonth } : { date: f.date }),
      note: f.note.trim(),
    })
      .then((r) => {
        say(quarterly ? `נוספה — מתחלקת על ${r.months.map(monthLabel).join(", ")}` : "הקנייה נוספה");
        onDone();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <BI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">קנייה חדשה</div>

      <div className="card">
        <div className="fld">
          <label>סוג הקנייה</label>
          <div className="pick">
            <button type="button" className={!quarterly ? "on" : ""} disabled={busy}
              onClick={() => setKind(ORDER_KIND.weekly)}>שבועית</button>
            <button type="button" className={quarterly ? "on" : ""} disabled={busy}
              onClick={() => setKind(ORDER_KIND.quarterly)}>רבעונית</button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            {quarterly
              ? "מתחלקת על שלושה חודשים ויורדת מכל אחד מהם"
              : "יורדת כולה מתקציב החודש שבו נעשתה"}
          </div>
        </div>

        <div className="fld">
          <label>שם הקנייה</label>
          <input value={f.name} onChange={set("name")} disabled={busy} autoFocus
            placeholder={quarterly ? "למשל: אוכל יבש — רבעון ראשון" : "למשל: קנייה שבועית"} />
        </div>

        <div className="two">
          <div className="fld">
            <label>סכום (₪)</label>
            <input value={f.amount} onChange={set("amount")} disabled={busy} inputMode="numeric" />
          </div>
          {quarterly ? (
            <div className="fld">
              <label>חודש פתיחה</label>
              <select value={f.startMonth} onChange={set("startMonth")} disabled={busy}>
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
          ) : (
            <div className="fld">
              <label>תאריך הקנייה</label>
              <input type="date" value={f.date} onChange={set("date")} disabled={busy} />
            </div>
          )}
        </div>

        <div className="fld">
          <label>הערה</label>
          <input value={f.note} onChange={set("note")} disabled={busy} />
        </div>

        {amount > 0 && (
          <div className="bg-calc">
            <span>{quarterly ? "יורד מכל אחד משלושת החודשים" : "יורד מתקציב החודש"}</span>
            <b className="num">{shekel(quarterly ? amount / 3 : amount)} ₪</b>
          </div>
        )}

        <button className="btn btn-primary" disabled={busy || !ok} onClick={save}>
          {busy ? "שומר…" : "הוספת הקנייה"}
        </button>
      </div>
    </>
  );
}

/* ---------- תקציב סוגי הימים ----------
   ⚠ שינוי כאן מזיז את כל השנה, לא חודש אחד: זה תעריף ולא
     חריגה. חריגה ליום בודד נעשית בלחיצה על היום עצמו.

   שלושה רכיבים לכל סוג. הקבוע קיים בגלל העשייה הקהילתית —
   900 ₪ ליום, בין אם הגיעו עשרים אנשים או ארבעים. */
function PriceTab({ types, headcount, say, onChanged }) {
  const [draft, setDraft] = useState({});
  const [busyId, setBusyId] = useState(null);

  const key = (t, f) => t.id + ":" + f;
  const valueOf = (t, f) => (key(t, f) in draft ? draft[key(t, f)] : String(t[f] ?? 0));

  const commit = (t, f) => {
    const k = key(t, f);
    const v = draft[k];
    if (v === undefined) return;
    const clean = String(v).trim();
    const drop = () => setDraft((d) => { const n = { ...d }; delete n[k]; return n; });
    if (clean === String(t[f] ?? 0)) { drop(); return; }
    const n = Number(clean);
    if (!Number.isFinite(n) || n < 0) { say("סכום לא תקין"); drop(); return; }
    setBusyId(t.id);
    api.setDayTypeBudget({ typeId: t.id, [f]: n })
      .then((r) => { say(`${r.name} עודכן`); drop(); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  const field = (t, f, label) => (
    <label className="bg-f">
      <span>{label}</span>
      <input value={valueOf(t, f)} inputMode="numeric" disabled={busyId === t.id}
        onChange={(e) => setDraft((d) => ({ ...d, [key(t, f)]: e.target.value }))}
        onBlur={() => commit(t, f)}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
    </label>
  );

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          התקציב מחולק לשניים: <b>קייטרינג</b> — מה שמזמינים מבחוץ,
          ו<b>קניות</b> — כל השאר. שינוי כאן משפיע על כל השנה.
          הסכום הקבוע אינו תלוי במספר הסועדים.
        </div>
      </div>

      <div className="grp-h">
        <span>לאדם, אלא אם צוין קבוע</span>
        <span>× {headcount} סועדים</span>
      </div>

      <div className="rows">
        {types.map((t) => {
          const perDay = (t.cateringFixed || 0)
            + ((t.catering || 0) + (t.purchases || 0)) * headcount;
          return (
            <div className="bg-type" key={t.id}>
              <div className="bg-type-h">
                <b>{t.name}</b>
                <span className="num">{shekel(perDay)} ₪ ליום</span>
              </div>
              <div className="bg-fields">
                {field(t, "catering", "קייטרינג לאדם")}
                {field(t, "cateringFixed", "קייטרינג קבוע")}
                {field(t, "purchases", "קניות לאדם")}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}

/* ---------- סיכום שנתי ---------- */
function YearView({ say, onMonth }) {
  const { data, err, busy } = useLoad(() => api.getBudgetYear(), []);
  if (busy && !data) return <div className="empty" style={{ paddingTop: 40 }}><div className="e1">טוען…</div></div>;
  if (err) return <div className="alert a-clay"><BI.warn /><div style={{ flex: 1 }}>
    <div className="ttl">לא הצלחנו לטעון</div><div className="bd">{err.message}</div></div></div>;
  if (!data) return null;

  const exportYear = () => {
    downloadTable({
      file: "תקציב-מטבח-שנתי",
      sheet: "סיכום שנתי",
      title: `תקציב המטבח — סיכום שנתי · ${data.headcount} סועדים`,
      header: ["חודש", "ימים", "קייטרינג", "תקציב קניות", "נקנה בפועל", "יתרה", "סה״כ תקציב"],
      rows: [
        ...data.rows.map((r) => [monthLabel(r.month), r.days, Math.round(r.catering),
          Math.round(r.purchases), Math.round(r.spent), Math.round(r.left), Math.round(r.total)]),
        [], ["סה״כ השנה", "", Math.round(data.catering), Math.round(data.purchases),
          Math.round(data.spent), Math.round(data.left), Math.round(data.total)],
      ],
      widths: [16, 7, 12, 13, 12, 11, 13],
    });
    say("הקובץ ירד");
  };

  const max = Math.max(...data.rows.map((r) => r.total), 1);

  return (
    <>
      <div className="bg-total">
        <div className="bg-total-k">סך התקציב לשנה</div>
        <div className="bg-total-v num">{shekel(data.total)} ₪</div>
        <div className="bg-total-s">
          קייטרינג {shekel(data.catering)} · קניות {shekel(data.purchases)} · {data.headcount} סועדים
        </div>
      </div>

      {data.spent > 0 && (
        <div className={"bg-spend " + (data.left < 0 ? "over" : "")}>
          <div><b className="num">{shekel(data.spent)} ₪</b><span>נקנה בפועל</span></div>
          <div><b className="num">{shekel(Math.abs(data.left))} ₪</b>
            <span>{data.left < 0 ? "חריגה" : "נותר בקניות"}</span></div>
        </div>
      )}

      <div className="sec-label">חודש אחר חודש · לחיצה לפירוט</div>
      <div className="rows">
        {data.rows.map((r) => (
          <button className="st-row" key={r.month} onClick={() => onMonth(r.month)}>
            <div className="st-main">
              <div className="st-n">{monthLabel(r.month)}</div>
              <div className="st-m">
                <span className="num">קייטרינג {shekel(r.catering)}</span>
                <span className="num">· קניות {shekel(r.purchases)}</span>
                {r.left < 0 && <span className="pill p-low">חריגה</span>}
              </div>
              <div className="bg-bar"><span style={{ width: `${(r.total / max) * 100}%` }} /></div>
            </div>
            <b className="num" style={{ flex: "0 0 auto", fontSize: 14.5 }}>{shekel(r.total)} ₪</b>
          </button>
        ))}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", margin: "12px 0" }}
        onClick={exportYear}><BI.dl />הורדת הסיכום השנתי לאקסל</button>
      <div style={{ height: 20 }} />
    </>
  );
}

/* ---------- הדף ---------- */
export function BudgetPage({ say }) {
  useExcel();
  const [view, setView] = useState("month");
  const [month, setMonth] = useState(null);
  const { data, err, busy, reload } = useLoad(() => api.getBudget(month), [month]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [headEdit, setHeadEdit] = useState(false);
  const [head, setHead] = useState("");

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען תקציב…</div></div>
  );
  if (err?.setupRequired) return (
    <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>התקציב עדיין לא חובר ל-monday</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{err.message}</div>
    </div>
  );
  if (err) return (
    <div className="alert a-clay">
      <BI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את התקציב</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (editing) return (
    <DayEditor day={editing} types={data.types} headcount={data.headcount} say={say}
      onDone={() => { setEditing(null); reload(); }}
      onCancel={() => setEditing(null)} />
  );
  if (adding) return (
    <OrderForm months={data.months} defaultMonth={data.month} today={data.days[0].date} say={say}
      onDone={() => { setAdding(false); reload(); }}
      onCancel={() => setAdding(false)} />
  );

  const saveHead = () => {
    const n = Number(head);
    if (!Number.isFinite(n) || n < 1) { say("מספר לא תקין"); return; }
    api.setHeadcount(n)
      .then(() => { say("מספר הסועדים עודכן"); setHeadEdit(false); reload(); })
      .catch((e) => say(e.message));
  };

  const exportMonth = () => {
    downloadTable({
      file: "תקציב-מטבח-" + data.month,
      sheet: "תקציב",
      title: `תקציב המטבח — ${monthLabel(data.month)} · ${data.headcount} סועדים`,
      header: ["תאריך", "יום", "סוג היום", "קייטרינג", "קניות", "סה״כ", "הערה"],
      rows: [
        ...data.days.map((d) => [dm(d.date), dowOf(d.date), d.type,
          Math.round(d.catering), Math.round(d.purchases), Math.round(d.total), d.note || ""]),
        [],
        ["תקציב קייטרינג", "", "", Math.round(data.catering), "", "", ""],
        ["תקציב קניות", "", "", "", Math.round(data.purchases), "", ""],
        ["נקנה בפועל", "", "", "", Math.round(data.spent), "", ""],
        ["יתרה בקניות", "", "", "", Math.round(data.left), "", ""],
        ["סה״כ תקציב החודש", "", "", "", "", Math.round(data.total), ""],
      ],
      widths: [10, 6, 16, 11, 10, 10, 22],
    });
    say("הקובץ ירד");
  };

  const idx = data.months.indexOf(data.month);
  const go = (i) => { if (i >= 0 && i < data.months.length) setMonth(data.months[i]); };
  const monthOrders = data.orders.filter((o) => o.share > 0);

  return (
    <>
      <div className="screen-title">תקציב המטבח</div>

      <div className="seg">
        <button className={view === "month" ? "on" : ""} onClick={() => setView("month")}>חודש</button>
        <button className={view === "year" ? "on" : ""} onClick={() => setView("year")}>כל השנה</button>
        <button className={view === "prices" ? "on" : ""} onClick={() => setView("prices")}>תקציב</button>
      </div>

      {view === "prices" ? (
        <PriceTab types={data.types} headcount={data.headcount} say={say} onChanged={reload} />
      ) : view === "year" ? (
        <YearView say={say} onMonth={(m) => { setMonth(m); setView("month"); }} />
      ) : (
      <>
        <div className="bg-nav">
          <button className="btn btn-ghost btn-sm" disabled={idx <= 0} onClick={() => go(idx - 1)}>
            <BI.chev style={{ transform: "rotate(180deg)" }} />
          </button>
          <select value={data.month} onChange={(e) => setMonth(e.target.value)}>
            {data.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" disabled={idx >= data.months.length - 1}
            onClick={() => go(idx + 1)}>
            <BI.chev />
          </button>
        </div>

        <div className="bg-total">
          <div className="bg-total-k">סך התקציב לחודש</div>
          <div className="bg-total-v num">{shekel(data.total)} ₪</div>
          <div className="bg-total-s">
            קייטרינג {shekel(data.catering)} · קניות {shekel(data.purchases)}
          </div>
        </div>

        {/* ---------- הקניות מול תקציב הקניות ---------- */}
        <div className={"bg-spend " + (data.left < 0 ? "over" : "")}>
          <div><b className="num">{shekel(data.purchases)}</b><span>תקציב קניות</span></div>
          <div><b className="num">{shekel(data.spent)}</b><span>נקנה בפועל</span></div>
          <div><b className="num">{shekel(Math.abs(data.left))}</b>
            <span>{data.left < 0 ? "חריגה" : "נותר"}</span></div>
        </div>

        <div className="card bg-head">
          {headEdit ? (
            <>
              <input value={head} onChange={(e) => setHead(e.target.value)} inputMode="numeric" autoFocus />
              <button className="btn btn-primary btn-sm" onClick={saveHead}>שמירה</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setHeadEdit(false)}>ביטול</button>
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <b className="num" style={{ fontSize: 18 }}>{data.headcount}</b>
                <span style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, marginRight: 8 }}>
                  סועדים — חניכים וצוות
                </span>
              </div>
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setHead(String(data.headcount)); setHeadEdit(true); }}>שינוי</button>
            </>
          )}
        </div>

        <div className="sec-label">מה מושך את התקציב</div>
        <div className="card" style={{ marginBottom: 12 }}>
          {data.byType.map((t) => (
            <div className="bg-row" key={t.type}>
              <span style={{ flex: 1 }}>{t.type}</span>
              <span className="num" style={{ color: "var(--muted)" }}>{t.days} ימים</span>
              <b className="num">{shekel(t.total)} ₪</b>
            </div>
          ))}
        </div>

        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 14 }}
          onClick={exportMonth}><BI.dl />הורדת החודש לאקסל</button>

        <div className="sec-label">קניות החודש</div>
        {monthOrders.length === 0 ? (
          <div className="card" style={{ marginBottom: 10, fontSize: 13.5, color: "var(--muted)",
                                         fontWeight: 600, textAlign: "center" }}>
            עדיין לא נרשמה קנייה לחודש הזה
          </div>
        ) : (
          <div className="rows" style={{ marginBottom: 10 }}>
            {monthOrders.map((o) => (
              <div className="st-row" key={o.id} style={{ cursor: "default" }}>
                <div className="st-main">
                  <div className="st-n">{o.name}</div>
                  <div className="st-m">
                    <span className={"pill " + (o.kind === ORDER_KIND.weekly ? "p-ok" : "p-new")}>
                      {o.kind}
                    </span>
                    <span className="num">{shekel(o.amount)} ₪</span>
                    {o.kind === ORDER_KIND.quarterly && (
                      <span>· {o.months.map(monthLabel).join(" · ")}</span>
                    )}
                    {o.date && <span className="num">· {dm(o.date)}</span>}
                  </div>
                </div>
                <b className="num" style={{ flex: "0 0 auto", color: "var(--clay)" }}>
                  −{shekel(o.share)}
                </b>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
                  onClick={() => api.deletePurchase(o.id)
                    .then(() => { say("הקנייה נמחקה"); reload(); })
                    .catch((e) => say(e.message))}>מחיקה</button>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 16 }}
          onClick={() => setAdding(true)}><BI.plus />קנייה חדשה</button>

        <div className="sec-label">ימי החודש · לחיצה לשינוי</div>
        <div className="rows">
          {data.days.map((d) => (
            <button className="st-row" key={d.date} onClick={() => setEditing(d)}>
              <div className="bg-day num">
                <b>{dm(d.date)}</b>
                <span>{dowOf(d.date)}׳</span>
              </div>
              <div className="st-main">
                <div className="st-n" style={{ fontSize: 14.5 }}>{d.type}</div>
                <div className="st-m">
                  {d.overridden && <span className="pill p-new">נקבע ידנית</span>}
                  {d.note && <span>{d.note}</span>}
                  {!d.overridden && !d.note && d.total > 0 && (
                    <span className="num">
                      {d.catering > 0 ? `קייטרינג ${shekel(d.catering)}` : ""}
                      {d.catering > 0 && d.purchases > 0 ? " · " : ""}
                      {d.purchases > 0 ? `קניות ${shekel(d.purchases)}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <b className="num" style={{ flex: "0 0 auto", fontSize: 14.5,
                                          color: d.total ? "var(--ink)" : "var(--faint)" }}>
                {d.total ? shekel(d.total) + " ₪" : "—"}
              </b>
            </button>
          ))}
        </div>
        <div style={{ height: 30 }} />
      </>
      )}
    </>
  );
}
