/* ============================================================
   תקציב המטבח — כמה עולה להאכיל את המכינה
   ------------------------------------------------------------
   עמוד לכל חודש. סוג היום נגזר מהלו״ז, ומי שרוצה אחרת כופה
   ליום בודד — כפייה מסומנת, וניתן לנקות אותה בחזרה לגזירה.

   ⚠ מנהל בלבד. השרת אוכף; כאן זו תצוגה.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable } from "./excel.js";
import { monthLabel, MONTHS_HE } from "../shared/budget-boards.js";

const BI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  dl: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
};

const DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const dowOf = (iso) => DOW[new Date(iso + "T12:00:00Z").getUTCDay()];
const dm = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const shekel = (n) => Math.round(n).toLocaleString("he-IL");

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
  const [cost, setCost] = useState(day.overridden && day.perPerson !== null ? "" : "");
  const [note, setNote] = useState(day.note || "");
  const [busy, setBusy] = useState(false);

  const chosen = types.find((t) => t.name === type);
  const effective = cost.trim() !== "" ? Number(cost) : (chosen ? chosen.cost : 0);

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
                disabled={busy} onClick={() => setType(t.name)}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="fld">
          <label>מחיר מיוחד לאדם (לא חובה)</label>
          <input value={cost} onChange={(e) => setCost(e.target.value)} disabled={busy}
            inputMode="numeric" placeholder={`ריק = ${chosen ? chosen.cost : 0} ₪ לפי סוג היום`} />
        </div>

        <div className="fld">
          <label>הערה</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} disabled={busy}
            placeholder="למשל: ארוחת חג, אירוח קבוצה" />
        </div>

        <div className="bg-calc">
          <span>{effective} ₪ × {headcount} סועדים</span>
          <b className="num">{shekel(effective * headcount)} ₪</b>
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

/* ---------- הזמנת אוכל יבש ---------- */
function OrderForm({ months, defaultMonth, say, onDone, onCancel }) {
  const [f, setF] = useState({ name: "", amount: "", startMonth: defaultMonth, note: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const ok = f.name.trim() && Number(f.amount) > 0 && f.startMonth;
  const share = Number(f.amount) > 0 ? Number(f.amount) / 3 : 0;

  const save = () => {
    if (busy || !ok) return;
    setBusy(true);
    api.addDryOrder({ name: f.name.trim(), amount: Number(f.amount), startMonth: f.startMonth, note: f.note.trim() })
      .then((r) => { say(`ההזמנה נוספה — מתחלקת על ${r.months.map(monthLabel).join(", ")}`); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <BI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">הזמנת אוכל יבש</div>

      <div className="card">
        <div className="fld">
          <label>שם ההזמנה</label>
          <input value={f.name} onChange={set("name")} disabled={busy} autoFocus
            placeholder="למשל: הזמנה רבעונית — ספטמבר" />
        </div>
        <div className="two">
          <div className="fld">
            <label>סכום כולל (₪)</label>
            <input value={f.amount} onChange={set("amount")} disabled={busy} inputMode="numeric" />
          </div>
          <div className="fld">
            <label>חודש פתיחה</label>
            <select value={f.startMonth} onChange={set("startMonth")} disabled={busy}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
        </div>
        <div className="fld">
          <label>הערה</label>
          <input value={f.note} onChange={set("note")} disabled={busy} />
        </div>

        {share > 0 && (
          <div className="bg-calc">
            <span>מתחלק על שלושה חודשים</span>
            <b className="num">{shekel(share)} ₪ לחודש</b>
          </div>
        )}

        <button className="btn btn-primary" disabled={busy || !ok} onClick={save}>
          {busy ? "שומר…" : "הוספת ההזמנה"}
        </button>
      </div>
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
      header: ["חודש", "ימים", "אוכל", "אוכל יבש", "סה״כ"],
      rows: [
        ...data.rows.map((r) => [monthLabel(r.month), r.days, r.foodTotal,
          Math.round(r.orderShare), Math.round(r.total)]),
        [], ["סה״כ השנה", "", data.foodTotal, Math.round(data.orderShare), Math.round(data.total)],
      ],
      widths: [16, 8, 12, 12, 12],
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
          {shekel(data.foodTotal)} ₪ אוכל
          {data.orderShare > 0 ? ` · ${shekel(data.orderShare)} ₪ אוכל יבש` : ""}
          {" · "}{data.headcount} סועדים
        </div>
      </div>

      <div className="sec-label">חודש אחר חודש · לחיצה לפירוט</div>
      <div className="rows">
        {data.rows.map((r) => (
          <button className="st-row" key={r.month} onClick={() => onMonth(r.month)}>
            <div className="st-main">
              <div className="st-n">{monthLabel(r.month)}</div>
              <div className="st-m">
                <span>{r.days} ימים</span>
                {r.orderShare > 0 && <span className="num">· {shekel(r.orderShare)} ₪ יבש</span>}
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
  const [view, setView] = useState("month"); // month | year
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
    <OrderForm months={data.months} defaultMonth={data.month} say={say}
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
      header: ["תאריך", "יום", "סוג היום", "₪ לאדם", "סה״כ ליום", "הערה"],
      rows: [
        ...data.days.map((d) => [
          dm(d.date), dowOf(d.date), d.type, d.perPerson, d.total, d.note || "",
        ]),
        [], ["סה״כ אוכל", "", "", "", data.foodTotal, ""],
        ["הזמנות אוכל יבש", "", "", "", Math.round(data.orderShare), ""],
        ["סה״כ החודש", "", "", "", Math.round(data.total), ""],
      ],
      widths: [10, 6, 20, 9, 11, 24],
    });
    say("הקובץ ירד");
  };

  const idx = data.months.indexOf(data.month);
  const go = (i) => { if (i >= 0 && i < data.months.length) setMonth(data.months[i]); };

  return (
    <>
      <div className="screen-title">תקציב המטבח</div>

      <div className="seg">
        <button className={view === "month" ? "on" : ""} onClick={() => setView("month")}>חודש</button>
        <button className={view === "year" ? "on" : ""} onClick={() => setView("year")}>כל השנה</button>
      </div>

      {view === "year" ? (
        <YearView say={say} onMonth={(m) => { setMonth(m); setView("month"); }} />
      ) : (
      <>
      {/* ---------- בורר החודש ---------- */}
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

      {/* ---------- הסכום ---------- */}
      <div className="bg-total">
        <div className="bg-total-k">סך התקציב לחודש</div>
        <div className="bg-total-v num">{shekel(data.total)} ₪</div>
        <div className="bg-total-s">
          {shekel(data.foodTotal)} ₪ אוכל
          {data.orderShare > 0 ? ` · ${shekel(data.orderShare)} ₪ אוכל יבש` : ""}
        </div>
      </div>

      {/* ---------- מספר הסועדים ---------- */}
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

      {/* ---------- פירוט לפי סוג ---------- */}
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

      {/* ---------- ההזמנות ---------- */}
      <div className="sec-label">הזמנות אוכל יבש</div>
      {data.orders.length === 0 ? (
        <div className="card" style={{ marginBottom: 10, fontSize: 13.5, color: "var(--muted)",
                                       fontWeight: 600, textAlign: "center" }}>
          אין הזמנות. הזמנה מתחלקת על שלושה חודשים.
        </div>
      ) : (
        <div className="rows" style={{ marginBottom: 10 }}>
          {data.orders.map((o) => {
            const inMonth = o.months.includes(data.month);
            return (
              <div className="st-row" key={o.id} style={{ cursor: "default" }}>
                <div className="st-main">
                  <div className="st-n">{o.name}</div>
                  <div className="st-m">
                    <span className="num">{shekel(o.amount)} ₪</span>
                    <span>· {o.months.map(monthLabel).join(" · ")}</span>
                    {inMonth && <span className="pill p-ok num">{shekel(o.amount / 3)} ₪ החודש</span>}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
                  onClick={() => api.deleteDryOrder(o.id)
                    .then(() => { say("ההזמנה נמחקה"); reload(); })
                    .catch((e) => say(e.message))}>מחיקה</button>
              </div>
            );
          })}
        </div>
      )}
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 16 }}
        onClick={() => setAdding(true)}><BI.plus />הזמנה חדשה</button>

      {/* ---------- הימים ---------- */}
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
                {!d.overridden && !d.note && <span>{d.perPerson} ₪ לאדם</span>}
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
