/* ============================================================
   פעמון ההתראות — משותף למסך המנהל ולמסך החניך
   ------------------------------------------------------------
   ⚠ רכיב אחד לשתי המעטפות. הפעמון של המנהל והפעמון של החניך
     הם אותו דבר בדיוק, ושני עותקים היו נפרדים זה מזה בתיקון
     הראשון שנעשה רק באחד מהם — כמו שכבר קרה עם מסכי הציוד.

   ⚠ ההתראות נגזרות בשרת מהמצב הנוכחי ואינן תור שמור.
     ראו api/_notify.js.

   ⚠ הרשימה **נטענת גם כשהפעמון סגור**, כי התג הוא כל התכלית:
     מי שצריך ללחוץ כדי לדעת שיש משהו לא יידע שיש משהו.
   ============================================================ */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api.js";

/** כל כמה זמן נבדק מחדש. ⚠ לא תכוף — כל שליפה היא שבעה לוחות. */
const EVERY = 3 * 60_000;

const NI = {
  bell: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>,
  x: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  chev: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
};

/** צבע ואייקון לכל תחום. ⚠ הצבע לעולם אינו לבד — הכותרת אומרת. */
const KIND = {
  "בקשות": { tone: "n-amber", ico: "▤" },
  "תקלה": { tone: "n-clay", ico: "▲" },
  "מלאי": { tone: "n-accent", ico: "▣" },
  "השאלה": { tone: "n-accent", ico: "▤" },
  "בטיחות": { tone: "n-clay", ico: "▲" },
  "אירוח": { tone: "n-green", ico: "▦" },
  "שיעורים": { tone: "n-green", ico: "▥" },
  "בקשה": { tone: "n-amber", ico: "▤" },
};

/**
 * מצב ההתראות. מוחזק במעטפת כדי שהתג והפאנל יראו אותו דבר.
 * ⚠ אינו טוען מחדש בכל רינדור — רק בפתיחה ובכל EVERY.
 */
export function useNotify(enabled = true) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const live = useRef(true);

  const load = useCallback(() => {
    if (!enabled) return;
    setBusy(true);
    api.getNotify()
      .then((d) => { if (live.current) setData(d); })
      .catch(() => {})
      .finally(() => { if (live.current) setBusy(false); });
  }, [enabled]);

  useEffect(() => {
    live.current = true;
    load();
    const t = setInterval(load, EVERY);
    return () => { live.current = false; clearInterval(t); };
  }, [load]);

  const markSeen = useCallback(() => {
    /* ⚠ אופטימי: התג נעלם מיד. אם השמירה נכשלה הוא יחזור
       בשליפה הבאה, וזו התנהגות עדיפה על פעמון שנתקע. */
    setData((p) => (p ? { ...p, unread: 0, notes: p.notes.map((n) => ({ ...n, fresh: false })) } : p));
    api.markNotifySeen().catch(() => {});
  }, []);

  return { data, busy, reload: load, markSeen };
}

/** הפעמון עצמו */
export function NotifyBell({ notify, open, onToggle }) {
  const unread = notify.data ? notify.data.unread : 0;
  const urgent = notify.data ? notify.data.urgent : 0;
  return (
    <button className={"bell-btn" + (open ? " on" : "")} aria-label="התראות"
      onClick={onToggle}>
      <NI.bell />
      {unread > 0 && (
        /* ⚠ המספר ולא רק נקודה: "יש משהו" ו"יש שבעה דברים"
           הם שתי החלטות שונות אם לפתוח עכשיו. */
        <span className={"bell-badge num" + (urgent ? " hot" : "")}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

/** הפאנל */
export function NotifyPanel({ notify, onClose, onGo }) {
  const d = notify.data;

  useEffect(() => {
    /* ⚠ מסומן כנקרא בפתיחה ולא בסגירה: מי שסוגר בלי לקרוא
       עדיין ראה את הרשימה, ותג שנשאר אחרי שהסתכלו בו הוא
       בדיוק מה שגורם להתעלם ממנו. */
    if (d && d.unread > 0) notify.markSeen();
  }, [d]); // eslint-disable-line

  return (
    <div className="notif-panel">
      <div className="notif-h">
        <div className="nh-l">
          <b>מה מחכה לך</b>
          {d && <span className="nh-c num">{d.count}</span>}
        </div>
        <button onClick={onClose} aria-label="סגירה"><NI.x /></button>
      </div>

      {!d && <div className="notif-empty">טוען…</div>}

      {d && d.notes.length === 0 && (
        /* ⚠ מצב ריק שאומר מה נבדק, ולא רק "אין". */
        <div className="notif-calm">
          <b>הכול מסודר</b>
          <span>אין תקלות פתוחות, חוסרים או בקשות שממתינות לך</span>
        </div>
      )}

      {d && d.notes.map((n) => {
        const k = KIND[n.kind] || { tone: "n-accent", ico: "▪" };
        return (
          <button className={"notif-item " + k.tone + (n.fresh ? " fresh" : "")}
            key={n.id} onClick={() => { onClose(); if (n.tab && onGo) onGo(n.tab); }}>
            <span className="ni-dot" aria-hidden="true">{k.ico}</span>
            <span className="ni-main">
              <span className="ni-k">
                {n.kind}
                {n.level === "גבוה" && <b className="ni-hot">דחוף</b>}
              </span>
              <span className="ni-t">{n.title}</span>
              {n.body && <span className="ni-s">{n.body}</span>}
            </span>
            {n.tab && <NI.chev className="ni-go" />}
          </button>
        );
      })}
    </div>
  );
}
