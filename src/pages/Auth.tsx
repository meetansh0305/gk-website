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

      setMsg("Signup successful! Please verify your email.");
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
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      background: "#fff"
    }}>
      {/* Left Side - Brand Image */}
      <div style={{
        background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop') center/cover`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
        color: "#fff"
      }}>
        <img 
          src="/logo.png" 
          alt="Gurukrupa Jewellers" 
          style={{ 
            height: 100,
            marginBottom: 40,
            filter: "brightness(0) invert(1)"
          }} 
        />
        <h2 style={{
          fontSize: 36,
          fontWeight: 300,
          marginBottom: 20,
          letterSpacing: "-0.5px",
          textAlign: "center"
        }}>
          Timeless Elegance
        </h2>
        <p style={{
          fontSize: 15,
          lineHeight: 1.8,
          maxWidth: 400,
          textAlign: "center",
          opacity: 0.9,
          fontWeight: 300
        }}>
          Crafting exquisite jewellery since generations. Each piece tells a story of tradition, beauty, and unparalleled craftsmanship.
        </p>
      </div>

      {/* Right Side - Form */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        background: "#fafafa"
      }}>
        <div style={{ 
          width: "100%",
          maxWidth: 440
        }}>
          
          <h2 style={{ 
            fontSize: 32,
            fontWeight: 300,
            marginBottom: 12,
            color: "#1a1a1a",
            letterSpacing: "-0.5px"
          }}>
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>

          <p style={{ 
            color: "#666",
            fontSize: 14,
            marginBottom: 48,
            fontWeight: 300
          }}>
            {mode === "login" 
              ? "Sign in to your account" 
              : "Begin your journey with us"
            }
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
            <div>
              <label style={{ 
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 12,
                color: "#999",
                letterSpacing: "1px",
                textTransform: "uppercase"
              }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 0,
                  border: "1px solid #e8e8e8",
                  fontSize: 15,
                  transition: "border-color 0.2s ease",
                  background: "#fff",
                  fontWeight: 300
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
              />
            </div>

            <div>
              <label style={{ 
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 12,
                color: "#999",
                letterSpacing: "1px",
                textTransform: "uppercase"
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 0,
                  border: "1px solid #e8e8e8",
                  fontSize: 15,
                  transition: "border-color 0.2s ease",
                  background: "#fff",
                  fontWeight: 300
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
              />
              {mode === "signup" && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#999",
                  marginTop: 8,
                  fontWeight: 300
                }}>
                  Minimum 6 characters
                </div>
              )}
            </div>

            <button 
              type="submit"
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 0,
                border: "none",
                background: "#1a1a1a",
                color: "#fff",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginTop: 16,
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1a1a1a";
              }}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {msg && (
            <div style={{ 
              marginTop: 24,
              padding: "14px 16px",
              borderRadius: 0,
              background: msg.includes("successful") ? "#f0f9f4" : "#fef2f2",
              color: msg.includes("successful") ? "#166534" : "#991b1b",
              fontSize: 13,
              border: `1px solid ${msg.includes("successful") ? "#bbf7d0" : "#fecaca"}`,
              fontWeight: 300
            }}>
              {msg}
            </div>
          )}

          <div style={{ 
            marginTop: 40,
            textAlign: "center",
            paddingTop: 32,
            borderTop: "1px solid #e8e8e8"
          }}>
            <span style={{ color: "#666", fontSize: 14, fontWeight: 300 }}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button 
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              style={{
                marginLeft: 8,
                background: "transparent",
                border: "none",
                color: "#1a1a1a",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "underline"
              }}
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 968px) {
          body > div > div {
            grid-template-columns: 1fr !important;
          }
          body > div > div > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}