/* ============================================================
   שכבת התרגום: פריט monday ← → אובייקט של האפליקציה
   ------------------------------------------------------------
   שני כיוונים לכל ישות:
     to*(item)      פריט monday  →  אובייקט כמו שהפרוטוטייפ מכיר
     *Columns(obj)  אובייקט       →  ערכי עמודות לכתיבה ל-monday

   מעבר לקובץ הזה ול-boards.js, שום קוד בפרויקט לא אמור לדעת
   שקיים דבר כזה "מזהה עמודה".
   ============================================================ */

import { COLS, LABELS, invert } from "./boards.js";

/* ---------- קריאה: חילוץ ערך מעמודה ---------- */

const byId = (item) =>
  Object.fromEntries((item.column_values || []).map((c) => [c.id, c]));

/** תווית של עמודת סטטוס, או null אם ריקה */
const label = (cv) => (cv && cv.text ? cv.text : null);

/** מספר מעמודת מספרים. ריק → ברירת המחדל */
const num = (cv, dflt = 0) => {
  const t = cv && cv.text;
  if (t === null || t === undefined || t === "") return dflt;
  const n = Number(t);
  return Number.isFinite(n) ? n : dflt;
};

/** תיבת סימון → true/false */
const bool = (cv) => {
  if (!cv || !cv.value) return false;
  try {
    return JSON.parse(cv.value).checked === true;
  } catch {
    return false;
  }
};

/** עמודת תאריך → חותמת זמן במילישניות, או null */
const ts = (cv) => {
  if (!cv || !cv.value) return null;
  try {
    const { date, time } = JSON.parse(cv.value);
    if (!date) return null;
    // monday שומר ב-UTC
    return new Date(`${date}T${time || "00:00:00"}Z`).getTime();
  } catch {
    return null;
  }
};

/** עמודת קישור → מזהה הפריט המקושר הראשון, או null */
const linked = (cv) => {
  const ids = cv && cv.linked_item_ids;
  return ids && ids.length ? String(ids[0]) : null;
};

/* ---------- כתיבה: בניית ערך עמודה ---------- */

const wLabel = (text) => (text ? { label: text } : {});
const wNum = (n) => String(n ?? 0);
const wBool = (b) => ({ checked: b ? "true" : "false" });
const wLink = (id) => ({ item_ids: id ? [Number(id)] : [] });

/** חותמת זמן → { date, time } ב-UTC, כמו ש-monday מצפה */
const wTs = (millis) => {
  if (!millis) return {};
  const d = new Date(millis);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 19),
  };
};

/* ============================================================
   מוצר — לוח הקטלוג
   ============================================================ */

const CAT_BACK = invert(LABELS.cat);
const UNIT_BACK = invert(LABELS.unit);
const TRACK_BACK = invert(LABELS.tracking);
const SUP_BACK = invert(LABELS.sup);
const STATUS_BACK = invert(LABELS.stockStatus);
const EXPIRY_BACK = invert(LABELS.expiryFlag);

export function toProduct(item) {
  const c = byId(item);
  const stock = num(c[COLS.catalog.stock]);
  const min = num(c[COLS.catalog.min]);
  return {
    id: String(item.id),
    name: item.name,
    cat: CAT_BACK[label(c[COLS.catalog.cat])] ?? null,
    unit: UNIT_BACK[label(c[COLS.catalog.unit])] ?? null,
    tracking: TRACK_BACK[label(c[COLS.catalog.tracking])] ?? null,
    sup: SUP_BACK[label(c[COLS.catalog.sup])] ?? null,
    exp: bool(c[COLS.catalog.exp]) ? 1 : 0,
    stock,
    min,
    target: num(c[COLS.catalog.target]),
    price: num(c[COLS.catalog.price]),
    // נגזר מהמלאי, לא נסמך על העמודה — כדי שהאפליקציה תמיד תהיה עקבית
    stockStatus: stock < min ? "low" : "ok",
    expiryFlag: EXPIRY_BACK[label(c[COLS.catalog.expiryFlag])] ?? null,
    pending: bool(c[COLS.catalog.pending]),
  };
}

export function productColumns(p) {
  const K = COLS.catalog;
  const out = {
    [K.stock]: wNum(p.stock),
    [K.min]: wNum(p.min),
    [K.target]: wNum(p.target),
    [K.price]: wNum(p.price),
    [K.exp]: wBool(p.exp),
    [K.pending]: wBool(p.pending),
    [K.stockStatus]: wLabel(LABELS.stockStatus[p.stock < p.min ? "low" : "ok"]),
  };
  if (p.cat) out[K.cat] = wLabel(LABELS.cat[p.cat]);
  if (p.unit) out[K.unit] = wLabel(LABELS.unit[p.unit]);
  if (p.tracking) out[K.tracking] = wLabel(LABELS.tracking[p.tracking]);
  if (p.sup) out[K.sup] = wLabel(LABELS.sup[p.sup]);
  // דגל תוקף ריק הוא מצב תקין ומשמעותי — מנקים את העמודה במפורש
  out[K.expiryFlag] = p.expiryFlag ? wLabel(LABELS.expiryFlag[p.expiryFlag]) : {};
  return out;
}

/* ============================================================
   תנועה — לוח יומן התנועות
   ============================================================ */

const MOVE_BACK = invert(LABELS.moveType);

export function toMove(item) {
  const c = byId(item);
  return {
    id: String(item.id),
    pid: linked(c[COLS.moves.product]),
    type: MOVE_BACK[label(c[COLS.moves.type])] ?? null,
    qty: num(c[COLS.moves.qty]),
    reason: label(c[COLS.moves.reason]),
    user: c[COLS.moves.user]?.text || null,
    ts: ts(c[COLS.moves.ts]),
    cancelled: bool(c[COLS.moves.cancelled]),
  };
}

/** @param extra שם המוצר ומחיר היחידה, לעמודות התצוגה ב-monday */
export function moveColumns(m, extra = {}) {
  const K = COLS.moves;
  const out = {
    [K.type]: wLabel(LABELS.moveType[m.type]),
    // ספירה שומרת הפרש, שיכול להיות שלילי — "נמצא פחות ממה שרשום".
    // הדוח מזהה חוסר לא מדווח בדיוק לפי זה. קבלה/שימוש/פחת תמיד חיוביים,
    // והכיוון נגזר מסוג התנועה.
    [K.qty]: wNum(m.type === "count" ? m.qty : Math.abs(m.qty)),
    [K.user]: m.user || "",
    [K.ts]: wTs(m.ts),
    [K.product]: wLink(m.pid),
    [K.productName]: extra.productName || "",
    [K.value]: wNum(Math.abs(m.qty) * (extra.price || 0)),
  };
  out[K.reason] = m.reason ? wLabel(m.reason) : {};
  return out;
}

/* ============================================================
   רשימת קניות — לוח הרשימות
   ============================================================ */

const LIST_BACK = invert(LABELS.listStatus);
const LSUP_BACK = invert(LABELS.sup);

export function toList(item) {
  const c = byId(item);
  return {
    id: String(item.id),
    name: item.name,
    sup: LSUP_BACK[label(c[COLS.lists.sup])] ?? null,
    status: LIST_BACK[label(c[COLS.lists.status])] ?? null,
    createdBy: c[COLS.lists.createdBy]?.text || null,
    createdAt: item.created_at ? new Date(item.created_at).getTime() : null,
    approvedBy: c[COLS.lists.approvedBy]?.text || null,
    approvedAt: ts(c[COLS.lists.approvedAt]),
    purchasedAt: ts(c[COLS.lists.purchasedAt]),
    cost: num(c[COLS.lists.cost]),
    items: [], // מגיעות מלוח השורות, בשאילתה נפרדת
  };
}

export function listColumns(l) {
  const K = COLS.lists;
  const out = {
    [K.sup]: wLabel(LABELS.sup[l.sup]),
    [K.status]: wLabel(LABELS.listStatus[l.status]),
    [K.createdBy]: l.createdBy || "",
    [K.approvedBy]: l.approvedBy || "",
    [K.cost]: wNum(l.cost || 0),
  };
  out[K.approvedAt] = l.approvedAt ? wTs(l.approvedAt) : {};
  out[K.purchasedAt] = l.purchasedAt ? wTs(l.purchasedAt) : {};
  return out;
}

/* ============================================================
   שורת רשימה — הלוח הרביעי
   ============================================================ */

const SOURCE_BACK = invert(LABELS.rowSource);

export function toRow(item) {
  const c = byId(item);
  const got = c[COLS.rows.got];
  return {
    id: String(item.id),
    listId: linked(c[COLS.rows.list]),
    pid: linked(c[COLS.rows.product]),
    qty: num(c[COLS.rows.qty]),
    // הבחנה חשובה: "טרם התקבל" (null) שונה מ"התקבל אפס" (0)
    got: got && got.text !== "" ? num(got) : null,
    auto: SOURCE_BACK[label(c[COLS.rows.source])] === "auto",
  };
}

export function rowColumns(r) {
  const K = COLS.rows;
  const out = {
    [K.list]: wLink(r.listId),
    [K.product]: wLink(r.pid),
    [K.qty]: wNum(r.qty),
    [K.source]: wLabel(LABELS.rowSource[r.auto ? "auto" : "manual"]),
  };
  out[K.got] = r.got === null || r.got === undefined ? "" : wNum(r.got);
  return out;
}
