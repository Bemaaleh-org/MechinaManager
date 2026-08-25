/* ============================================================
   תקלות ובעיות — מעקב תחזוקה
   ------------------------------------------------------------
   גלוי למנהלים ולאב הבית בלבד. ההרשאה נאכפת בשרת.

   מחזור חיים: פתוחה → בטיפול → טופלה. הרשימה ממוינת כך
   שהפתוחות והדחופות תמיד למעלה, והמסך נפתח על "פתוחות".
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import {
  FAULT_PLACE, FIXES, URGENCIES, STATUSES, FAULT_STATUS, FAULT_URGENCY,
} from "../shared/faults-board.js";

const FI = {
  tool: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14.6 12l-2.6-2.6 2.7-3.1z"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
};

function useLoad(fn, deps = []) {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(true);
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

const heDate = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

function Pick({ label, options, value, onChange, disabled }) {
  return (
    <div className="fld">
      <label>{label}</label>
      <div className="pick">
        {options.map((o) => (
          <button type="button" key={o} className={value === o ? "on" : ""} disabled={disabled}
            onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- טופס תקלה — חדשה או עריכה ---------- */
function FaultForm({ initial, say, onDone, onCancel }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(() => ({
    title: initial?.title || "",
    place: initial?.place || "",
    fix: initial?.fix || "",
    urgency: initial?.urgency || FAULT_URGENCY.normal,
    status: initial?.status || FAULT_STATUS.open,
    desc: initial?.desc || "",
    notes: initial?.notes || "",
  }));
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setT = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const canSave = f.title.trim() && f.place;

  const save = () => {
    if (busy || !canSave) return;
    setBusy(true);
    const body = { ...f, ...(editing ? { id: initial.id } : {}) };
    (editing ? api.editFault(body) : api.addFault(body))
      .then(() => { say(editing ? "התקלה עודכנה" : "התקלה נרשמה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy) return;
    setBusy(true);
    api.deleteFault(initial.id)
      .then(() => { say("התקלה נמחקה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <FI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{editing ? "עריכת תקלה" : "תקלה חדשה"}</div>

      <div className="card">
        <div className="fld">
          <label>סוג הבעיה</label>
          <input value={f.title} onChange={setT("title")} disabled={busy} autoFocus={!editing}
            placeholder="מה התקלקל, במשפט" />
        </div>

        <Pick label="מיקום" options={FAULT_PLACE} value={f.place} onChange={set("place")} disabled={busy} />

        <div className="two">
          <Pick label="אופן התיקון" options={FIXES} value={f.fix} onChange={set("fix")} disabled={busy} />
          <Pick label="דחיפות" options={URGENCIES} value={f.urgency} onChange={set("urgency")} disabled={busy} />
        </div>

        {editing && (
          <Pick label="סטטוס" options={STATUSES} value={f.status} onChange={set("status")} disabled={busy} />
        )}

        <div className="fld">
          <label>תיאור הבעיה</label>
          <textarea rows={3} value={f.desc} onChange={setT("desc")} disabled={busy}
            placeholder="מה בדיוק קרה, ממתי, מה כבר נוסה" />
        </div>

        {editing && (
          <div className="fld">
            <label>הערות טיפול</label>
            <textarea rows={3} value={f.notes} onChange={setT("notes")} disabled={busy}
              placeholder="מה נעשה, מי הוזמן, מה סוכם" />
          </div>
        )}

        <button className="btn btn-primary" disabled={busy || !canSave} onClick={save}>
          {busy ? "שומר…" : editing ? "שמירת השינויים" : "רישום התקלה"}
        </button>

        {editing && (confirmDel ? (
          <button className="btn btn-clay" style={{ marginTop: 8 }} disabled={busy} onClick={remove}>
            למחוק לצמיתות?
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            onClick={() => setConfirmDel(true)}>מחיקת התקלה</button>
        ))}
      </div>
    </>
  );
}

/* ---------- כרטיס תקלה ---------- */
function FaultCard({ x, onOpen }) {
  const urgent = x.urgency === FAULT_URGENCY.urgent && x.status !== FAULT_STATUS.done;
  const done = x.status === FAULT_STATUS.done;
  return (
    <button className="st-row" onClick={onOpen} style={{ width: "100%", textAlign: "right" }}>
      <div className="st-main">
        <div className="st-n" style={done ? { color: "var(--faint)", textDecoration: "line-through" } : undefined}>
          {x.title}
        </div>
        <div className="st-m">
          <span className={"pill " + (done ? "p-ok" : x.status === FAULT_STATUS.working ? "p-new" : "p-low")}>
            {x.status}
          </span>
          {urgent && <span className="pill p-low">דחוף</span>}
          {x.place && <span>{x.place}</span>}
          {x.fix && <span>· {x.fix}</span>}
          <span className="num">{heDate(x.date)}</span>
        </div>
      </div>
      <FI.chev style={{ color: "var(--line2)" }} />
    </button>
  );
}

/* ---------- הקמה בלחיצה ---------- */
function SetupCard({ say, onDone }) {
  const [busy, setBusy] = useState(false);
  const [failMsg, setFailMsg] = useState(null);
  const run = () => {
    if (busy) return;
    setBusy(true); setFailMsg(null);
    api.setupFaults()
      .then(() => { say("לוח התקלות נוצר"); onDone(); })
      .catch((e) => setFailMsg(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}><FI.tool /></div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>לוח התקלות עדיין לא חובר ל-monday</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, marginBottom: 16 }}>
        לחיצה אחת תיצור את הלוח ותוודא שהתפקיד "אב בית" קיים.
      </div>
      {failMsg && <div className="login-err" style={{ marginBottom: 12 }}>{failMsg}</div>}
      <button className="btn btn-primary" disabled={busy} onClick={run}>
        {busy ? "יוצר…" : "יצירת הלוח עכשיו"}
      </button>
    </div>
  );
}

/* ---------- הדף המלא ---------- */
export function FaultsPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getFaults(), []);
  const [filter, setFilter] = useState("open"); // open | done | all
  const [form, setForm] = useState(null);

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען תקלות…</div></div>
  );
  if (err?.setupRequired) return <SetupCard say={say} onDone={reload} />;
  if (err) return (
    <div className="alert a-clay">
      <FI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את התקלות</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (form) return (
    <FaultForm initial={form.id ? form : null} say={say}
      onDone={() => { setForm(null); reload(); }}
      onCancel={() => setForm(null)} />
  );

  const all = data.faults || [];
  const c = data.counts || {};
  const list = all.filter((x) =>
    filter === "all" ? true :
    filter === "done" ? x.status === FAULT_STATUS.done :
    x.status !== FAULT_STATUS.done);

  return (
    <>
      <div className="screen-title">תקלות ובעיות</div>

      <div className="seg">
        <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>
          פתוחות{(c.open || 0) + (c.working || 0) ? ` (${(c.open || 0) + (c.working || 0)})` : ""}
        </button>
        <button className={filter === "done" ? "on" : ""} onClick={() => setFilter("done")}>
          טופלו{c.done ? ` (${c.done})` : ""}
        </button>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>הכול</button>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">{filter === "done" ? "עוד לא טופלו תקלות" : "אין תקלות פתוחות"}</div>
          <div className="e2">{filter === "done" ? "" : "כשמשהו מתקלקל — רושמים אותו כאן."}</div>
        </div>
      ) : (
        <div className="rows">
          {list.map((x) => <FaultCard key={x.id} x={x} onOpen={() => setForm(x)} />)}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <FI.plus />תקלה חדשה
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}
