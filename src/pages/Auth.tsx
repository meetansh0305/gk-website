import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (!email || !password) {
      setMsg("Email and password required.");
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return setMsg(error.message);

      setMsg("Signup successful! Please verify email.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return setMsg(error.message);

    navigate("/profile");
  };

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 40 }}>
      
      {/* LOGO */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img src="/logo.png" alt="GK Logo" style={{ height: 70 }} />
      </div>

      <h2 style={{ textAlign: "center" }}>
        {mode === "login" ? "Login" : "Signup"}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn primary" type="submit">
          {mode === "login" ? "Login" : "Signup"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 16, color: "crimson" }}>{msg}</p>}

      <div style={{ marginTop: 20, textAlign: "center" }}>
        {mode === "login" ? (
          <>
            Don't have an account?
            <button className="btn" onClick={() => setMode("signup")}>
              Signup
            </button>
          </>
        ) : (
          <>
            Already have an account?
            <button className="btn" onClick={() => setMode("login")}>
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
