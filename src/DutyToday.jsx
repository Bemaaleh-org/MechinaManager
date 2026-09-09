/* ============================================================
   "היום אתה תורן" — מסך הבית של תורן המטבח
   ------------------------------------------------------------
   ⚠⚠ **הכול במקום אחד, ובראש המסך.** תורן המטבח נכנס בבוקר
     כדי לדעת שלושה דברים: שהוא תורן, מה מבשלים היום, ומה
     המטלות. עד היום כל אחד מהם ישב במסך אחר — התורנות
     בלשונית "תורנויות", הצ׳ק ליסט בלשונית שנייה בתוכה,
     והתפריט במסך "תפריט ארוחות". שלוש נגיעות לפני הדבר
     הראשון שהוא צריך.

   ⚠ **ושאר המסך אינו נעלם.** הכרטיס נדחף לראש, ומה שהיה
     ממשיך אחריו — מי שתורן עדיין חניך, ועדיין יש לו לו״ז,
     בקשות ושיעורים. מסך "מצב תורן" שמחליף את הבית היה מסתיר
     ממנו בדיוק את מה שהוא צריך כדי לתכנן את היום.

   ⚠ **ואין כאן שום שדה שאומר מי ביצע מה.** הצ׳ק ליסט הוא
     כלי של התורן, וסימון הוא **קיום שורה** בלוח הביצוע —
     לא מעקב, ולא מונה (עיקרון 5, 4צ).

   ⚠ **רק תורן היום מסמן.** לא אב הבית, לא אחראי המטבח ולא
     ראש המכינה — הם עוקבים. השרת אוכף, והכרטיס הזה מוצג
     ממילא רק למי שהשרת אמר עליו `onDutyToday`.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { israelDateStr } from "./testDate.js";
import { dayNameOf } from "../shared/weekmenu.js";

const DI = {
  chef: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 20h12M7 20v-6a5 5 0 0 1-1-9.9A4 4 0 0 1 12 2a4 4 0 0 1 6 2.1A5 5 0 0 1 17 14v6"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5l5.2 5.2L20 7"/></svg>,
  dish: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 13h18a9 9 0 0 0-18 0z"/><path d="M2 17h20M12 4v-.01"/></svg>,
  cal: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>,
  chev: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
};

/** כמה ימים מהיום — ⚠ UTC, כי אין כאן שעה (shared/chores.js). */
function daysAway(iso, today) {
  if (!iso || !today) return null;
  const a = Date.parse(today + "T00:00:00Z");
  const b = Date.parse(iso + "T00:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 864e5);
}

const whenWord = (n) => (n === 0 ? "היום" : n === 1 ? "מחר" : n === 2 ? "מחרתיים" : `בעוד ${n} ימים`);

/* ============================================================
   הכרטיס הגדול — למי שתורן היום
   ============================================================ */
export function DutyTodayCard({ say, onOpenChores, onOpenMenu }) {
  const [d, setD] = useState(null);
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    api.getChores()
      .then((r) => { if (alive) setD(r); })
      /* ⚠ כישלון אינו מפיל את מסך הבית — הכרטיס פשוט אינו מוצג.
         זה כרטיס אחד מתוך עשרה, ו-503 של לוח התורניות אינו
         סיבה לרוקן את הבית (עיקרון 6 בכיוון שקל לפספס, 5כב). */
      .catch(() => {});
    return () => { alive = false; };
  }, [n]);

  /* ⚠ התפריט נטען **רק** למי שתורן. שאילתה נוספת לכל חניך
     בכל טעינת בית היא בדיוק מה שהפעמון משלם עליו (4צ). */
  useEffect(() => {
    if (!d || !d.me || !d.me.onDutyToday) return;
    let alive = true;
    api.getWeekMenu().then((r) => { if (alive) setMenu(r); }).catch(() => {});
    return () => { alive = false; };
  }, [d]);

  if (!d || !d.me || !d.me.onDutyToday) return null;

  const items = (d.checklist && d.checklist.items) || [];
  const done = items.filter((x) => x.done).length;
  const today = d.today || israelDateStr();
  const dayName = dayNameOf(today);
  const meals = menu && menu.grid
    ? (menu.grid.find((g) => g.day === dayName) || { meals: [] }).meals.filter((m) => m.filled)
    : [];

  const tick = (it) => {
    if (busy) return;
    setBusy(it.id);
    api.tickChore({ item: it.id, done: !it.done })
      .then(() => setN((x) => x + 1))
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  /* ⚠ מקובץ לפי **סדר היום** ולא לפי אזור: תורן שרואה 33
     מטלות ברשימה אחת אינו יודע מה לעשות עכשיו (5ד). */
  const groups = [];
  for (const it of items) {
    const k = it.when || "בכל זמן";
    const g = groups.find((x) => x.when === k) || (groups.push({ when: k, list: [] }), groups[groups.length - 1]);
    g.list.push(it);
  }

  return (
    <div className="card dt-card">
      <div className="dt-h">
        <div className="dt-ico"><DI.chef /></div>
        <div className="dt-t">
          <b>היום אתם תורני מטבח</b>
          <span>{dmy(today)}{d.checklist && d.checklist.onDuty && d.checklist.onDuty.length > 1
            ? " · " + d.checklist.onDuty.map((x) => x.name).join(" · ") : ""}</span>
        </div>
      </div>

      {/* ---------- הארוחות של היום ---------- */}
      {meals.length > 0 && (
        <div className="dt-meals">
          {meals.map((m) => (
            <div className="dt-meal" key={m.meal}>
              <div className="dt-meal-h"><DI.dish />{m.meal}</div>
              <div className="dt-meal-m">{String(m.main || "").split("\n")[0]}</div>
              {m.items && <div className="dt-meal-i">{m.items}</div>}
            </div>
          ))}
          <button className="dt-link" onClick={onOpenMenu}>
            כל התפריט השבועי<DI.chev />
          </button>
        </div>
      )}

      {/* ---------- הצ׳ק ליסט ---------- */}
      {items.length > 0 ? (
        <>
          <div className="dt-prog">
            <div className="dt-prog-t">
              <span>צ׳ק ליסט היום</span>
              <b>{done} מתוך {items.length}</b>
            </div>
            <div className="dt-bar"><i style={{ width: `${Math.round(done / items.length * 100)}%` }} /></div>
          </div>

          {groups.map((g) => (
            <div className="dt-grp" key={g.when}>
              <div className="dt-grp-h">{g.when}</div>
              {g.list.map((it) => (
                <button className={"dt-task" + (it.done ? " on" : "")} key={it.id}
                  disabled={busy === it.id} onClick={() => tick(it)}>
                  <div className={"tick" + (it.done ? " on" : "")}>
                    {it.done && <DI.check style={{ color: "#fff" }} />}
                  </div>
                  <span>{it.task}</span>
                  {it.area && <i>{it.area}</i>}
                </button>
              ))}
            </div>
          ))}
        </>
      ) : (
        <div className="dt-none">אין מטלות מוגדרות ליום הזה</div>
      )}

      <button className="dt-link" onClick={onOpenChores}>
        התורנויות והנהלים<DI.chev />
      </button>
    </div>
  );
}

/* ============================================================
   "התורנות הבאה שלי"
   ------------------------------------------------------------
   ⚠ **לא מוצג למי שתורן היום** — הכרטיס הגדול כבר אומר את זה,
     ושתי אמירות על אותו דבר באותו מסך הן רעש.
   ⚠ **ולא מוצג כשאין** — כרטיס "אין לך תורנות" מלמד להתעלם
     מהמקום שבו כן תופיע אחת.
   ============================================================ */
export function NextChoreCard({ onOpen }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let alive = true;
    api.getChores().then((r) => { if (alive) setD(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!d || !d.me || d.me.onDutyToday) return null;
  const daily = d.me.nextDaily;
  const evening = d.me.nextEvening;
  if (!daily && !evening) return null;

  const today = d.today || israelDateStr();
  const away = daily ? daysAway(daily.date, today) : null;

  return (
    <button className="card nx-card" onClick={onOpen}>
      <div className="nx-ico"><DI.cal /></div>
      <div className="nx-b">
        {daily && (
          <div className="nx-l">
            <b>תורנות מטבח</b>
            <span>{away != null ? whenWord(away) : ""} · {dmy(daily.date)}</span>
          </div>
        )}
        {evening && (
          <div className="nx-l">
            <b>{evening.sector || "גזרת ערב"}</b>
            <span>שבוע {evening.num} · {dmy(evening.start)}–{dmy(evening.end)}</span>
          </div>
        )}
      </div>
      <DI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
    </button>
  );
}

export const DUTYTODAY_CSS = `
.dt-card{margin-bottom:14px;border-color:var(--accent)}
.dt-h{display:flex;align-items:center;gap:11px;margin-bottom:12px}
.dt-ico{flex:0 0 auto;width:42px;height:42px;border-radius:var(--r-md);
  display:flex;align-items:center;justify-content:center;
  background:var(--t4-s);color:var(--t4)}
.dt-t b{display:block;font-size:15.5px;font-weight:900;color:var(--ink)}
.dt-t span{display:block;font-size:11.5px;font-weight:700;color:var(--faint);margin-top:2px}

.dt-meals{background:var(--soft);border-radius:var(--r-md);padding:10px 12px;margin-bottom:12px}
.dt-meal + .dt-meal{margin-top:9px;padding-top:9px;border-top:1px solid var(--line2)}
.dt-meal-h{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;
  color:var(--faint)}
.dt-meal-m{font-size:13.5px;font-weight:800;color:var(--ink);margin-top:2px;line-height:1.4}
.dt-meal-i{font-size:11.5px;font-weight:600;color:var(--muted);margin-top:3px;line-height:1.5}

.dt-prog-t{display:flex;justify-content:space-between;gap:10px;font-size:12px;
  font-weight:800;color:var(--muted);margin-bottom:5px}
.dt-bar{height:6px;border-radius:99px;background:var(--line2);overflow:hidden}
.dt-bar i{display:block;height:100%;background:var(--t1);transition:width .2s var(--ease)}
.dt-prog{margin-bottom:10px}

.dt-grp{margin-bottom:8px}
.dt-grp-h{font-size:11px;font-weight:900;color:var(--faint);margin:8px 0 4px}
.kx .dt-task{display:flex;align-items:center;gap:9px;width:100%;text-align:right;
  padding:8px 9px;border-radius:var(--r-sm);background:var(--surface);
  border:1px solid var(--line2);margin-bottom:5px;transition:all .12s var(--ease)}
.kx .dt-task.on{background:var(--soft);border-color:transparent}
.dt-task span{flex:1;font-size:12.5px;font-weight:700;color:var(--ink);line-height:1.4}
.dt-task.on span{color:var(--faint);text-decoration:line-through}
.dt-task i{flex:0 0 auto;font-style:normal;font-size:10.5px;font-weight:800;color:var(--faint)}
.dt-none{font-size:12.5px;font-weight:700;color:var(--faint);padding:6px 0}

.kx .dt-link{display:flex;align-items:center;justify-content:space-between;width:100%;
  padding:9px 2px 0;background:none;border:0;font-size:12.5px;font-weight:800;
  color:var(--accent)}

.kx .nx-card{display:flex;align-items:center;gap:11px;width:100%;text-align:right;
  margin-bottom:14px}
.nx-ico{flex:0 0 auto;width:36px;height:36px;border-radius:var(--r-sm);
  display:flex;align-items:center;justify-content:center;background:var(--t1-s);color:var(--t1)}
.nx-b{flex:1;min-width:0}
.nx-l{display:flex;align-items:baseline;gap:8px}
.nx-l + .nx-l{margin-top:3px}
.nx-l b{font-size:13px;font-weight:900;color:var(--ink)}
.nx-l span{font-size:11.5px;font-weight:700;color:var(--faint)}
`;
