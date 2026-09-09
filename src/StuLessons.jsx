/* ============================================================
   שיעורי חניך — הטבלה, המועדים, והשיבוץ
   ------------------------------------------------------------
   שני סוגים לכל חניך: **שיעור חניך** ו**חניך מביא עולמו**.
   33 חניכים כפול שניים — 66 משבצות, וכל התכלית של המסך היא
   לדעת אילו מהן עוד ריקות.

   ⚠ **"שובץ" ו"התקיים" הם שני דברים.** שיבוץ לעתיד אינו
     "עשה", ולכן שני סימנים ולא אחד: מסגרת = שובץ, ✓ מלא =
     התקיים. סימן אחד לשניהם היה משאיר חניך בלי שיעור.

   ⚠ **המועדים נגזרים מהגאנט**, ומועד חסום מוצג עם הסיבה
     ואינו נמחק — רשימה של שמונה מועדים בשנה בלי הסבר נראית
     כמו מסך שבור (4כ).

   ⚠ **קריאה לכולם, עריכה לוועדת קבוצה ותוכן.** `canEdit`
     מגיע מהשרת ואינו נגזר כאן (4יד).
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { STU_KIND, STU_KINDS } from "../shared/stulesson.js";

const SI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5l5.2 5.2L20 7"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  book: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5z"/><path d="M8 7h8M8 11h5"/></svg>,
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
};
const shortKind = (k) => (k === STU_KIND.world ? "מביא עולמו" : "שיעור חניך");

export function StuLessonsPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [n, setN] = useState(0);
  const [tab, setTab] = useState("who"); // who · slots
  const [pick, setPick] = useState(null); // { date, kind }

  useEffect(() => {
    let alive = true;
    api.getStuLessons()
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [n]);

  const reload = () => setN((x) => x + 1);

  if (err) return (
    <>
      <div className="screen-title">שיעורי חניך</div>
      <div className={"alert " + (err.setupRequired ? "a-amber" : "a-clay")}>
        <SI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">{err.setupRequired ? "הלוח טרם הוקם" : "לא הצלחנו לטעון"}</div>
          <div className="bd">{err.message}</div>
        </div>
      </div>
    </>
  );
  if (!d) return <><div className="screen-title">שיעורי חניך</div>
    <div className="skel skel-card" /><div className="skel skel-card" /></>;

  if (pick) return (
    <AssignForm slot={pick} students={d.students} say={say}
      onDone={() => { setPick(null); reload(); }} onCancel={() => setPick(null)} />
  );

  return (
    <>
      <div className="screen-title">שיעורי חניך</div>
      <div className="tm-sub">
        כל חניך מעביר <b>שיעור חניך</b> ו<b>חניך מביא עולמו</b> — שני דברים שונים.
        הרשימה כאן היא כדי לדעת מי עוד לא.
      </div>

      {/* ⚠ הרצועה אומרת גם **כמה מועדים נשארו**. "18 מתוך 66"
          בלי לדעת אם בכלל אפשר להשלים אינו מספר שאפשר לפעול
          לפיו (4יח). */}
      <div className="band">
        <div className="band-h">המצב</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n ok">{d.counts.done}</div>
            <div className="band-l">התקיימו</div>
          </div>
          <div className="band-c">
            <div className="band-n">{d.counts.planned}</div>
            <div className="band-l">שובצו מתוך {d.counts.total}</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (d.counts.openSlots ? "" : " warn")}>{d.counts.openSlots}</div>
            <div className="band-l">משבצות פנויות</div>
          </div>
        </div>
      </div>

      {!d.canEdit && d.editHint && (
        <div className="ro-bar">{d.editHint}</div>
      )}

      <div className="seg">
        <button className={tab === "who" ? "on" : ""} onClick={() => setTab("who")}>מי כבר עשה</button>
        <button className={tab === "slots" ? "on" : ""} onClick={() => setTab("slots")}>המועדים</button>
      </div>

      {tab === "who" ? <WhoTable d={d} /> : (
        <SlotList d={d} say={say} onPick={setPick} onReload={reload} />
      )}
    </>
  );
}

/* ---------- 66 המשבצות ---------- */
function WhoTable({ d }) {
  const [only, setOnly] = useState(false); // רק מי שחסר לו

  const missing = (s) => STU_KINDS.some((k) => !s.kinds[k] || !s.kinds[k].planned);
  const list = only ? d.students.filter(missing) : d.students;

  return (
    <>
      <label className="stl-only">
        <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />
        <span>רק מי שחסר לו</span>
      </label>

      <div className="wm-wrap">
        <table className="stl-tbl">
          <thead>
            <tr>
              <th className="stl-nm">חניך</th>
              {STU_KINDS.map((k) => <th key={k}>{shortKind(k)}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className={s.me ? "me" : ""}>
                <th className="stl-nm">{s.name}</th>
                {STU_KINDS.map((k) => {
                  const c = s.kinds[k] || {};
                  return (
                    <td key={k}>
                      {/* ⚠ שני סימנים ולא אחד: ✓ מלא = התקיים,
                          מסגרת = שובץ וטרם. ראו ההערה בראש. */}
                      {c.done ? <span className="stl-v done"><SI.check /></span>
                        : c.planned ? <span className="stl-v plan" title={c.date || ""}>{dmy(c.date)}</span>
                          : <span className="stl-v none">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && (
        <div className="empty tone-1">
          <div className="e-ico"><SI.check /></div>
          <div className="e1">כולם שובצו</div>
        </div>
      )}
    </>
  );
}

/* ---------- המועדים ---------- */
function SlotList({ d, say, onPick, onReload }) {
  const [past, setPast] = useState(false);
  const [busy, setBusy] = useState(null);

  const slots = d.slots.filter((s) => past || s.date >= d.today);

  const mark = (id, v) => {
    setBusy(id);
    api.editStuLesson({ id, happened: v })
      .then(() => { say("נשמר"); onReload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };
  const remove = (id) => {
    setBusy(id);
    api.deleteStuLesson(id)
      .then(() => { say("השיבוץ בוטל"); onReload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  return (
    <>
      <label className="stl-only">
        <input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} />
        <span>להציג גם מועדים שעברו</span>
      </label>

      {slots.length === 0 && (
        <div className="empty"><div className="e1">אין מועדים בטווח</div></div>
      )}

      <div className="rows">
        {slots.map((s) => (
          <div className={"card stl-slot" + (s.blocked ? " off" : "")} key={s.date}>
            <div className="stl-sh">
              <b>{s.dowName} · {dmy(s.date)}</b>
              {/* ⚠ הסיבה נאמרת ולא רק "אין" — ראו 4כ. */}
              {s.blocked && <span className="stl-why">{s.reason}</span>}
            </div>

            {STU_KINDS.map((k) => {
              const t = s.taken.find((x) => x.kind === k);
              return (
                <div className="stl-row" key={k}>
                  <span className="stl-k">{shortKind(k)}</span>
                  {t ? (
                    <>
                      <b className="stl-who">{t.student}</b>
                      {d.canEdit && (
                        <div className="stl-act">
                          <button className={"btn btn-ghost btn-sm" + (t.happened === true ? " on" : "")}
                            disabled={busy === t.id}
                            onClick={() => mark(t.id, t.happened === true ? null : true)}>
                            {t.happened === true ? "התקיים ✓" : "סמן התקיים"}
                          </button>
                          <button className="esc-del" title="ביטול השיבוץ"
                            disabled={busy === t.id} onClick={() => remove(t.id)}>✕</button>
                        </div>
                      )}
                      {!d.canEdit && t.happened === true && <span className="stl-done">התקיים</span>}
                    </>
                  ) : d.canEdit && !s.blocked ? (
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => onPick({ date: s.date, kind: k, dowName: s.dowName })}>
                      שיבוץ
                    </button>
                  ) : (
                    <span className="stl-free">פנוי</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- שיבוץ ---------- */
function AssignForm({ slot, students, say, onDone, onCancel }) {
  const [id, setId] = useState("");
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  /* ⚠ **מי שכבר שובץ לסוג הזה מסומן ומושבת** — השרת חוסם
     ממילא, וכפתור שמקבל 409 אחרי הלחיצה הוא בדיוק מה
     ש-4יד אוסר. */
  const list = students.filter((s) => !q.trim() || s.name.includes(q.trim()));

  const save = () => {
    if (busy || !id) return;
    setBusy(true);
    api.addStuLesson({ date: slot.date, kind: slot.kind, studentId: id, topic })
      .then(() => { say("שובץ"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <SI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{shortKind(slot.kind)}</div>
      <div className="tm-sub">{slot.dowName} · {dmy(slot.date)}</div>

      <div className="card lift">
        <div className="fld">
          <label>נושא (לא חובה)</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} disabled={busy} />
        </div>
        <div className="fld">
          <label>מי</label>
          <input className="search" value={q} placeholder="חיפוש חניך"
            onChange={(e) => setQ(e.target.value)} />
          <div className="rows scroll-y stl-pick">
            {list.map((s) => {
              const done = s.kinds[slot.kind] && s.kinds[slot.kind].planned;
              return (
                <button className="st-row" key={s.id} disabled={busy || done}
                  onClick={() => setId(s.id)}>
                  <div className={"tick" + (id === s.id ? " on" : "")}>
                    {id === s.id && <SI.check style={{ color: "#fff" }} />}
                  </div>
                  <div className="st-main">
                    <div className="st-n">{s.name}</div>
                    {done && <div className="st-sub">כבר שובץ ל{shortKind(slot.kind)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }}
          disabled={busy || !id} onClick={save}>
          {busy ? "שומר…" : "שיבוץ"}
        </button>
      </div>
    </>
  );
}

/* ============================================================
   "השיעור הבא שלי" — כרטיס למסך הבית
   ------------------------------------------------------------
   ⚠ **מוצג רק כשיש מה לומר.** חניך שאינו משובץ ולא עשה כלום
     אינו מקבל כרטיס "עוד לא שובצת" — זו לא מטלה שלו, היא של
     הוועדה, וכרטיס כזה מלמד להתעלם מהמקום שבו כן תופיע
     ההודעה האמיתית.
   ============================================================ */
export function MyStuLessonCard({ onOpen }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let alive = true;
    api.getStuLessons().then((r) => { if (alive) setD(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!d) return null;
  const mine = (d.rows || []).filter((r) => r.mine && r.date >= d.today && r.happened !== true);
  if (!mine.length) return null;
  const next = mine[0];

  return (
    <button className="card nx-card" onClick={onOpen}>
      <div className="nx-ico"><SI.book /></div>
      <div className="nx-b">
        <div className="nx-l">
          <b>{shortKind(next.kind)}</b>
          <span>{dmy(next.date)}{next.topic ? ` · ${next.topic}` : ""}</span>
        </div>
        {mine.length > 1 && (
          <div className="nx-l">
            <b>{shortKind(mine[1].kind)}</b>
            <span>{dmy(mine[1].date)}</span>
          </div>
        )}
      </div>
      <SI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
    </button>
  );
}

export const STULESSON_CSS = `
.stl-only{display:flex;align-items:center;gap:7px;margin-bottom:10px;
  font-size:12px;font-weight:800;color:var(--muted)}
.stl-tbl{width:100%;min-width:420px;border-collapse:collapse;direction:rtl}
.stl-tbl th,.stl-tbl td{border:1px solid var(--line2);padding:7px 8px;font-size:12px;
  text-align:center}
.stl-tbl thead th{background:var(--soft);font-weight:900;color:var(--muted)}
.stl-nm{text-align:right;font-weight:800;color:var(--ink);white-space:nowrap}
.stl-tbl tr.me th,.stl-tbl tr.me td{background:var(--accent-soft)}
.stl-v{display:inline-flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:900}
.stl-v.done{width:22px;height:22px;border-radius:999px;background:var(--t1);color:#fff}
.stl-v.plan{color:var(--t2);font-variant-numeric:tabular-nums}
.stl-v.none{color:var(--faint)}

.stl-slot{margin-bottom:8px}
.stl-slot.off{opacity:.62}
.stl-sh{display:flex;align-items:baseline;gap:8px;margin-bottom:7px}
.stl-sh b{font-size:13.5px;font-weight:900;color:var(--ink)}
.stl-why{font-size:11px;font-weight:800;color:var(--t6)}
.stl-row{display:flex;align-items:center;gap:9px;padding:5px 0;
  border-top:1px solid var(--line2)}
.stl-k{flex:0 0 92px;font-size:11.5px;font-weight:800;color:var(--faint)}
.stl-who{flex:1;font-size:13px;font-weight:800;color:var(--ink)}
.stl-free{flex:1;font-size:12px;font-weight:700;color:var(--faint)}
.stl-done{font-size:11.5px;font-weight:900;color:var(--t1)}
.stl-act{display:flex;align-items:center;gap:5px;margin-inline-start:auto}
.stl-pick{max-height:40vh}
`;
