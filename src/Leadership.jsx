/* ============================================================
   דף המובילשיות
   ------------------------------------------------------------
   ⚠⚠ **רק מה שכבר עבר.** גם כשלחניך יש שיבוץ עתידי, הוא אינו
     מופיע כאן — דף שמראה את השבוע שעומד להגיע הופך מסיכום
     למטלה. מה שכן מוצג עליו: שורה אחת שאומרת מתי זה יהיה.

   ⚠ **שני קולות, שני שדות.** המשוב נכתב על ידי הצוות; הסיכום
     נכתב על ידי מי שהוביל. שדה אחד לשניהם היה מוחק את ההבחנה.

   ⚠ **הנתונים על השבוע נגזרים בשרת** ואינם נשמרים — כמה ימים
     סומנו, מה היה אחוז הנוכחות, כמה שיעורים דווחו. תיקון של
     יום נוכחות בדיעבד משנה גם את הדף הזה, מיד.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};
const ORD = ["", "הראשונה", "השנייה", "השלישית", "הרביעית", "החמישית"];

export default function Leadership({ say, staff = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    api.getLeadership(staff)
      .then((r) => { setData(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, [staff]);
  useEffect(() => { load(); }, [load]);

  if (err) {
    return <><div className="screen-title">מובילשיות</div>
      <div className="login-err">{err}</div></>;
  }
  if (!data) {
    return <><div className="screen-title">מובילשיות</div>
      <div className="skel" style={{ height: 200 }} /></>;
  }

  return (
    <>
      <div className="screen-title">{staff ? "מובילשיות שהיו" : "המובילשיות שלי"}</div>

      {data.weeks.length === 0 ? (
        <div className="empty">
          <div className="e1">{staff ? "עוד לא הסתיים אף שבוע הובלה" : "עוד לא הובלתם שבוע"}</div>
          {/* ⚠ **"עוד לא הובלת" שונה מ"יש לך שבוע עתידי".** דף
              ריק בלי המשפט הזה נראה כמו תקלה, ולא כמו "עוד לא
              הגיע התור" (עיקרון 6). */}
          <div className="e2">
            {(data.upcoming || []).length > 0
              ? `השבוע שלכם: ${data.upcoming.map((u) => `${dmy(u.start)}–${dmy(u.end)}`).join(" · ")}. `
                + "הדף הזה ייפתח אחרי שהוא יסתיים."
              : "הדף נפתח אחרי שהמובילות מסתיימת."}
          </div>
        </div>
      ) : data.weeks.map((w) => (
        <WeekCard key={w.id} w={w} canWrite={data.canWrite} mine={!staff}
          say={say} onSaved={load} />
      ))}
      <div style={{ height: 40 }} />
    </>
  );
}

function WeekCard({ w, canWrite, mine, say, onSaved }) {
  const [open, setOpen] = useState(false);
  const [editFb, setEditFb] = useState(false);
  const [editSum, setEditSum] = useState(false);
  const [fb, setFb] = useState(w.feedback || "");
  const [sum, setSum] = useState(w.summary || "");
  const [busy, setBusy] = useState(false);
  const f = w.facts;

  const save = (patch, done) => {
    if (busy) return;
    setBusy(true);
    api.saveLeadership({ weekId: w.id, ...patch })
      .then(() => { say("נשמר"); done(); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ld card">
      <button className="ld-h" onClick={() => setOpen(!open)}>
        <div className="ld-t">
          <b>{w.ordinal ? `המובילות ${ORD[w.ordinal] || `ה-${w.ordinal}`}` : `שבוע ${w.num}`}</b>
          <span>{dmy(w.start)} – {dmy(w.end)}{w.what ? ` · ${w.what}` : ""}</span>
        </div>
        {w.feedback && <span className="pill p-ok">יש משוב</span>}
      </button>

      {open && (
        <div className="ld-b">
          {w.leaders.length > 1 && (
            <div className="ld-with">
              הובלתם יחד: {w.leaders.map((l) => l.name).filter(Boolean).join(" · ")}
            </div>
          )}

          {/* ============================================================
              ⚠ **מספרים שנגזרים, ולא דוח.** אלה העובדות על השבוע
                שהמערכת באמת יודעת — לא הערכה ולא ציון.

              ⚠ ואחוז הנוכחות מוצג רק כשיש ימים מאחוריו (4ג).
              ============================================================ */}
          <div className="ld-facts">
            <div><b className="num">{f.marked}/{f.schoolDays}</b><span>ימים שסומנו</span></div>
            <div><b className="num">{f.avgPresent == null ? "—" : f.avgPresent}</b><span>נוכחים בממוצע</span></div>
            <div><b className="num">{f.lessonsReported}/{f.lessons}</b><span>שיעורים שדווחו</span></div>
          </div>
          {/* ⚠ המספר שאומר כמה מהתמונה חסר — מוצג, לא מושמט (4יח). */}
          {f.unmarked > 0 && (
            <div className="ld-gap">{f.unmarked} ימי לימוד בשבוע הזה לא סומנו</div>
          )}
          {f.absences > 0 && (
            <div className="ld-abs">
              {f.absences} היעדרויות
              {Object.entries(f.absencesByType).map(([k, n]) => (
                <span key={k}>{k} {n}</span>
              ))}
            </div>
          )}

          {w.note && <div className="ld-note"><i>הערת הלוח</i>{w.note}</div>}
          {w.escort && <div className="ld-note"><i>ליווי</i>{w.escort}</div>}

          {/* ---------- הסיכום של מי שהוביל ---------- */}
          <div className="sec-label">סיכום המובילות</div>
          {editSum ? (
            <>
              <textarea rows={5} value={sum} disabled={busy}
                placeholder="מה תכננתם, מה קרה, מה הייתם עושים אחרת"
                onChange={(e) => setSum(e.target.value)} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy}
                  onClick={() => save({ summary: sum }, () => setEditSum(false))}>
                  {busy ? "שומר…" : "שמירה"}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy}
                  onClick={() => { setSum(w.summary || ""); setEditSum(false); }}>ביטול</button>
              </div>
            </>
          ) : (
            <>
              <div className={"ld-text" + (w.summary ? "" : " ld-empty")}>
                {w.summary || "עוד לא נכתב סיכום."}
              </div>
              {/* ⚠ **רק מי שהוביל.** ראש המכינה אינו חריג כאן,
                  במכוון — זה הקול של מי שהיה שם. */}
              {mine && (
                <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 6 }}
                  onClick={() => setEditSum(true)}>
                  {w.summary ? "עריכת הסיכום" : "כתיבת סיכום"}
                </button>
              )}
            </>
          )}

          {/* ---------- המשוב של הצוות ---------- */}
          <div className="sec-label">משוב הצוות</div>
          {editFb ? (
            <>
              <textarea rows={5} value={fb} disabled={busy}
                placeholder="מה עבד, מה לשמר, מה לשפר בפעם הבאה"
                onChange={(e) => setFb(e.target.value)} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy}
                  onClick={() => save({ feedback: fb }, () => setEditFb(false))}>
                  {busy ? "שומר…" : "שמירה"}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy}
                  onClick={() => { setFb(w.feedback || ""); setEditFb(false); }}>ביטול</button>
              </div>
            </>
          ) : (
            <>
              <div className={"ld-text" + (w.feedback ? "" : " ld-empty")}>
                {w.feedback || "הצוות עוד לא כתב משוב."}
              </div>
              {w.feedbackBy && (
                <div className="ld-by">{w.feedbackBy}{w.feedbackAt ? ` · ${dmy(w.feedbackAt)}` : ""}</div>
              )}
              {canWrite && (
                <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 6 }}
                  onClick={() => setEditFb(true)}>
                  {w.feedback ? "עריכת המשוב" : "כתיבת משוב"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
