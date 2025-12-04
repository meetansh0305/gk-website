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
    setAvailable((r.data?.[0]?.available_grams) ?? 0);
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
    <div className="container">
      <h2 className="section-title">Raw Gold Ledger</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          Available: {available != null ? Number(available).toFixed(3) + " g" : "—"}
        </div>
      </div>

      <div className="card">
        <h4>Add Entry</h4>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="received">Received</option>
            <option value="used">Used</option>
            <option value="wastage">Wastage</option>
            <option value="returned">Returned</option>
            <option value="adjustment">Adjustment</option>
          </select>

          <input
            className="input"
            placeholder="Weight (g)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />

          <input
            className="input"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button className="btn" onClick={submit}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
