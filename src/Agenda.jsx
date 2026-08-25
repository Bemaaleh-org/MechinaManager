/* ============================================================
   הלו״ז — היום ושבועיים קדימה
   ------------------------------------------------------------
   נמשך מיומן Google של המכינה. אותו מסך לחניכים ולצוות.

   ⚠ צפייה בלבד. אין כאן כפתור עריכה ולא תהיה נקודת קצה
     שכותבת: היומן נערך ב-Google, והאפליקציה מציגה אותו.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";

const AI = {
  cal: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  pin: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>,
};

const DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const dowOf = (iso) => DOW[new Date(iso + "T12:00:00Z").getUTCDay()];
const dayLabel = (iso) =>
  `יום ${dowOf(iso)}, ${Number(iso.slice(8, 10))} ב${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

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

/* ---------- שורת אירוע ---------- */
function EventRow({ e }) {
  return (
    <div className="ag-ev">
      <div className="ag-time num">
        {e.allDay ? <span className="ag-allday">כל היום</span> : (
          <>
            <b>{e.time}</b>
            {e.endTime && <span>{e.endTime}</span>}
          </>
        )}
      </div>
      <div className="ag-body">
        <div className="ag-name">{e.name}</div>
        {e.location && (
          <div className="ag-loc"><AI.pin />{e.location}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- הלו״ז של היום, לשיבוץ במסך הבית ---------- */
export function TodayAgenda({ onOpen, max = 4 }) {
  const { data, err, busy } = useLoad(() => api.getAgenda(), []);
  if (busy || err || !data) return null;
  const list = data.todayEvents || [];
  if (list.length === 0) return null;

  return (
    <>
      <div className="sec-label">הלו״ז של היום</div>
      <button className="card ag-card" onClick={onOpen}>
        {list.slice(0, max).map((e, i) => <EventRow key={i} e={e} />)}
        {list.length > max && (
          <div className="ag-more">ועוד {list.length - max} בהמשך היום</div>
        )}
      </button>
    </>
  );
}

/* ---------- הדף ---------- */
export function AgendaPage() {
  const { data, err, busy, reload } = useLoad(() => api.getAgenda(), []);
  const [openAll, setOpenAll] = useState(false);

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען לו״ז…</div></div>
  );
  if (err?.setupRequired) return (
    <>
      <div className="screen-title">הלו״ז</div>
      <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <div style={{ marginBottom: 8 }}><AI.cal /></div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>היומן עדיין לא חובר</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          {err.message}
        </div>
      </div>
    </>
  );
  if (err) return (
    <div className="alert a-clay">
      <AI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הלו״ז</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  const today = data.days[0];
  const rest = data.days.slice(1);
  /* ⚠ ימים ריקים בהמשך אינם מוצגים — שורה "אין פעילות" לכל
     יום ריק הופכת שבועיים לרשימה של כלום. היום עצמו כן. */
  const withEvents = rest.filter((d) => d.events.length > 0);
  const shown = openAll ? withEvents : withEvents.slice(0, 3);

  return (
    <>
      <div className="screen-title">הלו״ז</div>

      <div className="ag-day today">
        <div className="ag-day-h">
          <b>היום · {dayLabel(today.date)}</b>
          <span className="num">{today.events.length ? `${today.events.length} פעילויות` : ""}</span>
        </div>
        {today.events.length === 0 ? (
          <div className="ag-empty">אין פעילות ביומן להיום</div>
        ) : today.events.map((e, i) => <EventRow key={i} e={e} />)}
      </div>

      <div className="sec-label">השבועיים הקרובים</div>

      {withEvents.length === 0 ? (
        <div className="attn-calm">
          <b>אין פעילות ביומן</b>
          <span>הימים הקרובים ריקים</span>
        </div>
      ) : (
        <>
          {shown.map((d) => (
            <div className="ag-day" key={d.date}>
              <div className="ag-day-h">
                <b>{dayLabel(d.date)}</b>
                <span className="num">{d.events.length}</span>
              </div>
              {d.events.map((e, i) => <EventRow key={i} e={e} />)}
            </div>
          ))}
          {withEvents.length > shown.length && (
            <button className="btn btn-ghost btn-sm" style={{ width: "100%" }}
              onClick={() => setOpenAll(true)}>
              הצגת {withEvents.length - shown.length} הימים הנותרים
            </button>
          )}
        </>
      )}

      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600,
                    textAlign: "center", margin: "16px 0 24px", lineHeight: 1.6 }}>
        הלו״ז נמשך מיומן המכינה ומתעדכן מעצמו. שינויים נעשים ביומן.
      </div>
    </>
  );
}
