/* ============================================================
   מרכז התפקיד
   ------------------------------------------------------------
   מסך אחד לכל אחריות שהחניך נושא: מה היא פותחת, מסמך החפיפה
   שהשאיר מי שהיה לפניו, המשימות שהוא כותב לעצמו, ומה שהצוות
   הציף אליו.

   ⚠ **קריאה אחת ולא ארבע.** הכול מגיע מ-`?action=duty`. מסך
     שנוחת בארבעה שלבים גורם לתוכן לקפוץ מתחת לאצבע.

   ⚠ **המשימות הן שלו ואין לצוות מראה אליהן.** זה לא פרט מימוש
     אלא ההבטחה עצמה, והיא כתובה גם במסך ולא רק בקוד — כדי
     שהחניך יידע שהיא קיימת.

   ⚠ **סימון משימה אופטימי**: מוצג מיד, נשלח ברקע, ובכישלון
     חוזר אחורה ואומר. סימון שנשאר על המסך אחרי שהשרת דחה
     אותו הוא שקר, לא נוחות (עיקרון 4י).
   ============================================================ */

import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const DI = {
  box: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
  cart: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>,
  tool: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5 1.6 1.6 2.5-2.5a4 4 0 0 1-4.6-4.6z"/></svg>,
  warn: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  cal: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  sun: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  users: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6"/><path d="M17 8.5a3 3 0 0 0 0-1M18 14.6c2 .7 3.5 2.4 3.5 5.4"/></svg>,
  doc: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>,
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 5l7 7-7 7"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  plus: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  x: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  bell: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5z"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>,
};
const icon = (k) => DI[k] || DI.users;

const he = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");
const heFull = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");
const today = () => new Date().toISOString().slice(0, 10);

/* ============================================================
   מסמך החפיפה
   ------------------------------------------------------------
   ⚠ מתקפל, וסגור כברירת מחדל אחרי שנקרא. פתוח תמיד היה דוחף
     את המשימות מתחת לקו הקיפול לצמיתות.
   ============================================================ */
const SECTIONS = [
  ["doing", "מה התפקיד כולל"],
  ["challenges", "אתגרים שהיו"],
  ["keep", "מה לשמר"],
  ["improve", "מה לשפר"],
  ["extra", "נקודות נוספות"],
];

function Handover({ doc, dutyName, say, onRead }) {
  const [open, setOpen] = useState(!doc.read);
  const [busy, setBusy] = useState(false);

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    api.markHandoverRead(dutyName)
      .then(() => { say("סומן כנקרא"); onRead(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="doc">
      <button className="doc-head" onClick={() => setOpen(!open)}>
        <div className="ic"><DI.doc /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>מסמך חפיפה</b>
          <span>
            {doc.by ? `${doc.by}` : "מי שהיה לפניך"}
            {doc.cycle ? ` · ${doc.cycle}` : ""}
            {doc.read ? " · נקרא" : ""}
          </span>
        </div>
        <DI.chev style={{ transform: open ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
      </button>

      {open && (
        <div className="doc-body">
          {SECTIONS.map(([k, title]) => (doc[k] ? (
            <div className="doc-sec" key={k}>
              <h4>{title}</h4>
              <p>{doc[k]}</p>
            </div>
          ) : null))}

          {/* ⚠ הטלפון הוא של מי שכתב, והוא הזמין במפורש לפנות
              אליו. זו הסיבה היחידה שהוא כאן. */}
          {(doc.by || doc.phone) && (
            <div className="doc-by">
              <span>נכתב על ידי {doc.by || "—"}</span>
              {doc.phone && <a href={`tel:${doc.phone}`}>{doc.phone}</a>}
              {doc.at && <span>· עודכן {heFull(doc.at)}</span>}
            </div>
          )}

          {doc.read ? (
            <div className="doc-read"><DI.check />אישרת שקראת</div>
          ) : (
            <button className="btn btn-primary" style={{ marginTop: 14 }}
              disabled={busy} onClick={confirm}>
              {busy ? "שומר…" : "קראתי את המסמך"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   המשימות
   ============================================================ */
function Tasks({ duty, say, reload }) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  /* ⚠ סימון אופטימי — id → done. גובר על מה שחזר מהשרת. */
  const [patch, setPatch] = useState({});

  const tasks = (duty.tasks || []).map((t) =>
    (t.id in patch ? { ...t, done: patch[t.id] } : t));
  const now = today();

  const add = () => {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    api.addDutyTask({ duty: duty.key, title, due: due || undefined })
      .then(() => { setText(""); setDue(""); return reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const toggle = (t) => {
    const next = !t.done;
    setPatch((p) => ({ ...p, [t.id]: next }));
    api.setDutyTask({ id: t.id, done: next })
      .catch((e) => {
        /* ⚠ חוזרים אחורה ואומרים. ראו ההערה בראש הקובץ. */
        say(e.message);
        setPatch((p) => { const n = { ...p }; delete n[t.id]; return n; });
      });
  };

  const remove = (t) => {
    if (busy) return;
    setBusy(true);
    api.deleteDutyTask(t.id)
      .then(() => reload())
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <div className="sec-label">המשימות שלי</div>

      <div className="task-add">
        <input value={text} disabled={busy} placeholder="מה צריך לעשות?"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={add}>
          <DI.plus />
        </button>
      </div>
      {/* ⚠ תאריך יעד הוא רשות ובשורה נפרדת. שדה חובה בטופס
          הוספה מהיר גורם לא להוסיף בכלל. */}
      <div className="fld" style={{ marginBottom: 12 }}>
        <input type="date" value={due} disabled={busy} dir="ltr"
          onChange={(e) => setDue(e.target.value)} />
        <div className="fld-hint">תאריך יעד — לא חובה</div>
      </div>

      {tasks.length === 0 ? (
        <div className="attn-calm" style={{ marginBottom: 14 }}>
          <b>עוד לא רשמת משימות</b>
          <span>הרשימה הזו שלך בלבד — הצוות אינו רואה אותה</span>
        </div>
      ) : (
        <div className="task-list" style={{ marginBottom: 14 }}>
          {tasks.map((t) => {
            const late = !t.done && t.due && t.due < now;
            return (
              <div className={"task" + (t.done ? " done" : "") + (late ? " late" : "")} key={t.id}>
                <button className="task-box" onClick={() => toggle(t)}
                  aria-label={t.done ? "ביטול סימון" : "סימון כבוצע"}>
                  {t.done && <DI.check />}
                </button>
                <div className="task-b">
                  <div className="task-t">{t.title}</div>
                  {(t.due || t.note) && (
                    <div className="task-m">
                      {t.due && (
                        <span className={"due" + (late ? " late" : "")}>
                          {late ? "עבר היעד · " : "עד "}{he(t.due)}
                        </span>
                      )}
                      {t.note && <span>{t.note}</span>}
                    </div>
                  )}
                </div>
                <button className="task-x" onClick={() => remove(t)} aria-label="מחיקה">
                  <DI.x />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============================================================
   הצפות מהצוות
   ------------------------------------------------------------
   ⚠ נראות כמו הודעה שהגיעה, ולא כמו משימה שהוקצתה. ההבחנה
     הזו היא הגבול: הצוות מציף, החניך מחליט מה לעשות ומתי.
   ============================================================ */
function Inbox({ duty, say, reload }) {
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(null);

  const notes = duty.notes || [];
  if (!notes.length) return null;

  const send = (n) => {
    const reply = (draft[n.id] || "").trim();
    if (!reply || busy) return;
    setBusy(n.id);
    api.replyDutyNote({ id: n.id, reply })
      .then(() => { setDraft((d) => ({ ...d, [n.id]: "" })); return reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  return (
    <>
      <div className="sec-label">מהצוות ({notes.length})</div>
      {notes.map((n) => (
        <div className="msg" key={n.id}>
          <div className="msg-h">
            <b>{n.title}</b>
            <span>{n.by}{n.at ? ` · ${heFull(n.at.slice(0, 10))}` : ""}</span>
          </div>
          {n.body && <div className="msg-b">{n.body}</div>}

          {n.reply ? (
            <div className="msg-reply">
              <b>השבת</b>
              {n.reply}
            </div>
          ) : (
            <div className="msg-form">
              <input value={draft[n.id] || ""} placeholder="תשובה לצוות"
                disabled={busy === n.id}
                onChange={(e) => setDraft((d) => ({ ...d, [n.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") send(n); }} />
              <button className="btn btn-ghost" disabled={busy === n.id || !(draft[n.id] || "").trim()}
                onClick={() => send(n)}>
                {busy === n.id ? "…" : "שליחה"}
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/* ============================================================
   המסך
   ============================================================ */
export default function DutyPage({ say, go }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [pick, setPick] = useState(0);

  const load = useCallback(() => api.getDuty()
    .then((d) => { setData(d); setErr(null); })
    .catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  if (err) {
    return (
      <>
        <div className="screen-title">מרכז התפקיד</div>
        <div className="alert a-clay"><DI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">{err}</div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
              onClick={() => { setErr(null); load(); }}>נסו שוב</button>
          </div>
        </div>
      </>
    );
  }
  if (!data) return <><div className="screen-title">מרכז התפקיד</div><div className="skel skel-card" /></>;

  const duties = data.duties || [];
  if (!duties.length) {
    return (
      <>
        <div className="screen-title">מרכז התפקיד</div>
        <div className="card duty-none">
          <div className="e-ico"><DI.users /></div>
          <b>עוד אין לך תפקיד</b>
          <span>כשהצוות ישבץ אותך לתפקיד, לוועדה או כמוביל שבוע —<br />הכול יופיע כאן</span>
        </div>
      </>
    );
  }

  const d = duties[Math.min(pick, duties.length - 1)];
  const Icon = icon(d.icon);

  return (
    <>
      <div className="screen-title">מרכז התפקיד</div>

      {/* ⚠ הבורר מוצג רק כשיש יותר מאחת. שורה עם כפתור יחיד
          היא רעש. */}
      {duties.length > 1 && (
        <div className="duty-bar">
          {duties.map((x, i) => (
            <button key={x.key} className={"duty-chip tone-" + x.tone + (i === pick ? " on" : "")}
              onClick={() => setPick(i)}>
              <span className="dot" />
              {x.short === x.label ? x.label : x.label}
              {x.counts.open > 0 && <span className="n">{x.counts.open}</span>}
            </button>
          ))}
        </div>
      )}

      {/* ---------- הכותרת ---------- */}
      <div className={"duty-hero tone-" + d.tone}>
        <div className="duty-hero-t">
          <div className="duty-hero-i"><Icon /></div>
          <div style={{ minWidth: 0 }}>
            <div className="duty-hero-n">{d.label}</div>
            <div className="duty-hero-s">
              {d.category ? `${d.category} · ` : ""}האחריות שלך במכינה
            </div>
          </div>
        </div>
        <div className="duty-nums">
          <div className="duty-num">
            <b>{d.counts.open}</b><span>משימות פתוחות</span>
          </div>
          <div className={"duty-num" + (d.counts.late ? " warn" : "")}>
            <b>{d.counts.late}</b><span>עבר היעד</span>
          </div>
          <div className="duty-num">
            <b>{d.counts.done}</b><span>בוצעו</span>
          </div>
        </div>
      </div>

      {/* ---------- מה האחריות פותחת ----------
          ⚠ אותה רשימה שמזינה את המגירה. שתי רשימות נפרדות
            נפרדו כאן פעם אחת, וזה עיקרון 4יט. */}
      {d.tabs.length > 0 && (
        <>
          <div className="sec-label">המסכים שלי</div>
          <div className={"duty-links tone-" + d.tone}>
            {d.tabs.map((t) => (
              <button className="duty-link" key={t.tab} onClick={() => go && go(t.tab)}>
                <span className="ic"><DI.chev /></span>
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {d.handover && (
        <div className={"tone-" + d.tone}>
          <Handover doc={d.handover} dutyName={d.name} say={say} onRead={load} />
        </div>
      )}

      <Inbox duty={d} say={say} reload={load} />
      <Tasks duty={d} say={say} reload={load} />

      {/* ⚠ ההבטחה כתובה במסך ולא רק בקוד. חניך שאינו יודע
          שהרשימה שלו בלבד ינהל אותה כאילו מישהו מסתכל. */}
      <div className="pf-note" style={{ marginTop: 4 }}>
        המשימות כאן שלך בלבד. הצוות אינו רואה אותן ואינו יודע מה סימנת —
        הוא יכול רק להציף אליך נושא, ואתה מחליט מה לעשות איתו.
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}
