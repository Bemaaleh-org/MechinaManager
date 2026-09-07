/* ============================================================
   הקבוצה שלי — קרוב אחד, שני צדדים
   ------------------------------------------------------------
   חניך רואה מי המדריך שלו, מי חברי הקבוצה, ואת ההודעות שהמדריך
   פרסם — ולמטה, ספריית כל הקבוצות במכינה, כדי שגם חניך בלי
   קבוצה משלו ידע איפה כולם. מדריך רואה את אותה קבוצה בדיוק,
   עם המספרים החיים של כל חניך (נוכחות, מכסת חופש, בקשות פתוחות,
   שיחה אישית), ויכול לפרסם. ראש המכינה רואה כל קבוצה, ויכול
   לפרסם לכל אחת.

   ⚠ **הקבוצה עצמה אינה נתון חדש** — היא נשלפת מלוח ההגדרות
     ומלוח השיבוץ, בדיוק כמו בכל מסך אחר. מה שהשרת מוסיף כאן
     הוא רק לוח הודעות, ולכן הוא הדבר היחיד שיכול "להיות לא
     מוכן" — וגם אז, רק לשונית ההודעות מרגישה זאת (ראו api/_group.js).

   ⚠ **הנתונים החיים על חניך מגיעים רק כשהצופה הוא צוות.**
     חניך שרואה את הקבוצה שלו רואה שמות והודעות — לא את אחוז
     הנוכחות או מכסת החופש של חבריו. השרת אוכף את זה; המסך רק
     מציג את מה שהגיע.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScrollTabs from "./Tabs.jsx";
import ScreenNote from "./ScreenNote.jsx";

const I = {
  users: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <path d="M16.5 3.6a3.2 3.2 0 010 8.8" /><path d="M21.5 20c0-3-2-5.3-5-5.9" /></svg>),
  chat: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z" /></svg>),
  chart: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20V10M12 20V4M20 20v-7" /></svg>),
  pin: (p) => (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" /></svg>),
  send: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" /></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" /></svg>),
  edit: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>),
  trash: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>),
  chev: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 18l-6-6 6-6" /></svg>),
};

/** גוון נגזר מהשם ואינו נשמר — אותו דפוס כמו tone() ב-Placements.jsx.
    מוגדר כאן שוב במקום מיובא כי הוא אינו exported שם (4כ ג). */
function tone(name) {
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return "tone-" + (h % 8 + 1);
}

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};

/* ⚠ הצבע לפי המספר, לא לפי המקור — אותו עיקרון כמו scoreTone
   בדירוג המרצים (4ב). */
const pctPill = (pct) => {
  const cls = pct >= 80 ? "p-ok" : pct >= 60 ? "p-new" : "p-low";
  return <span className={"pill " + cls}>{pct}% נוכחות</span>;
};

/* ============================================================
   המסך הראשי
   ============================================================ */
export default function GroupPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [extra, setExtra] = useState({}); // group id → "loading" | {error} | detail

  const load = useCallback(() => {
    setErr(null);
    api.getGroup().then(setD).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const fetchExtra = useCallback((id) => {
    setExtra((x) => ({ ...x, [id]: "loading" }));
    api.getGroupById(id)
      .then((r) => setExtra((x) => ({ ...x, [id]: r.mine })))
      .catch((e) => setExtra((x) => ({ ...x, [id]: { error: e.message } })));
  }, []);

  const toggleExtra = useCallback((id) => {
    setExtra((x) => {
      if (x[id]) { const n = { ...x }; delete n[id]; return n; }
      return x;
    });
  }, []);

  if (err) {
    return (
      <>
        <div className="screen-title">הקבוצה שלי</div>
        <div className="alert a-clay">
          <div><div className="ttl">שגיאה בטעינה</div><div className="bd">{err}</div></div>
        </div>
      </>
    );
  }
  if (!d) {
    return (
      <>
        <div className="screen-title">הקבוצה שלי</div>
        <div className="skel" style={{ height: 96, marginBottom: 14 }} />
        <div className="skel" style={{ height: 220 }} />
      </>
    );
  }

  return (
    <>
      <div className="screen-title">הקבוצה שלי</div>
      <ScreenNote name="note.group" say={say} />

      {d.mine ? (
        <GroupDetail group={d.mine} isStaff={d.isStaff} say={say} reload={load} />
      ) : (
        <div className="empty">
          <div className="e-ico"><I.users /></div>
          <div className="e1">
            {d.isStaff ? "אינך מדריך/ה של קבוצה" : "עדיין לא שובצת לקבוצה"}
          </div>
          <div className="e2">
            {d.isStaff
              ? "מסך הקבוצה נפתח למדריך של קבוצה. את כל הקבוצות אפשר לראות למטה."
              : "שיבוץ לקבוצה נעשה במסך השיבוצים. את כל הקבוצות אפשר לראות למטה."}
          </div>
        </div>
      )}

      <div className="sec-label">כל הקבוצות</div>
      {!d.groups || !d.groups.length ? (
        <div className="empty">
          <div className="e-ico"><I.users /></div>
          <div className="e1">אין עדיין קבוצות מוגדרות</div>
          <div className="e2">קבוצות מוגדרות במסך השיבוצים.</div>
        </div>
      ) : (
        <div className="rows">
          {d.groups.map((g) => (
            <DirectoryCard key={g.id} g={g} isStaff={d.isStaff} say={say}
              state={extra[g.id]}
              onToggle={() => { toggleExtra(g.id); if (!extra[g.id]) fetchExtra(g.id); }}
              onReload={() => fetchExtra(g.id)} />
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================
   פרטי קבוצה — כותרת, לשוניות ותוכן. נעשה שימוש חוזר גם
   ל"הקבוצה שלי" וגם לקבוצה אחרת שצוות פותח מהספרייה.
   ============================================================ */
function GroupDetail({ group: g, isStaff, say, reload, compact }) {
  const [view, setView] = useState("group");
  const tabs = [
    ["group", "הקבוצה", <I.users key="a" />],
    ["messages", "הודעות", <I.chat key="b" />],
  ];
  if (isStaff) tabs.push(["track", "מעקב", <I.chart key="c" />]);

  return (
    <div style={compact ? { padding: "0 13px 13px" } : undefined}>
      {!compact && (
        <div className={"card lift gh-hero " + tone(g.name)}>
          <div className="tile"><I.users /></div>
          <div className="gh-hero-t">
            <div className="gh-hero-n">{g.name}</div>
            <div className="gh-hero-m">
              {g.guide
                ? <span>מדריך/ה: {g.guide.name}</span>
                : <span className="pill p-idle">אין עדיין מדריך משויך</span>}
              <span>· {g.members.length} חניכים</span>
            </div>
          </div>
        </div>
      )}

      <ScrollTabs className="seg">
        {tabs.map(([k, t, ic]) => (
          <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
            {ic}{t}
          </button>
        ))}
      </ScrollTabs>

      {view === "group" && <Roster group={g} isStaff={isStaff} />}
      {view === "messages" && <Messages group={g} say={say} reload={reload} />}
      {view === "track" && isStaff && <Track group={g} />}
    </div>
  );
}

/* ---------- הקבוצה: מי בה ---------- */
function Roster({ group, isStaff }) {
  if (!group.members.length) {
    return (
      <div className="empty">
        <div className="e-ico"><I.users /></div>
        <div className="e1">אין עדיין חניכים בקבוצה</div>
        <div className="e2">שיבוץ לקבוצה נעשה במסך השיבוצים.</div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="rows">
        {group.members.map((m) => (
          <div className="st-row" key={m.id}>
            <div className="st-main">
              <div className="st-n">
                {m.name}
                {m.me && <span className="pill p-ok" style={{ marginInlineStart: 7 }}>את/ה</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {group.partial && (
        <div className="alert a-amber">
          <div>
            <div className="ttl">חלק מהנתונים לא נטענו</div>
            <div className="bd">{group.partial.join(" · ")} — לרענן שוב עוד רגע.</div>
          </div>
        </div>
      )}
      <div className="rows">
        {group.members.map((m) => <MemberRow key={m.id} m={m} />)}
      </div>
    </>
  );
}

function MemberRow({ m }) {
  return (
    <div className="st-row">
      <div className="st-main">
        <div className="st-n">{m.name}</div>
        <div className="st-m">
          {/* ⚠ אחוז מוצג רק מחמישה ימי סימון ומעלה (4ג) — לפני כן
              מוצג המונה עצמו ולא אחוז שקרי במשמעותו. */}
          {m.schoolDays == null
            ? <span className="pill p-idle">אין עדיין נתוני נוכחות</span>
            : m.pct == null
              ? <span>{m.present}/{m.schoolDays} ימי נוכחות</span>
              : pctPill(m.pct)}
          {m.quotaLeft != null && (
            <span>· חופש {m.quotaLeft}/{m.quotaTotal}{m.quotaHalf ? ` (${m.quotaHalf})` : ""}</span>
          )}
          {m.openRequests > 0 && (
            <span className="pill p-new">{m.openRequests} בקשות פתוחות</span>
          )}
          {m.talksSet < 3 && (
            <span className="pill p-low">שיחה אישית {m.talksSet}/3</span>
          )}
          {m.lastAbsence && <span>· נעדר לאחרונה {dmy(m.lastAbsence.date)}</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- מעקב: כלי עבודה, לא דירוג ---------- */
function Track({ group }) {
  const withPct = group.members.filter((m) => m.pct != null);
  const avg = withPct.length
    ? Math.round(withPct.reduce((s, m) => s + m.pct, 0) / withPct.length) : null;
  const openSum = group.members.reduce((s, m) => s + (m.openRequests || 0), 0);
  const below = avg == null ? [] : withPct.filter((m) => m.pct < avg);
  const talksLeft = group.members.filter((m) => m.talksSet < 3);

  return (
    <>
      <div className="band">
        <div className="band-h">כלי עבודה למדריך — לא דירוג בין חניכים</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{group.members.length}</div>
            <div className="band-l">חניכים בקבוצה</div>
          </div>
          <div className="band-c">
            <div className="band-n">{avg == null ? "—" : avg + "%"}</div>
            <div className="band-l">{avg == null ? "אין עדיין נתונים" : "נוכחות ממוצעת"}</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (openSum ? " warn" : " ok")}>{openSum}</div>
            <div className="band-l">בקשות פתוחות</div>
          </div>
        </div>
      </div>

      {/* ⚠ המסך הזה נועד לעזור למדריך לדעת למי לפנות — לא לדרג
          חניכים זה מול זה (עיקרון 5, ו-4צ באותה רוח). */}
      <div className="alert a-ok">
        <div>
          <div className="ttl">כלי עבודה, לא דירוג</div>
          <div className="bd">הרשימה למטה מיועדת לעזור לדעת למי כדאי לפנות השבוע — לא לדרג בין חניכים.</div>
        </div>
      </div>

      {avg != null && below.length > 0 && (
        <>
          <div className="sec-label">מתחת לממוצע הנוכחות בקבוצה</div>
          <div className="rows">
            {below.map((m) => (
              <div className="st-row" key={m.id}>
                <div className="st-main"><div className="st-n">{m.name}</div></div>
                {pctPill(m.pct)}
              </div>
            ))}
          </div>
        </>
      )}

      {talksLeft.length > 0 && (
        <>
          <div className="sec-label">שיחה אישית לא הושלמה</div>
          <div className="rows">
            {talksLeft.map((m) => (
              <div className="st-row" key={m.id}>
                <div className="st-main"><div className="st-n">{m.name}</div></div>
                <span className="pill p-low">{m.talksSet}/3</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ---------- הודעות ---------- */
function Messages({ group, say, reload }) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      {group.messages.length === 0 ? (
        <div className="empty">
          <div className="e-ico"><I.chat /></div>
          <div className="e1">אין עדיין הודעות</div>
          <div className="e2">
            {group.canPost
              ? "אפשר לפרסם כאן הודעה שכל חברי הקבוצה יראו."
              : "המדריך של הקבוצה יכול לפרסם כאן הודעה לכל החברים."}
          </div>
        </div>
      ) : (
        <div className="rows">
          {group.messages.map((m) => (
            <MessageRow key={m.id} m={m} group={group} say={say} reload={reload} />
          ))}
        </div>
      )}

      {group.canPost && (adding ? (
        <MessageForm group={group} say={say}
          onDone={() => { setAdding(false); reload(); }}
          onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><I.plus />הודעה חדשה</button>
      ))}
    </>
  );
}

function MessageRow({ m, group, say, reload }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (editing) {
    return (
      <MessageForm group={group} msg={m} say={say}
        onDone={() => { setEditing(false); reload(); }}
        onCancel={() => setEditing(false)} />
    );
  }

  return (
    <div className="st-row" style={{ alignItems: "flex-start" }}>
      <div className="st-main">
        <div className="st-n">
          {m.pinned && <I.pin style={{ marginInlineEnd: 5, color: "var(--amber)" }} />}
          {m.title}
        </div>
        {m.body && <div className="st-m" style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>}
        <div className="st-m">
          {m.by && <span>{m.by}</span>}
          {m.date && <span>· {dmy(m.date)}</span>}
        </div>
      </div>
      {m.canEdit && (
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><I.edit /></button>
          <button className="btn btn-clay btn-sm" disabled={busy}
            onClick={() => {
              setBusy(true);
              api.deleteGroupMessage(m.id).then(reload).catch((e) => say(e.message)).finally(() => setBusy(false));
            }}><I.trash /></button>
        </div>
      )}
    </div>
  );
}

function MessageForm({ group, msg, say, onDone, onCancel }) {
  const [title, setTitle] = useState(msg ? msg.title : "");
  const [body, setBody] = useState(msg ? (msg.body || "") : "");
  const [pinned, setPinned] = useState(msg ? Boolean(msg.pinned) : false);
  const [busy, setBusy] = useState(false);

  const save = () => {
    if (!title.trim()) return;
    setBusy(true);
    const p = msg
      ? api.editGroupMessage({ id: msg.id, title: title.trim(), body: body.trim(), pinned })
      : api.postGroupMessage({ group: group.id, title: title.trim(), body: body.trim(), pinned });
    p.then(onDone).catch((e) => say(e.message)).finally(() => setBusy(false));
  };

  return (
    <div className="card gh-form">
      <div className="fld">
        <label>נושא</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="למשל: מפגש קבוצתי ביום שלישי" />
      </div>
      <div className="fld">
        <label>תוכן (רשות)</label>
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <label className="gh-chk">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        <span>לנעוץ למעלה</span>
      </label>
      <div className="two" style={{ marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>ביטול</button>
        <button className="btn btn-primary" disabled={busy || !title.trim()} onClick={save}>
          <I.send />{msg ? "שמירה" : "פרסום"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   הספרייה — כל הקבוצות, מי מדריך ומי חבר בה
   ------------------------------------------------------------
   ⚠ שמות בלבד לכל אחד — אין כאן שום נתון אישי, גם לצוות.
     צוות שרוצה לראות את המספרים החיים של קבוצה אחרת פותח
     אותה (`onToggle`), וזה נטען דרך ?group=<id> בנפרד —
     לא מגיע כאן מלכתחילה.
   ============================================================ */
function DirectoryCard({ g, isStaff, say, state, onToggle, onReload }) {
  return (
    <div className={"gh-dcard " + tone(g.name)}>
      <button className="st-row" onClick={isStaff ? onToggle : undefined} disabled={!isStaff}>
        <div className="tile sm"><I.users /></div>
        <div className="st-main">
          <div className="st-n">{g.name}</div>
          <div className="st-m">
            {g.guide
              ? <span>מדריך/ה: {g.guide.name}</span>
              : <span className="pill p-idle">אין מדריך</span>}
            <span>· {g.count} חניכים</span>
          </div>
        </div>
        {isStaff && (
          <I.chev style={{ transform: state ? "rotate(-90deg)" : "none", color: "var(--faint)" }} />
        )}
      </button>

      {!isStaff && g.members.length > 0 && (
        <div className="gh-names">{g.members.map((m) => m.name).join(" · ")}</div>
      )}

      {isStaff && state === "loading" && <div className="skel" style={{ height: 84, margin: "0 13px 13px" }} />}
      {isStaff && state && state.error && (
        <div className="gh-nested"><div className="alert a-clay"><div><div className="bd">{state.error}</div></div></div></div>
      )}
      {isStaff && state && !state.error && state !== "loading" && (
        <GroupDetail group={state} isStaff say={say} reload={onReload} compact />
      )}
    </div>
  );
}

export const GROUP_CSS = `
.gh-hero{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.gh-hero-t{min-width:0;flex:1}
.gh-hero-n{font-family:'Suez One',Heebo,serif;font-size:19px;color:var(--ink)}
.gh-hero-m{font-size:12.5px;color:var(--muted);margin-top:3px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.gh-form{margin-top:10px}
.gh-chk{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--ink);margin:4px 2px 8px;cursor:pointer}
.gh-chk input{width:18px;height:18px;accent-color:var(--accent)}
.gh-dcard{border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--line2);
  box-shadow:var(--sh-1);margin-bottom:10px;overflow:hidden}
.gh-names{padding:0 13px 12px;font-size:12px;color:var(--muted);line-height:1.5}
.gh-nested{border-top:1px solid var(--line);padding-top:2px}
`;
