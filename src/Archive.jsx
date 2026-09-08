/* ============================================================
   השיעורים שהיו — הארכיון
   ------------------------------------------------------------
   ⚠⚠ **המסך הזה נועד לחניך, וזו הסיבה שהוא קיים.** עד היום
     שיעור שהתקיים נשאר כשורה בלוח המפגשים ותו לא: מה שנאמר בו
     היה אצל מי שהיה שם, ובסוף השנה אי אפשר היה לומר על שיעור
     בנובמבר יותר מ"הוא התקיים". כאן יושבים הסיכום, דפי העזר
     והדירוג — גם כדי לחזור לשיעור באמצע השנה, וגם כדי שיהיה
     ממה לסכם בסופה.

   ⚠ **הכתיבה באותו מסך שבו קוראים.** אחראי הלו״ז שכותב סיכום
     רואה את השיעור בדיוק כמו שהחניך יראה אותו — ולא ממלא טופס
     במסך אחר. זו אותה טעות של מסך ההצפות שתוקנה ב-4ס.

   ⚠ **"פתוח לדירוג" נדלק ביד ואינו נגזר מקיום סיכום.** לא כל
     שיעור ראוי לדירוג, ופתיחה אוטומטית הייתה מייצרת לחניך
     רשימה של עשרים שיעורים לדרג — כלומר אף אחד.
   ============================================================ */

import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScreenNote from "./ScreenNote.jsx";
import ScrollTabs from "./Tabs.jsx";

const AI = {
  book: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15"/></svg>,
  file: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/></svg>,
  star: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/></svg>,
  pen: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
  chev: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  up: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 19V6M6 11l6-6 6 6M4 21h16"/></svg>,
};

const dmy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
/* חודש בעברית, לכותרת הקיבוץ */
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const monthLabel = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/* ⚠ אותו סולם צבע של חוות הדעת (4ב): הצבע לפי הציון ולא לפי
   המקור, כי ברשימה ארוכה המספר לבדו אינו נקרא. */
const scoreTone = (n) =>
  n == null ? "" : n >= 9 ? "sc-ok" : n >= 8 ? "sc-blue" : n >= 6 ? "sc-amber" : "sc-clay";

export default function Archive({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(() => {
    setErr(null);
    api.getLessonArchive().then(setD).catch((e) => setErr(e));
  }, []);
  useEffect(load, [load]);

  /* ⚠ שלושה מצבים שונים: טוען, נכשל, וריק (עיקרון 6). */
  if (err) {
    return (
      <>
        <div className="screen-title">השיעורים שהיו</div>
        <div className="alert a-clay">
          <div style={{ flex: 1 }}>
            <div className="ttl">לא הצלחנו לטעון את הארכיון</div>
            <div className="bd">{err.message}</div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={load}>
              נסו שוב
            </button>
          </div>
        </div>
      </>
    );
  }
  if (!d) {
    return (
      <>
        <div className="screen-title">השיעורים שהיו</div>
        <div className="skel" style={{ height: 180 }} />
      </>
    );
  }

  const list = d.lessons.filter((l) =>
    (!subject || l.subject === subject)
    && (!q.trim() || l.subject.includes(q.trim())
      || (l.lecturer || "").includes(q.trim())
      || (l.summary || "").includes(q.trim())));

  /* קיבוץ לפי חודש — רשימה של 300 שיעורים בלי חלוקה אינה נסרקת */
  const groups = [];
  for (const l of list) {
    const key = l.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(l);
    else groups.push({ key, label: monthLabel(l.date), rows: [l] });
  }

  return (
    <>
      <div className="screen-title">השיעורים שהיו</div>
      <ScreenNote name="note.archive" say={say} />

      {/* ⚠ **כמה מהתמונה חסר, ולא רק מה שיש.** ארכיון של 200
          שיעורים שרק לעשרה מהם יש סיכום נראה מלא עד שמחפשים
          משהו. המספר הזה שייך למסך (4יח). */}
      <div className="band">
        <div className="band-h">מה נשמר מהשנה</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{d.counts.total}</div>
            <div className="band-l">שיעורים שהתקיימו</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (d.counts.withSummary ? " ok" : "")}>{d.counts.withSummary}</div>
            <div className="band-l">עם סיכום</div>
          </div>
          <div className="band-c">
            <div className="band-n">{d.counts.withFiles}</div>
            <div className="band-l">עם דפי עזר</div>
          </div>
        </div>
      </div>

      {/* ⚠ כשל הקמה נראה אחרת ממסך ריק, ואומר מה להריץ. */}
      {!d.ready && d.canWrite && (
        <div className="alert a-amber" style={{ marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="ttl">עמודות התוכן טרם הוקמו</div>
            <div className="bd">
              השיעורים מוצגים, אבל אי אפשר עדיין לכתוב סיכום או להעלות דפי עזר.
              להרצה פעם אחת: <span className="num">npm run seed:lesson-content</span>
            </div>
          </div>
        </div>
      )}

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש בנושא, במרצה או בסיכום" />

      <ScrollTabs className="seg">
        <button className={!subject ? "on" : ""} onClick={() => setSubject("")}>
          הכול ({d.lessons.length})
        </button>
        {d.subjects.map((s) => (
          <button key={s} className={subject === s ? "on" : ""} onClick={() => setSubject(s)}>{s}</button>
        ))}
      </ScrollTabs>

      {list.length === 0 ? (
        <div className="empty tone-1">
          <div className="e-ico"><AI.book /></div>
          <div className="e1">{d.lessons.length ? "אין שיעור שמתאים לחיפוש" : "עוד לא התקיים שיעור"}</div>
          <div className="e2">
            {d.lessons.length
              ? "אפשר לנקות את החיפוש או לבחור נושא אחר."
              : "שיעור שיסומן כמתקיים יופיע כאן, עם מה שנכתב עליו."}
          </div>
        </div>
      ) : groups.map((g) => (
        <div key={g.key}>
          <div className="grp-h"><span>{g.label}</span><span>{g.rows.length}</span></div>
          <div className="rows">
            {g.rows.map((l) => (
              <LessonCard key={l.id} l={l} d={d} say={say}
                open={open === l.id} onToggle={() => setOpen(open === l.id ? null : l.id)}
                editing={edit === l.id} onEdit={() => setEdit(l.id)}
                onDone={() => { setEdit(null); load(); }}
                onCancel={() => setEdit(null)} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============================================================
   כרטיס שיעור — סגור, ונפתח למי שרוצה לקרוא
   ⚠ סגור כברירת מחדל: סיכום של חמישה משפטים כפול מאתיים
     שיעורים אינו רשימה שאפשר לסרוק.
   ============================================================ */
function LessonCard({ l, d, say, open, onToggle, editing, onEdit, onDone, onCancel }) {
  if (editing) return <ContentForm l={l} say={say} onDone={onDone} onCancel={onCancel} />;

  return (
    <div className={"ar-card" + (open ? " on" : "")}>
      <button className="ar-head" onClick={onToggle}>
        <div className="ar-main">
          <div className="ar-t">{l.subject}</div>
          <div className="ar-m">
            <span className="num">{dmy(l.date)}</span>
            {l.time && <span className="num" dir="ltr">{l.time}</span>}
            {l.lecturer && <span>· {l.lecturer}</span>}
            {l.summary ? <span className="pill p-ok">סיכום</span>
              : <span className="pill p-new">אין סיכום</span>}
            {l.files.length > 0 && (
              <span className="pill p-ok"><AI.file /> {l.files.length}</span>
            )}
            {/* ⚠ המניין גם בשורה המכווצת. ציון בלי כמה דירגו אינו
                אומר אם הוא של הכיתה או של שני אנשים (4יח). */}
            {l.avg != null && (
              <span className={"ar-sc " + scoreTone(l.avg)}>
                <AI.star />{l.avg}
                <b className="ar-sc-n">{l.votes}</b>
              </span>
            )}
          </div>
        </div>
        <AI.chev className={"ar-chev" + (open ? " on" : "")} />
      </button>

      {open && (
        <div className="ar-body">
          {l.summary ? (
            /* ⚠ pre-wrap: הסיכום נכתב עם שבירות שורה מכוונות,
               ורינדור שמוחק אותן הופך רשימה לפסקה (4צ). */
            <div className="ar-sum">{l.summary}</div>
          ) : (
            <div className="e2" style={{ marginBottom: 10 }}>
              עוד לא נכתב סיכום לשיעור הזה.
            </div>
          )}

          {l.files.length > 0 && (
            <>
              <div className="sec-label">דפי עזר</div>
              <div className="ar-files">
                {l.files.map((f) => (
                  <a key={f.id} className="ar-file" href={f.url} target="_blank" rel="noreferrer">
                    <AI.file /><span>{f.name}</span>
                  </a>
                ))}
              </div>
            </>
          )}

          {/* ⚠ הדירוג כאן ולא במסך נפרד: מי שקרא את הסיכום הוא
              מי שיכול לדרג, וזה הרגע שבו הוא זוכר את השיעור. */}
          {l.canRate && d.me.isStudent && <Rate l={l} say={say} />}

          {/* ============================================================
              ⚠ **סגור לדירוג אומר למה, ולא סתם נעלם.**

              שני מצבים שונים לגמרי: "עברו שבועיים" הוא חלון
              שנסגר, ו"טרם נכתב תוכן" הוא משהו שעוד יקרה. חניך
              שרואה שיעור בלי כפתור דירוג ובלי הסבר מסיק שהמסך
              שבור (עיקרון 6).

              ⚠ ומוצג לחניך בלבד — לצוות אין מה לדרג.
              ============================================================ */}
          {!l.canRate && d.me.isStudent && l.rateClosed && (
            <div className="ar-closed">
              {l.rateClosed === "late"
                ? (l.myScore != null
                  ? `דירגת ${l.myScore}/10 · חלון הדירוג נסגר`
                  : "חלון הדירוג נסגר — עברו שבועיים מהשיעור")
                : "טרם נכתב תוכן לשיעור. כשייכתב, אפשר יהיה לדרג."}
            </div>
          )}

          {l.avg != null && !l.canRate && (
            <div className="ar-avg">
              ממוצע הכיתה <b className={"num " + scoreTone(l.avg)}>{l.avg}</b>
              <span> · {l.votes === 1 ? "מדרג אחד" : `${l.votes} מדרגים`}</span>
            </div>
          )}

          {d.canWrite && d.ready && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={onEdit}>
              <AI.pen />{l.summary ? "עריכת התוכן" : "הוספת סיכום ודפי עזר"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- דירוג 1–10 ----------
   ⚠ אופטימי, וחוזר אחורה בכישלון (4י). */
function Rate({ l, say }) {
  const [my, setMy] = useState(l.myScore);
  const [stat, setStat] = useState({ avg: l.avg, votes: l.votes });
  const [busy, setBusy] = useState(false);

  const rate = (n) => {
    if (busy) return;
    const prev = my;
    setMy(n); setBusy(true);
    api.rateLesson({ meetingId: l.id, score: n })
      .then((r) => setStat({ avg: r.avg, votes: r.votes }))
      .catch((e) => { setMy(prev); say(e.message); })
      .finally(() => setBusy(false));
  };

  return (
    <div className="ar-rate">
      <div className="sec-label" style={{ marginTop: 4 }}>הדירוג שלי לשיעור</div>
      <div className="rate-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} disabled={busy}
            className={my === n ? "on" : my && n <= my ? "lt" : ""}
            onClick={() => rate(n)}>{n}</button>
        ))}
      </div>
      <div className="ar-avg">
        {my ? <>דירגת <b className="num">{my}</b> · </> : "עוד לא דירגת · "}
        {stat.avg != null
          ? <>ממוצע הכיתה <b className={"num " + scoreTone(stat.avg)}>{stat.avg}</b> ({stat.votes})</>
          : "אין עדיין דירוגים"}
      </div>
    </div>
  );
}

/* ============================================================
   כתיבת התוכן — אחראי הלו״ז והצוות
   ============================================================ */
function ContentForm({ l, say, onDone, onCancel }) {
  const [summary, setSummary] = useState(l.summary || "");
  /* ⚠⚠ **מאתחל מ-`openRate` ולא מ-`canRate`.** מאז ש-canRate
     נגזר גם מהתוכן וגם מחלון הזמן, טופס שמאתחל ממנו היה מכבה
     תיבה שאחראי הלו״ז סימן — בשקט, ברגע שעברו שבועיים. */
  const [openRate, setOpenRate] = useState(Boolean(l.openRate));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { setFile(null); return; }
    if (f.size > 3.5 * 1024 * 1024) { say("הקובץ גדול מדי — עד 3.5MB"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setFile({
      name: f.name, mime: f.type || "application/octet-stream",
      data: String(reader.result).split(",")[1] || "",
    });
    reader.readAsDataURL(f);
  };

  const save = () => {
    if (busy) return;
    setBusy(true);
    api.setLessonContent({
      meetingId: l.id, summary, openRate,
      ...(file ? { fileName: file.name, fileMime: file.mime, fileData: file.data } : {}),
    })
      .then((r) => {
        if (r.fileUploaded === false) say("נשמר, אבל העלאת הקובץ נכשלה");
        else say(r.changed && r.changed.length ? "נשמר: " + r.changed.join(" · ") : "לא היה מה לשנות");
        onDone();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="card lift ar-form">
      <div className="ar-t" style={{ marginBottom: 2 }}>{l.subject}</div>
      <div className="ar-m" style={{ marginBottom: 12 }}>
        <span className="num">{dmy(l.date)}</span>
        {l.lecturer && <span>· {l.lecturer}</span>}
      </div>

      <div className="fld">
        <label htmlFor="ar-sum">מה היה בשיעור</label>
        <textarea id="ar-sum" rows={6} value={summary} disabled={busy}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="בכמה משפטים: על מה דובר, מה היו הנקודות המרכזיות, מה נשאר פתוח" />
        {/* ⚠ אומר במפורש מי קורא — זה מה שקובע איך כותבים. */}
        <div className="fld-hint">הטקסט הזה גלוי לכל החניכים, והוא מה שיישאר מהשיעור.</div>
      </div>

      <div className="fld">
        <label htmlFor="ar-file">דף עזר (לא חובה)</label>
        <input id="ar-file" type="file" disabled={busy} onChange={pick}
          accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
          style={{ width: "100%", minHeight: 48, background: "var(--surface)",
                   border: "1px solid var(--line2)", borderRadius: 11,
                   padding: "11px 13px", fontSize: 14 }} />
        {file && (
          <div style={{ fontSize: 12, color: "var(--ok)", fontWeight: 700, marginTop: 5 }}>
            ✓ {file.name} מוכן להעלאה
          </div>
        )}
        {l.files.length > 0 && (
          <div className="fld-hint">
            כבר יש {l.files.length} קבצים. קובץ חדש מתווסף לצידם ואינו מחליף אותם.
          </div>
        )}
      </div>

      {/* ⚠ **התיבה הזו היא "חוות דעת מזדמנת".** היא פותחת דירוג
          למפגש הזה בלי קשר לסוג הגיליון ובלי חלון זמן — כלומר
          גם לסדנה חד-פעמית וגם לשיעור מלפני חודש. */}
      <button type="button" className={"ar-toggle" + (openRate ? " on" : "")}
        disabled={busy} onClick={() => setOpenRate((v) => !v)}>
        <span className={"tick" + (openRate ? " on" : "")}>
          {openRate && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
        </span>
        <span>
          <b>פתוח לדירוג החניכים</b>
          <i>נפתח לשיעור הזה בלבד, בלי קשר לתאריך ולסוג הגיליון</i>
        </span>
      </button>

      <div className="ar-form-f">
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   ⚠ הקידומת `.ar-` בלבד, ובלי בקטיקים בפנים — ראו
     src/screen-css.js. כל כלל על <button> נושא `.kx` לפניו,
     כי `.kx button` מאפסת רקע ומסגרת בסגוליות גבוהה יותר.
   ============================================================ */
export const ARCHIVE_CSS = `
.ar-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);
  margin-bottom:8px;overflow:hidden;box-shadow:var(--sh-1)}
.ar-card.on{box-shadow:var(--sh-2)}
.kx .ar-head{display:flex;align-items:center;gap:10px;width:100%;text-align:right;
  padding:12px 13px;background:none;border:none}
.ar-main{flex:1;min-width:0}
.ar-t{font-size:14.5px;font-weight:800;color:var(--ink);line-height:1.35}
.ar-m{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px;
  font-size:11.5px;color:var(--muted);font-weight:700}
.ar-chev{color:var(--faint);flex:0 0 auto;transition:transform var(--ease)}
.ar-chev.on{transform:rotate(-90deg)}
.ar-sc{display:inline-flex;align-items:center;gap:3px;font-weight:800;
  padding:1px 6px;border-radius:6px;background:var(--t1-s);color:var(--ink)}
.ar-sc.sc-ok{background:var(--ok-soft);color:var(--ok)}
.ar-sc.sc-blue{background:var(--accent-soft);color:var(--accent)}
.ar-sc.sc-amber{background:var(--amber-soft);color:var(--amber)}
.ar-sc.sc-clay{background:var(--clay-soft);color:var(--clay)}
.ar-body{padding:0 13px 14px;border-top:1px solid var(--line)}
/* ⚠ pre-wrap: הסיכום נכתב עם שבירות שורה מכוונות */
.ar-sum{white-space:pre-wrap;font-size:14px;line-height:1.7;color:var(--ink);
  font-weight:500;padding:12px 0}
.ar-files{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.ar-file{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;
  color:var(--accent);background:var(--accent-soft);border-radius:var(--r-sm);
  padding:7px 10px;text-decoration:none}
.ar-avg{font-size:12.5px;color:var(--muted);font-weight:700;margin-top:8px}
.ar-rate{margin-top:10px}
.ar-form{margin-bottom:10px}
.ar-form-f{display:flex;gap:8px;margin-top:6px}
.ar-form-f .btn{flex:1}
.kx .ar-toggle{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:right;
  padding:11px 12px;border:1.5px solid var(--line2);border-radius:var(--r-md);
  background:var(--bg);margin-bottom:12px}
.kx .ar-toggle.on{border-color:var(--ok);background:var(--ok-soft)}
.ar-toggle b{display:block;font-size:13.5px;font-weight:800;color:var(--ink)}
.ar-toggle i{display:block;font-style:normal;font-size:11.5px;color:var(--muted);
  font-weight:600;margin-top:2px;line-height:1.5}
`;
