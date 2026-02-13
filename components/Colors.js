export const C = {
  bg: "#FAFAF9", sf: "#FFFFFF", sfh: "#F5F5F4", bd: "#E7E5E4",
  bl: "#F0EFED", pr: "#1A1A1A", ac: "#2563EB", al: "#DBEAFE",
  as: "#EFF6FF", tp: "#1A1A1A", ts: "#78716C", tt: "#A8A29E",
  su: "#16A34A", sb: "#F0FDF4", dn: "#DC2626", db: "#FEF2F2",
  wn: "#F59E0B", wb: "#FFFBEB"
}

export const SC = [
  { bg: "#DBEAFE", t: "#1E40AF", b: "#93C5FD" },
  { bg: "#FCE7F3", t: "#9D174D", b: "#F9A8D4" },
  { bg: "#D1FAE5", t: "#065F46", b: "#6EE7B7" },
  { bg: "#FEF3C7", t: "#92400E", b: "#FCD34D" },
  { bg: "#EDE9FE", t: "#5B21B6", b: "#C4B5FD" },
  { bg: "#FFE4E6", t: "#9F1239", b: "#FDA4AF" },
  { bg: "#CCFBF1", t: "#115E59", b: "#5EEAD4" },
  { bg: "#FEE2E2", t: "#991B1B", b: "#FCA5A5" }
]

export const STATUS = [
  { id: "paid", l: "완납", c: C.su, bg: C.sb },
  { id: "partial", l: "일부납", c: C.wn, bg: C.wb },
  { id: "unpaid", l: "미납", c: C.dn, bg: C.db }
]