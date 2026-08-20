/* ============================================================
   שיעורים במכינה — גיליונות מרצים וחוות דעת
   ------------------------------------------------------------
   קובץ נפרד מ-Mechina.jsx: זה תחום השיעורים ולא הנוכחות.

   ⚠ המסך פתוח לצוות ולאחראי הלו״ז בלבד. ההרשאה נאכפת בשרת
     בכל נקודת קצה; מה שכאן הוא תצוגה.

   ⚠ "טרם דווח" אינו "לא התקיים". שלושת המצבים מוצגים אחרת,
     כי מפגש שאיש לא נגע בו אינו מוריד ממניין השיעורים שהמרצה
     העביר — וזה המספר שכל המסך קיים בשבילו.
   ============================================================ */

import React, { useState, useMemo } from "react";
import { api } from "./api.js";

const LI = {
  book: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5z"/><path d="M4 17.5h16"/></svg>,
  star: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

const dmy = (iso) => iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : "";
const dm = (iso) => iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}` : "";

/* ---------- טעינה (זהה בהתנהגות לזו שב-Mechina.jsx) ---------- */
function useLoad(fn, deps = []) {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(true);
  const run = React.useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e.message || "הטעינה נכשלה"); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

const Loading = ({ what }) => (
  <div className="empty" style={{ paddingTop: 60 }}><div className="e1">{what}…</div></div>
);

function LoadFail({ msg, onRetry }) {
  return (
    <div className="alert a-clay">
      <LI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הנתונים</div>
        <div className="bd">{msg} — מה שמוצג כאן אינו מעודכן ואסור להסתמך עליו.</div>
        {onRetry && <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>נסו שוב</button>}
      </div>
    </div>
  );
}

/* ============================================================
   דוח חודשי לאקסל
   ------------------------------------------------------------
   הנתונים מהשרת; הקובץ נבנה בדפדפן עם SheetJS (נטען מ-CDN,
   כמו בדוח התקופתי של המטבח). אם הספרייה לא נטענה — CSV.
   ============================================================ */
function useSheetJS() {
  React.useEffect(() => {
    if (window.XLSX || document.getElementById("sheetjs-cdn")) return;
    const s = document.createElement("script");
    s.id = "sheetjs-cdn";
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.body.appendChild(s);
  }, []);
}

function MonthlyReport({ onClose, say }) {
  useSheetJS();
  const { data, err, busy, reload } = useLoad(() => api.getLessonReport(), []);
  const [month, setMonth] = useState("");

  if (busy && !data) return <Loading what="טוען נתוני דוח" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const monthName = (m) => {
    const [y, mo] = m.split("-");
    return ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][Number(mo) - 1] + " " + y;
  };

  const download = async () => {
    try {
      const rep = await api.getLessonReport(month || undefined);
      const header = ["שיעור", "מרצה", "יום ושעה", "מתוכננים", "התקיימו", "לא התקיימו", "טרם דווחו", "תאריכי קיום"];
      const rows = rep.rows.map((r) => [
        r.subject, r.lecturer, r.dayTime, r.planned, r.happened, r.missed, r.pending,
        r.dates.map(dmy).join(", "),
      ]);
      const label = month ? monthName(month) : "כל השנה";

      if (window.XLSX) {
        const ws = window.XLSX.utils.aoa_to_sheet([[`דוח שיעורים — ${label}`], [], header, ...rows]);
        ws["!cols"] = [{ wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 10 }, { wch: 60 }];
        const wb = window.XLSX.utils.book_new();
        wb.Workbook = { Views: [{ RTL: true }] };
        window.XLSX.utils.book_append_sheet(wb, ws, "דוח שיעורים");
        window.XLSX.writeFile(wb, `דוח-שיעורים-${month || "שנתי"}.xlsx`);
      } else {
        /* SheetJS לא נטען — CSV עם BOM כדי שאקסל יקרא עברית */
        const csv = "﻿" + [header, ...rows]
          .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        a.download = `דוח-שיעורים-${month || "שנתי"}.csv`;
        a.click();
      }
      say("הדוח ירד");
    } catch (e) { say(e.message); }
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onClose}>
        <LI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">דוח חודשי</div>

      <div className="card">
        <div className="fld">
          <label htmlFor="rp-month">חודש</label>
          <select id="rp-month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">כל השנה</option>
            {data.months.map((m) => <option value={m} key={m}>{monthName(m)}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6,
                      marginBottom: 12 }}>
          הדוח כולל לכל שיעור את מספר המפגשים שהתקיימו, לא התקיימו וטרם דווחו —
          ואת תאריכי הקיום המלאים.
        </div>
        <button className="btn btn-primary" onClick={download}>הורדת הדוח (Excel)</button>
      </div>
    </>
  );
}

/* ============================================================
   רשימת הגיליונות
   ============================================================ */
function SheetList({ onOpen, onNew, onReport, canEdit }) {
  const { data, err, busy, reload } = useLoad(() => api.getLessonSheets(), []);
  const [q, setQ] = useState("");

  if (busy && !data) return <Loading what="טוען גיליונות" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const list = data.sheets.filter((s) =>
    !q.trim() || s.subject.includes(q.trim()) || (s.lecturer || "").includes(q.trim()));
  const t = data.totals;

  return (
    <>
      <div className="stats" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="k">מפגשים מתוכננים</div>
          <div className="v num">{t.planned}</div>
          <div className="n">מתוך {t.total} בלו״ז</div>
        </div>
        <div className="stat ok">
          <div className="k">התקיימו בפועל</div>
          <div className="v num">{t.happened}</div>
          <div className="n">{t.pending} טרם דווחו</div>
        </div>
      </div>

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
        onClick={onReport}>דוח חודשי (Excel)</button>

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש שיעור או מרצה" />

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">אין גיליון תואם</div>
          <div className="e2">נסו חלק מהשם.</div>
        </div>
      ) : (
        <div className="rows">
          {list.map((s) => (
            <button className="st-row" key={s.id} onClick={() => onOpen(s)}>
              <div className="st-main">
                <div className="st-n">{s.subject}</div>
                <div className="st-m">
                  <span>{s.lecturer || "ללא מרצה"}</span>
                  {s.dayTime && <span>· {s.dayTime}</span>}
                </div>
              </div>
              <div className="st-fig">
                <b className="p-ok num" title="התקיימו">{s.counts.happened}</b>
                <b className="p-new num" title="טרם דווחו">{s.counts.pending}</b>
                <b className="p-low num" title="בוטלו">{s.counts.cancelled}</b>
              </div>
              <LI.chev style={{ color: "var(--line2)" }} />
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 700,
                    marginTop: 10, textAlign: "center" }}>
        התקיימו · טרם דווחו · בוטלו
      </div>

      {canEdit && (
        <>
          <div className="sticky">
            <button className="btn btn-primary" onClick={onNew}><LI.plus />גיליון חדש</button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}
    </>
  );
}

/* ============================================================
   גיליון אחד — המפגשים והדיווח
   ============================================================ */
function SheetDetail({ sheet, onBack, say }) {
  const [seq, setSeq] = useState(0);
  const { data, err, busy, reload } = useLoad(() => api.getLessonSheet(sheet.id), [sheet.id, seq]);
  const [filter, setFilter] = useState("planned");
  const [busyId, setBusyId] = useState(null);
  const [patch, setPatch] = useState({});
  const [fields, setFields] = useState({}); // שם המרצה, לפני שמירה
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [evalFor, setEvalFor] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const back = (
    <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
      <LI.chev style={{ transform: "rotate(180deg)" }} />חזרה לגיליונות
    </button>
  );

  if (busy && !data) return <>{back}<Loading what="טוען גיליון" /></>;
  if (err) return <>{back}<LoadFail msg={err} onRetry={reload} /></>;
  if (!data) return back;

  const { counts, meetings, canEdit } = data;
  const guest = data.sheet.guestLecturer;
  const stateOf = (m) => (m.id in patch ? patch[m.id] : m.happened);
  const fieldOf = (m, k) => (fields[m.id] && k in fields[m.id] ? fields[m.id][k] : (m[k] || ""));

  if (adding) {
    return (
      <NewMeeting sheet={data.sheet} say={say} onCancel={() => setAdding(false)}
        onDone={() => { setAdding(false); setSeq((n) => n + 1); }} />
    );
  }

  if (editing) {
    return (
      <NewMeeting sheet={data.sheet} say={say} meeting={editing}
        onCancel={() => setEditing(null)}
        onDone={() => { setEditing(null); setSeq((n) => n + 1); }} />
    );
  }

  /* חוות דעת נכתבת ישירות ללוח של מחזור ב׳, עם שם המרצה ותחום
     השיעור ממולאים מראש. */
  if (evalFor) {
    return (
      <NewEval fields={[data.sheet.subject]} say={say}
        preset={{ name: fieldOf(evalFor, "lecturer"), field: data.sheet.subject,
                  meetingId: evalFor.id }}
        onCancel={() => setEvalFor(null)}
        onDone={() => { setEvalFor(null); say("חוות הדעת נוספה למחזור ב׳"); }} />
    );
  }

  const doDelete = () => {
    if (deleting) return;
    setDeleting(true);
    api.deleteLessonMeeting(confirmDel.id)
      .then(() => { say("המפגש נמחק"); setConfirmDel(null); setSeq((n) => n + 1); })
      .catch((e) => say(e.message))
      .finally(() => setDeleting(false));
  };

  /* ⚠ הכפתור אינו מחכה לשרת. הסימון מופיע מיד, ואם הקריאה
     נכשלה הוא חוזר אחורה. */
  const mark = (m, value) => {
    const next = stateOf(m) === value ? null : value;
    setPatch((p) => ({ ...p, [m.id]: next }));
    api.markLesson({ meetingId: m.id, happened: next })
      .catch((e) => { setPatch((p) => ({ ...p, [m.id]: m.happened })); say(e.message); });
  };

  const setField = (m, k, v) =>
    setFields((p) => ({ ...p, [m.id]: { ...(p[m.id] || {}), [k]: v } }));

  /* נשמר ביציאה מהשדה, ורק אם השתנה */
  const saveField = (m, k) => {
    const v = fieldOf(m, k);
    if (v === (m[k] || "")) return;
    setBusyId(m.id);
    api.markLesson({ meetingId: m.id, happened: stateOf(m), [k]: v })
      .then(() => say(k === "lecturer" ? "שם המרצה נשמר" : "חוות הדעת נשמרה"))
      .catch((e) => { setField(m, k, m[k] || ""); say(e.message); })
      .finally(() => setBusyId(null));
  };

  const shown = meetings.filter((m) =>
    filter === "all" ? true
    : filter === "planned" ? m.planned === "כן"
    : m.planned === "לא");

  /* נספר מהמצב שעל המסך, כדי שהמספר יזוז עם הלחיצה */
  const live = meetings.reduce((a, m) => {
    const s = stateOf(m);
    if (s === "כן") a.happened++;
    else if (m.planned === "כן" && !s) a.pending++;
    return a;
  }, { happened: 0, pending: 0 });

  return (
    <>
      {back}
      <div className="screen-title">{data.sheet.subject}</div>
      <div className="sec-label">
        {data.sheet.lecturer || "ללא מרצה"}{data.sheet.dayTime ? " · " + data.sheet.dayTime : ""}
      </div>

      <div className="stats" style={{ marginBottom: 12 }}>
        <div className="stat ok">
          <div className="k">התקיימו בפועל</div>
          <div className="v num">{live.happened}</div>
          <div className="n">מתוך {counts.planned} מתוכננים</div>
        </div>
        <div className="stat">
          <div className="k">טרם דווחו</div>
          <div className="v num">{live.pending}</div>
          <div className="n">{counts.cancelled} בוטלו מראש</div>
        </div>
      </div>

      <div className="seg">
        <button className={filter === "planned" ? "on" : ""} onClick={() => setFilter("planned")}>מתוכננים</button>
        <button className={filter === "cancelled" ? "on" : ""} onClick={() => setFilter("cancelled")}>בוטלו</button>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>הכול</button>
      </div>

      {shown.length === 0 ? (
        <div className="empty"><div className="e1">אין מפגשים בקטגוריה הזו</div></div>
      ) : (
        <div className="rows">
          {shown.map((m) => {
            const s = stateOf(m);
            const cancelled = m.planned === "לא";
            return (
              <div className="crow" key={m.id}>
                <div className="crow-top">
                  <div className="r-main">
                    <div className="r-name">{dmy(m.date)} · {m.day}</div>
                    <div className="r-meta">
                      {cancelled ? (
                        <><span className="pill p-low">בוטל</span>{m.reason && <span>{m.reason}</span>}</>
                      ) : s === "כן" ? <span className="pill p-ok">התקיים</span>
                        : s === "לא" ? <span className="pill p-low">לא התקיים</span>
                        : <span className="pill p-new">טרם דווח</span>}
                      {m.note && <span>{m.note}</span>}
                    </div>
                  </div>
                </div>
                {!cancelled && canEdit && (
                  <div className="exp">
                    <button className={s === "כן" ? "on-ok" : ""} onClick={() => mark(m, "כן")}>
                      התקיים
                    </button>
                    <button className={s === "לא" ? "on-soon" : ""} onClick={() => mark(m, "לא")}>
                      לא התקיים
                    </button>
                  </div>
                )}

                {/* ⚠ מרצה אורח — נקבע בעמודה בלוח ולא לפי שם השיעור.
                    מוצג גם למפגש שטרם דווח, כדי שאפשר יהיה לרשום
                    מי אמור להגיע. */}
                {!cancelled && canEdit && guest && (
                  <div className="abs-note" style={{ padding: "0 0 4px" }}>
                    <input value={fieldOf(m, "lecturer")} placeholder="שם המרצה שהגיע"
                      onChange={(e) => setField(m, "lecturer", e.target.value)}
                      onBlur={() => saveField(m, "lecturer")} />
                    {/* ⚠ חוות הדעת אינה נשמרת על המפגש אלא בלוח חוות
                        הדעת של מחזור ב׳, כדי שכל חוות הדעת יישבו
                        במקום אחד וניתן יהיה לחפש בהן לאורך השנים. */}
                    <button className="btn btn-ghost btn-sm"
                      style={{ marginTop: 7, width: "100%" }}
                      onClick={() => setEvalFor(m)}>
                      <LI.star />הוספת חוות דעת
                    </button>
                    {busyId === m.id && (
                      <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 700, marginTop: 4 }}>
                        שומר…
                      </div>
                    )}
                  </div>
                )}

                {canEdit && (
                  <div style={{ display: "flex", gap: 6, padding: "2px 0 0" }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                      onClick={() => setEditing(m)}>עריכה</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: "var(--clay)" }}
                      onClick={() => setConfirmDel(m)}>מחיקה</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <>
          <div className="sticky">
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <LI.plus />הוספת מפגש
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}

      {/* ⚠ מחיקה בלתי הפיכה — תמיד דרך אישור, לעולם לא בלחיצה אחת */}
      {confirmDel && (
        <div className="scrim" onClick={() => !deleting && setConfirmDel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-h"><h3>מחיקת מפגש</h3></div>
            <div className="sheet-b">
              <div className="alert a-clay">
                <LI.warn />
                <div style={{ flex: 1 }}>
                  <div className="ttl">{dmy(confirmDel.date)} · {confirmDel.day}</div>
                  <div className="bd">
                    המפגש יימחק מהלוח לצמיתות, כולל הדיווח וההערות שעליו.
                    אי אפשר לבטל את הפעולה.
                  </div>
                </div>
              </div>
              <button className="btn btn-clay" disabled={deleting} onClick={doDelete}>
                {deleting ? "מוחק…" : "מחיקה לצמיתות"}
              </button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={deleting}
                onClick={() => setConfirmDel(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   מפגש חדש בגיליון קיים
   ⚠ נשמר ב-monday מיד. שם היום נגזר בשרת מהתאריך.
   ============================================================ */
function NewMeeting({ sheet, meeting, onDone, onCancel, say }) {
  /* אותו טופס לשני מצבים: meeting קיים = עריכה, בלעדיו = הוספה */
  const [date, setDate] = useState(meeting ? meeting.date : "");
  const [planned, setPlanned] = useState(meeting ? meeting.planned || "כן" : "כן");
  const [reason, setReason] = useState(meeting ? meeting.reason || "" : "");
  const [note, setNote] = useState(meeting ? meeting.note || "" : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const blocked = !date || (planned === "לא" && !reason.trim());

  const submit = (e) => {
    e.preventDefault();
    if (busy || blocked) return;
    setBusy(true); setErr(null);
    const call = meeting
      ? api.editLessonMeeting({
          meetingId: meeting.id, date, planned,
          reason: reason.trim(), note: note.trim(),
        })
      : api.addLessonMeeting({
          sheetId: sheet.id, date, planned,
          reason: reason.trim(), note: note.trim(),
        });
    call
      .then(() => { say(meeting ? "המפגש עודכן" : "המפגש נוסף"); onDone(); })
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <LI.chev style={{ transform: "rotate(180deg)" }} />ביטול
      </button>
      <div className="screen-title">{meeting ? "עריכת מפגש" : "מפגש חדש"}</div>
      <div className="sec-label">{sheet.subject}</div>

      <form className="card" onSubmit={submit}>
        {err && (
          <div className="alert a-clay" style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
          </div>
        )}

        <div className="fld">
          <label htmlFor="nm-date">תאריך</label>
          <input id="nm-date" type="date" value={date} disabled={busy}
            onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="fld">
          <label>האם יתקיים</label>
          <div className="pick">
            <button type="button" className={planned === "כן" ? "on" : ""} disabled={busy}
              onClick={() => setPlanned("כן")}>יתקיים</button>
            <button type="button" className={planned === "לא" ? "on" : ""} disabled={busy}
              onClick={() => setPlanned("לא")}>מבוטל</button>
          </div>
        </div>

        {planned === "לא" && (
          <div className="fld">
            <label htmlFor="nm-reason">סיבת ביטול</label>
            <input id="nm-reason" value={reason} disabled={busy}
              onChange={(e) => setReason(e.target.value)} placeholder="למשל: סדרת שטח" />
          </div>
        )}

        <div className="fld">
          <label htmlFor="nm-note">הערות (לא חובה)</label>
          <input id="nm-note" value={note} disabled={busy}
            onChange={(e) => setNote(e.target.value)} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={busy || blocked}>
          {busy ? "שומר…" : meeting ? "שמירת השינויים" : "הוספת המפגש"}
        </button>
      </form>
    </>
  );
}

/* ============================================================
   גיליון חדש
   ============================================================ */
function NewSheet({ onDone, onCancel, say }) {
  const [subject, setSubject] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [dayTime, setDayTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (busy || !subject.trim()) return;
    setBusy(true); setErr(null);
    api.createLessonSheet({ subject: subject.trim(), lecturer: lecturer.trim(), dayTime: dayTime.trim() })
      .then(() => { say("הגיליון נוצר"); onDone(); })
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <LI.chev style={{ transform: "rotate(180deg)" }} />ביטול
      </button>
      <div className="screen-title">גיליון חדש</div>

      <form className="card" onSubmit={submit}>
        {err && (
          <div className="alert a-clay" style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
          </div>
        )}
        <div className="fld">
          <label htmlFor="ls-subject">שם השיעור</label>
          <input id="ls-subject" value={subject} disabled={busy} autoFocus
            onChange={(e) => setSubject(e.target.value)} placeholder="למשל: מדעי המדינה" />
        </div>
        <div className="fld">
          <label htmlFor="ls-lecturer">מרצה (לא חובה)</label>
          <input id="ls-lecturer" value={lecturer} disabled={busy}
            onChange={(e) => setLecturer(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="ls-when">יום ושעה (לא חובה)</label>
          <input id="ls-when" value={dayTime} disabled={busy}
            onChange={(e) => setDayTime(e.target.value)} placeholder="למשל: שני 10:00" />
        </div>

        <div className="alert a-amber" style={{ marginBottom: 12 }}>
          <LI.warn />
          <div style={{ flex: 1 }}>
            <div className="bd" style={{ marginTop: 0 }}>
              הגיליון נוצר ריק. המפגשים נוספים בלוח ב-monday לפי הלו״ז —
              המערכת לא מנחשת תאריכים.
            </div>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={busy || !subject.trim()}>
          {busy ? "יוצר…" : "יצירת גיליון"}
        </button>
      </form>
    </>
  );
}

/* ============================================================
   חוות דעת על מרצים
   ============================================================ */
function Evals({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getLessonEvals(), []);
  const [cycle, setCycle] = useState(null);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  if (busy && !data) return <Loading what="טוען חוות דעת" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  if (adding) {
    return <NewEval fields={data.fields} onCancel={() => setAdding(false)} say={say}
      onDone={() => { setAdding(false); reload(); }} />;
  }

  const list = data.evals
    .filter((e) => !cycle || e.cycle === cycle)
    .filter((e) => !q.trim() || e.name.includes(q.trim()) || (e.topic || "").includes(q.trim()));

  return (
    <>
      <div className="seg">
        <button className={!cycle ? "on" : ""} onClick={() => setCycle(null)}>הכול</button>
        <button className={cycle === "מחזור א׳" ? "on" : ""} onClick={() => setCycle("מחזור א׳")}>מחזור א׳</button>
        <button className={cycle === "מחזור ב׳" ? "on" : ""} onClick={() => setCycle("מחזור ב׳")}>מחזור ב׳</button>
      </div>

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש מרצה או נושא" />

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">אין חוות דעת</div>
          <div className="e2">{cycle === "מחזור ב׳" ? "עדיין לא נכתבו חוות דעת השנה." : "נסו חלק מהשם."}</div>
        </div>
      ) : list.map((e) => (
        <div className="rq" key={e.id}>
          <div className="rq-top">
            <div className="rq-name">{e.name}</div>
            <span style={{ display: "flex", gap: 5 }}>
              {e.avg != null && (
                <span className="pill pp-ok num" title={`${e.votes} מדרגים`}>★ {e.avg}</span>
              )}
              {e.field && <span className="pill p-new">{e.field}</span>}
            </span>
          </div>
          {e.topic && <div className="rq-meta"><span>{e.topic}</span></div>}
          {e.opinion && <div className="rq-detail">{e.opinion}</div>}
          <div className="rq-meta" style={{ marginTop: 9 }}>
            {e.cycle && <span>{e.cycle}</span>}
            {e.phone && <span>· {e.phone}</span>}
            {e.by && <span>· {e.by}</span>}
          </div>
        </div>
      ))}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <LI.plus />חוות דעת חדשה
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function NewEval({ fields, onDone, onCancel, say, preset }) {
  const [f, setF] = useState({
    name: "", topic: "", field: "", phone: "", opinion: "", ...(preset || {}),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (busy || !f.name.trim() || !f.opinion.trim()) return;
    setBusy(true); setErr(null);
    api.addLessonEval({ ...f, cycle: "מחזור ב׳", meetingId: preset && preset.meetingId })
      .then(() => { say("חוות הדעת נוספה"); onDone(); })
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <LI.chev style={{ transform: "rotate(180deg)" }} />ביטול
      </button>
      <div className="screen-title">חוות דעת חדשה</div>

      <form className="card" onSubmit={submit}>
        {err && (
          <div className="alert a-clay" style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
          </div>
        )}
        <div className="fld">
          <label htmlFor="ev-name">שם המרצה</label>
          <input id="ev-name" value={f.name} disabled={busy} autoFocus onChange={set("name")} />
        </div>
        <div className="fld">
          <label htmlFor="ev-topic">נושא ההרצאה</label>
          <input id="ev-topic" value={f.topic} disabled={busy} onChange={set("topic")} />
        </div>
        <div className="fld">
          <label htmlFor="ev-field">תחום</label>
          <input id="ev-field" value={f.field} disabled={busy} onChange={set("field")}
            list="ev-fields" placeholder="למשל: מדעי המדינה" />
          <datalist id="ev-fields">
            {fields.map((x) => <option value={x} key={x} />)}
          </datalist>
        </div>
        <div className="fld">
          <label htmlFor="ev-phone">טלפון (לא חובה)</label>
          <input id="ev-phone" value={f.phone} disabled={busy} onChange={set("phone")} inputMode="tel" />
        </div>
        <div className="fld">
          <label htmlFor="ev-op">חוות דעת</label>
          <input id="ev-op" value={f.opinion} disabled={busy} onChange={set("opinion")}
            placeholder="מה היה טוב, למי להמליץ, דירוג" />
        </div>
        <button className="btn btn-primary" type="submit"
          disabled={busy || !f.name.trim() || !f.opinion.trim()}>
          {busy ? "שומר…" : "שמירה"}
        </button>
      </form>
    </>
  );
}

/* ============================================================
   גאנט — לו״ז שנתי
   ------------------------------------------------------------
   סדר-יום אנכי לפי חודשים ולא רשת אופקית: בטלפון רשת של שנה
   שלמה אינה קריאה. פס הצבע מקודד סוג, וסמן "אנחנו כאן" מפריד
   את מה שעבר ממה שמחכה.

   ⚠ קריאה בלבד. עריכת הגאנט — בלוח "מכינה ב׳ – גאנט שנתי"
     ב-monday, בלי דיפלוי.
   ============================================================ */
const GNT_MONTH = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const GNT_CLASS = { "שבת": "shabbat", "חג ומועד": "holiday" };

function Gantt() {
  const { data, err, busy, reload } = useLoad(() => api.getGantt(), []);
  const [type, setType] = useState(null);
  const [past, setPast] = useState(false);

  if (busy && !data) return <Loading what="טוען את הלו״ז" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const today = new Date().toISOString().slice(0, 10);
  const shown = data.events.filter((e) => !type || e.type === type);

  /* קיבוץ לחודשים; חודש שכולו עבר מתקפל אלא אם ביקשו לראות הכול */
  const months = [];
  for (const e of shown) {
    const key = e.start.slice(0, 7);
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      m = { key, label: GNT_MONTH[Number(e.start.slice(5, 7)) - 1] + " " + e.start.slice(0, 4), events: [] };
      months.push(m);
    }
    m.events.push(e);
  }
  const isPastMonth = (m) => m.events.every((e) => e.end < today);
  const visible = past ? months : months.filter((m) => !isPastMonth(m));
  const hiddenCount = months.length - visible.length;

  const range = (e) => e.start === e.end
    ? dm(e.start)
    : `${dm(e.start)}–${dm(e.end)}`;
  const days = (e) => {
    const n = Math.round((new Date(e.end) - new Date(e.start)) / 86400000) + 1;
    return n > 1 ? `${n} ימים` : null;
  };

  return (
    <>
      <div className="seg seg-scroll">
        {[[null, "הכול"], ["פעילות", "פעילות"], ["שבת", "שבתות"], ["חג ומועד", "חגים"]].map(([v, l]) => (
          <button key={l} className={type === v ? "on" : ""} onClick={() => setType(v)}>{l}</button>
        ))}
      </div>

      {hiddenCount > 0 && !past && (
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 12 }}
          onClick={() => setPast(true)}>
          הצגת {hiddenCount} חודשים שעברו
        </button>
      )}

      {visible.map((m) => {
        /* סמן "אנחנו כאן" — לפני האירוע הראשון שטרם הסתיים */
        let marker = -1;
        if (today.slice(0, 7) === m.key) {
          marker = m.events.findIndex((e) => e.end >= today);
        }
        return (
          <div className="gnt-month" key={m.key}>
            <div className="gnt-mh">
              <span className="m">{m.label}</span>
              <span className="c">{m.events.length} אירועים</span>
            </div>
            {m.events.map((e, i) => (
              <React.Fragment key={e.id}>
                {i === marker && <div className="gnt-now">אנחנו כאן</div>}
                <div className={"gnt-ev " + (GNT_CLASS[e.type] || "")
                  + (e.start <= today && today <= e.end ? " today" : "")}>
                  <div className="gnt-when">
                    <div className="d num">{range(e)}</div>
                    {days(e) && <div className="r">{days(e)}</div>}
                  </div>
                  <div className="gnt-what">
                    <div className="t">{e.name}</div>
                    {e.type !== "פעילות" && <div className="s">{e.type}</div>}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        );
      })}

      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600,
                    textAlign: "center", margin: "14px 0 20px", lineHeight: 1.6 }}>
        עריכת הלו״ז נעשית בלוח "גאנט שנתי" ב-monday ומתעדכנת כאן תוך דקות.
      </div>
    </>
  );
}

/* ============================================================
   הדף המלא
   ============================================================ */
export function LessonsPage({ say, sub0 }) {
  const [sub, setSub] = useState(sub0 || "sheets");
  const [sheet, setSheet] = useState(null);
  const [creating, setCreating] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [seq, setSeq] = useState(0); // מאלץ טעינה מחדש אחרי יצירה

  const inner = sheet || creating || reporting;

  return (
    <>
      <div className="screen-title">שיעורים במכינה</div>

      {!inner && (
        <div className="seg seg-scroll">
          <button className={sub === "sheets" ? "on" : ""} onClick={() => setSub("sheets")}>גיליונות</button>
          <button className={sub === "gantt" ? "on" : ""} onClick={() => setSub("gantt")}>גאנט שנתי</button>
          <button className={sub === "evals" ? "on" : ""} onClick={() => setSub("evals")}>חוות דעת</button>
        </div>
      )}

      {sub === "sheets" && (
        reporting ? (
          <MonthlyReport say={say} onClose={() => setReporting(false)} />
        ) : creating ? (
          <NewSheet say={say} onCancel={() => setCreating(false)}
            onDone={() => { setCreating(false); setSeq((n) => n + 1); }} />
        ) : sheet ? (
          <SheetDetail sheet={sheet} say={say} onBack={() => setSheet(null)} />
        ) : (
          <SheetList key={seq} onOpen={setSheet} onNew={() => setCreating(true)}
            onReport={() => setReporting(true)} canEdit />
        )
      )}

      {sub === "gantt" && <Gantt />}
      {sub === "evals" && <Evals say={say} />}
    </>
  );
}
