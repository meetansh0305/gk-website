import React, { useEffect, useState } from "react";
import { addRawGoldEntry, getRawGoldAvailable } from "../lib/stockApi";

export default function RawGold() {
  const [available, setAvailable] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [type, setType] = useState("received");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await getRawGoldAvailable();
    setAvailable(r.data?.[0]?.available_grams ?? 0);
  }

  async function submit() {
    if (!weight || isNaN(Number(weight))) return alert("Enter weight");
    const res = await addRawGoldEntry(type, Number(weight), notes);
    if (res.error) return alert("Failed: " + res.error.message);
    setWeight("");
    setNotes("");
    load();
    alert("Entry recorded");
  }

  return (
    <div>
      <h2 className="section-title" style={{ color: "var(--accent-dark)", marginBottom: 16 }}>Raw Gold Ledger</h2>

      <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%)", color: "#fff" }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Available Gold</div>
        <div style={{ fontSize: 32, fontWeight: 800 }}>
          {available != null ? Number(available).toFixed(3) + " g" : "—"}
        </div>
      </div>

      <div className="card">
        <h4 style={{ margin: "0 0 16px 0", color: "var(--primary-dark)", fontWeight: 700 }}>Add Entry</h4>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="received">Received</option>
              <option value="used">Used</option>
              <option value="wastage">Wastage</option>
              <option value="returned">Returned</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Weight (g)</label>
            <input className="input" type="number" step="0.001" placeholder="0.000" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Notes</label>
            <input className="input" placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button className="btn primary" onClick={submit}>Add Entry</button>
        </div>
      </div>
    </div>
  );
}
