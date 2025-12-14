import React, { useEffect, useMemo, useState } from "react";
import {
  getLocationsSummary,
  getCategories,
  getSubcategories,
  getFilteredItems,
  toggleShowOnWebsite,
  moveProductItem,
  markProductSold,
  getProductHistory,
} from "../lib/stockApi";

import { supabase } from "../lib/supabaseClient";

export default function StockManagement() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  // Filters
  const [filterCategory, setFilterCategory] = useState<number | "">("");
  const [filterSub, setFilterSub] = useState<number | "">("");
  const [filterWeightRange, setFilterWeightRange] = useState<string>("");
  const [filterShowOnline, setFilterShowOnline] = useState<"" | "true" | "false">("");
  const [filterSold, setFilterSold] = useState<"" | "sold" | "unsold">("");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Bulk move controls
  const [moveToLocation, setMoveToLocation] = useState<number | "">("");
  const [moveRemarks, setMoveRemarks] = useState("");
  const [processing, setProcessing] = useState(false);

  // history modal
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [moveModalItem, setMoveModalItem] = useState<any | null>(null);
  const [moveModalTarget, setMoveModalTarget] = useState<number | "">("");
  const [sellModalItem, setSellModalItem] = useState<any | null>(null);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | "">("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustCity, setNewCustCity] = useState("");
  const [newCustState, setNewCustState] = useState("");

  async function loadCustomers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, city, state")
      .order("full_name", { ascending: true });

    setCustomerList(data ?? []);
  }

  useEffect(() => {
    loadInitial();
    loadCustomers();
  }, []);

  function handleMoveSingle(item: any) {
    setMoveModalItem(item);
    setMoveModalTarget("");
  }

  async function openLocation(locId: number) {
    setSelectedLocation(locId);
    await refreshItems(locId);
  }

  async function refreshItems(locId: number | null = selectedLocation) {
    setLoading(true);

    const filters: any = {};

    if (filterSold !== "sold") {
      if (locId) {
        filters.location_id = locId;
      }
    }

    if (filterCategory) filters.category_id = filterCategory;
    if (filterSub) filters.subcategory_id = filterSub;
    if (filterWeightRange) filters.weight_range = filterWeightRange;
    if (filterShowOnline) filters.show_on_website = filterShowOnline === "true";

    if (filterSold === "sold") {
      filters.sold = true;
    } else if (filterSold === "unsold") {
      filters.sold = false;
    }

    const { data, error } = await getFilteredItems(filters);

    if (error) {
      console.error("Error fetching items:", error);
    }

    setItems(data ?? []);
    setSelectedIds([]);
    setLoading(false);
  }

  async function loadInitial() {
    const { data: locs } = await getLocationsSummary();
    setLocations(locs ?? []);

    const { data: cats } = await getCategories();
    setCategories(cats ?? []);

    const { data: subs } = await getSubcategories();
    setSubcategories(subs ?? []);
  }

  useEffect(() => {
    if (selectedLocation) refreshItems(selectedLocation);
  }, [filterCategory, filterSub, filterWeightRange, filterShowOnline, filterSold]);

  const weightBuckets = useMemo(
    () => [
      { key: "", label: "All" },
      { key: "0-5", label: "0 - 5 g" },
      { key: "5-10", label: "5 - 10 g" },
      { key: "10-25", label: "10 - 25 g" },
      { key: "25-50", label: "25 - 50 g" },
      { key: "50-100", label: "50 - 100 g" },
    ],
    []
  );

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleToggleShow(item: any) {
    await toggleShowOnWebsite(item.id, !item.show_on_website);
    await refreshItems();
  }

  async function handleBulkMove() {
    if (!moveToLocation) return alert("Select destination location");
    if (selectedIds.length === 0) return alert("Select items to move");
    setProcessing(true);
    for (const id of selectedIds) {
      const it = items.find((i: any) => i.id === id);
      if (!it) continue;
      await moveProductItem(id, it.current_location_id, Number(moveToLocation), "admin", moveRemarks || "");
    }
    await refreshItems();
    setMoveToLocation("");
    setMoveRemarks("");
    setProcessing(false);
  }

  async function handleBulkMarkSold() {
    if (selectedIds.length === 0) return alert("Select items to mark sold");
    if (!confirm(`Mark ${selectedIds.length} items as sold?`)) return;
    setProcessing(true);

    let successCount = 0;
    for (const id of selectedIds) {
      const it = items.find((i: any) => i.id === id);
      if (!it) continue;
      const result = await markProductSold(id, it.current_location_id, "admin", "sold via admin bulk");
      if (!result.error) successCount++;
    }

    setFilterSold("sold");
    setSelectedLocation(null);
    await refreshItems(null);
    setProcessing(false);

    alert(`${successCount} item(s) marked as sold! Viewing sold items now.`);
  }

  async function openHistory(itemId: number) {
    setHistoryFor(itemId);
    const { data } = await getProductHistory(itemId);
    setHistoryRows(data ?? []);
  }

  return (
    <div>
      <h2 className="section-title" style={{ color: "var(--accent-dark)", marginBottom: 16 }}>Stock Management</h2>

      {!selectedLocation && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <button className="btn primary" onClick={loadInitial}>Refresh Locations</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Location</th>
                  <th style={{ padding: 14, textAlign: "right", fontWeight: 700 }}>Total Weight (g)</th>
                  <th style={{ padding: 14, textAlign: "right", fontWeight: 700 }}>Total Items</th>
                  <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.location_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: 12, fontWeight: 700, color: "var(--accent-dark)" }}>{loc.location_name}</td>
                    <td style={{ padding: 12, textAlign: "right", color: "var(--accent)" }}>{Number(loc.total_weight_grams ?? loc.total_weight ?? 0).toFixed(3)}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{loc.pieces ?? loc.total_items ?? 0}</td>
                    <td style={{ padding: 12 }}>
                      <button className="btn primary" onClick={() => openLocation(loc.location_id)}>View Items</button>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No locations found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedLocation && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <button className="btn" onClick={() => { setSelectedLocation(null); setItems([]); }}>← Back</button>
              <button className="btn primary" onClick={() => refreshItems()}>Refresh</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <select className="input" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value ? Number(e.target.value) : ""); setFilterSub(""); }}>
                <option value="">Category: All</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select className="input" value={filterSub} onChange={(e) => setFilterSub(e.target.value ? Number(e.target.value) : "")} disabled={!filterCategory}>
                <option value="">Subcategory: All</option>
                {subcategories.filter((s) => !filterCategory || Number(s.category_id) === Number(filterCategory)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select className="input" value={filterWeightRange} onChange={(e) => setFilterWeightRange(e.target.value)}>
                {weightBuckets.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
              </select>

              <select className="input" value={filterShowOnline} onChange={(e) => setFilterShowOnline(e.target.value as any)}>
                <option value="">Show online: All</option>
                <option value="true">Shown</option>
                <option value="false">Hidden</option>
              </select>

              <select className="input" value={filterSold} onChange={(e) => { const val = e.target.value as any; setFilterSold(val); if (val === "sold") { setSelectedLocation(null); refreshItems(null); } }}>
                <option value="unsold">Unsold</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
              <select className="input" value={moveToLocation} onChange={(e) => setMoveToLocation(e.target.value ? Number(e.target.value) : "")} style={{ minWidth: 180 }}>
                <option value="">Move selected to...</option>
                {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
              </select>
              <input className="input" placeholder="Remarks" value={moveRemarks} onChange={(e) => setMoveRemarks(e.target.value)} style={{ minWidth: 150 }} />
              <button className="btn" onClick={handleBulkMove} disabled={processing}>Move</button>
              <button className="btn" onClick={handleBulkMarkSold} disabled={processing}>Mark Sold</button>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: "center", padding: 24, color: "var(--accent)" }}>Loading items...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                    <th style={{ padding: 14 }}>
                      <input type="checkbox" checked={selectedIds.length === items.length && items.length > 0} onChange={(e) => { if (e.target.checked) setSelectedIds(items.map((i: any) => i.id)); else setSelectedIds([]); }} />
                    </th>
                    <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Image</th>
                    <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Product</th>
                    <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Category</th>
                    <th style={{ padding: 14, textAlign: "right", fontWeight: 700 }}>Weight (g)</th>
                    <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Location</th>
                    <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Status</th>
                    <th style={{ padding: 14, textAlign: "center", fontWeight: 700 }}>Show</th>
                    <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: 12 }}><input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => toggleSelect(it.id)} /></td>
                      <td style={{ padding: 12 }}>
                        {it.image_url ? (
                          <img src={it.image_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "1px solid var(--border-light)" }} onClick={() => setImageModal(it.image_url)} />
                        ) : (
                          <div style={{ width: 56, height: 56, background: "var(--bg-cream)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>—</div>
                        )}
                      </td>
                      <td style={{ padding: 12, fontWeight: 600 }}>{it.product_name ?? `#${it.product_id}`}</td>
                      <td style={{ padding: 12, color: "var(--text-muted)" }}>{it.category_name ?? "-"} / {it.subcategory_name ?? "-"}</td>
                      <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--accent)" }}>{it.weight != null ? Number(it.weight).toFixed(3) : "-"}</td>
                      <td style={{ padding: 12 }}>{it.current_location_name ?? "-"}</td>
                      <td style={{ padding: 12 }}>{it.sold ? <span className="badge" style={{ background: "#e8f9ee", color: "#2e7d32" }}>Sold</span> : <span className="badge">Unsold</span>}</td>
                      <td style={{ padding: 12, textAlign: "center" }}><input type="checkbox" checked={!!it.show_on_website} onChange={() => handleToggleShow(it)} /></td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn" onClick={() => handleMoveSingle(it)}>Move</button>
                          <button className="btn" onClick={() => { setSellModalItem(it); setSelectedCustomerId(""); loadCustomers(); }}>Sell</button>
                          <button className="btn" onClick={() => openHistory(it.id)}>History</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No items</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History modal */}
      {historyFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => { setHistoryFor(null); setHistoryRows([]); }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 700, maxHeight: "80vh", overflow: "auto" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--accent-dark)" }}>History for item #{historyFor}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-cream)" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Date</th>
                  <th style={{ padding: 10, textAlign: "left" }}>From</th>
                  <th style={{ padding: 10, textAlign: "left" }}>To</th>
                  <th style={{ padding: 10, textAlign: "left" }}>By</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((h, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: 10, fontSize: 13 }}>{h.created_at ? new Date(h.created_at).toLocaleString() : "-"}</td>
                    <td style={{ padding: 10 }}>{h.from_location?.name ?? "-"}</td>
                    <td style={{ padding: 10 }}>{h.to_location?.name ?? "-"}</td>
                    <td style={{ padding: 10 }}>{h.moved_by ?? "-"}</td>
                    <td style={{ padding: 10, color: "var(--text-muted)" }}>{h.remarks ?? "-"}</td>
                  </tr>
                ))}
                {historyRows.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>No history</td></tr>}
              </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button className="btn primary" onClick={() => { setHistoryFor(null); setHistoryRows([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Move single modal */}
      {moveModalItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setMoveModalItem(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--accent-dark)" }}>Move item #{moveModalItem.id}</h3>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Move to location:</label>
            <select className="input" value={moveModalTarget} onChange={(e) => setMoveModalTarget(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%", marginTop: 6 }}>
              <option value="">Select location</option>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
            </select>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setMoveModalItem(null)}>Cancel</button>
              <button className="btn primary" onClick={async () => {
                if (!moveModalTarget) { alert("Select a location"); return; }
                setProcessing(true);
                await moveProductItem(moveModalItem.id, moveModalItem.current_location_id ?? selectedLocation, Number(moveModalTarget), "admin", "move single");
                setMoveModalItem(null);
                await refreshItems();
                setProcessing(false);
              }}>Move</button>
            </div>
          </div>
        </div>
      )}

      {/* Image modal */}
      {imageModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setImageModal(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw" }}>
            <img src={imageModal} alt="" style={{ maxWidth: "85vw", maxHeight: "75vh", objectFit: "contain", borderRadius: 8 }} />
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button className="btn primary" onClick={() => setImageModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell modal */}
      {sellModalItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setSellModalItem(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--accent-dark)" }}>Sell Item #{sellModalItem.id}</h3>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Customer:</label>
            <select className="input" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
              <option value="">Select customer</option>
              {customerList.map((c) => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
              <option value="__new">+ Add new customer</option>
            </select>

            {selectedCustomerId === "__new" && (
              <div style={{ marginTop: 16 }}>
                <input className="input" placeholder="Full Name" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                <input className="input" placeholder="Phone" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} style={{ marginTop: 8 }} />
                <input className="input" placeholder="City" value={newCustCity} onChange={(e) => setNewCustCity(e.target.value)} style={{ marginTop: 8 }} />
                <input className="input" placeholder="State" value={newCustState} onChange={(e) => setNewCustState(e.target.value)} style={{ marginTop: 8 }} />
                <button className="btn" style={{ marginTop: 12 }} onClick={async () => {
                  if (!newCustName || !newCustPhone) { alert("Name and phone required"); return; }
                  const { data, error } = await supabase.from("profiles").insert({ id: crypto.randomUUID(), full_name: newCustName, phone: newCustPhone, city: newCustCity, state: newCustState }).select().single();
                  if (error) { alert("Failed to add customer"); return; }
                  setSelectedCustomerId(data.id);
                  loadCustomers();
                  alert("Customer added!");
                }}>Save Customer</button>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setSellModalItem(null)}>Cancel</button>
              <button className="btn primary" onClick={async () => {
                if (!selectedCustomerId || selectedCustomerId === "__new") { alert("Select or create customer"); return; }
                const result = await markProductSold(sellModalItem.id, sellModalItem.current_location_id, "admin", "sold via admin", selectedCustomerId);
                if (result.error) { alert("Error: " + result.error.message); return; }
                setFilterSold("sold");
                setSelectedLocation(null);
                await refreshItems(null);
                alert("Item marked as sold!");
                setSellModalItem(null);
              }}>Confirm Sell</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
