/* ============================================================
   פניות גיוס — ועדת הגיוסים
   ------------------------------------------------------------
   ⚠⚠ **הפניות נכנסות מטופס monday, לא מכאן.** קישור ציבורי
     שיושב באתר מועצת המכינות, באינסטגרם ובטיקטוק — כל אדם
     באינטרנט ממלא אותו בלי חשבון ובלי כניסה. המסך הזה הוא
     **הטיפול**: מי לקח, מה נענה, ומה עוד פתוח.

   ⚠ **"מי לקח" נרשם בשם, וזה ההפך מעיקרון 5 — במכוון.** שם
     כאן אינו מעקב על חניך אלא "מי מדבר עם הבחור הזה", ובלעדיו
     שני חברי ועדה מתקשרים לאותו אדם. אותו נימוק כמו מי סימן
     בצ׳ק ליסט ההובלה (5יא).

   ⚠ **הפילוח לפי מקור הוא התועלת השנייה** — הוא אומר איזה
     ערוץ באמת מביא אנשים, וזו השאלה שבגללה מפרסמים בטיקטוק.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScrollTabs from "./Tabs.jsx";
import ScreenNote from "./ScreenNote.jsx";

const RI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  link: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>,
  mail: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.4"/><path d="m3 7 9 6 9-6"/></svg>,
  phone: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6 4z"/></svg>,
  inbox: (p) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 13h4l2 3h6l2-3h4"/><path d="M5 5h14l2 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4z"/></svg>,
};

const FRESH = "חדשה";
const WORKING = "בטיפול";
const ANSWERED = "נענתה";
const IRRELEVANT = "לא רלוונטי";

const PILL = {
  [FRESH]: "p-low", [WORKING]: "p-new",
  [ANSWERED]: "p-ok", [IRRELEVANT]: "p-idle",
};

const dmy = (iso) => (iso ? iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(2, 4) : "");

/* ⚠ מנקה רווחים ומקפים כדי שהחיוג יעבוד, ומשאיר את התצוגה
   כפי שהוקלדה — מספר שנשמר עם מקפים הוא מספר קריא. */
const telHref = (p) => "tel:" + String(p || "").replace(/[^\d+]/g, "");

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
  return { data, err, busy, reload: run };
}

/* ============================================================
   הקישור לשיתוף
   ------------------------------------------------------------
   ⚠ **הכתובת יושבת בלוח ולא בקוד** (`recruit.link` ב-
     shared/content.js) — טופס חדש לשנת גיוס חדשה אינו אמור
     להיות דיפלוי.

   ⚠ **ואם היא טרם הוזנה, המסך אומר בדיוק מה לעשות** ולא
     מציג שדה ריק שנראה שבור (עיקרון 6).
   ============================================================ */
function ShareLink({ say }) {
  const [url, setUrl] = useState(null);
  const [state, setState] = useState("load");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getChores()
      .then((r) => {
        if (!alive) return;
        const b = (r.texts || []).find((t) => t.key === "recruit.link");
        setUrl(b && String(b.text || "").trim() ? String(b.text).trim() : null);
        setState("ok");
      })
      .catch(() => { if (alive) setState("fail"); });
    return () => { alive = false; };
  }, []);

  if (state === "load") return <div className="skel skel-card" />;
  /* ⚠ כשל טעינה אינו "אין קישור" — זה עיקרון 6, ושתי ההודעות
     שונות לגמרי במה שהן אומרות לעשות. */
  if (state === "fail") {
    return <div className="fld-hint">הקישור לא נטען. רעננו את המסך.</div>;
  }

  if (!url) {
    return (
      <div className="card rc-share rc-empty">
        <div className="rc-share-h"><RI.link /><b>הקישור לטופס טרם הוזן</b></div>
        <ol className="rc-steps">
          <li>ב-monday, בלוח <b>מכינה – פניות גיוס</b>: <b>Integrate ▸ Forms</b></li>
          <li>להשאיר בטופס שם, טלפון, אימייל, סוג הפנייה, תוכן ומאיפה הגיע</li>
          <li>להעתיק את הקישור הציבורי מ-<b>Share</b></li>
          <li>להדביק אותו ב<b>ניהול תוכן ▸ הקישור לטופס הגיוס</b></li>
        </ol>
      </div>
    );
  }

  /* ⚠ **העתקה ולא רק הצגה.** הכתובת הזו נוסעת לביו של
     אינסטגרם ולאתר המועצה, ואיש לא מקליד אותה ביד. */
  const copy = () => {
    navigator.clipboard?.writeText(url)
      .then(() => { setCopied(true); say("הקישור הועתק"); setTimeout(() => setCopied(false), 2000); })
      .catch(() => say("ההעתקה נכשלה — אפשר לסמן ולהעתיק ידנית"));
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: "פנייה למכינת ניר עוז", url }).catch(() => {});
    } else copy();
  };

  return (
    <div className="card rc-share">
      <div className="rc-share-h"><RI.link /><b>הקישור לשיתוף</b></div>
      <div className="rc-url" dir="ltr">{url}</div>
      <div className="rc-share-btns">
        <button className="btn btn-primary btn-sm" onClick={copy}>
          {copied ? "הועתק ✓" : "העתקת הקישור"}
        </button>
        {typeof navigator !== "undefined" && navigator.share && (
          <button className="btn btn-ghost btn-sm" onClick={share}>שיתוף</button>
        )}
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
          פתיחת הטופס ↗
        </a>
      </div>
      <div className="fld-hint" style={{ marginTop: 8 }}>
        אפשר להדביק אותו באתר מועצת המכינות, בביו של אינסטגרם וטיקטוק, ובאתר המכינה.
        כל מי שממלא אותו מגיע לרשימה כאן — בלי חשבון ובלי כניסה.
      </div>
    </div>
  );
}

/* ---------- כרטיס פנייה ---------- */
function Card({ e, statuses, say, onChanged }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(e.notes || "");
  const [confirmDel, setConfirmDel] = useState(false);

  const save = (body, msg) => {
    if (busy) return;
    setBusy(true);
    api.setEnquiry({ id: e.id, ...body })
      .then(() => { say(msg); onChanged(); })
      .catch((x) => say(x.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className={"rc" + (e.status === FRESH ? " fresh" : "")}>
      <button className="rc-top" onClick={() => setOpen(!open)}>
        <div className="rc-main">
          <div className="rc-name">{e.name || "ללא שם"}</div>
          <div className="rc-meta">
            <span className={"pill " + (PILL[e.status] || "p-new")}>{e.status}</span>
            {e.kind && <span>{e.kind}</span>}
            {e.source && <span>· {e.source}</span>}
            {e.date && <span className="num">· {dmy(e.date)}</span>}
          </div>
          {/* ⚠ מי מטפל גלוי בשורה המכווצת — זו כל התכלית של
              השדה: שלא ישניים יתקשרו לאותו אדם. */}
          {e.owner && <div className="rc-owner">מטפל: {e.owner}</div>}
        </div>
        <RI.chev className={"rc-chev" + (open ? " on" : "")} />
      </button>

      {open && (
        <div className="rc-body">
          {/* ⚠ קישורי חיוג ומייל — פנייה שנפתחת כדי לחזור אליה,
              ומספר שצריך להעתיק ביד הוא צעד מיותר בכל פנייה. */}
          <div className="rc-contact">
            {e.phone && (
              <a className="rc-ct" href={telHref(e.phone)}>
                <RI.phone /><span className="num" dir="ltr">{e.phone}</span>
              </a>
            )}
            {e.email && (
              <a className="rc-ct" href={"mailto:" + e.email}>
                <RI.mail /><span dir="ltr">{e.email}</span>
              </a>
            )}
            {!e.phone && !e.email && (
              <span className="fld-hint">לא הושארו פרטי קשר.</span>
            )}
          </div>

          {e.message && <div className="rc-msg">{e.message}</div>}

          <div className="sec-label">סטטוס</div>
          <div className="rc-status">
            {statuses.map((s) => (
              <button key={s} type="button" disabled={busy}
                className={e.status === s ? "on" : ""}
                onClick={() => save({ status: s }, `סומן "${s}"`)}>{s}</button>
            ))}
          </div>

          <div className="sec-label">הערות פנימיות</div>
          <textarea className="rc-notes" rows={3} value={notes} disabled={busy}
            placeholder="מה נאמר בשיחה, מה נשאר לעשות" maxLength={4000}
            onChange={(ev) => setNotes(ev.target.value)} />
          <div className="rc-acts">
            <button className="btn btn-primary btn-sm" disabled={busy || notes === (e.notes || "")}
              onClick={() => save({ notes }, "ההערה נשמרה")}>
              {busy ? "שומר…" : "שמירת ההערה"}
            </button>
            {/* ⚠ שחרור — מי שלקח בטעות מחזיר. בלי זה הפנייה
                נעולה על מי שנעדר, והוועדה תפתח שורה כפולה. */}
            {e.owner && (
              <button className="btn btn-ghost btn-sm" disabled={busy}
                onClick={() => save({ release: true }, "הפנייה שוחררה")}>שחרור</button>
            )}
            {/* ⚠ מחיקה לספאם בלבד, והשרת חוסם כל דבר אחר. */}
            {e.status === IRRELEVANT && (confirmDel ? (
              <button className="btn btn-clay btn-sm" disabled={busy}
                onClick={() => {
                  setBusy(true);
                  api.deleteEnquiry(e.id)
                    .then(() => { say("נמחקה"); onChanged(); })
                    .catch((x) => say(x.message))
                    .finally(() => setBusy(false));
                }}>למחוק לצמיתות?</button>
            ) : (
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
                disabled={busy} onClick={() => setConfirmDel(true)}>מחיקה</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- המסך ---------- */
export default function RecruitPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getEnquiries(), []);
  const [tab, setTab] = useState("open");

  if (busy && !data) return (
    <><div className="screen-title">פניות גיוס</div><div className="skel skel-card" /></>
  );
  if (err?.setupRequired) return (
    <>
      <div className="screen-title">פניות גיוס</div>
      <div className="empty tone-5">
        <div className="e-ico"><RI.inbox /></div>
        <div className="e1">לוח פניות הגיוס טרם הוקם</div>
        <div className="e2">להריץ <b>npm run seed:recruit</b>, ואז ליצור טופס ב-monday.</div>
      </div>
    </>
  );
  if (err) return (
    <>
      <div className="screen-title">פניות גיוס</div>
      <div className="alert a-clay"><RI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">לא הצלחנו לטעון</div>
          <div className="bd">{err.message}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
        </div>
      </div>
    </>
  );
  if (!data) return null;

  const all = data.enquiries || [];
  const c = data.counts || {};
  const list = tab === "open"
    ? all.filter((x) => x.status === FRESH || x.status === WORKING)
    : tab === "done" ? all.filter((x) => x.status === ANSWERED)
      : all;

  return (
    <>
      <div className="screen-title">פניות גיוס</div>
      <ScreenNote name="note.recruit" say={say} />

      {/* ⚠ שלושה מספרים שמסכמים את המצב. "חדשות" ראשון — הוא
          מה שקובע אם צריך לפעול עכשיו. */}
      <div className="band">
        <div className="band-h">מצב הפניות</div>
        <div className="band-grid">
          <div className="band-c">
            <div className={"band-n num" + (c.fresh ? " warn" : " ok")}>{c.fresh || 0}</div>
            <div className="band-l">חדשות</div>
          </div>
          <div className="band-c">
            <div className="band-n num">{c.working || 0}</div>
            <div className="band-l">בטיפול</div>
          </div>
          <div className="band-c">
            <div className="band-n num">{c.total || 0}</div>
            <div className="band-l">בסך הכול</div>
          </div>
        </div>
      </div>

      <ShareLink say={say} />

      {/* ⚠⚠ **מאיפה הם מגיעים.** זו השאלה שבגללה מפרסמים
          בטיקטוק, ובלי המספר הזה אין דרך לדעת אם זה עובד. */}
      {(data.sources || []).length > 0 && (
        <>
          <div className="sec-label">מאיפה הגיעו</div>
          <div className="rc-src">
            {data.sources.map((s) => (
              <span className="rc-src-i" key={s.name}>
                {s.name}<b className="num">{s.n}</b>
              </span>
            ))}
          </div>
        </>
      )}

      <ScrollTabs className="seg">
        <button className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>
          פתוחות{(c.fresh || 0) + (c.working || 0) ? ` (${(c.fresh || 0) + (c.working || 0)})` : ""}
        </button>
        <button className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
          נענו{c.answered ? ` (${c.answered})` : ""}
        </button>
        <button className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>
          הכול{c.total ? ` (${c.total})` : ""}
        </button>
      </ScrollTabs>

      <div style={{ height: 12 }} />

      {list.length === 0 ? (
        <div className="empty tone-5">
          <div className="e-ico"><RI.inbox /></div>
          <div className="e1">
            {tab === "open" ? "אין פניות פתוחות" : tab === "done" ? "עוד לא נענתה פנייה" : "עוד לא הגיעו פניות"}
          </div>
          <div className="e2">
            {tab === "all" ? "ברגע שמישהו ימלא את הטופס, הפנייה תופיע כאן."
              : "כל מה שנכנס מהטופס מופיע כאן."}
          </div>
        </div>
      ) : (
        list.map((e) => (
          <Card key={e.id} e={e} statuses={data.statuses || []} say={say} onChanged={reload} />
        ))
      )}
      <div style={{ height: 40 }} />
    </>
  );
}

export const RECRUIT_CSS = `
/* ---------- פניות גיוס ---------- */
.rc{background:var(--card);border:1px solid var(--line2);border-radius:var(--r-md);
  box-shadow:var(--sh-1);margin-bottom:10px;overflow:hidden}
/* ⚠ פנייה חדשה מסומנת בפס ולא בצבע רקע — רקע צבעוני על שש
   פניות הופך את הרשימה לבלתי קריאה. */
.rc.fresh{border-inline-start:3px solid var(--accent)}
.kx .rc-top{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:right;
  cursor:pointer;background:none;border:none;padding:12px 14px}
.rc-main{flex:1;min-width:0}
.rc-name{font-size:15px;font-weight:800;margin-bottom:4px}
.rc-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;
  font-size:12px;color:var(--muted);font-weight:700}
.rc-owner{font-size:11.5px;color:var(--accent);font-weight:800;margin-top:4px}
.rc-chev{color:var(--line2);flex:0 0 auto;transition:transform .15s var(--ease)}
.rc-chev.on{transform:rotate(90deg)}
.rc-body{padding:0 14px 14px;border-top:1px solid var(--line)}
.rc-contact{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.kx a.rc-ct{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;
  background:var(--soft);border:1px solid var(--line2);border-radius:99px;
  padding:5px 12px;color:var(--ink);text-decoration:none}
/* ⚠ pre-wrap — הפונה כתב שורות בכוונה, ורינדור שמוחק אותן
   הופך שאלה בת ארבעה סעיפים לפסקה אחת. */
.rc-msg{white-space:pre-wrap;font-size:13.5px;line-height:1.65;
  background:var(--soft);border-radius:var(--r-sm);padding:11px 13px;margin-bottom:4px}
.rc-status{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
.kx .rc-status button{font-size:12.5px;font-weight:800;padding:6px 12px;
  border-radius:99px;border:1px solid var(--line2);background:var(--card);
  color:var(--ink);cursor:pointer;transition:all .12s var(--ease)}
.kx .rc-status button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.kx textarea.rc-notes{width:100%;border-radius:var(--r-sm);border:1px solid var(--line2);
  background:var(--soft);color:var(--ink);padding:10px 12px;font-size:13.5px;
  font-weight:600;font-family:inherit;resize:vertical}
.rc-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
/* ---------- הקישור ---------- */
.rc-share{margin-bottom:14px}
.rc-share.rc-empty{border:1px dashed var(--line2);box-shadow:none}
.rc-share-h{display:flex;align-items:center;gap:8px;margin-bottom:9px;
  font-size:13.5px;font-weight:800;color:var(--accent)}
.rc-url{background:var(--soft);border:1px solid var(--line2);border-radius:var(--r-sm);
  padding:9px 12px;font-size:12.5px;font-weight:700;word-break:break-all;margin-bottom:9px}
.rc-share-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rc-steps{margin:0;padding-inline-start:20px;font-size:13px;line-height:1.9;
  color:var(--muted);font-weight:600}
/* ---------- מאיפה הגיעו ---------- */
.rc-src{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}
.rc-src-i{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;
  background:var(--card);border:1px solid var(--line2);border-radius:99px;
  padding:5px 12px;box-shadow:var(--sh-1)}
.rc-src-i b{font-size:14px;font-weight:900;color:var(--accent)}
`;
