/* ============================================================
   הלו״ז השנתי — דף עצמאי
   ------------------------------------------------------------
   הופרד ממסך השיעורים: הלו״ז נוגע לכל המכינה, לא רק למי
   שמנהל גיליונות מרצים. החניכים רואים אותו; מנהל ואחראי
   הלו״ז גם עורכים. ההרשאה נאכפת בשרת.

   ⚠ דף אחד לכל חודש, בלי מסננים ובלי רשימה מתחת: הכול נמצא
     פיזית ברשת, כמו בגיליון שממנו הלו״ז מגיע.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable } from "./excel.js";

const GI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  dl: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
};

const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const CLASS = { "שבת": "shabbat", "חג ומועד": "holiday" };

/* ⚠ שבת וחג הם משמעות קבועה ולכן צבע קבוע. כל השאר קיבל עד
   היום את אותו כחול, ולוח חודש שלם נראה מונוכרומטי — אי אפשר
   היה להבחין בין סמינר, מסע ויום חופש בלי לקרוא.

   הגוון נגזר משם האירוע, כמו בשיבוצים: אירוע חדש מקבל צבע
   מעצמו, ואותו שם מקבל תמיד אותו צבע — כך "הכנת צוות" נראה
   זהה לאורך כל החודש. */
function evTone(name) {
  let h = 0;
  const t = String(name || "");
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return "tone-" + (h % 8 + 1);
}
const chipClass = (e) => CLASS[e.type] ? CLASS[e.type] : "act " + evTone(e.name);

const dm = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const dmy = (iso) => dm(iso) + "/" + iso.slice(0, 4);
const monthName = (m) => MONTHS[Number(m.slice(5, 7)) - 1] + " " + m.slice(0, 4);
const dowOf = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ------------------------------------------------------------
   התאריך העברי לייצוא — בגימטריה, כמו בגיליון המקור.
   ⚠ Intl מחזיר ספרות ("18"), והגיליון כתוב באותיות ("י״ח").
   ------------------------------------------------------------ */
const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל"];

function gematria(n) {
  if (!n || n < 1 || n > 39) return String(n || "");
  /* ⚠ ט״ו וט״ז ולא י״ה/י״ו — צירופי שם ה׳ אינם נכתבים */
  if (n === 15) return "ט״ו";
  if (n === 16) return "ט״ז";
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  if (!t) return o + "׳";
  if (!o) return t + "׳";
  return t + "״" + o;
}

const hebFmt = new Intl.DateTimeFormat("he-u-ca-hebrew", { day: "numeric" });
const hebDay = (iso) => {
  try {
    const raw = hebFmt.format(new Date(iso + "T12:00:00Z"));
    const n = Number(String(raw).replace(/\D/g, ""));
    return n ? gematria(n) : String(raw);
  } catch { return ""; }
};

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

/* ---------- טופס אירוע ---------- */
function EventForm({ event, defaultDate, say, onDone, onCancel }) {
  const editing = Boolean(event);
  const [f, setF] = useState({
    name: event ? event.name : "",
    start: event ? event.start : defaultDate,
    end: event ? event.end : defaultDate,
    type: event ? event.type : "פעילות",
  });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const bad = !f.name.trim() || !f.start || (f.end && f.end < f.start);

  const save = () => {
    if (busy || bad) return;
    setBusy(true);
    const body = { name: f.name.trim(), start: f.start, end: f.end || f.start, type: f.type };
    (editing ? api.editGanttEvent({ id: event.id, ...body }) : api.addGanttEvent(body))
      .then(() => { say(editing ? "האירוע עודכן" : "האירוע נוסף"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy) return;
    setBusy(true);
    api.deleteGanttEvent(event.id)
      .then(() => { say("האירוע נמחק"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <GI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{editing ? "עריכת אירוע" : "אירוע חדש בלו״ז"}</div>

      <div className="card lift">
        <div className="fld">
          <label>שם האירוע</label>
          <input value={f.name} onChange={set("name")} disabled={busy} autoFocus={!editing}
            placeholder="למשל: סדרת ניווטים" />
        </div>
        <div className="two">
          <div className="fld">
            <label>מתאריך</label>
            <input type="date" value={f.start} onChange={set("start")} disabled={busy} />
          </div>
          <div className="fld">
            <label>עד תאריך</label>
            <input type="date" value={f.end} onChange={set("end")} disabled={busy} />
          </div>
        </div>
        <div className="fld">
          <label>סוג</label>
          <div className="pick">
            {["פעילות", "שבת", "חג ומועד"].map((t) => (
              <button type="button" key={t} className={f.type === t ? "on" : ""} disabled={busy}
                onClick={() => setF((p) => ({ ...p, type: t }))}>{t}</button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" disabled={busy || bad} onClick={save}>
          {busy ? "שומר…" : editing ? "שמירת השינויים" : "הוספת האירוע"}
        </button>
        {editing && (confirmDel ? (
          <button className="btn btn-clay" style={{ marginTop: 8 }} disabled={busy} onClick={remove}>
            למחוק לצמיתות?
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            onClick={() => setConfirmDel(true)}>מחיקת האירוע</button>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------
   ייצוא — ציר זמן אופקי, בתבנית של גיליון המקור.
   לכל חודש בלוק: שם החודש, אותיות הימים, מספרי הימים, התאריך
   העברי, ומתחתם מסלולי האירועים. אירוע רב-יומי הוא תא ממוזג
   על פני הימים שלו — בדיוק כמו בגיליון.
   ------------------------------------------------------------ */
function buildTimeline(events) {
  const months = [...new Set(events.map((e) => e.start.slice(0, 7)))].sort();
  const rows = [];
  const merges = [];
  let maxCols = 1;

  for (const m of months) {
    const y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7));
    const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const col = (iso) => Number(iso.slice(8, 10)); // עמודה 0 = תווית
    maxCols = Math.max(maxCols, last + 1);

    const days = Array.from({ length: last }, (_, i) => `${m}-${String(i + 1).padStart(2, "0")}`);
    rows.push([monthName(m), ...days.map((d) => DOW[dowOf(d)])]);
    rows.push(["", ...days.map((d) => Number(d.slice(8, 10)))]);
    rows.push(["תאריך עברי", ...days.map(hebDay)]);

    /* אירועי החודש, חתוכים לגבולותיו */
    const mine = events
      .filter((e) => e.start.slice(0, 7) <= m && e.end.slice(0, 7) >= m)
      .map((e) => ({
        name: e.name,
        from: e.start < `${m}-01` ? `${m}-01` : e.start,
        to: e.end > `${m}-${String(last).padStart(2, "0")}` ? `${m}-${String(last).padStart(2, "0")}` : e.end,
      }))
      .sort((a, b) => a.from.localeCompare(b.from) || b.to.localeCompare(a.to));

    /* ⚠ מסלולים: אירועים חופפים לא יכולים לשבת באותה שורה,
       אחרת המיזוג היה דורס. כל אירוע נכנס למסלול הפנוי הראשון. */
    const lanes = [];
    for (const e of mine) {
      let lane = lanes.find((L) => L[L.length - 1].to < e.from);
      if (!lane) { lane = []; lanes.push(lane); }
      lane.push(e);
    }

    for (const lane of lanes) {
      const row = new Array(last + 1).fill("");
      row[0] = "";
      for (const e of lane) {
        const c1 = col(e.from), c2 = col(e.to);
        row[c1] = e.name;
        if (c2 > c1) merges.push({ s: { r: rows.length, c: c1 }, e: { r: rows.length, c: c2 } });
      }
      rows.push(row);
    }

    rows.push([]); // שורת הפרדה בין חודשים
  }

  return { rows, merges, maxCols };
}

/* ---------- הדף ---------- */
export function GanttPage({ say }) {
  useExcel();
  const [seq, setSeq] = useState(0);
  const { data, err, busy, reload } = useLoad(() => api.getGantt(), [seq]);
  const [month, setMonth] = useState(null);
  const [openDay, setOpenDay] = useState(null);
  const [form, setForm] = useState(null);

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען את הלו״ז…</div></div>
  );
  if (err) return (
    <div className="alert a-clay">
      <GI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הלו״ז</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (form) return (
    <EventForm event={form.event} defaultDate={form.defaultDate} say={say}
      onDone={() => { setForm(null); setSeq((n) => n + 1); }}
      onCancel={() => setForm(null)} />
  );

  const today = new Date().toISOString().slice(0, 10);
  const events = data.events;
  const canEdit = data.canEdit;

  const months = [...new Set(events.map((e) => e.start.slice(0, 7)))].sort();
  const cur = month || (months.includes(today.slice(0, 7)) ? today.slice(0, 7) : months[0]);
  const idx = months.indexOf(cur);

  const byDate = new Map();
  for (const e of events) {
    for (let d = e.start; d <= e.end; d = addDays(d, 1)) {
      if (!d.startsWith(cur)) continue;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(e);
    }
  }

  const y = Number(cur.slice(0, 4)), mo = Number(cur.slice(5, 7));
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => cur + "-" + String(i + 1).padStart(2, "0")),
  ];

  const go = (i) => { if (i >= 0 && i < months.length) { setMonth(months[i]); setOpenDay(null); } };
  const dayEvents = openDay ? (byDate.get(openDay) || []) : [];

  const exportAll = () => {
    const { rows, merges, maxCols } = buildTimeline(events);
    downloadTable({
      file: "גאנט-מכינת-ניר-עוז",
      sheet: "גאנט שנתי",
      title: null, header: null, rows, merges,
      widths: [14, ...Array.from({ length: maxCols - 1 }, () => 5)],
    });
    say("הגאנט ירד");
  };

  return (
    <>
      <div className="screen-title">גאנט שנתי</div>

      <div className="bg-nav">
        <button className="btn btn-ghost btn-sm" disabled={idx <= 0} onClick={() => go(idx - 1)}>
          <GI.chev style={{ transform: "rotate(180deg)" }} />
        </button>
        <select value={cur} onChange={(e) => { setMonth(e.target.value); setOpenDay(null); }}>
          {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" disabled={idx >= months.length - 1} onClick={() => go(idx + 1)}>
          <GI.chev />
        </button>
      </div>

      <div className="cal">
        {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
        {cells.map((iso, i) => {
          if (!iso) return <div className="cal-cell empty" key={"e" + i} />;
          const evs = byDate.get(iso) || [];
          return (
            <button className={"cal-cell"
              + (iso === today ? " today" : "")
              + (dowOf(iso) === 6 ? " sat" : "")
              + (openDay === iso ? " open" : "")}
              key={iso} onClick={() => setOpenDay(openDay === iso ? null : iso)}>
              <span className="cal-n num">{Number(iso.slice(8, 10))}</span>
              <span className="cal-evs">
                {evs.slice(0, 3).map((e) => (
                  <i key={e.id} className={"cal-chip " + chipClass(e)} title={e.name}>
                    {e.name}
                  </i>
                ))}
                {evs.length > 3 && <i className="cal-chip more">+{evs.length - 3}</i>}
              </span>
            </button>
          );
        })}
      </div>

      {openDay && (
        <div className="card cal-day">
          <div className="cal-day-h">
            <b>{dmy(openDay)}</b>
            <button onClick={() => setOpenDay(null)}>סגירה</button>
          </div>
          {dayEvents.length === 0 ? (
            <div className="cal-day-empty">אין אירועים ביום הזה</div>
          ) : dayEvents.map((e) => (
            <button className={"gnt-ev " + (CLASS[e.type] || "")} key={e.id} disabled={!canEdit}
              onClick={() => canEdit && setForm({ event: e })}
              style={{ width: "100%", textAlign: "right", cursor: canEdit ? "pointer" : "default" }}>
              <div className="gnt-what">
                <div className="t">{e.name}</div>
                <div className="s">
                  {e.start === e.end ? dm(e.start) : dm(e.start) + "–" + dm(e.end)}
                  {e.type !== "פעילות" ? " · " + e.type : ""}
                  {canEdit ? " · לחצו לעריכה" : ""}
                </div>
              </div>
            </button>
          ))}
          {canEdit && (
            <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8 }}
              onClick={() => setForm({ defaultDate: openDay })}>
              <GI.plus />אירוע חדש ביום הזה
            </button>
          )}
        </div>
      )}

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
        onClick={exportAll}><GI.dl />הורדת הגאנט המלא לאקסל</button>

      {canEdit && (
        <button className="btn btn-primary"
          onClick={() => setForm({ defaultDate: openDay || (cur + "-01") })}>
          <GI.plus />אירוע חדש בלו״ז
        </button>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}
