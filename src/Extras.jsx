/* ============================================================
   שלושה מסכים שחולקים את אותם עוזרים
   ------------------------------------------------------------
   בוגרים · אירוח קבוצות · השאלת ציוד

   ⚠ יושבים בקובץ אחד כי שלושתם אותו דפוס בדיוק — רשימה,
     כרטיס, טופס — ולא כי הם קשורים זה לזה. פיצול לשלושה
     קבצים היה משכפל את useLoad ואת מצבי הטעינה שלוש פעמים.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable } from "./excel.js";

const XI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  dl: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  users: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.4-1-4.1-2.6-5"/></svg>,
  home: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/></svg>,
  box: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

const dm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
const dmy = (iso) => (iso ? `${dm(iso)}/${iso.slice(0, 4)}` : "");

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
  }, deps); // eslint-disable-line
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

/* ⚠ כשל טעינה נראה אחרת ממצב ריק — עיקרון 6. */
const Fail = ({ err, onRetry }) => (
  <div className="alert a-clay"><XI.warn />
    <div style={{ flex: 1 }}>
      <div className="ttl">{err.setupRequired ? "הלוח טרם הוקם" : "לא הצלחנו לטעון"}</div>
      <div className="bd">{err.message}</div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>נסו שוב</button>
    </div>
  </div>
);
const Wait = () => <><div className="skel skel-card" /><div className="skel skel-card" /></>;

const Field = ({ label, children, hint }) => (
  <div className="fld">
    <label>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>{hint}</div>}
  </div>
);

/* ⚠ chips לרשימות ארוכות: צ׳יפ נמדד לפי הטקסט שבו. רשימה של
   ארבע־עשרה זרועות בכפתורים ברוחב שווה היא קיר שאי אפשר
   לסרוק. לרשימות של שניים־שלושה, הכפתור הרחב עדיין נוח יותר. */
const Pick = ({ label, options, value, onChange, disabled, chips }) => (
  <Field label={label}>
    <div className={"pick " + (chips || options.length > 4 ? "pick-chips" : "pick-wrap")}>
      {options.map((o) => (
        <button type="button" key={o} disabled={disabled}
          className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  </Field>
);

/* ============================================================
   בוגרים
   ------------------------------------------------------------
   ⚠ המסך הזה הוא סטטיסטיקה, לא תיק אישי. הוא מציג לאן הבוגרים
     התגייסו ומתי — ואין בו תעודות זהות, מיילים או מידע רפואי,
     גם כשהם קיימים בקבצים אחרים של המכינה.
   ============================================================ */
export function AlumniPage({ say }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => api.getAlumni(), []);
  const [cycle, setCycle] = useState(null);
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState(null);

  if (busy && !data) return <><div className="screen-title">בוגרים</div><Wait /></>;
  if (err) return <><div className="screen-title">בוגרים</div><Fail err={err} onRetry={reload} /></>;
  if (!data) return null;

  if (adding || edit) {
    return <AlumniForm initial={edit} branches={data.branches} cycles={data.cycles}
      canAddBranch={data.canAddBranch} say={say}
      onDone={() => { setAdding(false); setEdit(null); reload(); }}
      onCancel={() => { setAdding(false); setEdit(null); }} />;
  }

  const list = data.alumni.filter((a) => !cycle || a.cycle === cycle);
  const maxBranch = Math.max(...data.byBranch.map((b) => b.n), 1);
  /* ⚠ המחזורים שיש בהם בוגרים בפועל. רשימת כל המחזורים
     האפשריים שייכת לטופס, לא למסנן. */
  const usedCycles = data.byCycle.filter((c) => c.key !== "לא ידוע").map((c) => c.key);

  return (
    <>
      <div className="screen-title">בוגרים</div>

      <div className="band">
        <div className="band-h">המחזורים שסיימו</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{data.count}</div>
            <div className="band-l">בוגרים</div>
          </div>
          <div className="band-c">
            <div className="band-n">{data.byBranch.filter((b) => b.key !== "לא ידוע").length}</div>
            <div className="band-l">זרועות</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (data.unknown ? " warn" : " ok")}>{data.unknown}</div>
            <div className="band-l">טרם ידוע</div>
          </div>
        </div>
      </div>

      {/* ============================================================
          פיקוד וקצונה
          ------------------------------------------------------------
          ⚠ האחוז מחושב מתוך מי שנשאל, ולידו כתוב מכמה. בוגר
            שטרם נשאל אינו "לא יצא לקצונה", ושיוך שלו למכנה
            היה מוריד את האחוז בכל פעם שנוסף בוגר ולא נשאל.
          ============================================================ */}
      <div className="two" style={{ marginBottom: 14 }}>
        {[["פיקוד", data.command], ["קצונה", data.officer]].map(([t, d]) => (
          <div className="dial" key={t}>
            <div className="dial-h">יצאו ל{t}</div>
            {d.asked === 0 ? (
              <>
                <div className="dial-n none">—</div>
                <div className="dial-s">טרם נשאלו</div>
              </>
            ) : (
              <>
                <div className="dial-n num">{d.pct}<small>%</small></div>
                <div className="dial-bar"><span style={{ width: `${d.pct}%` }} /></div>
                <div className="dial-s num">{d.yes} מתוך {d.asked} שנשאלו</div>
                {d.pending > 0 && <div className="dial-p">{d.pending} טרם סומנו</div>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ---------- פילוח לפי זרוע ----------
          ⚠ פס לכל זרוע ולא עוגה: השוואה בין אורכים מדויקת
            הרבה יותר מהשוואה בין זוויות. */}
      <div className="sec-label">לפי זרוע</div>
      <div className="card" style={{ marginBottom: 14 }}>
        {data.byBranch.map((b) => (
          <div className="brw" key={b.key}>
            <span className="brw-k">{b.key}</span>
            <span className="brw-bar">
              <span style={{ width: `${(b.n / maxBranch) * 100}%` }} />
            </span>
            <b className="num">{b.n}</b>
          </div>
        ))}
      </div>

      {usedCycles.length > 1 && (
        <div className="seg">
          <button className={!cycle ? "on" : ""} onClick={() => setCycle(null)}>הכול</button>
          {usedCycles.map((c) => (
            <button key={c} className={cycle === c ? "on" : ""} onClick={() => setCycle(c)}>{c}</button>
          ))}
        </div>
      )}

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
        onClick={() => {
          downloadTable({
            file: "בוגרים", sheet: "בוגרים", title: "בוגרי מכינת ניר עוז",
            header: ["שם", "מחזור", "תפקיד / יחידה", "זרוע", "פיקוד", "קצונה",
              "תאריך גיוס", "מקום מגורים"],
            rows: list.map((a) => [a.name, a.cycle || "", a.unit || "", a.branch || "",
              a.command || "", a.officer || "", a.enlist ? dmy(a.enlist) : "", a.city || ""]),
            widths: [20, 12, 28, 17, 8, 8, 13, 16],
          });
          say("הקובץ ירד");
        }}><XI.dl />הורדה לאקסל</button>

      <div className="rows">
        {list.map((a) => (
          <button className="st-row" key={a.id} onClick={() => setEdit(a)}>
            <div className="tile sm"><XI.users /></div>
            <div className="st-main">
              <div className="st-n">{a.name}</div>
              <div className="st-m">
                {a.unit ? <span>{a.unit}</span> : <span className="pill p-new">טרם ידוע</span>}
                {a.branch && <span>· {a.branch}</span>}
                {a.enlist && <span className="num">· {dmy(a.enlist)}</span>}
                {a.command === "כן" && <span className="pill p-ok">פיקוד</span>}
                {a.officer === "כן" && <span className="pill p-mid">קצונה</span>}
              </div>
            </div>
            <XI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
          </button>
        ))}
      </div>

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <XI.plus />בוגר חדש
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function AlumniForm({ initial, branches, cycles, canAddBranch, say, onDone, onCancel }) {
  const [f, setF] = useState({
    name: initial?.name || "", cycle: initial?.cycle || "מחזור א׳",
    unit: initial?.unit || "", branch: initial?.branch || "",
    command: initial?.command || "", officer: initial?.officer || "",
    enlist: initial?.enlist || "", birthday: initial?.birthday || "",
    city: initial?.city || "", note: initial?.note || "",
  });
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState("");
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy || !f.name.trim()) return;
    setBusy(true);
    const call = initial ? api.editAlumni({ id: initial.id, ...f }) : api.addAlumni(f);
    call.then(() => { say(initial ? "עודכן" : "הבוגר נוסף"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  /* ⚠ הרשימה מגיעה מהלוח ולא מהקוד. רשימה שכתובה כאן הייתה
     מתיישנת עם כל מחזור, ומי שלא נכנס אליה היה נדחף ל"אחר". */
  const ALL_BRANCHES = [...new Set([...(branches || []), ...(f.branch ? [f.branch] : [])])];

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <XI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת בוגר" : "בוגר חדש"}</div>

      <div className="card">
        <Field label="שם"><input value={f.name} onChange={set("name")} disabled={busy} /></Field>
        <Pick label="מחזור" options={cycles && cycles.length ? cycles : ["מחזור א׳", "מחזור ב׳"]}
          value={f.cycle} onChange={(v) => setF({ ...f, cycle: v })} disabled={busy} />
        <Field label="תפקיד / יחידה" hint="ריק = טרם ידוע. עדיף ריק על ניחוש.">
          <input value={f.unit} onChange={set("unit")} disabled={busy} />
        </Field>
        <Pick label="זרוע" options={ALL_BRANCHES} value={f.branch} chips
          onChange={(v) => setF({ ...f, branch: v })} disabled={busy} />

        {/* ---------- הוספת זרוע ----------
            ⚠ שדה נפרד ומכוון ולא הקלדה חופשית בשדה הזרוע. מי
              שכותב "סיירת גבעתי" במקום לבחור "סיירות חי״ר
              וקומנדו" מפצל את הסטטיסטיקה לשתי שורות שנראות
              שונות ואינן, והחיכוך כאן הוא בדיוק העניין. */}
        {canAddBranch && (
          <div className="qadd">
            <label>הוספת סוג תפקיד</label>
            <div className="qadd-row">
              <input value={adding} disabled={busy} placeholder="למשל: מגן דוד אדום"
                onChange={(e) => setAdding(e.target.value)} />
              <button type="button" className="qa-plus"
                disabled={busy || !adding.trim() || ALL_BRANCHES.includes(adding.trim())}
                onClick={() => { setF({ ...f, branch: adding.trim() }); setAdding(""); }}>
                הוספה
              </button>
            </div>
            <div className="qadd-hint">
              הסוג החדש נוסף לרשימה בשמירה, ויופיע מכאן ואילך לכולם.
            </div>
          </div>
        )}

        {/* ---------- פיקוד וקצונה ----------
            ⚠ ריק הוא ערך בפני עצמו: "טרם נשאל" אינו "לא", והוא
              מה שמפריד בין נתון חסר לנתון שלילי בסטטיסטיקה. */}
        <div className="two">
          <Pick label="יצא פיקוד" options={["כן", "לא"]} value={f.command}
            onChange={(v) => setF({ ...f, command: f.command === v ? "" : v })} disabled={busy} />
          <Pick label="יצא קצונה" options={["כן", "לא"]} value={f.officer}
            onChange={(v) => setF({ ...f, officer: f.officer === v ? "" : v })} disabled={busy} />
        </div>
        <div className="two">
          <Field label="תאריך גיוס">
            <input type="date" value={f.enlist} onChange={set("enlist")} disabled={busy} />
          </Field>
          <Field label="תאריך לידה">
            <input type="date" value={f.birthday} onChange={set("birthday")} disabled={busy} />
          </Field>
        </div>
        <Field label="מקום מגורים"><input value={f.city} onChange={set("city")} disabled={busy} /></Field>
        <Field label="הערה"><input value={f.note} onChange={set("note")} disabled={busy} /></Field>

        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============================================================
   אירוח קבוצות
   ============================================================ */
const ils = (n) => "₪" + Number(n || 0).toLocaleString("he-IL");
/* ⚠ 12,400 -> "12.4אלף". על ציר עמודות אין מקום למספר מלא,
   ומספר קטוע ("12,4") גרוע מקיצור מוצהר. */
const shortIls = (n) => {
  const v = Number(n || 0);
  if (v >= 1000) return (Math.round(v / 100) / 10).toLocaleString("he-IL") + "אלף";
  return String(Math.round(v));
};

/* ============================================================
   גרף ההכנסות מאירוח
   ------------------------------------------------------------
   ⚠ ציר אחד — שקלים. הגובה הוא הכמות, ואין ציר שני שמתחרה בו.

   ⚠ החלק שהתקבל מלא, והחלק הצפוי מפוספס **ומסומן גם במקרא
     וגם בטקסט**. צבע לבדו לעולם אינו נושא את המידע: מי שאינו
     מבחין בין הגוונים רואה את ההבדל בפספוס.

   ⚠ העמודות נקראות מימין לשמאל כמו הטקסט, והתקופה האחרונה
     היא הימנית — אותו כיוון שבו קוראים את הרשימה שמתחתיה.
   ============================================================ */
function IncomeChart({ rows }) {
  const list = (rows || []).slice(0, 12);
  if (!list.length) return null;
  const max = Math.max(...list.map((r) => r.amount), 1);
  const any = list.some((r) => r.expected > 0);

  return (
    <div className="inc">
      <div className="inc-h">
        <span>הכנסות מאירוח</span>
        <span className="inc-max num">שיא {ils(max)}</span>
      </div>

      <div className="inc-plot" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(38px, 1fr))` }}>
        {list.map((r) => {
          const h = (r.amount / max) * 100;
          const paidH = r.amount > 0 ? (r.earned / r.amount) * 100 : 0;
          return (
            <div className="inc-col" key={r.key}>
              <div className="inc-v num">{r.amount ? shortIls(r.amount) : ""}</div>
              <div className="inc-track">
                <div className="inc-bar" style={{ height: `${h}%` }}
                  title={`${r.label}: ${ils(r.earned)} התקבל, ${ils(r.expected)} צפוי`}>
                  <div className="inc-exp" style={{ height: `${100 - paidH}%` }} />
                  <div className="inc-got" style={{ height: `${paidH}%` }} />
                </div>
              </div>
              <div className="inc-x">{r.label.replace(/ \d{4}$/, "").replace("רבעון ", "ר")}</div>
            </div>
          );
        })}
      </div>

      <div className="inc-key">
        <span><i className="k-got" />התקבל</span>
        {any && <span><i className="k-exp" />צפוי</span>}
      </div>
    </div>
  );
}

export function HostingPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getHosting(), []);
  const [form, setForm] = useState(null);
  const [span, setSpan] = useState("month");

  if (busy && !data) return <><div className="screen-title">אירוח קבוצות</div><Wait /></>;
  if (err) return <><div className="screen-title">אירוח קבוצות</div><Fail err={err} onRetry={reload} /></>;
  if (!data) return null;

  if (form) {
    return <HostingForm initial={form.id ? form : null} options={data.options} say={say}
      onDone={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />;
  }

  return (
    <>
      <div className="screen-title">אירוח קבוצות</div>

      <div className="band">
        <div className="band-h">מצב האירוחים</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{data.counts.upcoming}</div>
            <div className="band-l">אירוחים קרובים</div>
          </div>
          <div className="band-c">
            <div className="band-n">{data.counts.sleeping}</div>
            <div className="band-l">עם לינה</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (data.counts.pending ? " warn" : " ok")}>{data.counts.pending}</div>
            <div className="band-l">בתיאום</div>
          </div>
        </div>
      </div>

      {/* ============================================================
          הכנסות מאירוח
          ------------------------------------------------------------
          ⚠ "התקבל" ו"צפוי" בנפרד. אירוח שהתקיים הוא כסף שנכנס,
            אירוח עתידי הוא הבטחה — ומספר אחד שמאחד אותם היה
            מנפח את התמונה בדיוק כשמסתכלים עליה כדי להחליט.
          ============================================================ */}
      {(data.totals.paidGroups > 0 || data.totals.expected > 0) && (
        <>
          <div className="sec-label">הכנסות</div>
          <div className="money">
            <div className="money-top">
              <div className="money-c">
                <div className="money-n num">{ils(data.totals.earned)}</div>
                <div className="money-l">התקבל</div>
              </div>
              <div className="money-sep" />
              <div className="money-c">
                <div className="money-n num soft">{ils(data.totals.expected)}</div>
                <div className="money-l">צפוי</div>
              </div>
            </div>
            <div className="money-f">
              <span>{data.totals.paidGroups} בתשלום</span>
              <span>{data.totals.freeGroups} ללא תשלום</span>
              {/* ⚠ כמה עוד לא סומן — המספר שאומר כמה מהתמונה חסר */}
              {data.totals.unmarked > 0 && (
                <span className="warn">{data.totals.unmarked} טרם סומנו</span>
              )}
            </div>
          </div>

          <div className="seg">
            {[["month", "לפי חודש"], ["quarter", "לפי רבעון"], ["year", "לפי שנה"]].map(([k, t]) => (
              <button key={k} className={span === k ? "on" : ""} onClick={() => setSpan(k)}>{t}</button>
            ))}
          </div>

          <IncomeChart rows={data.periods[span]} />

          <div className="card" style={{ marginBottom: 14 }}>
            {(data.periods[span] || []).length === 0 && (
              <div className="led-empty">אין אירוחים עם תאריך</div>
            )}
            {(data.periods[span] || []).map((r) => (
              <div className="per" key={r.key}>
                <div className="per-l">
                  <div className="per-t">{r.label}</div>
                  <div className="per-s">
                    {r.groups} קבוצות · {r.people} איש
                    {r.nights > 0 && <> · {r.nights} עם לינה</>}
                  </div>
                </div>
                <div className="per-r">
                  <div className="per-n num">{ils(r.amount)}</div>
                  {r.expected > 0 && r.earned > 0 && (
                    <div className="per-x num">{ils(r.earned)} התקבל</div>
                  )}
                  {r.expected > 0 && r.earned === 0 && <div className="per-x">צפוי</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data.hosting.length === 0 ? (
        <div className="empty tone-1">
          <div className="e-ico"><XI.home /></div>
          <div className="e1">אין אירוחים רשומים</div>
          <div className="e2">קבוצה שמגיעה למכינה — פותחים לה כרטיס כאן.</div>
        </div>
      ) : (
        <div className="rows">
          {data.hosting.map((h) => {
            const pending = h.status === "בתיאום";
            return (
              <button className={"st-row " + (pending ? "tone-3" : "tone-1")} key={h.id}
                onClick={() => setForm(h)}>
                <div className="tile sm"><XI.home /></div>
                <div className="st-main">
                  <div className="st-n">{h.title}</div>
                  <div className="st-m">
                    <span className={"pill " + (h.status === "בוטל" ? "p-low" : "p-new")}>{h.status || "—"}</span>
                    {h.from && <span className="num">{dm(h.from)}{h.to && h.to !== h.from ? `–${dm(h.to)}` : ""}</span>}
                    {h.people != null && <span>· {h.people} איש</span>}
                    {h.sleeping && <span>· {h.sleeping}</span>}
                    {h.paid === "בתשלום" && (
                      <span className="pill p-ok num">{h.amount ? ils(h.amount) : "בתשלום"}</span>
                    )}
                    {h.paid === "ללא תשלום" && <span className="pill p-low">ללא תשלום</span>}
                  </div>
                </div>
                <XI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <XI.plus />אירוח חדש
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function HostingForm({ initial, options, say, onDone, onCancel }) {
  const [f, setF] = useState({
    title: initial?.title || "", org: initial?.org || "",
    contact: initial?.contact || "", phone: initial?.phone || "",
    from: initial?.from || "", to: initial?.to || "",
    people: initial?.people != null ? String(initial.people) : "",
    sleeping: initial?.sleeping || "לא לנים",
    buildings: initial?.buildings || "", meals: initial?.meals || "",
    status: initial?.status || "בתיאום",
    paid: initial?.paid || "",
    amount: initial?.amount != null ? String(initial.amount) : "",
    note: initial?.note || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy || !f.title.trim()) return;
    setBusy(true);
    const call = initial ? api.editHosting({ id: initial.id, ...f }) : api.addHosting(f);
    call.then(() => { say(initial ? "עודכן" : "האירוח נרשם"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy || !initial) return;
    setBusy(true);
    api.deleteHosting(initial.id)
      .then(() => { say("האירוח נמחק"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <XI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת אירוח" : "אירוח חדש"}</div>

      <div className="card">
        <Field label="כותרת" hint="למשל: בית ספר אמית · שכבת י׳">
          <input value={f.title} onChange={set("title")} disabled={busy} />
        </Field>
        <Field label="הגוף המתארח"><input value={f.org} onChange={set("org")} disabled={busy} /></Field>
        <div className="two">
          <Field label="איש קשר"><input value={f.contact} onChange={set("contact")} disabled={busy} /></Field>
          <Field label="טלפון">
            <input value={f.phone} onChange={set("phone")} disabled={busy} inputMode="tel" placeholder="050-0000000" />
          </Field>
        </div>
        <div className="two">
          <Field label="מתאריך"><input type="date" value={f.from} onChange={set("from")} disabled={busy} /></Field>
          <Field label="עד תאריך"><input type="date" value={f.to} onChange={set("to")} disabled={busy} /></Field>
        </div>
        <div className="two">
          <Field label="מספר משתתפים">
            <input value={f.people} onChange={set("people")} disabled={busy} inputMode="numeric" />
          </Field>
          <div />
        </div>
        <Pick label="לינה" options={options.sleeping} value={f.sleeping}
          onChange={(v) => setF({ ...f, sleeping: v })} disabled={busy} />
        <Field label="מבנים" hint="אילו מבנים נמסרו לשימושם">
          <input value={f.buildings} onChange={set("buildings")} disabled={busy} />
        </Field>
        <Field label="ארוחות" hint="למשל: צהריים וערב ביום הראשון">
          <input value={f.meals} onChange={set("meals")} disabled={busy} />
        </Field>
        <Pick label="סטטוס" options={options.status} value={f.status}
          onChange={(v) => setF({ ...f, status: v })} disabled={busy} />

        {/* ---------- תשלום ----------
            ⚠ שני שדות ולא אחד. אירוח בתשלום שהסכום בו טרם סוכם
              הוא מצב רגיל, וסכום 0 היה נראה בדיוק כמו חינם. */}
        <Pick label="תשלום" options={options.paid} value={f.paid}
          onChange={(v) => setF({ ...f, paid: f.paid === v ? "" : v })} disabled={busy} />
        {f.paid === "בתשלום" && (
          <Field label="סכום" hint="ריק = טרם סוכם. ההכנסות מסוכמות לפי תאריך תחילת האירוח.">
            <input value={f.amount} onChange={set("amount")} disabled={busy}
              inputMode="numeric" placeholder="₪" />
          </Field>
        )}

        <Field label="הערות">
          <textarea value={f.note} onChange={set("note")} disabled={busy} rows={3} />
        </Field>

        <button className="btn btn-primary" disabled={busy || !f.title.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {initial && (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            disabled={busy} onClick={remove}>מחיקת האירוח</button>
        )}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============================================================
   פריטי ההשאלה — קופסה לכל פריט
   ------------------------------------------------------------
   ⚠ עד כה כל הציוד נכתב לתיבת טקסט אחת. אי אפשר היה לענות
     ממנה על השאלה היחידה שנשאלת אחרי השאלה — מה עוד לא חזר.
     כל פריט הוא עכשיו קופסה עם כמות שיצאה וכמות שחזרה,
     באותו דפוס של רשימת הציוד במכולה.

   ⚠ החזרה חלקית מטבעה: הושאלו 20 כיסאות וחזרו 15 הוא המצב
     הרגיל, לא החריג.
   ============================================================ */
function ItemBox({ it, onChange, onRemove, disabled }) {
  const qty = Number(it.qty) || 1;
  const back = Math.max(0, Math.min(Number(it.back) || 0, qty));
  const done = back >= qty;
  const pct = qty > 0 ? (back / qty) * 100 : 0;

  const step = (k, d, max) => () =>
    onChange({ ...it, [k]: Math.max(k === "qty" ? 1 : 0, Math.min(max, (Number(it[k]) || (k === "qty" ? 1 : 0)) + d)) });

  return (
    <div className={"li" + (done ? " li-done" : back > 0 ? " li-part" : "")}>
      <div className="li-h">
        <input className="li-n" value={it.name} disabled={disabled}
          placeholder="שם הפריט"
          onChange={(e) => onChange({ ...it, name: e.target.value })} />
        <input className="li-u" value={it.unit || ""} disabled={disabled}
          placeholder="יח׳" onChange={(e) => onChange({ ...it, unit: e.target.value })} />
        <button type="button" className="li-x" disabled={disabled}
          onClick={onRemove} aria-label="הסרת הפריט">×</button>
      </div>

      <div className="li-g">
        <div className="li-f">
          <span className="li-l">הושאל</span>
          <div className="qstep li-step">
            <button type="button" className="qs-btn" disabled={disabled || qty <= 1}
              onClick={step("qty", -1, 9999)}>−</button>
            <span className="qs-n num">{qty}</span>
            <button type="button" className="qs-btn" disabled={disabled}
              onClick={step("qty", 1, 9999)}>+</button>
          </div>
        </div>
        <div className="li-f">
          <span className="li-l">חזר</span>
          <div className="qstep li-step">
            <button type="button" className="qs-btn" disabled={disabled || back <= 0}
              onClick={step("back", -1, qty)}>−</button>
            <span className="qs-n num">{back}</span>
            <button type="button" className="qs-btn" disabled={disabled || back >= qty}
              onClick={step("back", 1, qty)}>+</button>
          </div>
        </div>
      </div>

      <div className="li-bar"><span style={{ width: `${pct}%` }} /></div>
      <div className="li-foot">
        <span className={"li-s" + (done ? " ok" : back > 0 ? " part" : "")}>
          {done ? "חזר במלואו" : back > 0 ? `נותרו ${qty - back} בחוץ` : "טרם חזר"}
        </span>
        {!done && (
          <button type="button" className="li-all" disabled={disabled}
            onClick={() => onChange({ ...it, back: qty })}>הכול חזר</button>
        )}
      </div>
    </div>
  );
}

/* ---------- בחירת ציוד מהמכולה ----------
   ⚠ בוחרים מהמלאי, ואפשר גם להוסיף פריט ידני. השאלה כוללת
     לעיתים דבר שאינו בלוח ("שני שולחנות של הקיבוץ"), ורשימה
     סגורה הייתה מונעת לרשום אותו. */
function LoanItems({ items, onChange, disabled, fromStock }) {
  const { data } = useLoad(() => (fromStock ? api.getContainer("מכולה") : Promise.resolve(null)), [fromStock]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const has = (name) => items.some((x) => x.name === name);
  const add = (name, unit) => {
    if (has(name)) { onChange(items.filter((x) => x.name !== name)); return; }
    onChange([...items, { name, qty: 1, unit: unit || "", back: 0 }]);
  };
  const at = (i, next) => onChange(items.map((x, j) => (j === i ? next : x)));

  const list = (data ? data.equipment : [])
    .filter((x) => !q.trim() || x.name.includes(q.trim()));

  const out = items.reduce((a, x) => a + (Number(x.qty) || 1), 0);
  const backed = items.reduce((a, x) => a + Math.min(Number(x.back) || 0, Number(x.qty) || 1), 0);

  return (
    <div className="fld">
      <label>הציוד</label>

      {items.length === 0 && (
        <div className="li-empty">אין פריטים. מוסיפים מהמכולה או ידנית.</div>
      )}

      {items.map((it, i) => (
        <ItemBox key={i} it={it} disabled={disabled}
          onChange={(next) => at(i, next)}
          onRemove={() => onChange(items.filter((_, j) => j !== i))} />
      ))}

      {items.length > 0 && (
        <div className="li-tot">
          <span>{items.length} פריטים · <b className="num">{out}</b> יחידות</span>
          <span className={backed >= out ? "ok" : ""}>
            חזרו <b className="num">{backed}</b> מתוך <b className="num">{out}</b>
          </span>
        </div>
      )}

      <div className="li-acts">
        <button type="button" className="btn btn-ghost btn-sm" disabled={disabled}
          onClick={() => onChange([...items, { name: "", qty: 1, unit: "", back: 0 }])}>
          <XI.plus />פריט ידני
        </button>
        {fromStock && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={disabled}
            onClick={() => setOpen(!open)}>
            {open ? "סגירה" : `מהמכולה${data ? ` (${data.equipment.length})` : ""}`}
          </button>
        )}
      </div>

      {open && fromStock && (
        <div style={{ marginTop: 9 }}>
          <input className="search" value={q} placeholder="חיפוש ציוד"
            onChange={(e) => setQ(e.target.value)} />
          <div className="rows scroll-y" style={{ marginTop: 8 }}>
            {list.map((x) => {
              const on = has(x.name);
              return (
                <button type="button" className="st-row" key={x.id}
                  disabled={disabled} onClick={() => add(x.name)}>
                  <div className={"tick" + (on ? " on" : "")}>
                    {on && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                  <div className="st-main">
                    <div className="st-n">{x.name}</div>
                    <div className="st-m"><span>{x.qty || "—"}</span></div>
                  </div>
                </button>
              );
            })}
            {list.length === 0 && (
              <div className="led-empty">{data ? "אין ציוד תואם" : "טוען…"}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   השאלת ציוד
   ============================================================ */
export function LoansPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getLoans(), []);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("open");

  if (busy && !data) return <><div className="screen-title">השאלת ציוד</div><Wait /></>;
  if (err) return <><div className="screen-title">השאלת ציוד</div><Fail err={err} onRetry={reload} /></>;
  if (!data) return null;

  if (form) {
    return <LoanForm initial={form.id ? form : null} directions={data.directions} say={say}
      onDone={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />;
  }

  const shown = filter === "open" ? data.loans.filter((l) => !l.back)
    : filter === "late" ? data.loans.filter((l) => l.late)
    : data.loans;

  return (
    <>
      <div className="screen-title">השאלת ציוד</div>

      <div className="band">
        <div className="band-h">מה בחוץ</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{data.counts.open}</div>
            <div className="band-l">השאלות פתוחות</div>
          </div>
          <div className="band-c">
            {/* ⚠ פריטים ולא השאלות — זה המספר שאומר כמה ציוד
                באמת נמצא מחוץ למכינה. */}
            <div className="band-n">{data.counts.itemsOut}</div>
            <div className="band-l">פריטים בחוץ</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (data.counts.late ? " warn" : " ok")}>{data.counts.late}</div>
            <div className="band-l">באיחור</div>
          </div>
        </div>
      </div>

      <div className="seg">
        <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>
          פתוחות ({data.counts.open})
        </button>
        <button className={filter === "late" ? "on" : ""} onClick={() => setFilter("late")}>
          באיחור ({data.counts.late})
        </button>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>הכול</button>
      </div>

      {shown.length === 0 ? (
        <div className="empty tone-1">
          <div className="e-ico"><XI.box /></div>
          <div className="e1">{filter === "late" ? "אין השאלות באיחור" : "אין השאלות פתוחות"}</div>
          <div className="e2">ציוד שיוצא או נכנס — פותחים לו כרטיס מעקב.</div>
        </div>
      ) : (
        <div className="rows">
          {shown.map((l) => {
            const t = l.totals || { out: 0, back: 0, left: 0 };
            return (
              <button className={"st-row " + (l.late ? "tone-8" : l.back ? "tone-1" : "tone-6")}
                key={l.id} onClick={() => setForm(l)}>
                <div className="tile sm"><XI.box /></div>
                <div className="st-main">
                  <div className="st-n">{l.title}</div>
                  <div className="st-m">
                    <span className="pill p-new">{l.direction || "—"}</span>
                    {l.party && <span>· {l.party}</span>}
                    {l.due && <span className="num">· להחזרה {dm(l.due)}</span>}
                  </div>
                  {t.out > 0 && (
                    <div className="st-m">
                      <span className={"pill " + (l.state === "הוחזר" ? "p-ok"
                        : l.state === "חזר חלקית" ? "p-mid" : "p-low")}>{l.state}</span>
                      <span className="num">{t.back}/{t.out} פריטים</span>
                    </div>
                  )}
                  {l.late && <div className="sf-pend">באיחור — טרם חזר</div>}
                  {l.back && <div className="st-m"><span>חזר {dmy(l.back)}</span></div>}
                </div>
                <XI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <XI.plus />השאלה חדשה
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function LoanForm({ initial, directions, say, onDone, onCancel }) {
  const [f, setF] = useState({
    title: initial?.title || "", party: initial?.party || "",
    direction: initial?.direction || directions[0],
    out: initial?.out || "", due: initial?.due || "",
    contact: initial?.contact || "", note: initial?.note || "",
  });
  const [items, setItems] = useState(initial?.items || []);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const clean = items.filter((x) => String(x.name || "").trim());
  const out = clean.reduce((a, x) => a + (Number(x.qty) || 1), 0);
  const backed = clean.reduce((a, x) => a + Math.min(Number(x.back) || 0, Number(x.qty) || 1), 0);
  const allBack = out > 0 && backed >= out;

  const save = () => {
    if (busy || !f.title.trim()) return;
    setBusy(true);
    const payload = { ...f, items: clean };
    const call = initial ? api.editLoan({ id: initial.id, ...payload }) : api.addLoan(payload);
    call.then(() => { say(initial ? "עודכן" : "ההשאלה נרשמה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy || !initial) return;
    setBusy(true);
    api.deleteLoan(initial.id)
      .then(() => { say("ההשאלה נמחקה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <XI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת השאלה" : "השאלה חדשה"}</div>

      <div className="card">
        <Field label="כותרת" hint="למשל: אוהלים לבית ספר שדות">
          <input value={f.title} onChange={set("title")} disabled={busy} />
        </Field>
        <Pick label="כיוון" options={directions} value={f.direction}
          onChange={(v) => setF({ ...f, direction: v })} disabled={busy} />
        <div className="two">
          <Field label="הגוף"><input value={f.party} onChange={set("party")} disabled={busy} /></Field>
          <Field label="איש קשר"><input value={f.contact} onChange={set("contact")} disabled={busy} /></Field>
        </div>

        {/* ⚠ בחירה מהמכולה רק כשמשאילים מאיתנו. ציוד ששאלנו
            מגוף אחר אינו במלאי שלנו, ורשימה שתציע אותו הייתה
            מבלבלת בין שני הכיוונים. */}
        <LoanItems items={items} onChange={setItems} disabled={busy}
          fromStock={f.direction === "הושאל מאיתנו"} />

        {/* ⚠ שורות שנכתבו לפני הפיצול לפריטים. לקריאה בלבד —
            מחיקה שלהן הייתה מוחקת מידע שאיש לא ביקש למחוק. */}
        {initial?.legacy && (
          <div className="li-legacy">
            <div className="li-legacy-h">נרשם קודם כטקסט</div>
            <div className="li-legacy-b">{initial.legacy}</div>
          </div>
        )}

        <div className="two">
          <Field label="תאריך יציאה"><input type="date" value={f.out} onChange={set("out")} disabled={busy} /></Field>
          <Field label="תאריך החזרה"><input type="date" value={f.due} onChange={set("due")} disabled={busy} /></Field>
        </div>

        {/* ⚠ תאריך הסגירה נקבע בשרת כשהפריט האחרון מסומן כחוזר,
            ולכן אין כאן שדה תאריך שצריך למלא ביד. */}
        {clean.length > 0 && (
          <div className={"li-close" + (allBack ? " on" : "")}>
            {allBack
              ? <span>כל הציוד חזר — ההשאלה תיסגר בשמירה{initial?.back ? ` (נסגרה ${dmy(initial.back)})` : ""}.</span>
              : <span>נותרו <b className="num">{out - backed}</b> פריטים בחוץ.</span>}
            {!allBack && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                onClick={() => setItems(items.map((x) => ({ ...x, back: Number(x.qty) || 1 })))}>
                סימון שהכול חזר
              </button>
            )}
          </div>
        )}

        <Field label="הערות"><input value={f.note} onChange={set("note")} disabled={busy} /></Field>

        <button className="btn btn-primary" disabled={busy || !f.title.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {initial && (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            disabled={busy} onClick={remove}>מחיקת ההשאלה</button>
        )}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}
