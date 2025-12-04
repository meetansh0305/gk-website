export const fmtWeight = (w?: number | null) =>
  typeof w === "number" ? w.toFixed(2) : "";

export const fmtPrice = (p?: number | null) =>
  typeof p === "number" ? `₹${p.toLocaleString()}` : "";
