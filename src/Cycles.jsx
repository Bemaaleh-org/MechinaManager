/* ============================================================
   מחזורים
   ------------------------------------------------------------
   ⚠ המסך שנועד לכך שהמכינה תמשיך לעבוד בלי מפתח. ראש המכינה
     פותח מחזור, ממלא אותו, ומפעיל — והמערכת עוברת אליו.

   ⚠ **פתיחה והפעלה הן שתי פעולות נפרדות**, ובכוונה. בין פתיחת
     מחזור להפעלתו יש חודשיים של הזנת נתונים, ומחזור שנכנס
     לתוקף ברגע שנפתח היה מחליף את המערכת ללוחות ריקים באמצע
     שנה פעילה.

   ⚠ ההפעלה מקבלת אישור נפרד ומפורש. זו הפעולה הכי משמעותית
     במערכת כולה.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";

const CI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  flag: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 21V4"/><path d="M5 4h12l-2.2 3.6L17 11H5"/></svg>,
};

const dmy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

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
  }, deps); // eslint-disable-line
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

export function CyclesPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getCycles(), []);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);

  if (busy && !data) return <><div className="screen-title">מחזורים</div><div className="skel skel-card" /></>;
  if (err) {
    return (
      <>
        <div className="screen-title">מחזורים</div>
        <div className="alert a-clay"><CI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">{err.message}</div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
              onClick={reload}>נסו שוב</button>
          </div>
        </div>
      </>
    );
  }
  if (!data) return null;

  if (adding) {
    return <NewCycle say={say} onDone={() => { setAdding(false); reload(); }}
      onCancel={() => setAdding(false)} />;
  }
  const cur = open && data.cycles.find((c) => c.id === open);
  if (cur) {
    return <CycleDetail cycle={cur} steps={data.steps} say={say}
      onChange={reload} onBack={() => setOpen(null)} />;
  }

  return (
    <>
      <div className="screen-title">מחזורים</div>

      <div className="cy-lead">
        מחזור חדש נפתח מכאן — האפליקציה מעתיקה את מבנה כל הלוחות ב-monday,
        בלי הנתונים שבהם. משם ממלאים מצבה, גאנט וגיליונות, ומפעילים.
        <b> אין צורך בשום שינוי בפיתוח.</b>
      </div>

      <div className="rows">
        {data.cycles.map((c) => {
          const active = c.status === "פעיל";
          const done = c.check.steps.filter((s) => s.done).length;
          return (
            <button className={"st-row " + (active ? "tone-1" : "tone-3")}
              key={c.id} onClick={() => setOpen(c.id)}>
              <div className={"tile sm" + (active ? " cy-on" : "")}><CI.flag /></div>
              <div className="st-main">
                <div className="st-n">
                  {c.name}
                  {active && <span className="pill p-ok" style={{ marginRight: 7 }}>פעיל</span>}
                  {c.status === "בהקמה" && <span className="pill p-new" style={{ marginRight: 7 }}>בהקמה</span>}
                  {c.status === "ארכיון" && <span className="pill p-low" style={{ marginRight: 7 }}>ארכיון</span>}
                </div>
                <div className="st-m">
                  <span className="num">{dmy(c.from)} – {dmy(c.to)}</span>
                  <span>· {c.check.boardCount} לוחות</span>
                  <span>· {done}/{c.check.steps.length} שלבים</span>
                </div>
              </div>
              <CI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
            </button>
          );
        })}
      </div>

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <CI.plus />פתיחת מחזור חדש
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

/* ============================================================
   פתיחה
   ⚠ המסך אומר מראש כמה זמן זה ייקח ומה ייווצר. פעולה שנמשכת
     חצי דקה בלי שנאמר שהיא תימשך נראית כמו תקיעה.
   ============================================================ */
function NewCycle({ say, onDone, onCancel }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);

  const go = () => {
    if (busy || !name.trim()) return;
    setBusy(true); setOut(null);
    api.addCycle({ name: name.trim(), from, to })
      .then((d) => {
        setOut(d);
        if (!d.failed || !d.failed.length) { say(`נפתחו ${d.created} לוחות`); onDone(); }
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <CI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">מחזור חדש</div>

      <div className="card lift">
        <div className="cy-lead" style={{ marginBottom: 15 }}>
          ייפתחו 19 לוחות חדשים ב-monday, עם אותן עמודות בדיוק כמו במחזור
          הנוכחי ו<b>בלי אף שורה</b>. הפעולה נמשכת כחצי דקה.
        </div>
        <div className="fld">
          <label>שם המחזור</label>
          <input value={name} disabled={busy} placeholder="מחזור ד׳"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="two">
          <div className="fld">
            <label>תחילת השנה</label>
            <input type="date" value={from} disabled={busy}
              onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="fld">
            <label>סוף השנה</label>
            <input type="date" value={to} disabled={busy}
              onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {/* ⚠ ההבטחה המפורשת: פתיחה אינה מחליפה כלום. */}
        <div className="cy-safe">
          המחזור נפתח <b>בהקמה</b> ואינו נכנס לתוקף. המערכת ממשיכה לעבוד
          על המחזור הנוכחי עד שתפעילו אותו במפורש.
        </div>

        <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={go}>
          {busy ? "פותח לוחות… זה לוקח כחצי דקה" : "פתיחת המחזור"}
        </button>
      </div>

      {out && out.failed && out.failed.length > 0 && (
        <div className="alert a-clay" style={{ marginTop: 14 }}><CI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">{out.created} לוחות נפתחו · {out.failed.length} נכשלו</div>
            <div className="bd">
              {out.failed.map((f) => `${f.title} — ${f.why}`).join(" · ")}
            </div>
          </div>
        </div>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============================================================
   מחזור אחד
   ============================================================ */
function CycleDetail({ cycle, steps, say, onChange, onBack }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const active = cycle.status === "פעיל";

  const patch = (b) => {
    setBusy(true);
    api.editCycle({ id: cycle.id, ...b })
      .then((d) => { say(d.activated ? "המחזור הופעל" : "עודכן"); onChange(); })
      .catch((e) => say(e.message))
      .finally(() => { setBusy(false); setConfirm(false); });
  };

  const remove = () => {
    setBusy(true);
    api.deleteCycle(cycle.id)
      .then((d) => { say(d.note || "נמחק"); onChange(); onBack(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <CI.chev style={{ transform: "rotate(180deg)" }} />כל המחזורים
      </button>
      <div className="screen-title">{cycle.name}</div>

      <div className="band">
        <div className="band-h">{cycle.status}</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{cycle.check.boardCount}</div>
            <div className="band-l">לוחות</div>
          </div>
          <div className="band-c">
            <div className="band-n">
              {cycle.check.steps.filter((s) => s.done).length}/{cycle.check.steps.length}
            </div>
            <div className="band-l">שלבים</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (cycle.check.ready ? " ok" : " warn")}>
              {cycle.check.ready ? "✓" : "—"}
            </div>
            <div className="band-l">{cycle.check.ready ? "מוכן" : "בהקמה"}</div>
          </div>
        </div>
      </div>

      {/* ---------- השלבים ---------- */}
      <div className="sec-label">שלבי ההקמה</div>
      <div className="card">
        <div className="steps">
          {cycle.check.steps.map((s) => (
            <div className={"step-row " + (s.done ? "done" : "")} key={s.key}>
              <div className="step-n">{s.done ? "✓" : "•"}</div>
              <div className="step-b">
                <div className="step-t">
                  {s.title}
                  {s.need && !s.done && <span className="pill p-new" style={{ marginRight: 6 }}>חובה</span>}
                </div>
                <div className="step-s">{s.desc}</div>
                {/* ⚠ הסימון ידני בכוונה: המערכת אינה יכולה לדעת
                    שהגאנט "הושלם" — היא יכולה לדעת שיש בו שורות,
                    וזה לא אותו דבר. ראש המכינה יודע. */}
                {!active && (
                  <button className="step-mark" disabled={busy}
                    onClick={() => patch({ step: s.key, undo: s.done })}>
                    {s.done ? "ביטול הסימון" : "סימון כהושלם"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- הלוחות ---------- */}
      <div className="sec-label">הלוחות ב-monday</div>
      <div className="card">
        <div className="cy-boards">
          {Object.entries(cycle.boards).map(([path, id]) => (
            <div className="cy-b" key={path}>
              <span className="cy-bp">{path}</span>
              <span className="cy-bi num">{id}</span>
            </div>
          ))}
          {!Object.keys(cycle.boards).length && (
            <div className="led-empty">אין לוחות רשומים</div>
          )}
        </div>
      </div>

      {/* ---------- הפעלה ---------- */}
      {!active && (
        <>
          <div className="sec-label">הפעלה</div>
          <div className="card lift">
            {!cycle.check.ready ? (
              <div className="cy-block">
                כדי להפעיל, יש להשלים: <b>{cycle.check.missing.join(", ")}</b>
              </div>
            ) : !confirm ? (
              <>
                {/* ⚠ אזהרה שאומרת בדיוק מה יקרה, ולא "האם אתה בטוח". */}
                <div className="cy-warn">
                  <CI.warn />
                  <div>
                    הפעלת <b>{cycle.name}</b> תעביר את כל המערכת ללוחות שלו —
                    חניכים, שיעורים, תקציב, תקלות והכול. המחזור הנוכחי יעבור
                    לארכיון ו<b>שום נתון שלו לא יימחק</b>, אבל הוא לא יופיע
                    יותר במסכים.
                  </div>
                </div>
                <button className="btn btn-primary" disabled={busy}
                  onClick={() => setConfirm(true)}>הפעלת המחזור</button>
              </>
            ) : (
              <>
                <div className="cy-warn">
                  <CI.warn />
                  <div>לאשר את המעבר ל<b>{cycle.name}</b>?</div>
                </div>
                <button className="btn btn-primary" disabled={busy}
                  onClick={() => patch({ activate: true })}>
                  {busy ? "מעביר…" : "כן, להעביר את המערכת"}
                </button>
                <button className="link-btn" disabled={busy}
                  onClick={() => setConfirm(false)}>ביטול</button>
              </>
            )}

            <button className="btn btn-ghost" style={{ marginTop: 10, color: "var(--clay)" }}
              disabled={busy} onClick={remove}>
              מחיקת הרישום
            </button>
            <div className="cy-note">
              המחיקה מסירה את הרישום בלבד. הלוחות ב-monday נשארים.
            </div>
          </div>
        </>
      )}

      <div style={{ height: 40 }} />
    </>
  );
}
