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
/**
 * Corrected StockManagement.tsx
 * - Uses id / product_name / category_name / subcategory_name / current_location_name
 * - Bulk select, bulk move, bulk mark sold
 * - Filters for category, subcategory, weight buckets, shown_on_website, sold
 * - History modal
 *
 * Paste this file over your existing src/pages/StockManagement.tsx
 */

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



  useEffect(() => {
    loadInitial();
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
    if (!locId) return;
    setLoading(true);

    const filters: any = { location_id: locId };
    if (filterCategory) filters.category_id = filterCategory;
    if (filterSub) filters.subcategory_id = filterSub;
    if (filterWeightRange) filters.weight_range = filterWeightRange;
    if (filterShowOnline) filters.show_on_website = filterShowOnline === "true";
    if (filterSold) filters.sold = filterSold === "sold";

    const { data } = await getFilteredItems(filters);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // use item.id everywhere
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
    for (const id of selectedIds) {
      const it = items.find((i: any) => i.id === id);
      if (!it) continue;
      await markProductSold(id, it.current_location_id, "admin", "sold via admin bulk");
    }
    await refreshItems();
    setProcessing(false);
  }

  async function openHistory(itemId: number) {
    setHistoryFor(itemId);
    const { data } = await getProductHistory(itemId);
    setHistoryRows(data ?? []);
  }

  return (
    <div style={{ padding: 18 }}>
      <h2 style={{ marginBottom: 12 }}>Stock Management</h2>

      {/* Locations summary */}
      {!selectedLocation && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <button className="btn" onClick={loadInitial}>
              Refresh
            </button>
          </div>

          <table className="admin-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Location</th>
                <th>Total Weight (g)</th>
                <th>Total Items</th>
                <th></th>
                
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.location_id}>
                  <td style={{ fontWeight: 700 }}>{loc.location_name}</td>
                  <td>{Number(loc.total_weight_grams ?? loc.total_weight ?? 0).toFixed(3)}</td>
                  <td>{loc.pieces ?? loc.total_items ?? 0}</td>
                  <td>
                    <button className="btn" onClick={() => openLocation(loc.location_id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {locations.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 20 }}>
                    No locations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Location detail */}
      {selectedLocation && (
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <button
              className="btn"
              onClick={() => {
                setSelectedLocation(null);
                setItems([]);
              }}
            >
              ← Back
            </button>
            <button className="btn ghost" onClick={() => refreshItems()}>
              Refresh items
            </button>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 16 }}>
              <select
                className="input"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value ? Number(e.target.value) : "");
                  setFilterSub("");
                }}
              >
                <option value="">Category (All)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select className="input" value={filterSub} onChange={(e) => setFilterSub(e.target.value ? Number(e.target.value) : "")} disabled={!filterCategory}>
                <option value="">Subcategory (All)</option>
                {subcategories
                  .filter((s) => !filterCategory || Number(s.category_id) === Number(filterCategory))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>

              <select className="input" value={filterWeightRange} onChange={(e) => setFilterWeightRange(e.target.value)}>
                {weightBuckets.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>

              <select className="input" value={filterShowOnline} onChange={(e) => setFilterShowOnline(e.target.value as any)}>
                <option value="">Show online: All</option>
                <option value="true">Shown</option>
                <option value="false">Hidden</option>
              </select>

              <select className="input" value={filterSold} onChange={(e) => setFilterSold(e.target.value as any)}>
                <option value="">Sold: All</option>
                <option value="unsold">Unsold</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* Bulk action controls */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select className="input" value={moveToLocation} onChange={(e) => setMoveToLocation(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">Move selected to...</option>
                  {locations.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.location_name}
                    </option>
                  ))}
                </select>
                <input className="input" placeholder="Remarks" value={moveRemarks} onChange={(e) => setMoveRemarks(e.target.value)} />
                <button className="btn" onClick={handleBulkMove} disabled={processing}>
                  Move
                </button>
              </div>

              <button className="btn" onClick={handleBulkMarkSold} disabled={processing}>
                Mark Sold
              </button>
            </div>
          </div>

          {loading ? (
            <div className="card">Loading items...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={selectedIds.length === items.length && items.length > 0} onChange={(e) => { if (e.target.checked) setSelectedIds(items.map((i: any) => i.id)); else setSelectedIds([]); }} />
                    </th>
                    <th>Image</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Weight (g)</th>
                    <th>Location</th>
                    <th>Show online</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any) => (
                    <tr key={it.id}>
                      <td><input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => toggleSelect(it.id)} /></td>
                      <td style={{ width: 84 }}>
                        {it.image_url ? (
                        <img
                          src={it.image_url}
                          className="thumb"
                          alt=""
                          style={{ cursor: "pointer" }}
                          onClick={() => setImageModal(it.image_url)}
                        /> 
                      ) : (
                        <div className="thumb placeholder">—</div>
                       )}
                      </td>
                    
                      <td style={{ minWidth: 180 }}>
                        {it.product_name ?? `Product #${it.product_id}`}
                      </td>
                      <td style={{ minWidth: 120 }}>
                        {it.category_name ?? "-"}
                      </td>
                      <td style={{ minWidth: 120 }}>
                        {it.subcategory_name ?? "-"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {it.weight != null ? Number(it.weight).toFixed(3) : "-"}
                      </td>
                      <td>{it.current_location_name ?? "-"}
                      </td>
                      <td><input type="checkbox" checked={!!it.show_on_website} onChange={() => handleToggleShow(it)} /></td>
                      <td>{it.sold ? `Sold${it.sold_at ? " (" + it.sold_at.split("T")[0] + ")" : ""}` : "Unsold"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn" onClick={() => handleMoveSingle(it)}>
                            Move

                          </button>
                          <button
                          className="btn"
                          onClick={async () => {
                            if (confirm("Mark sold?")) {
                              await markProductSold(
                                it.id,
                                it.current_location_id,
                                "admin",
                                "sold via admin"
                              );
                              await refreshItems();
                            }
                          }}
                        >
                          Sold
                        </button>

                        <button className="btn ghost" onClick={() => openHistory(it.id)}>
                          History
                        </button>
                       </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 20 }}>No items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History modal */}
      {historyFor && (
        <div className="modal-overlay" onClick={() => { setHistoryFor(null); setHistoryRows([]); }}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ width: 800 }}>
            <h3>History for item #{historyFor}</h3>
            <div style={{ maxHeight: "60vh", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === items.length && items.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(items.map((i: any) => i.id));
                          else setSelectedIds([]);
                        }}
                      />  
                    </th>
                    <th>Image</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Weight (g)</th>
                    <th>Location</th>
                    <th>Show online</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any) => (
                    <tr key={it.id}>
                       <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(it.id)}
                          onChange={() => toggleSelect(it.id)}
                        />
                       </td>

                       <td style={{ width: 84 }}>
                        {it.image_url ? (
                          <img
                            src={it.image_url}
                            className="thumb"
                            alt=""
                            style={{ cursor: "pointer" }}
                            onClick={() => window.open(it.image_url, "_blank")}
                          />
                        ) : (
                          <div className="thumb placeholder">—</div>
                        )}
                       </td>

                       <td>{it.product_name ?? "-"}</td>
                       <td>{it.category_name ?? "-"}</td>
                       <td>{it.subcategory_name ?? "-"}</td>
                       <td>{it.current_location_name ?? "-"}</td>

                       <td style={{ textAlign: "right" }}>
                        {it.weight != null ? Number(it.weight).toFixed(3) : "-"}
                       </td>

                       <td>{it.current_location?.name ?? "-"}</td>

                       <td>
                        <input
                          type="checkbox"
                          checked={!!it.show_on_website}
                          onChange={() => handleToggleShow(it)}
                        />
                       </td>

                       <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn" onClick={() => handleMoveSingle(it)}>
                            Move
                          </button>
                          <button
                            className="btn"
                            onClick={async () => {
                              if (confirm("Mark sold?")) {
                                await markProductSold(
                                  it.id,
                                  it.current_location_id,
                                  "admin",
                                  "sold via admin"
                                );
                                await refreshItems();
                              }
                            }}
                          >
                            Sold
                          </button>
                          <button className="btn ghost" onClick={() => openHistory(it.id)}>
                           Hisotry
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 20 }}>
                        No items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn" onClick={() => { setHistoryFor(null); setHistoryRows([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Move single item modal */}
      {moveModalItem && (
        <div className="modal-overlay" onClick={() => setMoveModalItem(null)}>
          <div
           className="modal-body"
           onClick={(e) => e.stopPropagation()}
           style={{ width: 400 }}
          >
            <h3>Move item #{moveModalItem.id}</h3>

            <div style={{ marginTop: 12 }}>
              <label>Move to location:</label>
              <select
               className="input"
               value={moveModalTarget}
               onChange={(e) =>
                setMoveModalTarget(
                  e.target.value ? Number(e.target.value) : ""
                )
               }
               style={{ width: "100%", marginTop: 6 }}
              >
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.location_id} value={l.location_id}>
                    {l.location_id} – {l.location_name}
                  </option>
              ))}
              </select>
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button className="btn ghost" onClick={() => setMoveModalItem(null)}>
                Cancel
              </button>
              <button
               className="btn"
               onClick={async () => {
                if (!moveModalTarget) {
                  alert("Select a location");
                  return;
                }
                const fromLocationId =
                  moveModalItem.current_location_id ?? selectedLocation;

                if (!fromLocationId){
                  alert("Current location unknown - cannot move item.");
                  return;
                }

                try {
                  setProcessing(true);

                  await moveProductItem(
                    moveModalItem.id,
                    fromLocationId,
                    Number(moveModalTarget),
                    "admin",
                    "move single via modal"
                  );

                  alert("Item moved successfully.");

                  setMoveModalItem(null);
                  setMoveModalTarget("");
                  await refreshItems();
                } catch (err) {
                  console.error("Move failed", err);
                  alert("Move failed - check console for details.");
                } finally {
                  setProcessing(false);
                }
              }}
            >
              Move
              </button>
            </div>
          </div>
        </div>
      )}              
            {/* Image Modal */}
      {imageModal && (
        <div className="modal-overlay" onClick={() => setImageModal(null)}>
          <div
            className="modal-body"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh" }}
          >
            <img
              src={imageModal}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />

            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button className="btn" onClick={() => setImageModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>  
  );
}


   