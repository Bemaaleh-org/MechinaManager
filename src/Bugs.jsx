/* ============================================================
   באגים והערות לשיפור
   ------------------------------------------------------------
   מסך אחד לשלושה סוגים: משהו לא עובד · הצעה לשיפור · חסר לי
   משהו. שלושה מסכים היו מתפצלים בתיקון הראשון, והמדווח אינו
   יודע ממילא לאיזה מהם דיווח שלו שייך.

   ⚠ **הרשימה פתוחה לכולם** — מי שלא יראה שכבר דיווחו ידווח
     שוב (5כד).
   ⚠ **ושם המדווח אינו מוצג לחניכים.** די בכותרת ובמסך;
     שם היה הופך את הרשימה ליומן של מי מתלונן על מה (עיקרון 5).
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { BUG_KIND, BUG_STATUS, isOpenBug } from "../shared/bugs-ids.js";

const GI = {
  bug: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="8" y="6" width="8" height="13" rx="4"/><path d="M8 10H4M20 10h-4M8 15H3.5M20.5 15H16M9 6l-1.5-2M15 6l1.5-2"/></svg>,
  bulb: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1h6c0-.4.1-.8.5-1.1A6 6 0 0 0 12 3z"/></svg>,
  ask: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4M12 17h.01"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

const kindIcon = (k) => (k === BUG_KIND.idea ? <GI.bulb /> : k === BUG_KIND.ask ? <GI.ask /> : <GI.bug />);
/* ⚠ גוון לפי מצב ולא לפי סוג: אדום וירוק שמורים למצב (4ג). */
const stTone = (s) => (s === BUG_STATUS.done ? "ok" : s === BUG_STATUS.wont ? "off"
  : s === BUG_STATUS.working ? "work" : "new");

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
};

export function BugsPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [n, setN] = useState(0);
  const [form, setForm] = useState(null); // {} חדש · הרשומה לעריכה
  const [filter, setFilter] = useState("open"); // open · mine · all

  useEffect(() => {
    let alive = true;
    api.getBugs()
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [n]);

  const reload = () => setN((x) => x + 1);

  if (err) return (
    <>
      <div className="screen-title">באגים והערות</div>
      <div className={"alert " + (err.setupRequired ? "a-amber" : "a-clay")}>
        <GI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">{err.setupRequired ? "המסך טרם הוקם" : "לא הצלחנו לטעון"}</div>
          <div className="bd">{err.message}</div>
        </div>
      </div>
    </>
  );
  if (!d) return <><div className="screen-title">באגים והערות</div>
    <div className="skel skel-card" /><div className="skel skel-card" /></>;

  if (form) return (
    <BugForm initial={form.id ? form : null} kinds={d.kinds} say={say}
      onDone={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />
  );

  const list = (d.bugs || []).filter((b) =>
    filter === "mine" ? b.mine
      : filter === "all" ? true
        : isOpenBug(b.status));

  return (
    <>
      <div className="screen-title">באגים והערות</div>
      <div className="tm-sub">
        משהו לא עובד, חסר, או שאפשר לעשות אותו טוב יותר — כאן כותבים.
        {/* ⚠ המחיר מוצהר במסך: אין הבטחת זמן, וכדאי שזה ייאמר
            ולא יובן מעצמו (4מה). */}
        {" "}הרשימה פתוחה לכולם כדי שלא ידווחו על אותו דבר פעמיים.
      </div>

      <div className="seg">
        <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>
          פתוחים{d.counts.open ? ` (${d.counts.open})` : ""}
        </button>
        <button className={filter === "mine" ? "on" : ""} onClick={() => setFilter("mine")}>
          שלי{d.counts.mine ? ` (${d.counts.mine})` : ""}
        </button>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>הכול</button>
      </div>

      {list.length === 0 ? (
        <div className="empty tone-1">
          <div className="e-ico"><GI.bulb /></div>
          <div className="e1">{filter === "mine" ? "עוד לא דיווחתם" : "אין דיווחים פתוחים"}</div>
          <div className="e2">כל הערה עוזרת — גם קטנה.</div>
        </div>
      ) : (
        <div className="rows">
          {list.map((b) => (
            <BugCard key={b.id} b={b} canManage={d.canManage} statuses={d.statuses}
              say={say} onEdit={() => setForm(b)} onSaved={reload} />
          ))}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <GI.plus />דיווח חדש
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function BugCard({ b, canManage, statuses, say, onEdit, onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState(b.reply || "");

  const setStatus = (st) => {
    if (busy) return;
    setBusy(true);
    api.editBug({ id: b.id, status: st })
      .then(() => { say("הסטטוס עודכן"); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const saveReply = () => {
    if (busy) return;
    setBusy(true);
    api.editBug({ id: b.id, reply })
      .then(() => { say("נשמר"); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const remove = () => {
    if (busy) return;
    setBusy(true);
    api.deleteBug(b.id)
      .then(() => { say("נמחק"); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className={"card gb-item" + (open ? " open" : "")}>
      <button className="gb-hd" onClick={() => setOpen(!open)}>
        <div className="tile sm">{kindIcon(b.kind)}</div>
        <div className="st-main">
          <div className="st-n">{b.title}</div>
          <div className="st-m">
            <span className={"gb-st " + stTone(b.status)}>{b.status}</span>
            {b.where && <span>· {b.where}</span>}
            {b.date && <span>· {dmy(b.date)}</span>}
            {b.mine && <span>· שלי</span>}
            {/* ⚠ שם המדווח מגיע מהשרת לצוות בלבד ואינו בגוף
                התשובה של חניך — אין כאן סינון בתצוגה (עיקרון 4). */}
            {b.reporter && <span>· {b.reporter}</span>}
          </div>
        </div>
        <GI.chev style={{ transform: open ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
      </button>

      {open && (
        <div className="gb-bd">
          {b.detail && <div className="gb-det">{b.detail}</div>}
          {b.reply && (
            <div className="gb-reply">
              <div className="gb-reply-h">תשובה</div>
              {b.reply}
            </div>
          )}

          {b.canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>עריכת הדיווח</button>
          )}
          {b.canDelete && (
            <button className="btn btn-ghost btn-sm" style={{ marginInlineStart: 8 }}
              disabled={busy} onClick={remove}>מחיקה</button>
          )}

          {canManage && (
            <div className="gb-adm">
              <div className="fld">
                <label>סטטוס</label>
                <div className="pick pick-wrap">
                  {statuses.map((st) => (
                    <button type="button" key={st} className={b.status === st ? "on" : ""}
                      disabled={busy} onClick={() => setStatus(st)}>{st}</button>
                  ))}
                </div>
              </div>
              <div className="fld">
                <label>תשובה למדווח</label>
                <textarea rows={2} value={reply} disabled={busy}
                  onChange={(e) => setReply(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={saveReply}>
                שמירת התשובה
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BugForm({ initial, kinds, say, onDone, onCancel }) {
  const [f, setF] = useState({
    title: initial ? initial.title : "",
    kind: initial ? initial.kind : kinds[0],
    where: initial ? initial.where || "" : "",
    detail: initial ? initial.detail || "" : "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy || !f.title.trim()) return;
    setBusy(true);
    const p = initial
      ? api.editBug({ id: initial.id, ...f })
      : api.addBug(f);
    p.then(() => { say(initial ? "עודכן" : "תודה — הדיווח נשלח"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <GI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת הדיווח" : "דיווח חדש"}</div>

      <div className="card lift">
        <div className="fld">
          <label>מה זה</label>
          <div className="pick pick-wrap">
            {kinds.map((k) => (
              <button type="button" key={k} className={f.kind === k ? "on" : ""}
                disabled={busy} onClick={() => setF((p) => ({ ...p, kind: k }))}>{k}</button>
            ))}
          </div>
        </div>
        <div className="fld">
          <label>בכותרת אחת</label>
          <input value={f.title} onChange={set("title")} disabled={busy} autoFocus
            placeholder="למשל: כפתור השמירה בבקשת יציאה לא מגיב" />
        </div>
        <div className="fld">
          {/* ⚠ **איפה** הוא השדה שהופך דיווח לניתן לשחזור.
              בלעדיו הדיווח נכון ובלתי שמיש. */}
          <label>באיזה מסך</label>
          <input value={f.where} onChange={set("where")} disabled={busy}
            placeholder="למשל: תורנויות ▸ מטבח וחד״א" />
        </div>
        <div className="fld">
          <label>פירוט</label>
          <textarea rows={4} value={f.detail} onChange={set("detail")} disabled={busy}
            placeholder="מה עשיתם, מה ציפיתם שיקרה, ומה קרה בפועל" />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }}
          disabled={busy || !f.title.trim()} onClick={save}>
          {busy ? "שולח…" : initial ? "שמירה" : "שליחה"}
        </button>
      </div>
    </>
  );
}

export const BUGS_CSS = `
.gb-item{padding:0;margin-bottom:8px;overflow:hidden}
.kx .gb-hd{display:flex;align-items:center;gap:11px;width:100%;text-align:right;padding:12px 14px}
.gb-bd{padding:0 14px 14px}
.gb-det{font-size:12.5px;font-weight:600;color:var(--ink);line-height:1.6;
  white-space:pre-wrap;margin-bottom:10px}
.gb-reply{background:var(--t1-s);color:var(--t1);border-radius:var(--r-sm);
  padding:9px 11px;font-size:12.5px;font-weight:700;line-height:1.55;
  white-space:pre-wrap;margin-bottom:10px}
.gb-reply-h{font-size:10.5px;font-weight:900;opacity:.8;margin-bottom:3px}
.gb-st{font-weight:900}
.gb-st.new{color:var(--t2)}
.gb-st.work{color:var(--t6)}
.gb-st.ok{color:var(--t1)}
.gb-st.off{color:var(--faint)}
.gb-adm{margin-top:12px;padding-top:12px;border-top:1px solid var(--line2)}
`;
