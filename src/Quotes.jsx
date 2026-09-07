/* ============================================================
   הציטוט היומי — הווידג׳ט במסך הבית, ובנק הציטוטים
   ------------------------------------------------------------
   שני ייצוא:
     DailyQuote  — כרטיס הציטוט של היום, טוען את עצמו. במסך
                   הבית של החניך. ⚠ מחזיר null בכשל ובריק —
                   ציטוט שלא נטען אינו סיבה לחסום את מסך הבית.
     QuotesPage  — הבנק: הוספה, רשימה, בחירה ומחיקה.

   ⚠ **הסימון אופטימי, ובכישלון חוזרים אחורה ואומרים** (4י).
     לחיצה על אימוג׳י שממתינה ל-monday נראית כאילו לא נקלטה;
     סימון שנשאר על המסך אחרי שהשרת דחה אותו הוא שקר.

   ⚠ **המצב הרצוי ולא "הפוך"** (עיקרון 5): לחיצה על התגובה
     שלי שולחת ריק ("אין לי תגובה"), לחיצה על אחרת שולחת אותה.
     שתי לחיצות כמעט יחד שולחות אותה כוונה ומקבלות אותה תוצאה.

   ⚠ **`canCurate` מגיע מהשרת** ואינו נגזר כאן — כפתור שמופיע
     למי שיקבל 403 אחרי שלחץ הוא הכשל של 4יד.

   ⚠ **הטיפוגרפיה**: "Suez One" כבר נטענת (כותרות המסכים), ולכן
     הציטוט הגדול אינו עולה בקשת גופן נוספת.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScreenNote from "./ScreenNote.jsx";

const QI = {
  plus: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" /></svg>),
  star: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z" /></svg>),
  edit: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17z" /><path d="M13 7l3 3" /></svg>),
  trash: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>),
  warn: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>),
  back: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /></svg>),
};

/* ⚠ אותו ביטוי בדיוק כמו ב-api/_quotes.js. המסך אומר מה
   לא בסדר לפני השליחה; השרת הוא מי שמכריע. */
const REACTION_RE =
  /^(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?|(?=[^\s]{1,12}$)[א-תA-Za-z׳״']+!?)$/u;
const REACTION_HINT = "מילה אחת בלי רווחים, עד 12 אותיות — או אימוג׳י";

/* ⚠ הסט הקבוע קצר בכוונה. שישה מספיקים כדי לא לחשוב; מה
   שמעבר לזה מקלידים בשדה "מילה אחת". */
const EMOJIS = ["❤️", "🔥", "👏", "😂", "🤔", "💪"];

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
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
  return { data, err, busy, reload: run, setData };
}

/* ============================================================
   התגובות — חישוב מקומי לסימון אופטימי
   ------------------------------------------------------------
   מורידים את התגובה הקודמת שלי, מוסיפים את החדשה, וממיינים
   כמו השרת. אותה צורה בדיוק, כדי שהתשובה שתחזור תחליף אותה
   בלי קפיצה.
   ============================================================ */
function applyLocal(live, next) {
  const counts = new Map(live.reactions.map((r) => [r.reaction, r.n]));
  if (live.myReaction) counts.set(live.myReaction, (counts.get(live.myReaction) || 1) - 1);
  if (next) counts.set(next, (counts.get(next) || 0) + 1);
  return {
    reactions: [...counts].filter(([, n]) => n > 0)
      .map(([reaction, n]) => ({ reaction, n }))
      .sort((a, b) => b.n - a.n || a.reaction.localeCompare(b.reaction, "he")),
    myReaction: next || null,
    total: live.total - (live.myReaction ? 1 : 0) + (next ? 1 : 0),
  };
}

/* ============================================================
   כרטיס הציטוט — משותף לווידג׳ט ולראש הבנק
   ============================================================ */
function QuoteCard({ q, say, footer }) {
  const [live, setLive] = useState({ reactions: q.reactions, myReaction: q.myReaction, total: q.total });
  const [busy, setBusy] = useState(false);
  const [word, setWord] = useState("");

  /* ⚠ ציטוט שהתחלף (בחירה חדשה, רענון) מאפס את המצב המקומי. */
  useEffect(() => {
    setLive({ reactions: q.reactions, myReaction: q.myReaction, total: q.total });
  }, [q.id, q.reactions, q.myReaction, q.total]);

  const react = (chosen) => {
    if (busy) return;
    /* ⚠ לחיצה על התגובה שלי = "אין לי תגובה". מצב רצוי, לא הפוך. */
    const want = chosen === live.myReaction ? "" : chosen;
    const snapshot = live;
    setLive(applyLocal(live, want));
    setBusy(true);
    api.reactQuote({ quote: q.id, reaction: want })
      .then((r) => setLive({ reactions: r.reactions, myReaction: r.myReaction, total: r.total }))
      .catch((e) => { setLive(snapshot); say(e.message); })
      .finally(() => setBusy(false));
  };

  const sendWord = (e) => {
    e.preventDefault();
    const w = word.trim();
    if (!w) return;
    if (!REACTION_RE.test(w)) { say(REACTION_HINT); return; }
    setWord("");
    react(w);
  };

  /* ⚠ הסט הקבוע תמיד, ואחריו כל תגובה שכבר קיימת ואינה בסט —
     מילים ואימוג׳ים אחרים. כך "וואו" של מישהו הופך לכפתור
     שכולם יכולים להצטרף אליו. */
  const counts = new Map(live.reactions.map((r) => [r.reaction, r.n]));
  const extra = live.reactions.filter((r) => !EMOJIS.includes(r.reaction));

  return (
    <div className="card lift qt-card">
      <div className="qt-mark" aria-hidden="true">״</div>
      <blockquote className="qt-text">{q.text}</blockquote>
      <div className="qt-by">— {q.author}</div>
      {/* ⚠ "מהבנק" נאמר בשקט: ברירת מחדל ובחירה נראות אותו דבר
          ואינן אותו דבר. */}
      {q.auto && <div className="qt-auto">מהבנק · טרם נבחר ציטוט להיום</div>}

      <div className="qt-chips">
        {EMOJIS.map((em) => (
          <button key={em} type="button"
            className={"qt-chip" + (live.myReaction === em ? " on" : "")}
            aria-pressed={live.myReaction === em}
            onClick={() => react(em)}>
            <span>{em}</span>
            {counts.get(em) > 0 && <span className="qt-n">{counts.get(em)}</span>}
          </button>
        ))}
        {extra.map((r) => (
          <button key={r.reaction} type="button"
            className={"qt-chip" + (/\p{Extended_Pictographic}/u.test(r.reaction) ? "" : " qt-word-chip")
              + (live.myReaction === r.reaction ? " on" : "")}
            aria-pressed={live.myReaction === r.reaction}
            onClick={() => react(r.reaction)}>
            <span>{r.reaction}</span>
            <span className="qt-n">{r.n}</span>
          </button>
        ))}
      </div>

      <form className="qt-word" onSubmit={sendWord}>
        <input value={word} maxLength={12} placeholder="מילה אחת…"
          aria-label="תגובה במילה אחת" disabled={busy}
          onChange={(e) => setWord(e.target.value.replace(/\s/g, ""))} />
        <button type="submit" disabled={busy || !word.trim()}>שליחה</button>
      </form>

      <div className="qt-foot">
        <span>{live.total ? `${live.total} הגיבו` : "עוד לא הגיב איש — תהיו הראשונים"}</span>
        {footer}
      </div>
    </div>
  );
}

/* ============================================================
   הווידג׳ט — מסך הבית
   ⚠ null בכל מצב שאינו "יש ציטוט": טעינה, כשל, לוח שטרם הוקם,
     בנק ריק. מסך הבית אינו נעצר בגלל ציטוט.
   ============================================================ */
export function DailyQuote({ say, onOpen }) {
  const { data, err, busy } = useLoad(() => api.getQuotes(), []);
  if (busy || err || !data || !data.daily) return null;
  return (
    <>
      <div className="sec-label">הציטוט היומי</div>
      <QuoteCard q={data.daily} say={say}
        footer={<button type="button" className="qt-link" onClick={onOpen}>לבנק הציטוטים</button>} />
      <div style={{ height: 6 }} />
    </>
  );
}

/* ============================================================
   הבנק
   ============================================================ */
export default function QuotesPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getQuotes(), []);
  const [adding, setAdding] = useState(false);

  /* ⚠ שלושה מצבים, שלושה מסכים: טעינה · כשל · טרם הוקם (עיקרון 6). */
  if (busy && !data) return (
    <>
      <div className="screen-title">הציטוט היומי</div>
      <div className="skel" style={{ height: 200 }} />
    </>
  );
  if (err?.setupRequired) return (
    <>
      <div className="screen-title">הציטוט היומי</div>
      <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <div className="qt-empty-mark" aria-hidden="true">״</div>
        <div style={{ fontSize: 16, fontWeight: 800, margin: "6px 0" }}>לוח הציטוטים עדיין לא הוקם</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          {err.message}. להריץ פעם אחת: <code dir="ltr">npm run seed:quotes</code>
        </div>
      </div>
    </>
  );
  if (err) return (
    <>
      <div className="screen-title">הציטוט היומי</div>
      <div className="alert a-clay">
        <QI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">לא הצלחנו לטעון את הציטוטים</div>
          <div className="bd">{err.message}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
        </div>
      </div>
    </>
  );
  if (!data) return null;

  return (
    <>
      <div className="screen-title">הציטוט היומי</div>
      <ScreenNote name="note.quotes" say={say} />
      {/* ⚠ שורה אחת שאומרת מי בוחר — מי שרואה כפתור "ציטוט היום"
          אצל אחרים ולא אצלו צריך לדעת שזה מכוון ולא תקלה. */}
      <div className="qt-hint">
        מובילי השבוע והצוות בוחרים את ציטוט היום · כל אחד מוסיף לבנק ומגיב.
      </div>

      {data.daily ? (
        <QuoteCard q={data.daily} say={say} />
      ) : (
        <div className="empty">
          <div className="qt-empty-mark" aria-hidden="true">״</div>
          <div className="e1">הבנק ריק</div>
          <div className="e2">הציטוט הראשון שיתווסף יהיה ציטוט היום.</div>
        </div>
      )}

      {adding ? (
        <AddForm say={say} onDone={() => { setAdding(false); reload(); }}
          onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
          onClick={() => setAdding(true)}><QI.plus />הוספה לבנק</button>
      )}

      {data.bank.length > 0 && (
        <>
          <div className="grp-h"><span>בנק הציטוטים · {data.bank.length}</span></div>
          <div className="rows">
            {data.bank.map((q) => (
              <BankRow key={q.id} q={q} today={data.today} canCurate={data.canCurate}
                say={say} reload={reload} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function AddForm({ say, onDone, onCancel }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = text.trim().length >= 3;

  return (
    <div className="card lift" style={{ marginTop: 12 }}>
      <div className="fld">
        <label>הציטוט</label>
        <textarea rows={3} value={text} autoFocus disabled={busy} maxLength={600}
          placeholder="משפט אחד ששווה לזכור"
          onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="fld">
        <label>מי אמר</label>
        <input value={author} disabled={busy} maxLength={80} placeholder="לא ידוע"
          onChange={(e) => setAuthor(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !ok}
          onClick={() => {
            setBusy(true);
            api.addQuote({ text: text.trim(), author: author.trim() })
              .then(() => { say("נוסף לבנק"); onDone(); })
              .catch((e) => say(e.message)).finally(() => setBusy(false));
          }}>הוספה</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy}
          onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   שורה בבנק
   ------------------------------------------------------------
   ⚠ מחיקה באישור **בתוך המסך** ולא `confirm()` של הדפדפן — הוא
     נחסם בחלק מדפדפני המובייל, ואז הכפתור פשוט לא עושה כלום (4ק).
   ============================================================ */
function BankRow({ q, today, canCurate, say, reload }) {
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState(q.text);
  const [author, setAuthor] = useState(q.author);

  const isToday = q.shown === today;
  const mayEdit = canCurate || q.mine;
  const run = (key, p, done) => {
    setBusy(key);
    p.then((r) => { if (done) done(r); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  const top = q.reactions.slice(0, 3);

  return (
    <div className={"qt-row" + (isToday ? " qt-today" : "")}>
      {editing ? (
        <>
          <div className="fld">
            <label>הציטוט</label>
            <textarea rows={3} value={text} disabled={busy === "e"} maxLength={600}
              onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="fld">
            <label>מי אמר</label>
            <input value={author} disabled={busy === "e"} maxLength={80}
              onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="qt-acts">
            <button type="button" className="qt-act qt-act-main" disabled={busy === "e" || text.trim().length < 3}
              onClick={() => run("e",
                api.curateQuote({ id: q.id, text: text.trim(), author: author.trim() }),
                () => { setEditing(false); say("נשמר"); })}>שמירה</button>
            <button type="button" className="qt-act" disabled={busy === "e"}
              onClick={() => { setEditing(false); setText(q.text); setAuthor(q.author); }}>ביטול</button>
          </div>
        </>
      ) : (
        <>
          <div className="qt-row-t">{q.text}</div>
          <div className="qt-row-m">
            <b>— {q.author}</b>
            {isToday && <span className="pill qt-pill-today">ציטוט היום</span>}
            {q.shown && !isToday && <span>הוצג {dmy(q.shown)}</span>}
            {q.by && <span>הוסיף/ה {q.by}</span>}
            {q.added && <span>{dmy(q.added)}</span>}
            {q.total > 0 && (
              <span className="qt-sum">
                {top.map((r) => <span key={r.reaction}>{r.reaction} {r.n}</span>)}
                {q.reactions.length > top.length && <span>…</span>}
              </span>
            )}
          </div>

          {(canCurate || mayEdit) && (
            <div className="qt-acts">
              {canCurate && (isToday ? (
                <button type="button" className="qt-act" disabled={busy === "s"}
                  onClick={() => run("s", api.curateQuote({ id: q.id, shown: null }),
                    () => say("חזר לבנק — היום מוצג ציטוט מהבנק"))}>
                  <QI.back />להחזיר לבנק
                </button>
              ) : (
                <button type="button" className="qt-act qt-act-main" disabled={busy === "s"}
                  onClick={() => run("s", api.curateQuote({ id: q.id, shown: "today" }),
                    () => say("זה ציטוט היום"))}>
                  <QI.star />הפוך לציטוט של היום
                </button>
              ))}
              {mayEdit && (
                <button type="button" className="qt-act" disabled={Boolean(busy)}
                  onClick={() => setEditing(true)}><QI.edit />עריכה</button>
              )}
              {mayEdit && (confirm ? (
                <>
                  <button type="button" className="qt-act qt-act-del on" disabled={busy === "d"}
                    onClick={() => run("d", api.deleteQuote(q.id),
                      (r) => say(r.removed ? `נמחק, עם ${r.removed} תגובות` : "נמחק"))}>
                    למחוק?
                  </button>
                  <button type="button" className="qt-act" disabled={busy === "d"}
                    onClick={() => setConfirm(false)}>ביטול</button>
                </>
              ) : (
                <button type="button" className="qt-act qt-act-del" disabled={Boolean(busy)}
                  onClick={() => setConfirm(true)}><QI.trash />מחיקה</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   העיצוב
   ------------------------------------------------------------
   ⚠ בלי בקטיקים בפנים — הבלוק נכנס ל-src/styles.js, שהוא
     template literal אחד (ראו "בקטיק בתוך styles.js").
   ⚠ צבעים דרך טוקנים בלבד, כדי שמצב לילה יעבוד מעצמו (5יד).
     ⚠ אין כאן var(--navy): הוא אינו מוגדר בשום מקום ב-styles.js
     — אותה מלכודת של --sand. הכחול הוא var(--accent).
   ⚠ כללים על <button> נושאים את הקידומת .kx — אחרת האיפוס של
     .kx button גובר עליהם (4מח).
   ============================================================ */
export const QUOTES_CSS = `
/* ---- הציטוט היומי ---- */
.kx .qt-card{position:relative;text-align:center;padding:30px 22px 16px;overflow:hidden}
.qt-mark{position:absolute;top:-6px;right:14px;font-family:"Suez One","David","Frank Ruhl Libre",serif;
  font-size:92px;line-height:1;color:var(--t3);opacity:.28;pointer-events:none;user-select:none}
.qt-text{font-family:"Suez One","David","Frank Ruhl Libre",serif;font-size:24px;line-height:1.55;
  font-weight:400;color:var(--ink);margin:4px 10px 10px;white-space:pre-wrap;position:relative;
  overflow-wrap:anywhere}
.qt-by{font-size:13.5px;font-weight:700;color:var(--muted)}
.qt-auto{font-size:11.5px;font-weight:700;color:var(--faint);letter-spacing:.3px;margin-top:3px}
.qt-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:16px}
.kx .qt-chip{display:inline-flex;align-items:center;gap:5px;min-height:38px;padding:0 12px;
  border-radius:999px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);
  font-size:17px;font-weight:700;cursor:pointer;
  transition:transform .12s var(--ease),background .12s var(--ease),border-color .12s var(--ease)}
.kx .qt-chip:active{transform:scale(.92)}
.kx .qt-chip.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.kx .qt-chip.qt-word-chip{font-size:13.5px;font-weight:800}
.kx .qt-chip .qt-n{font-size:12px;font-weight:800;color:var(--muted);font-variant-numeric:tabular-nums}
.kx .qt-chip.on .qt-n{color:var(--accent)}
.qt-word{display:flex;gap:6px;justify-content:center;margin-top:10px}
.qt-word input{width:156px;min-height:38px;border-radius:999px;border:1.5px solid var(--line);
  background:var(--bg);color:var(--ink);padding:0 12px;font:inherit;font-size:14px;font-weight:700;
  text-align:center}
.qt-word input::placeholder{color:var(--faint);font-weight:600}
.qt-word input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.kx .qt-word button{min-height:38px;padding:0 13px;border-radius:999px;border:1.5px solid var(--line);
  background:var(--surface);color:var(--ink);font-weight:800;font-size:13px;cursor:pointer}
.kx .qt-word button:disabled{opacity:.45;cursor:default}
.qt-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px;
  font-size:12px;font-weight:700;color:var(--faint)}
.kx .qt-link{background:none;border:0;padding:4px 2px;color:var(--accent);font-weight:800;
  font-size:12.5px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.qt-hint{font-size:12.5px;font-weight:600;color:var(--muted);line-height:1.5;margin:-6px 2px 14px}
.qt-empty-mark{font-family:"Suez One","David","Frank Ruhl Libre",serif;font-size:46px;line-height:1;
  color:var(--t3);opacity:.5}

/* ---- הבנק ---- */
.qt-row{padding:12px 14px;border-bottom:1px solid var(--line)}
.qt-row:last-child{border-bottom:0}
.qt-row.qt-today{background:var(--t3-s)}
.qt-row-t{font-family:"Suez One","David","Frank Ruhl Libre",serif;font-size:16.5px;line-height:1.5;
  color:var(--ink);white-space:pre-wrap;overflow-wrap:anywhere}
.qt-row-m{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;margin-top:5px;
  font-size:12px;font-weight:700;color:var(--faint)}
.qt-row-m b{color:var(--muted)}
.qt-sum{display:inline-flex;gap:8px;align-items:center;color:var(--muted)}
.qt-pill-today{background:var(--t3-s);color:var(--t3);border:1px solid var(--t3)}
.qt-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.kx .qt-act{display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:0 11px;
  border-radius:var(--r-sm);border:1.5px solid var(--line);background:var(--surface);color:var(--ink);
  font-weight:800;font-size:12.5px;cursor:pointer}
.kx .qt-act:disabled{opacity:.45;cursor:default}
.kx .qt-act.qt-act-main{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.kx .qt-act.qt-act-del{color:var(--clay);border-color:var(--clay-soft)}
.kx .qt-act.qt-act-del.on{background:var(--clay-soft);border-color:var(--clay);color:var(--clay)}
@media (prefers-reduced-motion:reduce){.kx .qt-chip{transition:none}.kx .qt-chip:active{transform:none}}
`;
