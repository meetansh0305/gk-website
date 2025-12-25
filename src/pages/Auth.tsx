import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if user is coming from password reset email
  useEffect(() => {
    const hashParams = window.location.hash;
    if (hashParams.includes("type=recovery")) {
      // Supabase will automatically handle the session from the hash
      // We just need to switch to reset mode
      setMode("reset");
      // Clear the hash from URL for cleaner UX
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    if (mode === "forgot") {
      if (!email) {
        setMsg("Email is required.");
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setMsg("Please enter a valid email address.");
        setLoading(false);
        return;
      }

      try {
        const redirectUrl = `${window.location.origin}/auth`;
        console.log("Sending password reset email to:", email);
        console.log("Redirect URL:", redirectUrl);
        console.log("Note: Make sure this URL is added to Supabase Auth → URL Configuration → Redirect URLs");

        // Try with redirectTo first
        let result = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectUrl,
        });

        // If that fails with redirect error, try without redirectTo
        if (result.error && (result.error.message && (result.error.message.includes("redirect") || result.error.message.includes("URL") || result.error.message.includes("whitelist")))) {
          console.log("Redirect URL error detected. Retrying without redirectTo...");
          console.log("Note: You may need to add the redirect URL in Supabase Dashboard → Authentication → URL Configuration");
          result = await supabase.auth.resetPasswordForEmail(email.trim());
        }

        const { data, error } = result;

        if (error) {
          console.error("Password reset error:", error);
          console.error("Full error object:", JSON.stringify(error, null, 2));
          
          // Provide more user-friendly error messages
          if (error.message.includes("rate limit") || error.message.includes("too many")) {
            setMsg("Too many requests. Please wait a few minutes before trying again.");
          } else if (error.message.includes("not found") || error.message.includes("user")) {
            // For security, don't reveal if email exists - show success message
            setMsg("If an account exists with this email, a password reset link has been sent. Please check your inbox.");
          } else if (error.status === 500 || error.code === "unexpected_failure" || (error.message && error.message.toLowerCase().includes("error sending"))) {
            setMsg("Email service not configured. Please configure email settings in Supabase Dashboard: Go to Authentication → Email Templates and ensure email service is set up, or configure SMTP in Project Settings → Auth.");
          } else if (error.message.includes("email") && error.message.includes("send")) {
            setMsg("Unable to send email. Please check your Supabase email configuration or contact support.");
          } else {
            setMsg(`Error: ${error.message || "Unknown error"}. Please check the browser console for details.`);
          }
          setLoading(false);
          return;
        }

        // Success - even if user doesn't exist, we show success for security
        setMsg("If an account exists with this email, a password reset link has been sent. Please check your inbox (and spam folder).");
        setLoading(false);
        return;
      } catch (err: any) {
        console.error("Unexpected error during password reset:", err);
        setMsg(`An unexpected error occurred: ${err?.message || "Unknown error"}. Please try again later or contact support.`);
        setLoading(false);
        return;
      }
    }

    if (mode === "reset") {
      if (!newPassword || !confirmPassword) {
        setMsg("Both password fields are required.");
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setMsg("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setMsg("Passwords do not match.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setMsg("Session expired or invalid. Please open the reset link again.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      setMsg("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        setMode("login");
        setNewPassword("");
        setConfirmPassword("");
        setLoading(false);
      }, 2000);
      return;
    }

    if (!email || !password) {
      setMsg("Email and password required.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      setMsg("Signup successful! Please verify your email.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    navigate("/profile");
    setLoading(false);
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
            {mode === "login" ? "Welcome Back" 
              : mode === "signup" ? "Create Account"
              : mode === "forgot" ? "Reset Password"
              : "Set New Password"}
          </h2>

          <p style={{ 
            color: "#666",
            fontSize: 14,
            marginBottom: 48,
            fontWeight: 300
          }}>
            {mode === "login" 
              ? "Sign in to your account" 
              : mode === "signup"
              ? "Begin your journey with us"
              : mode === "forgot"
              ? "Enter your email to receive a password reset link"
              : "Enter your new password"}
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

            {mode !== "forgot" && mode !== "reset" && (
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
                {mode === "login" && (
                  <div style={{ 
                    marginTop: 12,
                    textAlign: "right"
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setPassword("");
                        setMsg("");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#1a1a1a",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 400,
                        textDecoration: "underline",
                        padding: 0
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === "reset" && (
              <>
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
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  <div style={{ 
                    fontSize: 12, 
                    color: "#999",
                    marginTop: 8,
                    fontWeight: 300
                  }}>
                    Minimum 6 characters
                  </div>
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
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
              </>
            )}

            <button 
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 0,
                border: "none",
                background: loading ? "#999" : "#1a1a1a",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginTop: 16,
                transition: "all 0.3s ease",
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#000";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#1a1a1a";
              }}
            >
              {loading 
                ? "Processing..." 
                : mode === "login" 
                ? "Sign In" 
                : mode === "signup"
                ? "Create Account"
                : mode === "forgot"
                ? "Send Reset Link"
                : "Update Password"}
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

          {(mode === "login" || mode === "signup") && (
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
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setMsg("");
                }}
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
          )}

          {mode === "forgot" && (
            <div style={{ 
              marginTop: 40,
              textAlign: "center",
              paddingTop: 32,
              borderTop: "1px solid #e8e8e8"
            }}>
              <span style={{ color: "#666", fontSize: 14, fontWeight: 300 }}>
                Remember your password?
              </span>
              <button 
                onClick={() => {
                  setMode("login");
                  setMsg("");
                  setEmail("");
                }}
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
                Sign In
              </button>
            </div>
          )}

          {mode === "reset" && (
            <div style={{ 
              marginTop: 40,
              textAlign: "center",
              paddingTop: 32,
              borderTop: "1px solid #e8e8e8"
            }}>
              <span style={{ color: "#666", fontSize: 14, fontWeight: 300 }}>
                Remember your password?
              </span>
              <button 
                onClick={() => {
                  setMode("login");
                  setMsg("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
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
                Sign In
              </button>
            </div>
          )}
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