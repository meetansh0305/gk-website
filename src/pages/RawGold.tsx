import React, { useEffect, useState } from "react";
import { addRawGoldEntry, getRawGoldAvailable } from "../lib/stockApi";
import { supabase } from "../lib/supabaseClient";

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          if (cell == null) return "";
          const s = String(cell).replace(/"/g, '""');
          if (s.search(/,|\n|"/) >= 0) return `"${s}"`;
          return s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function RawGold() {
  const [available, setAvailable] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [type, setType] = useState("received");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    load();
    loadEntries();
  }, []);

  async function load() {
    const r = await getRawGoldAvailable();
    setAvailable(r.data?.[0]?.available_grams ?? 0);
  }

  async function loadEntries() {
    const { data } = await supabase
      .from("raw_gold_ledger")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries(data ?? []);
  }

  const exportCsv = () => {
    const out: Array<Array<string | number | null>> = [
      ["Date", "Type", "Weight (g)", "Notes", "Available After (g)"],
    ];
    let runningTotal = 0;
    [...entries].reverse().forEach((entry: any) => {
      if (entry.type === "received" || entry.type === "returned") {
        runningTotal += Number(entry.weight || 0);
      } else {
        runningTotal -= Number(entry.weight || 0);
      }
      out.push([
        entry.created_at ? new Date(entry.created_at).toLocaleString() : "",
        entry.type ?? "",
        entry.weight != null ? Number(entry.weight).toFixed(3) : "",
        entry.notes ?? "",
        runningTotal.toFixed(3),
      ]);
    });
    downloadCsv(`raw-gold-ledger-${new Date().toISOString().slice(0, 10)}.csv`, out);
  };

  async function submit() {
    if (!weight || isNaN(Number(weight))) return alert("Enter weight");
    const res = await addRawGoldEntry(type, Number(weight), notes);
    if (res.error) return alert("Failed: " + res.error.message);
      setWeight("");
      setNotes("");
      load();
      loadEntries();
      alert("Entry recorded");
    }

  return (
    <div>
      <h2 className="section-title" style={{ color: "var(--accent-dark)", marginBottom: 16 }}>Raw Gold Ledger</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 250, background: "linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%)", color: "#fff" }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Available Gold</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>
            {available != null ? Number(available).toFixed(3) + " g" : "—"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button 
            className="btn" 
            onClick={exportCsv}
            style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff", minHeight: 44 }}
            aria-label="Export ledger to CSV"
          >
            Export Ledger CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h4 style={{ margin: "0 0 24px 0", color: "var(--primary-dark)", fontWeight: 700, fontSize: 18 }}>Add Entry</h4>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)", display: "block", marginBottom: 8 }}>
              Entry Type <span style={{ color: "#c62828" }}>*</span>
            </label>
            <select 
              className="input" 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              aria-label="Entry type"
              required
            >
              <option value="received">Received</option>
              <option value="used">Used</option>
              <option value="wastage">Wastage</option>
              <option value="returned">Returned</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)", display: "block", marginBottom: 8 }}>
              Weight (grams) <span style={{ color: "#c62828" }}>*</span>
            </label>
            <input 
              className="input" 
              type="number" 
              step="0.001" 
              placeholder="0.000" 
              value={weight} 
              onChange={(e) => setWeight(e.target.value)}
              aria-label="Weight in grams"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)", display: "block", marginBottom: 8 }}>
              Notes <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(Optional)</span>
            </label>
            <input 
              className="input" 
              placeholder="Optional notes..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Entry notes"
            />
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button 
              className="btn primary" 
              onClick={submit}
              style={{ width: "100%", minHeight: 44 }}
              aria-label="Add entry"
            >
              Add Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
