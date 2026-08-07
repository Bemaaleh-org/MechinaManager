import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ============================================================
   מערכת ניהול מלאי — מטבח המכינה
   פרוטוטייפ עובד. נתונים נשמרים ומשותפים לכל מי שפותח את האפליקציה.
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap');

.kx, .kx *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
.kx{
  --bg:#EEF1F5; --surface:#fff; --ink:#152234; --muted:#5F6B7C; --faint:#94A0B0;
  --line:#DBE1EA; --line2:#C6CFDC;
  --accent:#002454; --accent-soft:#DDE5F0;
  --amber:#8A5A1E; --amber-soft:#F5EBDA;
  --clay:#9E3626; --clay-soft:#F8E6E2;
  --brand-clay:#906048; --brand-clay-soft:#EFE6DE;
  --ok:#1F6B45; --ok-soft:#E1EFE8;
  font-family:'Heebo',system-ui,-apple-system,'Segoe UI',Arial,sans-serif;
  direction:rtl; background:var(--bg); color:var(--ink);
  min-height:100vh; padding-bottom:84px; font-size:16px; line-height:1.45;
  font-feature-settings:'tnum' 1;
}
.kx button{font-family:inherit;font-size:inherit;color:inherit;background:none;border:none;cursor:pointer}
.kx input,.kx select,.kx textarea{font-family:inherit;font-size:inherit;color:inherit}
.num{font-variant-numeric:tabular-nums}

/* ---- shell ---- */
.top{position:sticky;top:0;z-index:40;background:var(--accent);color:#fff;padding:12px 16px 12px}
.top-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.top h1{font-size:18px;font-weight:800;letter-spacing:-.4px;line-height:1.15}
.top .sub{font-size:12px;opacity:.72;font-weight:500;margin-top:2px}
.brand-coin{width:46px;height:46px;border-radius:50%;background:#fff;display:grid;place-items:center;
  flex:0 0 auto;box-shadow:0 2px 8px rgba(0,0,0,.18)}
.brand-coin img{width:38px;height:38px;object-fit:contain;display:block}
.who{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);
  padding:7px 11px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap}
.who .dot{width:7px;height:7px;border-radius:50%;background:#7FB3E0}

.wrap{padding:16px 14px 24px;max-width:640px;margin:0 auto}
.sec-label{font-size:11.5px;font-weight:800;letter-spacing:.9px;color:var(--faint);margin:22px 2px 9px}
.sec-label:first-child{margin-top:4px}

/* ---- day ledger (signature) ---- */
.ledger{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.led-head{padding:13px 16px 11px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline}
.led-head .d{font-size:15px;font-weight:800}
.led-head .duty{font-size:12.5px;color:var(--muted);font-weight:600}
.led-item{display:flex;align-items:center;gap:13px;padding:14px 16px;border-bottom:1px solid var(--line);
  width:100%;text-align:right;min-height:62px;transition:background .13s}
.led-item:last-child{border-bottom:none}
.led-item:active{background:#F5F7FA}
.tick{width:26px;height:26px;border-radius:8px;border:2px solid var(--line2);flex:0 0 26px;
  display:grid;place-items:center;transition:all .15s}
.tick.on{background:var(--ok);border-color:var(--ok)}
.tick.due{border-color:var(--amber);background:var(--amber-soft)}
.tick.late{border-color:var(--clay);background:var(--clay)}
.led-txt{flex:1;min-width:0}
.led-txt .t{font-size:15.5px;font-weight:700;letter-spacing:-.2px}
.led-txt .s{font-size:12.5px;color:var(--muted);margin-top:1px;font-weight:500}
.led-item.done .led-txt .t{color:var(--faint);text-decoration:line-through;text-decoration-thickness:1.5px}
.chev{color:var(--line2);flex:0 0 auto}
.when{font-size:11px;font-weight:800;letter-spacing:.6px;color:var(--faint);
  background:var(--bg);padding:3px 8px;border-radius:6px;flex:0 0 auto}

/* ---- cards / alerts ---- */
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:15px 16px}
.alert{border-radius:14px;padding:13px 15px;display:flex;gap:11px;align-items:flex-start;margin-bottom:9px}
.alert .ttl{font-weight:800;font-size:14.5px}
.alert .bd{font-size:13px;margin-top:3px;line-height:1.4}
.a-clay{background:var(--clay-soft);border:1px solid #EFCEC7;color:#5E2016}
.a-amber{background:var(--amber-soft);border:1px solid #EDDCBF;color:#5C3708}
.a-ok{background:var(--ok-soft);border:1px solid #C9E2D4;color:#194B32}

.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.chip{background:rgba(255,255,255,.75);border:1px solid rgba(0,0,0,.09);padding:4px 9px;border-radius:8px;
  font-size:12.5px;font-weight:600}

/* ---- buttons ---- */
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;
  border-radius:13px;font-weight:800;font-size:15.5px;letter-spacing:-.2px;transition:transform .08s,opacity .15s}
.btn:active{transform:scale(.985)}
.btn:disabled{opacity:.42}
.btn-primary{background:var(--accent);color:#fff}
.btn-ghost{background:var(--surface);border:1.5px solid var(--line2);color:var(--ink)}
.btn-clay{background:var(--clay);color:#fff}
.btn-ok{background:var(--ok);color:#fff}
.btn-sm{min-height:42px;font-size:14px;border-radius:11px;padding:0 14px;width:auto}

/* ---- segmented ---- */
.seg{display:flex;background:#E3E7ED;border-radius:13px;padding:4px;gap:3px;margin-bottom:14px}
.seg button{flex:1;min-height:44px;border-radius:10px;font-weight:700;font-size:14.5px;color:var(--muted);transition:all .15s}
.seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.09)}
.seg button.on.clay{color:var(--clay)}
.seg-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.seg-scroll::-webkit-scrollbar{display:none}
.seg-scroll button{flex:1 0 auto;padding:0 14px;white-space:nowrap}

/* weekly compliance board */
.wk{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.wk-day{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:9px 4px;text-align:center}
.wk-day .dn{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.2px}
.wk-day .dd{font-size:11px;color:var(--faint);font-weight:600;margin-top:1px}
.wk-mark{width:30px;height:30px;border-radius:50%;margin:8px auto 4px;display:grid;place-items:center}
.wk-mark.done{background:var(--ok)}
.wk-mark.miss{background:var(--clay)}
.wk-mark.fut{background:var(--line);height:5px;width:20px;border-radius:99px;margin:20px auto 15px}
.wk-day .who2{font-size:10px;color:var(--faint);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wk-day.is-today{border-color:var(--accent);border-width:2px}

/* ---- product rows ---- */
.grp{margin-bottom:14px}
.grp-h{font-size:12px;font-weight:800;letter-spacing:.7px;color:var(--muted);padding:0 4px 7px;
  display:flex;justify-content:space-between;align-items:center}
.rows{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.row{display:flex;align-items:center;gap:10px;padding:11px 13px;border-bottom:1px solid var(--line);min-height:64px}
.row:last-child{border-bottom:none}
.row.hot{background:#FEFBF6}
.r-main{flex:1;min-width:0}
.r-name{font-size:15px;font-weight:700;letter-spacing:-.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.r-meta{font-size:12px;color:var(--muted);margin-top:2px;font-weight:500;display:flex;gap:7px;align-items:center}
.pill{font-size:10.5px;font-weight:800;letter-spacing:.4px;padding:2px 6px;border-radius:5px}
.p-low{background:var(--clay-soft);color:var(--clay)}
.p-ok{background:var(--ok-soft);color:var(--ok)}
.p-new{background:var(--amber-soft);color:var(--amber)}

/* stepper */
.step{display:flex;align-items:center;gap:0;background:var(--bg);border:1px solid var(--line);border-radius:11px;flex:0 0 auto}
.step button{width:42px;height:44px;font-size:21px;font-weight:700;color:var(--accent);display:grid;place-items:center}
.step button:disabled{color:var(--line2)}
.step input{width:56px;height:44px;text-align:center;background:none;border:none;font-size:16px;font-weight:800;
  outline:none;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.step input::-webkit-outer-spin-button,.step input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.step.filled{background:var(--accent-soft);border-color:#B4C6DC}

/* count row */
.crow{padding:12px 13px;border-bottom:1px solid var(--line)}
.crow:last-child{border-bottom:none}
.crow.done{background:#F6F8FB}
.crow-top{display:flex;align-items:center;gap:10px}
.exp{display:flex;gap:6px;margin-top:10px}
.exp button{flex:1;min-height:46px;border-radius:10px;border:1.5px solid var(--line2);font-size:13.5px;font-weight:700;
  color:var(--muted);background:var(--surface);display:flex;align-items:center;justify-content:center;gap:6px}
.exp button.on-ok{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}
.exp button.on-soon{background:var(--amber-soft);border-color:var(--amber);color:var(--amber)}

/* reason chips */
.reasons{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-right:2px}
.reasons button{padding:8px 13px;border-radius:9px;border:1.5px solid var(--line2);font-size:13.5px;font-weight:700;
  color:var(--muted);background:var(--surface);min-height:40px}
.reasons button.on{background:var(--clay);border-color:var(--clay);color:#fff}

/* progress */
.prog{height:6px;background:#DCE2EA;border-radius:99px;overflow:hidden;margin-top:9px}
.prog i{display:block;height:100%;background:var(--accent);border-radius:99px;transition:width .3s}

/* sticky bar */
.sticky{position:fixed;bottom:76px;right:0;left:0;padding:10px 14px;z-index:35;
  background:linear-gradient(to top,var(--bg) 62%,rgba(239,242,241,0));pointer-events:none}
.sticky>*{pointer-events:auto;max-width:612px;margin:0 auto}

/* nav */
.nav{position:fixed;bottom:0;right:0;left:0;z-index:50;background:var(--surface);border-top:1px solid var(--line);
  display:flex;padding:6px 4px calc(6px + env(safe-area-inset-bottom))}
.nav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;
  font-size:10.5px;font-weight:700;color:var(--faint);position:relative;min-height:58px;justify-content:center}
.nav button.on{color:var(--accent)}
.nav .bdg{position:absolute;top:2px;left:calc(50% - 20px);background:var(--clay);color:#fff;font-size:10px;font-weight:800;
  min-width:17px;height:17px;border-radius:99px;display:grid;place-items:center;padding:0 4px}

/* search & fields */
.search{width:100%;min-height:48px;background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:0 14px;outline:none;font-size:15.5px;margin-bottom:12px}
.search:focus{border-color:var(--accent)}
.fld{margin-bottom:13px}
.fld label{display:block;font-size:12.5px;font-weight:800;color:var(--muted);margin-bottom:5px;letter-spacing:.2px}
.fld input,.fld select{width:100%;min-height:48px;background:var(--surface);border:1px solid var(--line2);
  border-radius:11px;padding:0 13px;outline:none;font-size:15.5px}
.fld input:focus,.fld select:focus{border-color:var(--accent)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.pick{display:flex;gap:6px}
.pick button{flex:1;min-height:46px;border-radius:10px;border:1.5px solid var(--line2);background:var(--surface);
  font-size:14px;font-weight:700;color:var(--muted)}
.pick button.on{background:var(--accent);border-color:var(--accent);color:#fff}

/* modal */
.scrim{position:fixed;inset:0;background:rgba(12,22,20,.5);z-index:100;display:flex;align-items:flex-end;
  animation:fade .18s ease}
.sheet{background:var(--bg);width:100%;max-height:92vh;overflow-y:auto;border-radius:20px 20px 0 0;
  animation:up .24s cubic-bezier(.2,.8,.3,1);padding-bottom:calc(16px + env(safe-area-inset-bottom))}
.sheet-h{position:sticky;top:0;background:var(--bg);padding:16px 16px 12px;display:flex;justify-content:space-between;
  align-items:center;border-bottom:1px solid var(--line);z-index:2}
.sheet-h h3{font-size:17.5px;font-weight:800;letter-spacing:-.3px}
.sheet-b{padding:16px}
@keyframes fade{from{opacity:0}}
@keyframes up{from{transform:translateY(26px)}}

/* stats */
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
.stat .k{font-size:11.5px;font-weight:800;letter-spacing:.5px;color:var(--muted)}
.stat .v{font-size:26px;font-weight:900;letter-spacing:-1px;margin-top:4px;font-variant-numeric:tabular-nums}
.stat .n{font-size:11.5px;color:var(--faint);font-weight:600;margin-top:1px}
.stat.clay .v{color:var(--clay)}
.stat.ok .v{color:var(--ok)}

.bar{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}
.bar:last-child{border-bottom:none}
.bar .bn{font-size:14px;font-weight:600;flex:0 0 96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .bt{flex:1;height:9px;background:var(--bg);border-radius:99px;overflow:hidden}
.bar .bt i{display:block;height:100%;background:var(--clay);border-radius:99px}
.bar .bv{font-size:13.5px;font-weight:800;flex:0 0 auto;font-variant-numeric:tabular-nums}

.empty{text-align:center;padding:44px 24px;color:var(--muted)}
.empty .e1{font-size:16px;font-weight:800;color:var(--ink);margin-bottom:5px}
.empty .e2{font-size:13.5px;line-height:1.5}

.toast{position:fixed;bottom:96px;right:16px;left:16px;z-index:200;background:var(--ink);color:#fff;
  border-radius:13px;padding:14px 16px;font-size:14.5px;font-weight:700;text-align:center;
  animation:up .22s cubic-bezier(.2,.8,.3,1);max-width:400px;margin:0 auto;box-shadow:0 8px 24px rgba(0,0,0,.22)}

@media (prefers-reduced-motion:reduce){.kx *{animation:none!important;transition:none!important}}
`;

const LOGO = "data:image/png;base64,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";

/* ---------- icons ---------- */
const I = {
  home: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  day: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  count: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>,
  cart: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>,
  gear: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="6" rx="1.6"/><rect x="3" y="14" width="18" height="6" rx="1.6"/><path d="M7 7h.01M7 17h.01"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  x: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  clock: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/></svg>,
  download: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  edit: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
};

/* ---------- data ---------- */
const UNITS = { kg: "ק״ג", liter: "ליטר", unit: "יח׳" };
const CATS = ["בשר ועוף", "חלב וביצים", "ירקות ופירות", "לחם ומאפים", "יבשים", "שימורים ורטבים", "תבלינים ומשקאות", "חד״פ וניקיון"];
const SUPPLIERS = { super: "סופר – שבועי", wholesale: "סיטונאי – דו‑חודשי" };
const REASONS = ["רקוב", "פג תוקף", "עודף מבושל", "נשפך / נפגם", "אחר"];

let _sid = 0;
const P = (name, cat, unit, tracking, exp, min, target, sup, price, stock) =>
  ({ id: "p" + (++_sid), name, cat, unit, tracking, exp, min, target, sup, price, stock, order: _sid, expiryFlag: null, pending: false });

const SEED_PRODUCTS = [
  P("חזה עוף","בשר ועוף","kg","daily",1,10,40,"wholesale",38,22),
  P("שניצל עוף","בשר ועוף","kg","daily",1,8,30,"wholesale",42,15),
  P("בשר טחון","בשר ועוף","kg","daily",1,6,20,"wholesale",55,4),
  P("נקניקיות","בשר ועוף","kg","daily",1,4,12,"wholesale",35,5),
  P("חלב 3%","חלב וביצים","liter","daily",1,12,40,"super",6.5,9),
  P("גבינה לבנה 5%","חלב וביצים","kg","daily",1,3,10,"super",25,4),
  P("קוטג׳","חלב וביצים","unit","daily",1,10,30,"super",7,12),
  P("גבינה צהובה","חלב וביצים","kg","daily",1,3,10,"super",60,3.5),
  P("שמנת חמוצה","חלב וביצים","unit","daily",1,6,18,"super",6.5,7),
  P("לבנה","חלב וביצים","kg","daily",1,2,8,"super",30,2),
  P("ביצים","חלב וביצים","unit","daily",1,60,240,"super",1.2,90),
  P("עגבניות","ירקות ופירות","kg","daily",1,8,25,"super",8,11),
  P("מלפפונים","ירקות ופירות","kg","daily",1,8,25,"super",7,9),
  P("בצל","ירקות ופירות","kg","daily",0,6,20,"super",5,14),
  P("גזר","ירקות ופירות","kg","daily",0,5,15,"super",5,6),
  P("פלפל אדום","ירקות ופירות","kg","daily",1,4,12,"super",12,5),
  P("חסה","ירקות ופירות","unit","daily",1,6,20,"super",6,8),
  P("כרוב","ירקות ופירות","kg","daily",0,4,12,"super",5,5),
  P("תפוחי אדמה","ירקות ופירות","kg","daily",0,10,30,"super",5,16),
  P("לימון","ירקות ופירות","kg","daily",0,2,8,"super",10,3),
  P("פטרוזיליה","ירקות ופירות","unit","daily",1,3,10,"super",4,4),
  P("בננות","ירקות ופירות","kg","daily",1,6,20,"super",9,7),
  P("תפוחים","ירקות ופירות","kg","daily",0,6,20,"super",10,8),
  P("תפוזים","ירקות ופירות","kg","daily",0,6,20,"super",7,9),
  P("לחם פרוס","לחם ומאפים","unit","daily",1,6,20,"super",8,4),
  P("פיתות","לחם ומאפים","unit","daily",1,5,18,"super",10,6),
  P("חלה","לחם ומאפים","unit","daily",1,4,12,"super",12,0),
  P("אורז","יבשים","kg","weekly",0,10,40,"wholesale",8,8),
  P("פסטה","יבשים","kg","weekly",0,8,30,"wholesale",7,17),
  P("קוסקוס","יבשים","kg","weekly",0,6,20,"wholesale",9,11),
  P("בורגול","יבשים","kg","weekly",0,4,12,"wholesale",8,6),
  P("עדשים","יבשים","kg","weekly",0,4,12,"wholesale",10,7),
  P("חומוס יבש","יבשים","kg","weekly",0,4,12,"wholesale",10,5),
  P("שעועית יבשה","יבשים","kg","weekly",0,3,10,"wholesale",12,4),
  P("קמח","יבשים","kg","weekly",0,8,25,"wholesale",5,12),
  P("סוכר","יבשים","kg","weekly",0,6,20,"wholesale",6,9),
  P("מלח","יבשים","kg","weekly",0,2,8,"wholesale",3,3),
  P("שמן קנולה","יבשים","liter","weekly",0,6,20,"wholesale",12,8),
  P("שמן זית","יבשים","liter","weekly",0,2,6,"wholesale",45,2.5),
  P("חומץ","יבשים","liter","weekly",0,1,4,"wholesale",8,2),
  P("רסק עגבניות","שימורים ורטבים","unit","weekly",0,10,30,"wholesale",6,14),
  P("תירס משומר","שימורים ורטבים","unit","weekly",0,8,24,"wholesale",6,10),
  P("טונה","שימורים ורטבים","unit","weekly",0,12,40,"wholesale",8,9),
  P("זיתים","שימורים ורטבים","unit","weekly",0,4,12,"wholesale",12,6),
  P("מלפפון חמוץ","שימורים ורטבים","unit","weekly",0,4,12,"wholesale",10,5),
  P("קטשופ","שימורים ורטבים","unit","weekly",0,3,10,"wholesale",12,4),
  P("מיונז","שימורים ורטבים","unit","weekly",0,3,10,"wholesale",15,4),
  P("חרדל","שימורים ורטבים","unit","weekly",0,1,4,"wholesale",10,2),
  P("טחינה גולמית","שימורים ורטבים","kg","weekly",0,3,10,"wholesale",22,4),
  P("פפריקה","תבלינים ומשקאות","kg","weekly",0,.5,2,"wholesale",40,.8),
  P("כמון","תבלינים ומשקאות","kg","weekly",0,.4,1.5,"wholesale",45,.6),
  P("פלפל שחור","תבלינים ומשקאות","kg","weekly",0,.3,1.2,"wholesale",60,.5),
  P("אבקת מרק","תבלינים ומשקאות","kg","weekly",0,1,4,"wholesale",30,1.5),
  P("אורגנו","תבלינים ומשקאות","kg","weekly",0,.2,1,"wholesale",50,.3),
  P("קפה נמס","תבלינים ומשקאות","kg","weekly",0,1,4,"wholesale",90,1.6),
  P("תה","תבלינים ומשקאות","unit","weekly",0,4,12,"wholesale",15,5),
  P("צלחות חד״פ","חד״פ וניקיון","unit","weekly",0,200,800,"wholesale",.4,320),
  P("כוסות חד״פ","חד״פ וניקיון","unit","weekly",0,300,1200,"wholesale",.2,450),
  P("סכו״ם חד״פ","חד״פ וניקיון","unit","weekly",0,200,800,"wholesale",.3,280),
  P("מגבות נייר","חד״פ וניקיון","unit","weekly",0,6,24,"wholesale",8,9),
  P("שקיות אשפה","חד״פ וניקיון","unit","weekly",0,4,16,"wholesale",15,6),
  P("סבון כלים","חד״פ וניקיון","liter","weekly",0,3,10,"wholesale",12,4),
  P("אקונומיקה","חד״פ וניקיון","liter","weekly",0,3,10,"wholesale",8,5),
  P("כפפות חד״פ","חד״פ וניקיון","unit","weekly",0,3,10,"wholesale",20,4),
];

// Demo: mark a couple of fresh items as "use within 3 days" so the trainee sees
// the immediate-use state on the home screen exactly as it would appear in the morning.
["גבינה לבנה 5%", "קוטג׳"].forEach((name) => {
  const p = SEED_PRODUCTS.find((x) => x.name === name);
  if (p) p.expiryFlag = "soon";
});

const SEED_USERS = [
  { id: "u1", name: "אורי לוי", role: "trainee" },
  { id: "u2", name: "נועה כהן", role: "trainee" },
  { id: "u3", name: "יובל אזולאי", role: "trainee" },
  { id: "u4", name: "שיר מזרחי", role: "trainee" },
  { id: "u5", name: "דוד ברק", role: "manager", title: "מנהל המכינה" },
  { id: "u6", name: "תמר שגב", role: "manager", title: "סגנית מנהל" },
  { id: "u7", name: "רועי נחום", role: "manager", title: "מנהל אופרציה" },
  { id: "u8", name: "מיכל אדרי", role: "manager", title: "מנכ״לית העמותה" },
];

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const SEED_DUTY = { 0: "u1", 1: "u2", 2: "u3", 3: "u4", 4: "u1", 5: "u2", 6: "u3" };

/* ---------- helpers ---------- */
const KEY = "mechina-kitchen-v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const dkey = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
const sameDay = (ts, d = new Date()) => dkey(ts) === dkey(d);
const nfmt = (n) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(r * 10 % 1 === 0 ? 1 : 2);
};
const shek = (n) => "₪" + Math.round(n).toLocaleString("he-IL");
const stepOf = (u) => (u === "unit" ? 1 : 0.5);
const hebDate = (d = new Date()) =>
  DAYS[d.getDay()] + ", " + d.getDate() + " ב" + ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][d.getMonth()];

const normHe = (s) =>
  (s || "").trim().replace(/[ְ-ׇ]/g, "")
    .replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ץ/g,"צ").replace(/ף/g,"פ").replace(/ך/g,"כ")
    .replace(/[׳'"״.,\-]/g, "").replace(/\s+/g, " ").toLowerCase();

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function similar(a, b) {
  const x = normHe(a), y = normHe(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;
  return 1 - lev(x, y) / Math.max(x.length, y.length);
}
function findSimilar(name, products, exclude) {
  return products
    .filter((p) => p.id !== exclude)
    .map((p) => ({ p, s: similar(name, p.name) }))
    .filter((r) => r.s >= 0.62)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
}

const weekStart = (d = new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; };

/* ---------- storage ---------- */
async function loadRemote() {
  try { const r = await window.storage.get(KEY, true); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function saveRemote(s) {
  try { await window.storage.set(KEY, JSON.stringify(s), true); } catch {}
}

/* Ensures each supplier has exactly one open "draft" list containing every
   non-pending product currently below its minimum. Manual additions and edited
   quantities are preserved; auto items that recovered above minimum drop out. */
function syncLiveLists(products, lists, creatorName) {
  let next = [...lists];
  ["super", "wholesale"].forEach((sup) => {
    const below = products.filter((p) => p.sup === sup && !p.pending && p.stock < p.min);
    const draft = next.find((l) => l.sup === sup && l.status === "draft");
    const autoItems = below.map((p) => {
      const existing = draft && draft.items.find((it) => it.pid === p.id);
      return existing ? existing : { pid: p.id, qty: Math.ceil((p.target - p.stock) * 2) / 2, got: null, auto: true };
    });
    if (draft) {
      const manualKept = draft.items.filter((it) => !it.auto && !below.some((p) => p.id === it.pid));
      const merged = [...autoItems, ...manualKept.filter((m) => !autoItems.some((a) => a.pid === m.pid))];
      next = next.map((l) => (l.id === draft.id ? { ...l, items: merged } : l));
    } else if (autoItems.length) {
      next = [{ id: uid(), sup, items: autoItems, status: "draft", createdBy: creatorName || "אוטומטי", createdAt: Date.now(), extra: [] }, ...next];
    }
  });
  return next;
}

const freshState = () => {
  const products = SEED_PRODUCTS.map((p) => ({ ...p, stockStatus: p.stock < p.min ? "low" : "ok" }));
  return {
    v: 1,
    products,
    moves: [],
    lists: syncLiveLists(products, [], "אוטומטי"),
    users: SEED_USERS.map((u) => ({ ...u })),
    duty: { ...SEED_DUTY },
    countDraft: null,
    lastCountAt: null,
  };
};

/* ============================================================ */
export default function App() {
  const [st, setSt] = useState(null);
  const [me, setMe] = useState("u1");
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const saveT = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await loadRemote();
      if (!live) return;
      if (r && r.products) {
        // migrate older saved state: ensure stockStatus + live draft lists exist
        let products = r.products.map((p) => ({ ...p, stockStatus: p.stock < p.min ? "low" : "ok" }));
        // demo aid: if nothing is flagged "use within 3 days", seed the flag so the state is visible
        if (!products.some((p) => p.expiryFlag === "soon")) {
          products = products.map((p) =>
            (p.name === "גבינה לבנה 5%" || p.name === "קוטג׳") ? { ...p, expiryFlag: "soon" } : p);
        }
        setSt({ ...r, products, lists: syncLiveLists(products, r.lists || [], "אוטומטי") });
      } else {
        setSt(freshState());
      }
    })();
    return () => { live = false; };
  }, []);

  // Load SheetJS for real .xlsx export (falls back to CSV if it doesn't load)
  useEffect(() => {
    if (window.XLSX || document.getElementById("sheetjs-cdn")) return;
    const s = document.createElement("script");
    s.id = "sheetjs-cdn";
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!st) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => saveRemote(st), 450);
  }, [st]);

  const say = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2400); }, []);

  if (!st) return (<><style>{CSS}</style><div className="kx"><div className="empty" style={{ paddingTop: 100 }}><div className="e1">טוען מלאי…</div></div></div></>);

  const user = st.users.find((u) => u.id === me) || st.users[0];
  const isMgr = user.role === "manager";
  const today = new Date();
  const dutyId = st.duty[today.getDay()];
  const dutyUser = st.users.find((u) => u.id === dutyId);

  /* --- derived --- */
  const lowStock = st.products.filter((p) => !p.pending && p.stock < p.min);
  const soonList = st.products.filter((p) => p.expiryFlag === "soon");
  const pendingProducts = st.products.filter((p) => p.pending);
  const receiptDone = st.moves.some((m) => m.type === "receipt" && sameDay(m.ts));
  const eveningDone = st.moves.some((m) => (m.type === "usage" || m.type === "waste") && sameDay(m.ts));
  const countedThisWeek = st.lastCountAt && new Date(st.lastCountAt) >= weekStart();
  const isTue = today.getDay() === 2;
  const isWed = today.getDay() === 3;
  const afterSix = today.getHours() >= 18;
  const openLists = st.lists.filter((l) => l.status !== "purchased" && l.status !== "missed");
  const needsApproval = st.lists.filter((l) => l.status === "pending");

  const navBadge = lowStock.length + (isMgr ? needsApproval.length : 0);

  /* --- actions --- */
  const commitMoves = (entries, type) => {
    const now = Date.now();
    const moves = entries.map((e) => ({
      id: uid(), pid: e.pid, type, qty: e.qty, reason: e.reason || null,
      user: user.name, uid: user.id, ts: now,
    }));
    setSt((s) => {
      const products = s.products.map((p) => {
        const e = entries.find((x) => x.pid === p.id);
        if (!e) return p;
        const delta = type === "receipt" ? e.qty : -e.qty;
        const stock = Math.max(0, Math.round((p.stock + delta) * 100) / 100);
        return { ...p, stock, stockStatus: stock < p.min ? "low" : "ok" };
      });
      return { ...s, moves: [...s.moves, ...moves], products, lists: syncLiveLists(products, s.lists) };
    });
  };

  // Reverses a single move (receipt/usage/waste): restores the stock and removes the record.
  const undoMove = (moveId) => {
    setSt((s) => {
      const mv = s.moves.find((x) => x.id === moveId);
      if (!mv) return s;
      const products = s.products.map((p) => {
        if (p.id !== mv.pid) return p;
        // receipt added stock, so undo subtracts; usage/waste subtracted, so undo adds back
        const delta = mv.type === "receipt" ? -mv.qty : mv.qty;
        const stock = Math.max(0, Math.round((p.stock + delta) * 100) / 100);
        return { ...p, stock, stockStatus: stock < p.min ? "low" : "ok" };
      });
      return { ...s, moves: s.moves.filter((x) => x.id !== moveId), products, lists: syncLiveLists(products, s.lists) };
    });
  };

  const finishCount = (draft) => {
    const now = Date.now();
    setSt((s) => {
      const moves = [];
      const products = s.products.map((p) => {
        const d = draft[p.id];
        if (!d || d.qty === "" || d.qty == null) return p;
        const counted = Number(d.qty);
        const diff = Math.round((counted - p.stock) * 100) / 100;
        if (diff !== 0) moves.push({ id: uid(), pid: p.id, type: "count", qty: diff, user: user.name, uid: user.id, ts: now });
        return { ...p, stock: counted, stockStatus: counted < p.min ? "low" : "ok", expiryFlag: p.exp ? (d.exp || null) : null };
      });
      return { ...s, products, moves: [...s.moves, ...moves], lists: syncLiveLists(products, s.lists), lastCountAt: now, countDraft: null };
    });
  };

  // Opens (or focuses) the live draft list for a supplier. Never creates duplicates.
  const makeList = (sup) => {
    let id = null;
    setSt((s) => {
      const lists = syncLiveLists(s.products, s.lists);
      const draft = lists.find((l) => l.sup === sup && l.status === "draft");
      if (draft) { id = draft.id; return { ...s, lists }; }
      // no products below minimum and no existing draft — create an empty one to add to manually
      const empty = { id: uid(), sup, items: [], status: "draft", createdBy: user.name, createdAt: Date.now(), extra: [] };
      id = empty.id;
      return { ...s, lists: [empty, ...lists] };
    });
    return id;
  };

  const patchList = (id, patch) =>
    setSt((s) => ({ ...s, lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const receiveList = (list, received) => {
    const entries = Object.entries(received)
      .map(([pid, q]) => ({ pid, qty: Number(q) }))
      .filter((e) => e.qty > 0);
    commitMoves(entries, "receipt");
    patchList(list.id, { status: "purchased", purchasedAt: Date.now(), received });
    say("המלאי עודכן לפי מה שהגיע");
  };

  const upsertProduct = (p) =>
    setSt((s) => {
      const ex = s.products.some((x) => x.id === p.id);
      return { ...s, products: ex ? s.products.map((x) => (x.id === p.id ? p : x)) : [...s.products, p] };
    });

  const ctx = { st, setSt, user, isMgr, say, setModal, commitMoves, undoMove, finishCount, makeList, patchList, receiveList,
    upsertProduct, lowStock, soonList, pendingProducts, receiptDone, eveningDone, countedThisWeek, isTue, isWed,
    afterSix, dutyUser, needsApproval, openLists, setTab };

  return (
    <>
      <style>{CSS}</style>
      <div className="kx">
        <header className="top">
          <div className="top-row">
            <div>
              <h1>מטבח המכינה</h1>
              <div className="sub">{hebDate(today)}</div>
            </div>
            <div className="brand-coin" aria-label="במעלה הדרך">
              <img src={LOGO} alt="לוגו במעלה הדרך" />
            </div>
            <button className="who" onClick={() => setModal({ t: "user" })}>
              <span className="dot" />{user.name.split(" ")[0]}
            </button>
          </div>
        </header>

        <main className="wrap">
          {tab === "home" && <Home ctx={ctx} />}
          {tab === "daily" && <Daily ctx={ctx} />}
          {tab === "count" && <Count ctx={ctx} />}
          {tab === "shop" && <Shop ctx={ctx} />}
          {tab === "manage" && (isMgr ? <Manage ctx={ctx} /> : <Home ctx={ctx} />)}
        </main>

        <nav className="nav">
          {(isMgr
            ? [["home", "בית", I.home], ["shop", "קניות", I.cart], ["manage", "ניהול", I.gear]]
            : [["home", "בית", I.home], ["daily", "יומי", I.day], ["count", "ספירה", I.count], ["shop", "קניות", I.cart]]
          ).map(([k, label, Icon]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              <Icon />
              <span>{label}</span>
              {k === "home" && navBadge > 0 && <span className="bdg">{navBadge}</span>}
            </button>
          ))}
        </nav>

        {toast && <div className="toast">{toast}</div>}
        {modal && <Modal ctx={ctx} modal={modal} close={() => setModal(null)} me={me} setMe={setMe} />}
      </div>
    </>
  );
}

/* ============================ HOME ============================ */
function Home({ ctx }) {
  const { st, lowStock, soonList, receiptDone, eveningDone, countedThisWeek, isTue, isWed, afterSix,
    dutyUser, setTab, isMgr, needsApproval, openLists, pendingProducts } = ctx;
  const h = new Date().getHours();
  const [openPanel, setOpenPanel] = useState(null);

  const listApprovedToday = st.lists.some((l) =>
    (l.status === "approved" || (l.status === "purchased" && l.purchasedAt && sameDay(l.purchasedAt))) &&
    l.approvedAt && sameDay(l.approvedAt));
  const anyApproved = st.lists.some((l) => l.status === "approved" || l.status === "purchased");

  const rows = [
    { k: "r", when: "בוקר", t: "קבלת סחורה", s: receiptDone ? "עודכן היום" : "מה הגיע היום למחסן", done: receiptDone,
      due: !receiptDone && h >= 9, go: () => setTab("daily") },
    { k: "e", when: "ערב", t: "ספירת מלאי יומית", s: eveningDone ? "עודכן היום" : "מוצרים טריים בלבד – דקה וחצי", done: eveningDone,
      due: !eveningDone && afterSix, go: () => setTab("daily") },
    { k: "c", when: "שלישי", t: "ספירת מלאי שבועית", s: countedThisWeek ? "בוצעה השבוע" : (isTue ? "היום – כולל סימון תוקף" : "בשלישי בערב"),
      done: !!countedThisWeek, due: isTue && !countedThisWeek, go: () => setTab("count") },
    { k: "s", when: isWed ? "היום" : "רביעי", t: "רשימת קניות ואישור",
      s: anyApproved ? "הרשימה אושרה על ידי המנהל" : (openLists.length ? statusText(openLists[0]) : "נוצרת אחרי הספירה"),
      done: anyApproved, due: !anyApproved && ((isTue && countedThisWeek) || isWed), go: () => setTab("shop") },
  ];

  return (
    <>
      {/* Managers: low stock stays open — they must see shortages the moment they open the app (sef 6) */}
      {isMgr && lowStock.length > 0 && (
        <div className="alert a-clay">
          <span style={{ marginTop: 1 }}><I.warn /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">{lowStock.length} מוצרים מתחת למינימום</div>
            <div className="chips">
              {lowStock.slice(0, 6).map((p) => (
                <span className="chip" key={p.id}>{p.name} – {nfmt(p.stock)} {UNITS[p.unit]}</span>
              ))}
              {lowStock.length > 6 && <span className="chip">ועוד {lowStock.length - 6}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Trainees: only the immediate-use panel — shortages are a management concern, not the trainee's */}
      {!isMgr && soonList.length > 0 && (
        <div className="rows" style={{ marginBottom: 14 }}>
          <button className="row" style={{ width: "100%", textAlign: "right" }}
            onClick={() => setOpenPanel(openPanel === "soon" ? null : "soon")}>
            <span style={{ color: "var(--amber)", flex: "0 0 auto" }}><I.clock /></span>
            <div className="r-main">
              <div className="r-name">לשימוש מיידי</div>
              <div className="r-meta">תוקף המוצר עומד לפוג</div>
            </div>
            <span className="pill" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>{soonList.length}</span>
            <span className="chev" style={{ transform: openPanel === "soon" ? "rotate(-90deg)" : "none" }}><I.chev /></span>
          </button>
          {openPanel === "soon" && (
            <div style={{ padding: "4px 14px 14px", background: "#FDFBF5" }}>
              <div className="chips">
                {soonList.map((p) => (
                  <span className="chip" key={p.id}>{p.name} – {nfmt(p.stock)} {UNITS[p.unit]}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Managers also see soon-to-expire as an open note */}
      {isMgr && soonList.length > 0 && (
        <div className="alert a-amber">
          <span style={{ marginTop: 1 }}><I.clock /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">לשימוש מיידי – פחות מ‑3 ימים</div>
            <div className="bd">סומנו בספירה האחרונה. לשלב אותם בתפריט של מחר.</div>
            <div className="chips">{soonList.map((p) => <span className="chip" key={p.id}>{p.name}</span>)}</div>
          </div>
        </div>
      )}

      {isMgr && needsApproval.length > 0 && (
        <button className="alert a-amber" style={{ width: "100%", textAlign: "right" }} onClick={() => setTab("shop")}>
          <span style={{ marginTop: 1 }}><I.clock /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">{needsApproval.length} רשימות ממתינות לאישור שלך</div>
            <div className="bd">בלי אישור אי אפשר לצאת לקניות</div>
          </div>
        </button>
      )}

      {isMgr && pendingProducts.length > 0 && (
        <button className="alert a-amber" style={{ width: "100%", textAlign: "right" }} onClick={() => setTab("manage")}>
          <span style={{ marginTop: 1 }}><I.warn /></span>
          <div style={{ flex: 1 }}>
            <div className="ttl">{pendingProducts.length} מוצרים חדשים ממתינים לאישור</div>
            <div className="bd">אשרו או מזגו כדי לשמור על קטלוג נקי</div>
          </div>
        </button>
      )}

      <div className="sec-label">משימות היום</div>
      <div className="ledger">
        <div className="led-head">
          <span className="d">{DAYS[new Date().getDay()]}</span>
          <span className="duty">תורן: {dutyUser ? dutyUser.name : "לא הוגדר"}</span>
        </div>
        {rows.map((r) => (
          <button key={r.k} className={"led-item" + (r.done ? " done" : "")} onClick={r.go}>
            <span className={"tick" + (r.done ? " on" : r.due ? (afterSix && !r.done ? " late" : " due") : "")}>
              {r.done && <span style={{ color: "#fff" }}><I.check /></span>}
              {!r.done && r.due && afterSix && <span style={{ color: "#fff" }}><I.warn width="13" height="13" /></span>}
            </span>
            <span className="when">{r.when}</span>
            <span className="led-txt">
              <span className="t">{r.t}</span>
              <span className="s">{r.s}</span>
            </span>
            <span className="chev"><I.chev /></span>
          </button>
        ))}
      </div>

      {isMgr && (
        <>
          <div className="sec-label">תמונת מצב</div>
          <div className="stats">
            <div className="stat">
              <div className="k">שווי מלאי</div>
              <div className="v">{shek(st.products.reduce((a, p) => a + p.stock * p.price, 0))}</div>
              <div className="n">{st.products.length} מוצרים בקטלוג</div>
            </div>
            <div className="stat clay">
              <div className="k">פחת החודש</div>
              <div className="v">{shek(st.moves.filter((m) => m.type === "waste" && new Date(m.ts).getMonth() === new Date().getMonth())
                .reduce((a, m) => { const p = st.products.find((x) => x.id === m.pid); return a + m.qty * (p ? p.price : 0); }, 0))}</div>
              <div className="n">לפי מחירי תקן</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const statusText = (l) => ({
  draft: "טיוטה – לשלוח לאישור", pending: "ממתינה לאישור מנהל", approved: "מאושרת – אפשר לצאת לקנות",
  purchased: "נקנתה", missed: "התפספסה",
}[l.status] || "");

/* ============================ DAILY ============================ */
function Daily({ ctx }) {
  const { st, commitMoves, undoMove, say, user } = ctx;
  const [mode, setMode] = useState("usage");
  const [vals, setVals] = useState({});
  const [reasons, setReasons] = useState({});
  const [confirm, setConfirm] = useState(null);

  const list = st.products.filter((p) => p.tracking === "daily" && !p.pending)
    .sort((a, b) => a.order - b.order);
  const groups = CATS.map((c) => [c, list.filter((p) => p.cat === c)]).filter(([, a]) => a.length);

  useEffect(() => { setVals({}); setReasons({}); }, [mode]);

  const entries = Object.entries(vals).map(([pid, q]) => ({ pid, qty: Number(q), reason: reasons[pid] }))
    .filter((e) => e.qty > 0);
  const missingReason = mode === "waste" && entries.some((e) => !e.reason);

  const doSave = () => {
    const odd = entries.find((e) => {
      const p = st.products.find((x) => x.id === e.pid);
      return p && e.qty > Math.max(p.target * 2, 12);
    });
    if (odd && !confirm) {
      const p = st.products.find((x) => x.id === odd.pid);
      setConfirm({ p, qty: odd.qty });
      return;
    }
    commitMoves(entries, mode);
    setVals({}); setReasons({}); setConfirm(null);
    say(({ receipt: "נקלטה סחורה", usage: "נרשם שימוש", waste: "נרשם פחת" }[mode]) + " – " + entries.length + " מוצרים");
  };

  return (
    <>
      <div className="seg">
        <button className={mode === "receipt" ? "on" : ""} onClick={() => setMode("receipt")}>קבלה</button>
        <button className={mode === "usage" ? "on" : ""} onClick={() => setMode("usage")}>שימוש</button>
        <button className={mode === "waste" ? "on clay" : ""} onClick={() => setMode("waste")}>פחת</button>
      </div>

      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          {mode === "receipt" && "מה הגיע היום למחסן. אם זו אספקה מול הזמנה מאושרת – עדיף לעדכן דרך מסך הקניות."}
          {mode === "usage" && "רק מוצרים טריים. היבשים נספרים בשלישי ולא צריך לדווח עליהם."}
          {mode === "waste" && "חובה לציין סיבה לכל פריט. זה מה שמאפשר לזהות דפוסי בזבוז בסוף החודש."}
        </div>
      </div>

      {groups.map(([cat, items]) => (
        <div className="grp" key={cat}>
          <div className="grp-h"><span>{cat}</span><span>{items.length}</span></div>
          <div className="rows">
            {items.map((p) => {
              const v = vals[p.id] ?? "";
              const active = Number(v) > 0;
              return (
                <div key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <div className="row" style={{ borderBottom: "none" }}>
                    <div className="r-main">
                      <div className="r-name">{p.name}</div>
                      <div className="r-meta">
                        <span className="num">{nfmt(p.stock)} {UNITS[p.unit]} במלאי</span>
                        {p.stock < p.min && <span className="pill p-low">נמוך</span>}
                      </div>
                    </div>
                    <Stepper value={v} unit={p.unit} onChange={(x) => setVals((s) => ({ ...s, [p.id]: x }))} />
                  </div>
                  {mode === "waste" && active && (
                    <div className="reasons" style={{ padding: "0 13px 13px" }}>
                      {REASONS.map((r) => (
                        <button key={r} className={reasons[p.id] === r ? "on" : ""}
                          onClick={() => setReasons((s) => ({ ...s, [p.id]: r }))}>{r}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <MyTodayReports ctx={ctx} />

      <div style={{ height: 60 }} />
      <div className="sticky">
        <button className={"btn " + (mode === "waste" ? "btn-clay" : "btn-primary")}
          disabled={!entries.length || missingReason} onClick={doSave}>
          {!entries.length ? "לא הוזן כלום עדיין"
            : missingReason ? "חסרה סיבת פחת"
            : "שמור – " + entries.length + " מוצרים"}
        </button>
      </div>

      {confirm && (
        <div className="scrim" onClick={() => setConfirm(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-h"><h3>לוודא רגע</h3>
              <button onClick={() => setConfirm(null)}><I.x /></button></div>
            <div className="sheet-b">
              <div className="alert a-amber" style={{ marginBottom: 14 }}>
                <span style={{ marginTop: 1 }}><I.warn /></span>
                <div>
                  <div className="ttl">{nfmt(confirm.qty)} {UNITS[confirm.p.unit]} של {confirm.p.name}</div>
                  <div className="bd">זה הרבה מעל הכמות הרגילה. אם זה נכון – המשיכו.</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={doSave} style={{ marginBottom: 9 }}>נכון, לשמור</button>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>חזרה לתיקון</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Sef 6: lets a trainee review the reports they entered today and undo a mistaken one.
   Scope is deliberately "today" only — not editing history from days ago. Undo restores stock. */
function MyTodayReports({ ctx }) {
  const { st, undoMove, say, user } = ctx;
  const prod = (pid) => st.products.find((x) => x.id === pid);
  const mine = st.moves
    .filter((m) => sameDay(m.ts) && (m.type === "receipt" || m.type === "usage" || m.type === "waste"))
    .sort((a, b) => b.ts - a.ts);
  if (!mine.length) return null;
  const typeLabel = { receipt: "קבלה", usage: "שימוש", waste: "פחת" };
  return (
    <>
      <div className="sec-label">הדיווחים של היום</div>
      <div className="rows">
        {mine.map((m) => {
          const p = prod(m.pid);
          return (
            <div className="row" key={m.id}>
              <div className="r-main">
                <div className="r-name">{p ? p.name : "מוצר"} <span className="pill" style={{
                  background: m.type === "waste" ? "var(--clay-soft)" : "var(--bg)",
                  color: m.type === "waste" ? "var(--clay)" : "var(--muted)" }}>{typeLabel[m.type]}</span></div>
                <div className="r-meta num">{nfmt(m.qty)} {p ? UNITS[p.unit] : ""}{m.reason ? " • " + m.reason : ""} • {m.user}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
                onClick={() => { undoMove(m.id); say("הדיווח בוטל והמלאי הוחזר"); }}>
                בטל
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, margin: "8px 4px 0", lineHeight: 1.5 }}>
        אפשר לבטל דיווח שהוזן היום. ביטול מחזיר את המלאי למצב שלפני הדיווח.
      </div>
    </>
  );
}

function Stepper({ value, unit, onChange, wide }) {
  const s = stepOf(unit);
  const n = value === "" ? 0 : Number(value);
  const set = (x) => onChange(x <= 0 ? "" : String(Math.round(x * 100) / 100));
  return (
    <div className={"step" + (n > 0 ? " filled" : "")} style={wide ? { flex: 1 } : undefined}>
      <button onClick={() => set(n - s)} disabled={n <= 0}>−</button>
      <input type="number" inputMode="decimal" value={value} placeholder="0"
        style={wide ? { flex: 1, width: "auto" } : undefined}
        onChange={(e) => onChange(e.target.value)} />
      <button onClick={() => set(n + s)}>+</button>
    </div>
  );
}

/* ============================ COUNT ============================ */
function Count({ ctx }) {
  const { st, setSt, finishCount, say, setTab, isTue, isMgr } = ctx;
  const [draft, setDraft] = useState(() => st.countDraft || {});
  const [done, setDone] = useState(false);

  const list = [...st.products].filter((p) => !p.pending).sort((a, b) => a.order - b.order);
  const groups = CATS.map((c) => [c, list.filter((p) => p.cat === c)]).filter(([, a]) => a.length);

  const filled = list.filter((p) => draft[p.id] && draft[p.id].qty !== "" && draft[p.id].qty != null);
  const missingExp = filled.filter((p) => p.exp && !draft[p.id].exp);
  const pct = Math.round((filled.length / list.length) * 100);

  const upd = (pid, patch) => {
    const next = { ...draft, [pid]: { ...(draft[pid] || {}), ...patch } };
    setDraft(next);
    setSt((s) => ({ ...s, countDraft: next }));
  };

  const diffs = useMemo(() => filled.map((p) => ({
    p, counted: Number(draft[p.id].qty), diff: Math.round((Number(draft[p.id].qty) - p.stock) * 100) / 100,
  })).filter((d) => Math.abs(d.diff) > 0.01).sort((a, b) =>
    Math.abs(b.diff * b.p.price) - Math.abs(a.diff * a.p.price)), [draft, filled]);

  if (done) {
    const soon = filled.filter((p) => draft[p.id].exp === "soon");
    const loss = diffs.filter((d) => d.diff < 0).reduce((a, d) => a + Math.abs(d.diff) * d.p.price, 0);
    return (
      <>
        <div className="alert a-ok" style={{ marginBottom: 14 }}>
          <span style={{ marginTop: 1 }}><I.check /></span>
          <div><div className="ttl">הספירה נשמרה</div>
            <div className="bd">המלאי עודכן לפי מה שנספר בפועל.</div></div>
        </div>
        <div className="stats" style={{ marginBottom: 16 }}>
          {isMgr ? (
            <div className="stat clay"><div className="k">פער לא מדווח</div><div className="v">{shek(loss)}</div>
              <div className="n">חוסר מול הרישום</div></div>
          ) : (
            <div className="stat clay"><div className="k">פערים מול הרישום</div>
              <div className="v">{diffs.length}</div><div className="n">מוצרים עם פער</div></div>
          )}
          <div className="stat"><div className="k">לשימוש מיידי</div><div className="v">{soon.length}</div>
            <div className="n">פחות מ‑3 ימים</div></div>
        </div>
        {diffs.length > 0 && (<>
          <div className="sec-label">הפערים הגדולים</div>
          <div className="card" style={{ marginBottom: 16 }}>
            {diffs.slice(0, 6).map((d) => (
              <div className="bar" key={d.p.id}>
                <span className="bn">{d.p.name}</span>
                <span className="bv num" style={{ color: d.diff < 0 ? "var(--clay)" : "var(--ok)", flex: 1, textAlign: "left" }}>
                  {d.diff > 0 ? "+" : ""}{nfmt(d.diff)} {UNITS[d.p.unit]}
                </span>
                {isMgr && <span className="bv num" style={{ color: "var(--muted)" }}>{shek(Math.abs(d.diff) * d.p.price)}</span>}
              </div>
            ))}
          </div>
        </>)}
        <button className="btn btn-primary" onClick={() => setTab("shop")}>המשך לרשימת קניות</button>
      </>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, fontSize: 15.5 }}>ספירה שבועית</span>
          <span className="num" style={{ fontWeight: 800, color: "var(--accent)" }}>{filled.length}/{list.length}</span>
        </div>
        <div className="prog"><i style={{ width: pct + "%" }} /></div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 9, fontWeight: 600, lineHeight: 1.5 }}>
          {isTue ? "ספירה מלאה, לפי סדר המדפים. " : "לא שלישי, אבל אפשר לספור. "}
          מה שמוזן נשמר תוך כדי – אפשר לעצור ולחזור.
        </div>
      </div>

      {groups.map(([cat, items]) => (
        <div className="grp" key={cat}>
          <div className="grp-h">
            <span>{cat}</span>
            <span>{items.filter((p) => draft[p.id] && draft[p.id].qty !== "").length}/{items.length}</span>
          </div>
          <div className="rows">
            {items.map((p) => {
              const d = draft[p.id] || {};
              const has = d.qty !== "" && d.qty != null;
              return (
                <div className={"crow" + (has ? " done" : "")} key={p.id}>
                  <div className="crow-top">
                    <div className="r-main">
                      <div className="r-name">{p.name}</div>
                      <div className="r-meta">
                        <span className="num">רשום: {nfmt(p.stock)} {UNITS[p.unit]}</span>
                        {has && Math.abs(Number(d.qty) - p.stock) > 0.01 && (
                          <span className="pill" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                            {Number(d.qty) - p.stock > 0 ? "+" : ""}{nfmt(Number(d.qty) - p.stock)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Stepper value={d.qty ?? ""} unit={p.unit} onChange={(x) => upd(p.id, { qty: x })} />
                  </div>
                  {p.exp && has && (
                    <div className="exp">
                      <button className={d.exp === "ok" ? "on-ok" : ""} onClick={() => upd(p.id, { exp: "ok" })}>
                        מעל 3 ימים
                      </button>
                      <button className={d.exp === "soon" ? "on-soon" : ""} onClick={() => upd(p.id, { exp: "soon" })}>
                        פחות מ‑3 ימים
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ height: 60 }} />
      <div className="sticky">
        <button className="btn btn-primary" disabled={!filled.length || missingExp.length > 0}
          onClick={() => { finishCount(draft); setDone(true); }}>
          {!filled.length ? "עדיין לא נספר כלום"
            : missingExp.length ? "חסר סימון תוקף ב‑" + missingExp.length + " מוצרים"
            : "סיים ספירה – " + filled.length + " מוצרים"}
        </button>
      </div>
    </>
  );
}

/* ============================ SHOP ============================ */
function Shop({ ctx }) {
  const { st, makeList, patchList, isMgr, user, say, setModal } = ctx;
  const [sup, setSup] = useState("super");
  const [open, setOpen] = useState(null);

  const lists = st.lists.filter((l) => l.sup === sup);
  const active = lists.find((l) => l.status !== "purchased" && l.status !== "missed");

  if (open) {
    const l = st.lists.find((x) => x.id === open);
    if (l) return <ListDetail ctx={ctx} list={l} back={() => setOpen(null)} />;
  }

  return (
    <>
      <div className="seg">
        <button className={sup === "super" ? "on" : ""} onClick={() => setSup("super")}>סופר</button>
        <button className={sup === "wholesale" ? "on" : ""} onClick={() => setSup("wholesale")}>סיטונאי</button>
      </div>

      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          {sup === "super"
            ? "מוצרים שיורדים מתחת למינימום נכנסים לרשימה אוטומטית. בשלישי סוקרים, משלימים ידנית ושולחים לאישור."
            : "הזמנה אחת לחודשיים. מוצרים בחוסר נכנסים אוטומטית – שווה לוודא שהכמויות מספיקות לכל התקופה."}
        </div>
      </div>

      {!active && (
        <div className="card"><div className="empty" style={{ padding: "28px 12px" }}>
          <div className="e1">אין רשימה פתוחה כרגע</div>
          <div className="e2">כשמוצר יורד מתחת למינימום הוא ייכנס לכאן אוטומטית.
            אפשר גם לפתוח רשימה ריקה ולהוסיף ידנית.</div>
          <button className="btn btn-ghost" style={{ marginTop: 16 }}
            onClick={() => { const id = makeList(sup); if (id) setOpen(id); }}>
            <I.plus /> פתח רשימה ריקה
          </button>
        </div></div>
      )}

      {active && (
        <>
          <div className="sec-label">רשימה פעילה</div>
          <button className="card" style={{ width: "100%", textAlign: "right", marginBottom: 6 }} onClick={() => setOpen(active.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{active.items.length} מוצרים</div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{statusText(active)}</div>
                <div style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 600, marginTop: 2 }}>
                  {active.createdBy === "אוטומטי" ? "נאספה אוטומטית מחוסרים" : "נוצרה על ידי " + active.createdBy}
                </div>
              </div>
              <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
            </div>
          </button>
        </>
      )}

      {lists.filter((l) => l.status === "purchased" || l.status === "missed").length > 0 && (
        <>
          <div className="sec-label">היסטוריה</div>
          <div className="rows">
            {lists.filter((l) => l.status === "purchased" || l.status === "missed").slice(0, 8).map((l) => (
              <button className="row" key={l.id} style={{ width: "100%", textAlign: "right" }} onClick={() => setOpen(l.id)}>
                <div className="r-main">
                  <div className="r-name">{new Date(l.createdAt).toLocaleDateString("he-IL")}</div>
                  <div className="r-meta">{l.items.length} מוצרים • {statusText(l)}</div>
                </div>
                <span className={"pill " + (l.status === "purchased" ? "p-ok" : "p-low")}>
                  {l.status === "purchased" ? "נקנתה" : "התפספסה"}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ListDetail({ ctx, list, back }) {
  const { st, patchList, isMgr, user, say, receiveList, setModal } = ctx;
  const [receiving, setReceiving] = useState(false);
  const [got, setGot] = useState(() => {
    const o = {}; list.items.forEach((it) => (o[it.pid] = String(it.qty))); return o;
  });

  const prod = (pid) => st.products.find((p) => p.id === pid);
  const total = list.items.reduce((a, it) => { const p = prod(it.pid); return a + it.qty * (p ? p.price : 0); }, 0);
  const editable = list.status === "draft";

  const setQty = (pid, q) =>
    patchList(list.id, { items: list.items.map((it) => (it.pid === pid ? { ...it, qty: Number(q) || 0 } : it)) });
  const remove = (pid) => patchList(list.id, { items: list.items.filter((it) => it.pid !== pid) });

  if (receiving) {
    const diffs = list.items.filter((it) => Number(got[it.pid]) !== it.qty);
    return (
      <>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setReceiving(false)}>
          <I.chev /> חזרה
        </button>
        <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
            כמה באמת הגיע? ברירת המחדל היא מה שהוזמן – תקנו רק את מה ששונה.
          </div>
        </div>
        <div className="rows" style={{ marginBottom: 14 }}>
          {list.items.map((it) => {
            const p = prod(it.pid); if (!p) return null;
            const diff = Number(got[it.pid] ?? it.qty) - it.qty;
            return (
              <div className="row" key={it.pid}>
                <div className="r-main">
                  <div className="r-name">{p.name}</div>
                  <div className="r-meta num">
                    הוזמן {nfmt(it.qty)} {UNITS[p.unit]}
                    {Math.abs(diff) > 0.01 && (
                      <span className="pill p-low">{diff > 0 ? "+" : ""}{nfmt(diff)}</span>
                    )}
                  </div>
                </div>
                <Stepper value={got[it.pid] ?? String(it.qty)} unit={p.unit}
                  onChange={(x) => setGot((s) => ({ ...s, [it.pid]: x }))} />
              </div>
            );
          })}
        </div>
        {diffs.length > 0 && (
          <div className="alert a-amber">
            <span style={{ marginTop: 1 }}><I.warn /></span>
            <div><div className="ttl">{diffs.length} פערים מול ההזמנה</div>
              <div className="bd">שווה לתעד מול הספק – זה מקור מרכזי לחוסרים בהמשך השבוע.</div></div>
          </div>
        )}
        <button className="btn btn-ok" onClick={() => { receiveList(list, got); back(); }}>
          קלוט למלאי וסגור רשימה
        </button>
      </>
    );
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={back}><I.chev /> חזרה</button>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{SUPPLIERS[list.sup]}</span>
          {isMgr
            ? <span className="num" style={{ fontWeight: 900, fontSize: 20 }}>{shek(total)}</span>
            : <span className="num" style={{ fontWeight: 900, fontSize: 20, color: "var(--muted)" }}>{list.items.length} מוצרים</span>}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>
          {statusText(list)} • {list.createdBy}
        </div>
        {list.approvedBy && (
          <div style={{ fontSize: 12.5, color: "var(--ok)", fontWeight: 700, marginTop: 3 }}>
            אושרה על ידי {list.approvedBy}
          </div>
        )}
      </div>

      <div className="rows" style={{ marginBottom: 14 }}>
        {list.items.map((it) => {
          const p = prod(it.pid); if (!p) return null;
          return (
            <div className="row" key={it.pid}>
              <div className="r-main">
                <div className="r-name">{p.name}</div>
                <div className="r-meta num">יש {nfmt(p.stock)} • יעד {nfmt(p.target)} {UNITS[p.unit]}{isMgr ? " • " + shek(it.qty * p.price) : ""}</div>
              </div>
              {editable
                ? <Stepper value={String(it.qty)} unit={p.unit} onChange={(x) => setQty(it.pid, x)} />
                : <div className="num" style={{ fontWeight: 900, fontSize: 17 }}>{nfmt(it.qty)} <span style={{ fontSize: 12, color: "var(--muted)" }}>{UNITS[p.unit]}</span></div>}
              {editable && <button onClick={() => remove(it.pid)} style={{ color: "var(--faint)", padding: 4 }}><I.x /></button>}
            </div>
          );
        })}
        {!list.items.length && <div className="empty"><div className="e1">הרשימה ריקה</div></div>}
      </div>

      {editable && (
        <button className="btn btn-ghost" style={{ marginBottom: 10 }}
          onClick={() => setModal({ t: "addItem", listId: list.id })}>
          <I.plus /> הוסף מוצר לרשימה
        </button>
      )}

      {list.status === "draft" && (isMgr ? (
        <button className="btn btn-ok" disabled={!list.items.length}
          onClick={() => { patchList(list.id, { status: "approved", approvedBy: user.name, approvedAt: Date.now() }); say("אושר – אפשר לצאת לקנות"); }}>
          אשר רשימה
        </button>
      ) : (
        <button className="btn btn-primary" disabled={!list.items.length}
          onClick={() => { patchList(list.id, { status: "pending" }); say("נשלחה לאישור המנהל"); }}>
          שלח לאישור מנהל
        </button>
      ))}

      {list.status === "pending" && (isMgr ? (
        <>
          <button className="btn btn-ok" style={{ marginBottom: 9 }}
            onClick={() => { patchList(list.id, { status: "approved", approvedBy: user.name, approvedAt: Date.now() }); say("אושר – אפשר לצאת לקנות"); }}>
            אשר רשימה
          </button>
          <button className="btn btn-ghost" onClick={() => { patchList(list.id, { status: "draft" }); say("הוחזרה לתיקון"); }}>
            החזר לתיקון
          </button>
        </>
      ) : (
        <>
          <div className="alert a-amber" style={{ marginBottom: 10 }}><span style={{ marginTop: 1 }}><I.clock /></span>
            <div><div className="ttl">ממתינה לאישור</div>
              <div className="bd">אפשר לצאת לקנות רק אחרי אישור סגן או מנהל המכינה. עדיין אפשר לתקן עד שתאושר.</div></div></div>
          <button className="btn btn-ghost"
            onClick={() => { patchList(list.id, { status: "draft" }); say("הרשימה נפתחה לעריכה – התיקון יחליף את מה שנשלח"); }}>
            <I.edit /> ערוך את הרשימה
          </button>
        </>
      ))}

      {list.status === "approved" && (
        <>
          <button className="btn btn-primary" style={{ marginBottom: 9 }} onClick={() => setReceiving(true)}>
            הסחורה הגיעה – עדכן קבלה
          </button>
          <button className="btn btn-ghost"
            onClick={() => { ctx.patchList(list.id, { status: "missed" }); say("סומן שהקנייה התפספסה"); back(); }}>
            הקנייה התפספסה
          </button>
        </>
      )}
    </>
  );
}

/* ============================ MANAGE ============================ */
function Manage({ ctx }) {
  const [sub, setSub] = useState("dash");
  const tabs = [["dash", "קניות"], ["report", "דוח תקופתי"], ["catalog", "קטלוג"], ["stock", "תיקון מלאי"], ["team", "תורנויות"]];
  return (
    <>
      <div className="seg seg-scroll">
        {tabs.map(([k, label]) => (
          <button key={k} className={sub === k ? "on" : ""} onClick={() => setSub(k)}>{label}</button>
        ))}
      </div>
      {sub === "dash" && <PurchaseDash ctx={ctx} />}
      {sub === "report" && <Report ctx={ctx} />}
      {sub === "catalog" && <Catalog ctx={ctx} />}
      {sub === "stock" && <StockFix ctx={ctx} />}
      {sub === "team" && <Team ctx={ctx} />}
    </>
  );
}

/* Manager access to stock actions — kept out of the main nav for a clean day-to-day view,
   but available here so a manager can correct a mistaken count or receipt when needed. */
function StockFix({ ctx }) {
  const [mode, setMode] = useState(null);
  if (mode === "daily") return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setMode(null)}><I.chev /> חזרה לניהול</button>
      <Daily ctx={ctx} />
    </>
  );
  if (mode === "count") return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setMode(null)}><I.chev /> חזרה לניהול</button>
      <Count ctx={ctx} />
    </>
  );
  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          התורנים מבצעים את העדכונים היומיים והספירה. כאן אפשר להיכנס במקרה שצריך לתקן טעות – למשל ספירה שגויה או קבלה שלא נרשמה נכון.
        </div>
      </div>
      <div className="rows">
        <button className="row" style={{ width: "100%", textAlign: "right" }} onClick={() => setMode("daily")}>
          <span style={{ color: "var(--accent)", flex: "0 0 auto" }}><I.day /></span>
          <div className="r-main">
            <div className="r-name">קבלה / שימוש / פחת</div>
            <div className="r-meta">תיקון עדכון יומי</div>
          </div>
          <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
        </button>
        <button className="row" style={{ width: "100%", textAlign: "right" }} onClick={() => setMode("count")}>
          <span style={{ color: "var(--accent)", flex: "0 0 auto" }}><I.count /></span>
          <div className="r-main">
            <div className="r-name">ספירת מלאי / תיקון כמויות</div>
            <div className="r-meta">עדכון המלאי הרשום לפי הנספר בפועל</div>
          </div>
          <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
        </button>
      </div>
    </>
  );
}

/* Purchasing status since start of month. Entry point is APPROVAL:
   a list enters the dashboard the moment a manager approves it (planning + cost),
   independent of whether the goods have physically arrived yet (which updates stock separately). */
function PurchaseDash({ ctx }) {
  const { st } = ctx;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prod = (pid) => st.products.find((x) => x.id === pid);

  // approved this month = any list a manager approved since the 1st, including ones already received
  const approvedLists = st.lists.filter((l) => l.approvedAt && new Date(l.approvedAt) >= monthStart);
  const pulses = approvedLists.length;
  const superPulses = approvedLists.filter((l) => l.sup === "super").length;
  const wholePulses = approvedLists.filter((l) => l.sup === "wholesale").length;

  // cost is the ordered/approved value — what the manager committed to, by standard prices
  const lineValue = (l) => l.items.reduce((a, it) => { const p = prod(it.pid); return a + it.qty * (p ? p.price : 0); }, 0);
  const totalCost = approvedLists.reduce((a, l) => a + lineValue(l), 0);
  const totalItems = approvedLists.reduce((a, l) => a + l.items.length, 0);

  const pending = st.lists.filter((l) => l.status === "pending").length;
  const awaitingReceipt = st.lists.filter((l) => l.status === "approved").length;
  const missed = st.lists.filter((l) => l.status === "missed" && l.createdAt && new Date(l.createdAt) >= monthStart).length;

  const mName = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][now.getMonth()];

  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          סטטוס הקניות מתחילת {mName}. כל רשימה שאושרה נכנסת לכאן. העלות היא לפי מה שאושר; המלאי בפועל מתעדכן בקבלת הסחורה.
        </div>
      </div>

      <div className="stats" style={{ marginBottom: 10 }}>
        <div className="stat"><div className="k">פעימות קנייה</div><div className="v">{pulses}</div>
          <div className="n">{superPulses} סופר • {wholePulses} סיטונאי</div></div>
        <div className="stat"><div className="k">עלות מאושרת</div><div className="v">{shek(totalCost)}</div>
          <div className="n">לפי מחירי תקן</div></div>
        <div className="stat"><div className="k">שורות שאושרו</div><div className="v">{totalItems}</div>
          <div className="n">סך פריטים</div></div>
        <div className="stat clay"><div className="k">קניות שהתפספסו</div><div className="v">{missed}</div>
          <div className="n">החודש</div></div>
      </div>

      {(pending > 0 || awaitingReceipt > 0) && (
        <>
          <div className="sec-label">בתהליך כרגע</div>
          <div className="rows" style={{ marginBottom: 14 }}>
            {pending > 0 && (
              <div className="row">
                <div className="r-main"><div className="r-name">ממתינות לאישור</div>
                  <div className="r-meta">דורש אישור סגן או מנהל</div></div>
                <span className="pill p-new">{pending}</span>
              </div>
            )}
            {awaitingReceipt > 0 && (
              <div className="row">
                <div className="r-main"><div className="r-name">אושרו – ממתינות לקבלת סחורה</div>
                  <div className="r-meta">המלאי יתעדכן כשהחניך יסמן מה הגיע</div></div>
                <span className="pill p-ok">{awaitingReceipt}</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="sec-label">רשימות שאושרו החודש</div>
      {approvedLists.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: "24px 8px" }}>
          <div className="e1">עדיין לא אושרה אף רשימה החודש</div>
          <div className="e2">כל רשימה שהמנהל יאשר תופיע כאן עם התאריך והעלות המאושרת.</div></div></div>
      ) : (
        <div className="rows">
          {approvedLists.map((l) => (
            <div className="row" key={l.id}>
              <div className="r-main">
                <div className="r-name">{SUPPLIERS[l.sup]}
                  {l.status === "purchased" && <span className="pill p-ok" style={{ marginRight: 6 }}>נקלטה</span>}
                  {l.status === "approved" && <span className="pill p-new" style={{ marginRight: 6 }}>ממתינה לסחורה</span>}
                </div>
                <div className="r-meta num">
                  {new Date(l.approvedAt).toLocaleDateString("he-IL")} • {l.items.length} שורות • אישר {l.approvedBy || "—"}
                </div>
              </div>
              <span className="num" style={{ fontWeight: 800 }}>{shek(lineValue(l))}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Catalog({ ctx }) {
  const { st, setModal, isMgr, setSt, say } = ctx;
  const [q, setQ] = useState("");
  const pending = st.products.filter((p) => p.pending);
  const shown = st.products.filter((p) => !p.pending && (!q || normHe(p.name).includes(normHe(q))))
    .sort((a, b) => a.order - b.order);
  const groups = CATS.map((c) => [c, shown.filter((p) => p.cat === c)]).filter(([, a]) => a.length);

  return (
    <>
      <input className="search" placeholder="חיפוש מוצר…" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setModal({ t: "product", p: null })}>
        <I.plus /> מוצר חדש
      </button>

      {pending.length > 0 && (
        <>
          <div className="sec-label">ממתינים לאישור</div>
          <div className="rows" style={{ marginBottom: 14 }}>
            {pending.map((p) => (
              <div className="row hot" key={p.id}>
                <div className="r-main">
                  <div className="r-name">{p.name} <span className="pill p-new">חדש</span></div>
                  <div className="r-meta">{p.cat} • {UNITS[p.unit]}</div>
                </div>
                {isMgr ? (
                  <button className="btn btn-ok btn-sm"
                    onClick={() => { setSt((s) => ({ ...s, products: s.products.map((x) => x.id === p.id ? { ...x, pending: false } : x) })); say("אושר לקטלוג"); }}>
                    אשר
                  </button>
                ) : <span className="pill p-new">ממתין</span>}
                <button style={{ color: "var(--faint)", padding: 4 }} onClick={() => setModal({ t: "product", p })}>
                  <I.chev style={{ transform: "scaleX(-1)" }} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {groups.map(([cat, items]) => (
        <div className="grp" key={cat}>
          <div className="grp-h"><span>{cat}</span><span>{items.length}</span></div>
          <div className="rows">
            {items.map((p) => (
              <button className="row" key={p.id} style={{ width: "100%", textAlign: "right" }}
                onClick={() => setModal({ t: "product", p })}>
                <div className="r-main">
                  <div className="r-name">{p.name}</div>
                  <div className="r-meta num">
                    {nfmt(p.stock)} {UNITS[p.unit]} • מינ׳ {nfmt(p.min)} • יעד {nfmt(p.target)}
                    {p.stock < p.min && <span className="pill p-low">נמוך</span>}
                  </div>
                </div>
                <span className="pill" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                  {p.tracking === "daily" ? "יומי" : "שבועי"}
                </span>
                <span className="chev"><I.chev /></span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Report({ ctx }) {
  const { st } = ctx;
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return d; });
  const [mi, setMi] = useState(0);
  const m = months[mi];

  const inMonth = st.moves.filter((x) => { const d = new Date(x.ts); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); });
  const price = (pid) => { const p = st.products.find((x) => x.id === pid); return p ? p.price : 0; };
  const pname = (pid) => { const p = st.products.find((x) => x.id === pid); return p ? p.name : "–"; };

  const sum = (t) => inMonth.filter((x) => x.type === t).reduce((a, x) => a + Math.abs(x.qty) * price(x.pid), 0);
  const buy = sum("receipt"), use = sum("usage"), waste = sum("waste");
  const shrink = inMonth.filter((x) => x.type === "count" && x.qty < 0).reduce((a, x) => a + Math.abs(x.qty) * price(x.pid), 0);
  const wasteRate = use + waste > 0 ? (waste / (use + waste)) * 100 : 0;

  const byReason = REASONS.map((r) => ({
    r, v: inMonth.filter((x) => x.type === "waste" && x.reason === r).reduce((a, x) => a + x.qty * price(x.pid), 0),
  })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);

  const byProduct = Object.values(inMonth.filter((x) => x.type === "waste").reduce((acc, x) => {
    acc[x.pid] = acc[x.pid] || { pid: x.pid, v: 0, q: 0 };
    acc[x.pid].v += x.qty * price(x.pid); acc[x.pid].q += x.qty; return acc;
  }, {})).sort((a, b) => b.v - a.v).slice(0, 5);

  const maxR = Math.max(1, ...byReason.map((x) => x.v));
  const maxP = Math.max(1, ...byProduct.map((x) => x.v));

  const MON = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const label = MON[m.getMonth()] + " " + m.getFullYear();

  /* Weekly task-compliance board — one status per day for the selected month's current week.
     A day is "done" if every task DUE that day was completed, "missed" if a past day left one
     undone, and "future" if the day hasn't arrived yet. */
  const ws = weekStart();
  const todayKeyStr = dkey();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const dk = dkey(d);
    const isFuture = dk > todayKeyStr;
    const isToday = dk === todayKeyStr;
    const dayMoves = st.moves.filter((x) => dkey(x.ts) === dk);
    const gotReceipt = dayMoves.some((x) => x.type === "receipt");
    const gotDailyCount = dayMoves.some((x) => x.type === "usage" || x.type === "waste");
    const gotWeeklyCount = dayMoves.some((x) => x.type === "count");
    const gotApproval = st.lists.some((l) => l.approvedAt && dkey(l.approvedAt) === dk);
    // tasks due this day
    const due = [];
    due.push(gotReceipt);       // receipt — every day
    due.push(gotDailyCount);    // daily count — every day
    if (d.getDay() === 2) due.push(gotWeeklyCount);  // weekly count — Tuesday
    if (d.getDay() === 3) due.push(gotApproval);     // shopping approval — Wednesday
    const allDone = due.every(Boolean);
    const dutyId = st.duty[d.getDay()];
    const duty = st.users.find((u) => u.id === dutyId);
    return { d, dk, isFuture, isToday, allDone,
      status: isFuture ? "future" : (allDone ? "done" : "missed"),
      dutyName: duty ? duty.name : "—" };
  });

  const exportExcel = () => {
    const rows = [
      ["דוח תקופתי – מטבח המכינה", label],
      [],
      ["סיכום", "₪"],
      ["נקנה", Math.round(buy)],
      ["נצרך (שימוש)", Math.round(use)],
      ["פחת", Math.round(waste)],
      ["פער ספירה (חוסר לא מדווח)", Math.round(shrink)],
      ["אחוז פחת מהצריכה", wasteRate.toFixed(1) + "%"],
      [],
      ["פחת לפי סיבה", "₪"],
      ...byReason.map((x) => [x.r, Math.round(x.v)]),
      [],
      ["ביצוע משימות – השבוע", "", ""],
      ["יום", "תורן", "סטטוס"],
      ...week.map((w) => [
        DAYS[w.d.getDay()] + " " + w.d.getDate() + "/" + (w.d.getMonth() + 1),
        w.dutyName,
        w.status === "future" ? "טרם" : (w.status === "done" ? "בוצע" : "לא בוצע"),
      ]),
      [],
      ["פירוט תנועות", "", "", "", ""],
      ["תאריך", "סוג", "מוצר", "כמות", "סיבת פחת"],
      ...inMonth.map((x) => [
        new Date(x.ts).toLocaleDateString("he-IL"),
        ({ receipt: "קבלה", usage: "שימוש", waste: "פחת", count: "ספירה" }[x.type] || x.type),
        pname(x.pid), Math.abs(x.qty), x.reason || "",
      ]),
    ];
    const fname = "דוח-מטבח-" + label.replace(" ", "-");
    const XLSX = window.XLSX;
    if (XLSX) {
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "דוח");
      XLSX.writeFile(wb, fname + ".xlsx");
    } else {
      const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = fname + ".csv"; a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          סיכום ההתנהלות בתקופה הנבחרת. אפשר להוריד כקובץ להפצה בהנהלה.
        </div>
      </div>

      <div className="fld">
        <label>תקופה</label>
        <select value={mi} onChange={(e) => setMi(Number(e.target.value))}>
          {months.map((d, i) => (
            <option key={i} value={i}>{MON[d.getMonth()]} {d.getFullYear()}</option>
          ))}
        </select>
      </div>

      <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={exportExcel}>
        <I.download /> הורד דוח כקובץ אקסל
      </button>

      <div className="sec-label">ביצוע משימות – השבוע</div>
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="wk">
          {week.map((w) => (
            <div className={"wk-day" + (w.isToday ? " is-today" : "")} key={w.dk}>
              <div className="dn">{DAYS[w.d.getDay()].slice(0, 3)}</div>
              <div className="dd">{w.d.getDate()}/{w.d.getMonth() + 1}</div>
              {w.status === "future"
                ? <div className="wk-mark fut" />
                : <div className={"wk-mark " + (w.status === "done" ? "done" : "miss")}>
                    <span style={{ color: "#fff" }}>{w.status === "done" ? <I.check /> : <I.x width="15" height="15" />}</span>
                  </div>}
              <div className="who2">{w.dutyName.split(" ")[0]}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, margin: "0 4px 18px", lineHeight: 1.5 }}>
        ✓ כל המשימות של היום בוצעו &nbsp;•&nbsp; ✗ יום עם משימה שלא בוצעה &nbsp;•&nbsp; פס אפור – יום שטרם הגיע
      </div>

      {inMonth.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="e1">אין עדיין תנועות בחודש הזה</div>
          <div className="e2">הדוח מתמלא מעצמו מהעדכונים היומיים ומהספירות.</div></div></div>
      ) : (<>
        <div className="stats" style={{ marginBottom: 10 }}>
          <div className="stat"><div className="k">נקנה</div><div className="v">{shek(buy)}</div><div className="n">קבלות סחורה</div></div>
          <div className="stat ok"><div className="k">נצרך</div><div className="v">{shek(use)}</div><div className="n">שימוש מדווח</div></div>
          <div className="stat clay"><div className="k">פחת</div><div className="v">{shek(waste)}</div>
            <div className="n">{wasteRate.toFixed(1)}% מהצריכה</div></div>
          <div className="stat clay"><div className="k">פער ספירה</div><div className="v">{shek(shrink)}</div>
            <div className="n">חוסר לא מדווח</div></div>
        </div>

        {byReason.length > 0 && (<>
          <div className="sec-label">פחת לפי סיבה</div>
          <div className="card" style={{ marginBottom: 6 }}>
            {byReason.map((x) => (
              <div className="bar" key={x.r}>
                <span className="bn">{x.r}</span>
                <span className="bt"><i style={{ width: (x.v / maxR) * 100 + "%" }} /></span>
                <span className="bv">{shek(x.v)}</span>
              </div>
            ))}
          </div>
        </>)}

        {byProduct.length > 0 && (<>
          <div className="sec-label">חמשת המוצרים הבזבזניים</div>
          <div className="card">
            {byProduct.map((x) => (
              <div className="bar" key={x.pid}>
                <span className="bn">{pname(x.pid)}</span>
                <span className="bt"><i style={{ width: (x.v / maxP) * 100 + "%" }} /></span>
                <span className="bv">{shek(x.v)}</span>
              </div>
            ))}
          </div>
        </>)}
      </>)}
    </>
  );
}

function Team({ ctx }) {
  const { st, setSt, isMgr, say } = ctx;
  const trainees = st.users.filter((u) => u.role === "trainee");
  return (
    <>
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
          {isMgr ? "סגן המנהל מעדכן כאן את התורנים לתקופה. רק התורן של אותו יום מקבל את המשימות." 
                 : "רק סגן או מנהל המכינה יכולים לשנות את התורנויות."}
        </div>
      </div>
      <div className="rows" style={{ marginBottom: 16 }}>
        {DAYS.map((d, i) => (
          <div className="row" key={i}>
            <div className="r-main"><div className="r-name">יום {d}</div></div>
            <select disabled={!isMgr} value={st.duty[i] || ""}
              onChange={(e) => { setSt((s) => ({ ...s, duty: { ...s.duty, [i]: e.target.value } })); say("התורנות עודכנה"); }}
              style={{ minHeight: 44, borderRadius: 10, border: "1px solid var(--line2)", padding: "0 10px",
                background: "var(--surface)", fontWeight: 700, fontSize: 14 }}>
              <option value="">–</option>
              {trainees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="sec-label">משתמשים</div>
      <div className="rows">
        {st.users.map((u) => (
          <div className="row" key={u.id}>
            <div className="r-main">
              <div className="r-name">{u.name}</div>
              <div className="r-meta">{u.title || "חניך"}</div>
            </div>
            <span className={"pill " + (u.role === "manager" ? "p-ok" : "")}
              style={u.role !== "manager" ? { background: "var(--bg)", color: "var(--muted)" } : undefined}>
              {u.role === "manager" ? "מנהל" : "חניך"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================ MODALS ============================ */
function Modal({ ctx, modal, close, me, setMe }) {
  if (modal.t === "user") return <UserModal ctx={ctx} close={close} me={me} setMe={setMe} />;
  if (modal.t === "product") return <ProductModal ctx={ctx} close={close} p={modal.p} />;
  if (modal.t === "addItem") return <AddItemModal ctx={ctx} close={close} listId={modal.listId} />;
  if (modal.t === "newProduct") return <NewProductModal ctx={ctx} close={close} listId={modal.listId} sup={modal.sup} name0={modal.name0} />;
  return null;
}

function UserModal({ ctx, close, me, setMe }) {
  const { st } = ctx;
  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>מי משתמש עכשיו</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <div className="sec-label" style={{ marginTop: 0 }}>חניכים</div>
          <div className="rows" style={{ marginBottom: 14 }}>
            {st.users.filter((u) => u.role === "trainee").map((u) => (
              <button className="row" key={u.id} style={{ width: "100%", textAlign: "right" }}
                onClick={() => { setMe(u.id); close(); }}>
                <div className="r-main"><div className="r-name">{u.name}</div></div>
                {me === u.id && <span style={{ color: "var(--ok)" }}><I.check /></span>}
              </button>
            ))}
          </div>
          <div className="sec-label">הנהלה</div>
          <div className="rows">
            {st.users.filter((u) => u.role === "manager").map((u) => (
              <button className="row" key={u.id} style={{ width: "100%", textAlign: "right" }}
                onClick={() => { setMe(u.id); close(); }}>
                <div className="r-main"><div className="r-name">{u.name}</div><div className="r-meta">{u.title}</div></div>
                {me === u.id && <span style={{ color: "var(--ok)" }}><I.check /></span>}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 14, fontWeight: 600, lineHeight: 1.5 }}>
            בפרוטוטייפ בוחרים משתמש ידנית. בגרסה האמיתית תהיה התחברות אישית לכל חניך.
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ ctx, close, p }) {
  const { st, upsertProduct, say, isMgr, setSt } = ctx;
  const isNew = !p;
  const [f, setF] = useState(() => p ? { ...p } : {
    id: "p" + uid(), name: "", cat: CATS[0], unit: "kg", tracking: "weekly", exp: 0,
    min: 0, target: 0, sup: "super", price: 0, stock: 0, order: 999, expiryFlag: null, pending: !isMgr,
  });
  const sims = useMemo(() => (f.name.length >= 2 ? findSimilar(f.name, st.products, f.id) : []), [f.name, st.products, f.id]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>{isNew ? "מוצר חדש" : f.name}</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <div className="fld">
            <label>שם המוצר</label>
            <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="לדוגמה: עגבניות שרי" />
          </div>

          {isNew && sims.length > 0 && (
            <div className="alert a-amber" style={{ marginBottom: 14 }}>
              <span style={{ marginTop: 1 }}><I.warn /></span>
              <div style={{ flex: 1 }}>
                <div className="ttl">כבר קיים משהו דומה</div>
                <div className="bd">אולי אחד מאלה הוא אותו מוצר. עדיף להשתמש בקיים.</div>
                <div className="chips">{sims.map((s) => <span className="chip" key={s.p.id}>{s.p.name}</span>)}</div>
              </div>
            </div>
          )}

          <div className="fld">
            <label>קטגוריה</label>
            <select value={f.cat} onChange={(e) => set("cat", e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="fld">
            <label>יחידת מדידה</label>
            <div className="pick">
              {Object.entries(UNITS).map(([k, v]) => (
                <button key={k} className={f.unit === k ? "on" : ""} onClick={() => set("unit", k)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <label>מעקב</label>
            <div className="pick">
              <button className={f.tracking === "daily" ? "on" : ""} onClick={() => set("tracking", "daily")}>יומי – טרי</button>
              <button className={f.tracking === "weekly" ? "on" : ""} onClick={() => set("tracking", "weekly")}>שבועי – יבש</button>
            </div>
          </div>

          <div className="fld">
            <label>תוקף</label>
            <div className="pick">
              <button className={f.exp ? "on" : ""} onClick={() => set("exp", 1)}>לעקוב אחרי תוקף</button>
              <button className={!f.exp ? "on" : ""} onClick={() => set("exp", 0)}>לא רלוונטי</button>
            </div>
          </div>

          <div className="fld">
            <label>ספק</label>
            <div className="pick">
              <button className={f.sup === "super" ? "on" : ""} onClick={() => set("sup", "super")}>סופר</button>
              <button className={f.sup === "wholesale" ? "on" : ""} onClick={() => set("sup", "wholesale")}>סיטונאי</button>
            </div>
          </div>

          <div className="three">
            <div className="fld"><label>מינימום</label>
              <input type="number" inputMode="decimal" value={f.min} onChange={(e) => set("min", Number(e.target.value))} /></div>
            <div className="fld"><label>יעד</label>
              <input type="number" inputMode="decimal" value={f.target} onChange={(e) => set("target", Number(e.target.value))} /></div>
            <div className="fld"><label>מחיר ליח׳</label>
              <input type="number" inputMode="decimal" value={f.price} onChange={(e) => set("price", Number(e.target.value))} /></div>
          </div>

          {!isNew && (
            <div className="fld"><label>מלאי נוכחי</label>
              <input type="number" inputMode="decimal" value={f.stock} onChange={(e) => set("stock", Number(e.target.value))} /></div>
          )}

          {f.target <= f.min && f.target > 0 && (
            <div className="alert a-amber" style={{ marginBottom: 14 }}>
              <span style={{ marginTop: 1 }}><I.warn /></span>
              <div><div className="ttl">היעד צריך להיות גבוה מהמינימום</div>
                <div className="bd">אחרת כל קנייה מחזירה אתכם מיד לסף ההתראה.</div></div>
            </div>
          )}

          <button className="btn btn-primary" style={{ marginTop: 4 }}
            disabled={!f.name.trim() || f.target <= f.min}
            onClick={() => { upsertProduct({ ...f, name: f.name.trim() }); say(isNew ? (f.pending ? "נוצר – ממתין לאישור מנהל" : "המוצר נוסף") : "עודכן"); close(); }}>
            {isNew ? "צור מוצר" : "שמור שינויים"}
          </button>

          {!isNew && (
            <button className="btn btn-ghost" style={{ marginTop: 9, color: "var(--clay)" }}
              onClick={() => { setSt((s) => ({ ...s, products: s.products.filter((x) => x.id !== f.id) })); say("המוצר הוסר"); close(); }}>
              הסר מהקטלוג
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddItemModal({ ctx, close, listId }) {
  const { st, patchList, setModal } = ctx;
  const [q, setQ] = useState("");
  const list = st.lists.find((l) => l.id === listId);
  const inList = new Set(list ? list.items.map((i) => i.pid) : []);
  const res = st.products.filter((p) => !inList.has(p.id) && (!q || normHe(p.name).includes(normHe(q))))
    .slice(0, 40);
  const sims = q.length >= 2 ? findSimilar(q, st.products, null) : [];

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>הוספה לרשימה</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <input className="search" autoFocus placeholder="חפשו לפני שיוצרים חדש…"
            value={q} onChange={(e) => setQ(e.target.value)} />
          {q && res.length === 0 && (
            <>
              {sims.length > 0 && (
                <div className="alert a-amber">
                  <span style={{ marginTop: 1 }}><I.warn /></span>
                  <div style={{ flex: 1 }}>
                    <div className="ttl">אולי התכוונתם לאחד מאלה</div>
                    <div className="chips">{sims.map((s) => <span className="chip" key={s.p.id}>{s.p.name}</span>)}</div>
                  </div>
                </div>
              )}
              <button className="btn btn-ghost" onClick={() => { close(); setModal({ t: "newProduct", listId, sup: list ? list.sup : "super", name0: q }); }}>
                <I.plus /> צור מוצר חדש בשם “{q}”
              </button>
            </>
          )}
          <div className="rows">
            {res.map((p) => (
              <button className="row" key={p.id} style={{ width: "100%", textAlign: "right" }}
                onClick={() => {
                  patchList(listId, { items: [...list.items, { pid: p.id, qty: Math.max(1, Math.ceil(p.target - p.stock)), got: null }] });
                  close();
                }}>
                <div className="r-main">
                  <div className="r-name">{p.name}</div>
                  <div className="r-meta num">יש {nfmt(p.stock)} {UNITS[p.unit]} • {p.sup === "super" ? "סופר" : "סיטונאי"}</div>
                </div>
                <span className="chev" style={{ transform: "scaleX(-1)" }}><I.chev /></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Simple new-product creator for trainees: name + unit + qty.
   Creates a product marked pending (awaits manager approval into catalog),
   and immediately adds it to the current shopping list so the trainee isn't blocked. */
function NewProductModal({ ctx, close, listId, sup, name0 }) {
  const { st, setSt, patchList, say, user } = ctx;
  const [name, setName] = useState(name0 || "");
  const [unit, setUnit] = useState("unit");
  const [qty, setQty] = useState("1");
  const sims = useMemo(() => (name.trim().length >= 2 ? findSimilar(name, st.products, null) : []), [name, st.products]);

  const create = () => {
    const clean = name.trim();
    const id = "p" + uid();
    const prod = {
      id, name: clean, cat: "יבשים", unit, tracking: "weekly", exp: 0,
      min: 0, target: 0, sup: sup || "super", price: 0, stock: 0,
      order: 999, expiryFlag: null, pending: true, createdBy: user.name,
    };
    setSt((s) => ({ ...s, products: [...s.products, prod] }));
    if (listId) {
      const list = st.lists.find((l) => l.id === listId);
      if (list) patchList(listId, { items: [...list.items, { pid: id, qty: Number(qty) || 1, got: null }] });
    }
    say("נוסף לרשימה • ממתין לאישור מנהל לקטלוג");
    close();
  };

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>מוצר שלא ברשימה</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
              המוצר יתווסף לרשימת הקניות עכשיו. הוא ייכנס לקטלוג הקבוע רק אחרי אישור מנהל.
            </div>
          </div>

          <div className="fld">
            <label>שם המוצר</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: שוקולד לבן" />
          </div>

          {sims.length > 0 && (
            <div className="alert a-amber" style={{ marginBottom: 14 }}>
              <span style={{ marginTop: 1 }}><I.warn /></span>
              <div style={{ flex: 1 }}>
                <div className="ttl">אולי כבר קיים משהו דומה</div>
                <div className="bd">עדיף לחזור אחורה ולהוסיף מהקיים, כדי לא ליצור כפילות.</div>
                <div className="chips">{sims.map((s) => <span className="chip" key={s.p.id}>{s.p.name}</span>)}</div>
              </div>
            </div>
          )}

          <div className="fld">
            <label>יחידת מדידה</label>
            <div className="pick">
              {Object.entries(UNITS).map(([k, v]) => (
                <button key={k} className={unit === k ? "on" : ""} onClick={() => setUnit(k)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <label>כמה להוסיף לרשימה</label>
            <Stepper value={qty} unit={unit} onChange={setQty} wide />
          </div>

          <button className="btn btn-primary" style={{ marginTop: 4 }}
            disabled={!name.trim()} onClick={create}>
            הוסף לרשימה
          </button>
        </div>
      </div>
    </div>
  );
}
