/* ============================================================
   לוח מודעות · סקרים · משוב להנהלה
   ------------------------------------------------------------
   מסך אחד לשלושה ערוצים שמופנים לכל המכינה, וההבחנה ביניהם
   היא **מי המקור ומי הנמען**:

     מודעה  — מישהו אומר משהו לכולם, ואפשר להגיב.
     סקר    — מישהו שואל את כולם, ורואים מי ענה.
     משוב   — מישהו אומר משהו להנהלה, ואיש אינו יודע מי.

   ⚠⚠ **שלוש לשוניות ולא שלושה מסכים.** מי שרוצה לומר משהו
     לכולם לא יודע מראש באיזה משלושת הערוצים מדובר, ומסך נפרד
     לכל אחד היה מחייב אותו לנחש לפני שהוא כותב.

   ⚠ **והמשוב האנונימי מוצג לצידם ולא מוסתר** — ערוץ שצריך
     לחפש אותו אינו ערוץ.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScrollTabs from "./Tabs.jsx";
import ScreenNote from "./ScreenNote.jsx";

const BI = {
  pin: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" /></svg>),
  chat: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z" /></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" /></svg>),
  poll: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <path d="M6 20V10M12 20V4M18 20v-6" /></svg>),
  lock: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>),
  note: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 3h9l5 5v13H5z" /><path d="M14 3v5h5" /></svg>),
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};

const KIND_TONE = {
  "הודעה": "tone-6", "אירוע": "tone-1", "אבידה ומציאה": "tone-3",
  "בקשה": "tone-4", "המלצה": "tone-7",
};

export default function BoardPage({ say }) {
  const [view, setView] = useState("notices");
  return (
    <>
      <div className="screen-title">לוח המודעות</div>
      <ScreenNote name="note.board" say={say} />
      <ScrollTabs className="seg">
        <button className={view === "notices" ? "on" : ""} onClick={() => setView("notices")}>
          <BI.note />מודעות
        </button>
        <button className={view === "polls" ? "on" : ""} onClick={() => setView("polls")}>
          <BI.poll />סקרים
        </button>
        <button className={view === "fb" ? "on" : ""} onClick={() => setView("fb")}>
          <BI.lock />משוב להנהלה
        </button>
      </ScrollTabs>
      {view === "notices" && <Notices say={say} />}
      {view === "polls" && <MechinaPolls say={say} />}
      {view === "fb" && <MechinaFeedback say={say} />}
    </>
  );
}

/* ============================================================
   המודעות
   ============================================================ */
function Notices({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const [showOld, setShowOld] = useState(false);

  const load = useCallback(() => {
    setErr(null);
    api.notices().then(setD).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  /* ⚠ כשל טעינה נראה אחרת מ"אין מודעות" (עיקרון 6), וכשל הקמה
     אומר מה להריץ. */
  if (err) return <div className="banner-bad">{err}</div>;
  if (!d) return <div className="skel" style={{ height: 180 }} />;

  return (
    <>
      {d.notices.length === 0 && !adding && (
        <div className="empty">
          <div className="e1">אין מודעות פעילות</div>
          <div className="e2">
            כאן מפרסמים מה שכל המכינה צריכה לדעת — ולא בעשר קבוצות וואטסאפ.
          </div>
        </div>
      )}

      <div className="rows">
        {d.notices.map((n) => (
          <NoticeCard key={n.id} n={n} d={d} say={say} reload={load}
            open={open === n.id} onToggle={() => setOpen(open === n.id ? null : n.id)} />
        ))}
      </div>

      {d.me.post && (adding ? (
        <NoticeForm d={d} say={say} onDone={() => { setAdding(false); load(); }}
          onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><BI.plus />מודעה חדשה</button>
      ))}

      {/* ⚠ **נאמר מה מותר לי, ולא "אין הרשאה".** מי שרואה רק
          שני סוגים בבורר צריך לדעת למה, אחרת זה נראה כמו תקלה. */}
      {d.me.post && !d.me.as && (
        <div className="tm-note">
          אבידה ומציאה והמלצות פתוחות לכולם. הודעות, אירועים ובקשות
          מפורסמים על ידי בעלי תפקידים והצוות — ואפשר להגיב לכל מודעה.
        </div>
      )}

      {/* ⚠ **הארכיון קיים ואינו נמחק.** מודעה שפג תוקפה יורדת
          מהלוח ונשארת קריאה — לוח שמוחק בעצמו אינו יכול לענות
          על "מה בעצם נאמר אז". */}
      {d.archive.length > 0 && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }}
            onClick={() => setShowOld(!showOld)}>
            {showOld ? "להסתיר" : `מודעות שפג תוקפן · ${d.archive.length}`}
          </button>
          {showOld && (
            <div className="rows" style={{ marginTop: 10 }}>
              {d.archive.map((n) => (
                <NoticeCard key={n.id} n={n} d={d} say={say} reload={load} past
                  open={open === n.id} onToggle={() => setOpen(open === n.id ? null : n.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function NoticeCard({ n, d, say, reload, open, onToggle, past }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(null);

  const send = () => {
    if (!text.trim()) return;
    setBusy("c");
    api.commentNotice({ post: n.id, text: text.trim() })
      .then(() => { setText(""); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  return (
    <div className={"nb-card " + (KIND_TONE[n.kind] || "tone-2") + (past ? " nb-past" : "")}>
      <button className="nb-h" onClick={onToggle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="nb-meta">
            {n.pinned && <span className="nb-pin"><BI.pin />נעוץ</span>}
            <span className="nb-kind">{n.kind}</span>
            {n.to !== "כולם" && <span className="pill p-idle">{n.to}</span>}
          </div>
          <div className="nb-t">{n.title}</div>
          <div className="tm-entry-m">
            {n.by && <span>{n.by}</span>}
            {n.date && <span>· {dmy(n.date)}</span>}
            {n.comments.length > 0 && (
              <span><BI.chat /> {n.comments.length}</span>
            )}
            {/* ⚠ התפוגה נאמרת מראש: מי שקורא צריך לדעת אם זה
                עדיין רלוונטי מחר. */}
            {n.until && !past && <span>· עד {dmy(n.until)}</span>}
            {past && <span className="tm-faint">· פג תוקף</span>}
          </div>
        </div>
      </button>

      {open && (
        <div className="nb-b">
          {n.body && <div className="tm-pre">{n.body}</div>}
          {n.link && (
            <div className="tm-note" style={{ marginTop: 8 }}>
              <a className="tm-link" href={n.link} target="_blank" rel="noreferrer">קישור מצורף</a>
            </div>
          )}

          {n.comments.length > 0 && (
            <div className="nb-cs">
              {n.comments.map((c) => (
                <div className="nb-c" key={c.id}>
                  <div className="nb-c-t">{c.text}</div>
                  <div className="tm-entry-m">
                    {c.by && <span>{c.by}</span>}
                    {c.date && <span>· {dmy(c.date)}</span>}
                    {(c.mine || d.me.moderate) && (
                      <button className="nb-x" disabled={busy === c.id}
                        onClick={() => {
                          setBusy(c.id);
                          api.deleteNoticeComment(c.id)
                            .then(reload).catch((e) => say(e.message))
                            .finally(() => setBusy(null));
                        }}>מחיקה</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ⚠ תגובה פתוחה לכל מי שרואה — זו ההבחנה בין לוח
              מודעות לבין הודעות. */}
          <div className="nb-add">
            <input value={text} placeholder="תגובה" disabled={busy === "c"}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
            <button className="btn btn-ghost btn-sm" disabled={busy === "c" || !text.trim()}
              onClick={send}>שליחה</button>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {d.me.pin && (
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy === "p"}
                onClick={() => {
                  setBusy("p");
                  api.editNotice({ id: n.id, pinned: !n.pinned })
                    .then(reload).catch((e) => say(e.message)).finally(() => setBusy(null));
                }}>{n.pinned ? "לבטל נעיצה" : "לנעוץ למעלה"}</button>
            )}
            {(n.mine || d.me.moderate) && (
              <button className="btn btn-ghost btn-sm ev-del" disabled={busy === "d"}
                onClick={() => {
                  setBusy("d");
                  api.deleteNotice(n.id)
                    .then((r) => { say(r.removed ? `נמחקה עם ${r.removed} תגובות` : "נמחקה"); reload(); })
                    .catch((e) => say(e.message)).finally(() => setBusy(null));
                }}>מחיקה</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NoticeForm({ d, say, onDone, onCancel }) {
  const [f, setF] = useState({
    title: "", kind: d.kinds[0], body: "", to: d.audiences[0], until: "", link: "",
  });
  const [busy, setBusy] = useState(false);

  return (
    <div className="card lift" style={{ marginTop: 10 }}>
      <div className="fld">
        <label>כותרת</label>
        <input value={f.title} autoFocus disabled={busy}
          onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="fld">
        <label>סוג</label>
        <select value={f.kind} disabled={busy}
          onChange={(e) => setF({ ...f, kind: e.target.value })}>
          {d.kinds.map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>
      <div className="fld">
        <label>תוכן</label>
        <textarea rows={4} value={f.body} disabled={busy}
          onChange={(e) => setF({ ...f, body: e.target.value })} />
      </div>
      <div className="fld">
        <label>למי</label>
        <select value={f.to} disabled={busy}
          onChange={(e) => setF({ ...f, to: e.target.value })}>
          {d.audiences.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div className="fld">
        <label>עד מתי רלוונטי</label>
        <input type="date" dir="ltr" value={f.until} disabled={busy}
          onChange={(e) => setF({ ...f, until: e.target.value })} />
        {/* ⚠ ריק אינו "לנצח" בשקט — נאמר במפורש. */}
        <div className="pf-note">ריק = נשארת על הלוח עד שמוחקים אותה.</div>
      </div>
      <div className="fld">
        <label>קישור</label>
        <input dir="ltr" value={f.link} disabled={busy}
          onChange={(e) => setF({ ...f, link: e.target.value })} />
      </div>
      {d.me.as && (
        <div className="tm-note" style={{ marginTop: 0, marginBottom: 10 }}>
          המודעה תתפרסם בשמך, לצד <b>{d.me.as}</b>.
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }}
          disabled={busy || !f.title.trim()}
          onClick={() => {
            setBusy(true);
            api.addNotice({ ...f, title: f.title.trim() })
              .then(() => { say("פורסמה"); onDone(); })
              .catch((e) => say(e.message)).finally(() => setBusy(false));
          }}>פרסום</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy}
          onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   סקרי מכינה
   ⚠ אינם חשאיים, וזה נאמר. משוב אנונימי הוא הלשונית האחרת.
   ============================================================ */
function MechinaPolls({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState("");
  const [to, setTo] = useState("כולם");
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setErr(null);
    api.mechinaPolls().then(setD).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) return <div className="banner-bad">{err}</div>;
  if (!d) return <div className="skel" style={{ height: 160 }} />;

  return (
    <>
      <div className="tm-note" style={{ marginTop: 0 }}>
        הסקר גלוי — רואים כמה בחרו בכל אפשרות. מה שרוצים לומר בלי שם נמצא
        בלשונית "משוב להנהלה".
      </div>

      {d.polls.length === 0 && !adding && (
        <div className="empty"><div className="e1">אין סקרים פתוחים</div></div>
      )}

      {d.polls.map((p) => (
        <div className="card tm-poll" key={p.id}>
          <div className="tm-entry-t">{p.question}</div>
          <div className="tm-entry-m">
            {p.by && <span>{p.by}</span>}
            <span>· {p.total} הצביעו</span>
            {p.to !== "כולם" && <span className="pill p-idle">{p.to}</span>}
            {p.closed && <span className="pill p-idle">סגור</span>}
            {p.closes && !p.closed && <span>· עד {dmy(p.closes)}</span>}
          </div>
          <div className="tm-opts">
            {p.results.map((r) => {
              const pct = p.total ? Math.round((r.n / p.total) * 100) : 0;
              return (
                <button key={r.option} disabled={p.closed || busy === p.id}
                  className={"tm-opt" + (p.mine === r.option ? " on" : "")}
                  onClick={() => {
                    setBusy(p.id);
                    api.voteMechinaPoll({ poll: p.id, choice: r.option })
                      .then(load).catch((e) => say(e.message)).finally(() => setBusy(null));
                  }}>
                  <span className="tm-opt-bar" style={{ width: pct + "%" }} />
                  <span className="tm-opt-t">{r.option}</span>
                  <b className="num">{r.n}</b>
                </button>
              );
            })}
          </div>
          {d.me.manage && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy === p.id}
                onClick={() => {
                  setBusy(p.id);
                  api.closeMechinaPoll({ id: p.id, closed: !p.closed })
                    .then(load).catch((e) => say(e.message)).finally(() => setBusy(null));
                }}>{p.closed ? "לפתוח מחדש" : "לסגור"}</button>
              <button className="btn btn-ghost btn-sm ev-del" disabled={busy === p.id}
                onClick={() => {
                  setBusy(p.id);
                  api.deleteMechinaPoll(p.id)
                    .then(() => { say("נמחק"); load(); })
                    .catch((e) => say(e.message)).finally(() => setBusy(null));
                }}>מחיקה</button>
            </div>
          )}
        </div>
      ))}

      {d.me.manage && (adding ? (
        <div className="card lift" style={{ marginTop: 10 }}>
          <div className="fld">
            <label>השאלה</label>
            <input value={q} autoFocus disabled={busy === "n"}
              onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="fld">
            <label>אפשרויות — שורה לכל אחת</label>
            <textarea rows={4} value={opts} disabled={busy === "n"}
              onChange={(e) => setOpts(e.target.value)} />
          </div>
          <div className="fld">
            <label>למי</label>
            <select value={to} disabled={busy === "n"} onChange={(e) => setTo(e.target.value)}>
              {d.audiences.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy === "n"}
              onClick={() => {
                const options = opts.split("\n").map((x) => x.trim()).filter(Boolean);
                if (!q.trim() || options.length < 2) { say("צריך שאלה ולפחות שתי אפשרויות"); return; }
                setBusy("n");
                api.addMechinaPoll({ question: q.trim(), options, to })
                  .then(() => { say("הסקר נפתח"); setQ(""); setOpts(""); setAdding(false); load(); })
                  .catch((e) => say(e.message)).finally(() => setBusy(null));
              }}>פתיחת הסקר</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy === "n"}
              onClick={() => setAdding(false)}>ביטול</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><BI.plus />סקר חדש</button>
      ))}
    </>
  );
}

/* ============================================================
   משוב אנונימי להנהלה
   ------------------------------------------------------------
   ⚠⚠ **אנונימי בהיעדר הנתון ולא בהסתרתו.** הלוח שבו זה נשמר
     אינו מחזיק עמודת כותב, המסלול בשרת אינו נוגע במזהה הסשן,
     והתשובה אינה מחזירה מזהה שורה.

   ⚠ **וזה נאמר במסך.** מי שאינו יודע שזה אנונימי יכתוב כאילו
     לא, וזה בדיוק מה שהופך את הערוץ לחסר תועלת.

   ⚠ **הקריאה של הצוות בלבד.** משוב שכל המכינה קוראת אינו
     אנונימי בפועל — מי שכותב על מקרה שקרה לו מזוהה מהתוכן.
   ============================================================ */
function MechinaFeedback({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    setErr(null);
    api.mechinaFeedback().then(setD).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) return <div className="banner-bad">{err}</div>;
  if (!d) return <div className="skel" style={{ height: 140 }} />;

  return (
    <>
      <div className="tm-anon">
        <BI.lock />
        <div>
          <b>מה שנכתב כאן אנונימי.</b> אין בלוח שדה שמזהה מי כתב — לא לראש
          המכינה, לא למדריכים וגם לא לנו. המחיר: אי אפשר למחוק בדיעבד את מה
          שכתבת, ואי אפשר לענות לך אישית.
        </div>
      </div>

      <div className="card lift" style={{ marginBottom: 14 }}>
        <div className="fld">
          <label>נושא</label>
          <input value={topic} disabled={busy === "n"} placeholder="לא חובה"
            onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div className="fld">
          <label>מה יש לך לומר</label>
          <textarea rows={5} value={text} disabled={busy === "n"}
            placeholder="מה עובד, מה לא, ומה היה משנה את היום־יום כאן"
            onChange={(e) => setText(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={busy === "n" || !text.trim()}
          onClick={() => {
            setBusy("n");
            api.sendMechinaFeedback({ topic: topic.trim(), text: text.trim() })
              .then(() => { setText(""); setTopic(""); setSent(true); say("נשלח"); load(); })
              .catch((e) => say(e.message)).finally(() => setBusy(null));
          }}>שליחה</button>
        {sent && (
          <div className="tm-note" style={{ marginTop: 10 }}>
            נשלח. אין דרך לקשר את זה אליך.
          </div>
        )}
      </div>

      {/* ⚠ החניך אינו רואה את מה שאחרים כתבו, וזה נאמר — מסך
          שנראה ריק בלי הסבר נראה כמו תקלה (עיקרון 6). */}
      {!d.canRead ? (
        <div className="tm-note" style={{ marginTop: 0 }}>
          מה שנשלח כאן נקרא על ידי הצוות בלבד. משוב שכל המכינה קוראת אינו
          אנונימי בפועל — אפשר לזהות מי כתב לפי מה שכתב.
        </div>
      ) : d.feedback.length === 0 ? (
        <div className="empty"><div className="e1">אין עדיין משוב</div></div>
      ) : (
        <>
          <div className="grp-h"><span>מה נכתב · {d.feedback.length}</span></div>
          <div className="rows">
            {d.feedback.map((f) => (
              <div className="tm-entry-row" key={f.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {f.topic && <div className="tm-entry-t">{f.topic}</div>}
                  <div className="tm-pre">{f.text}</div>
                  {f.date && <div className="tm-entry-m"><span>{dmy(f.date)}</span></div>}
                </div>
                <button className="btn btn-ghost btn-sm ev-del" disabled={busy === f.id}
                  onClick={() => {
                    setBusy(f.id);
                    api.deleteMechinaFeedback(f.id)
                      .then(() => { say("נמחק"); load(); })
                      .catch((e) => say(e.message)).finally(() => setBusy(null));
                  }}>מחיקה</button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
