import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [fullName, setFullName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

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
      })
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

          <button className="btn" style={{ marginTop: 10 }} onClick={() => setEditMode(true)}>
            Edit Profile
          </button>
        </div>
      )}

      {/* ➤ EDIT MODE FORM */}
      {editMode && (
        <div className="card" style={{ maxWidth: 420 }}>
          <label>Email</label>
          <input className="input" value={user.email} disabled />

          <label>Full Name</label>
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <label>Phone</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label>City</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <label>State</label>
          <input
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />

          <button className="btn" disabled={saving} onClick={save} style={{ marginTop: 10 }}>
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            className="btn"
            style={{ marginTop: 10, background: "#ccc", color: "black" }}
            onClick={() => setEditMode(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
