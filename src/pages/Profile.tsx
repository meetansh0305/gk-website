import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [fullName, setFullName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [firmName, setFirmName] = useState("");
  const [businessType, setBusinessType] = useState<"wholesale" | "retail" | "manufacturer" | "">("");

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUser(u?.user || null);

      if (u?.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.user.id)
          .single();

        if (p) {
          setProfile(p);
          setFullName(p.full_name || "");
          setCity(p.city || "");
          setState(p.state || "");
          setPhone(p.phone || "");
          setFirmName((p as any).firm_name || "");
          setBusinessType((p as any).business_type || "");
        }
      }

      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        state,
        city,
        phone,
        firm_name: firmName || null,
        business_type: businessType || null,
      } as any)
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.error("Profile save error:", error);
      return alert("Error saving profile");
    }

    // update local profile and exit edit mode
    const newProfile = {
      ...profile,
      full_name: fullName,
      state,
      city,
      phone,
    };

    setProfile(newProfile);
    setEditMode(false);
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="container">
        <h2 className="section-title">Login / Signup</h2>
        <p>You must log in first.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="section-title">My Profile</h2>

      {/* BALANCE CARD */}
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 20,
          background: "#071E33",
          color: "white",
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 16, opacity: 0.8 }}>Account Balance</div>
        <div style={{ fontSize: 32, fontWeight: 900 }}>
          {(profile?.balance_grams ?? 0).toFixed(3)} g
        </div>
      </div>

      {/* ➤ SHOW SUMMARY IF NOT EDITING */}
      {!editMode && (
        <div className="card" style={{ maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <strong>Email:</strong> {user.email}
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong>Name:</strong> {profile?.full_name || "-"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong>Phone:</strong> {profile?.phone || "-"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong>City:</strong> {profile?.city || "-"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong>State:</strong> {profile?.state || "-"}
          </div>

          {(profile as any)?.firm_name && (
            <div style={{ marginBottom: 10 }}>
              <strong>Firm Name:</strong> {(profile as any).firm_name || "-"}
            </div>
          )}

          {(profile as any)?.business_type && (
            <div style={{ marginBottom: 10 }}>
              <strong>Business Type:</strong> {String((profile as any).business_type || "-").charAt(0).toUpperCase() + String((profile as any).business_type || "").slice(1)}
            </div>
          )}

          <button className="btn" style={{ marginTop: 10 }} onClick={() => setEditMode(true)}>
            Edit Profile
          </button>
        </div>
      )}

      {/* ➤ EDIT MODE FORM */}
      {editMode && (
        <div className="card" style={{ maxWidth: 600, padding: 24 }}>
          <h3 style={{ margin: "0 0 24px 0", color: "var(--accent-dark)", fontWeight: 700 }}>Edit Profile</h3>
          
          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Email
              </label>
              <input 
                className="input" 
                value={user.email} 
                disabled
                aria-label="Email address"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Full Name
              </label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                aria-label="Full name"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Phone
              </label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 1234567890"
                aria-label="Phone number"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                  City
                </label>
                <input
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                  aria-label="City"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                  State
                </label>
                <input
                  className="input"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Enter state"
                  aria-label="State"
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Firm Name <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                className="input"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Enter your firm/business name"
                aria-label="Firm name"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Business Type <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(Optional)</span>
              </label>
              <select
                className="input"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as any)}
                aria-label="Business type"
              >
                <option value="">Select Business Type</option>
                <option value="wholesale">Wholesale</option>
                <option value="retail">Retail</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              <button 
                className="btn primary" 
                disabled={saving} 
                onClick={save} 
                style={{ minHeight: 44, minWidth: 120 }}
                aria-label="Save profile"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="btn"
                style={{ minHeight: 44, minWidth: 100 }}
                onClick={() => setEditMode(false)}
                aria-label="Cancel editing"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
