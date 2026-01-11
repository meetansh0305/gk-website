import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Phone, MapPin, Building2, Briefcase, Edit2, Save, X, Wallet, LogOut } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

// Hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Check authentication on mount - using localStorage workaround
  useEffect(() => {
    (async () => {
      // Check localStorage first (workaround for Supabase client hanging)
      const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      let sessionUser = null;
      
      if (projectRef) {
        const storageKey = `sb-${projectRef}-auth-token`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const sessionData = JSON.parse(stored);
            if (sessionData.user) {
              sessionUser = sessionData.user;
            }
          } catch (e) {
            console.error("Profile: Error parsing stored session:", e);
          }
        }
      }
      
      if (sessionUser) {
        setUser(sessionUser);
        setCheckingAuth(false);
      } else {
        // Try Supabase with timeout
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("getSession timeout")), 2000);
          });
          
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          if (session?.user) {
            setUser(session.user);
            setCheckingAuth(false);
          } else {
            navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
          }
        } catch (e: any) {
          navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      }
    })();
  }, [navigate, location]);

  useEffect(() => {
    if (checkingAuth || !user) return;

    const loadProfile = async () => {
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
    };

    // Initial load
    loadProfile();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // User logged in - reload profile
        setLoading(true);
        loadProfile();
      } else {
        // User logged out - redirect to auth
        setUser(null);
        setProfile(null);
        setFullName("");
        setCity("");
        setState("");
        setPhone("");
        setFirmName("");
        setBusinessType("");
        setLoading(false);
        navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user, checkingAuth, navigate, location]);

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

  if (checkingAuth) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: isMobile ? "50px 16px" : "100px 16px"
      }}>
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: isMobile ? "50px 16px" : "100px 16px"
      }}>
        <LoadingSpinner size="large" message="Loading your profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        padding: isMobile ? "50px 16px 120px 16px" : "80px 48px 100px 48px",
        maxWidth: 600,
        margin: "0 auto",
        textAlign: "center"
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 24,
          border: "1px solid #e8e4dc",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          padding: isMobile ? "60px 24px" : "80px 40px"
        }}>
          <User size={64} style={{ color: "#b08d57", marginBottom: 24 }} />
          <h2 style={{
            fontSize: isMobile ? 24 : 32,
            fontWeight: 700,
            marginBottom: 12,
            color: "#071E33",
            fontFamily: "'Playfair Display', Georgia, serif"
          }}>
            Login Required
          </h2>
          <p style={{
            color: "#8b7355",
            fontSize: isMobile ? 14 : 16,
            marginBottom: 32
          }}>
            You must log in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: isMobile ? "50px 16px 120px 16px" : "80px 48px 100px 48px",
      maxWidth: 1000,
      margin: "0 auto",
      background: "linear-gradient(180deg, #fefdfb 0%, #faf8f5 30%, #f5f3ed 100%)",
      minHeight: "100vh",
      boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{
        marginBottom: isMobile ? 32 : 48,
        textAlign: "center",
        position: "relative"
      }}>
        <h1 style={{
          fontSize: isMobile ? 32 : 42,
          fontWeight: 700,
          marginBottom: isMobile ? 8 : 12,
          color: "#071E33",
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: "-0.8px",
          lineHeight: 1.2
        }}>
          My Profile
        </h1>
        <p style={{
          fontSize: isMobile ? 14 : 16,
          color: "#8b7355",
          fontWeight: 500,
          letterSpacing: "0.2px",
          margin: 0
        }}>
          Manage your account information
        </p>
        {user && (
          <button
            onClick={handleLogout}
            style={{
              position: isMobile ? "static" : "absolute",
              top: isMobile ? "auto" : 0,
              right: isMobile ? "auto" : 0,
              marginTop: isMobile ? 16 : 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: isMobile ? "10px 20px" : "12px 24px",
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              borderRadius: 50,
              border: "1px solid #e8e4dc",
              background: "#fff",
              color: "#8b7355",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.background = "#fff5f5";
                e.currentTarget.style.borderColor = "#c62828";
                e.currentTarget.style.color = "#c62828";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(198, 40, 40, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e8e4dc";
                e.currentTarget.style.color = "#8b7355";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
              }
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        )}
      </div>

      {/* Account Balance Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #071E33 0%, #0a2642 100%)",
          color: "#fff",
          borderRadius: 20,
          padding: isMobile ? "24px" : "32px",
          marginBottom: isMobile ? 24 : 32,
          boxShadow: "0 8px 32px rgba(7, 30, 51, 0.2)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: "radial-gradient(circle, rgba(176, 141, 87, 0.1) 0%, transparent 70%)",
          borderRadius: "50%"
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div style={{
            width: isMobile ? 48 : 56,
            height: isMobile ? 48 : 56,
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Wallet size={isMobile ? 24 : 28} />
          </div>
          <div>
            <div style={{
              fontSize: isMobile ? 13 : 14,
              opacity: 0.9,
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase"
            }}>
              Account Balance
            </div>
            <div style={{
              fontSize: isMobile ? 32 : 42,
              fontWeight: 700,
              lineHeight: 1.2,
              marginTop: 4
            }}>
              {(profile?.balance_grams ?? 0).toFixed(3)} <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 500 }}>grams</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information Display */}
      {!editMode && (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e8e4dc",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          padding: isMobile ? "24px" : "32px",
          marginBottom: isMobile ? 24 : 32
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? 24 : 32,
            paddingBottom: isMobile ? 20 : 24,
            borderBottom: "2px solid #e8e4dc"
          }}>
            <h2 style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 700,
              color: "#071E33",
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: 0
            }}>
              Personal Information
            </h2>
            <button
              onClick={() => setEditMode(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: isMobile ? "10px 20px" : "12px 24px",
                fontSize: isMobile ? 13 : 14,
                fontWeight: 600,
                borderRadius: 50,
                border: "1px solid #b08d57",
                background: "#fff",
                color: "#b08d57",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.background = "#b08d57";
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(176, 141, 87, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.color = "#b08d57";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
          </div>

          <div style={{
            display: "grid",
            gap: isMobile ? 20 : 24
          }}>
            {/* Email */}
            <div style={{
              display: "flex",
              gap: isMobile ? 12 : 16,
              alignItems: "flex-start"
            }}>
              <div style={{
                width: isMobile ? 40 : 48,
                height: isMobile ? 40 : 48,
                borderRadius: 12,
                background: "#faf8f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Mail size={isMobile ? 18 : 20} style={{ color: "#b08d57" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: "#8b7355",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Email Address
                </div>
                <div style={{
                  fontSize: isMobile ? 15 : 16,
                  fontWeight: 500,
                  color: "#071E33"
                }}>
                  {user.email}
                </div>
              </div>
          </div>

            {/* Full Name */}
            <div style={{
              display: "flex",
              gap: isMobile ? 12 : 16,
              alignItems: "flex-start"
            }}>
              <div style={{
                width: isMobile ? 40 : 48,
                height: isMobile ? 40 : 48,
                borderRadius: 12,
                background: "#faf8f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <User size={isMobile ? 18 : 20} style={{ color: "#b08d57" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: "#8b7355",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Full Name
                </div>
                <div style={{
                  fontSize: isMobile ? 15 : 16,
                  fontWeight: 500,
                  color: "#071E33"
                }}>
                  {profile?.full_name || <span style={{ color: "#999", fontStyle: "italic" }}>Not provided</span>}
                </div>
              </div>
          </div>

            {/* Phone */}
            <div style={{
              display: "flex",
              gap: isMobile ? 12 : 16,
              alignItems: "flex-start"
            }}>
              <div style={{
                width: isMobile ? 40 : 48,
                height: isMobile ? 40 : 48,
                borderRadius: 12,
                background: "#faf8f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Phone size={isMobile ? 18 : 20} style={{ color: "#b08d57" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: "#8b7355",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Phone Number
                </div>
                <div style={{
                  fontSize: isMobile ? 15 : 16,
                  fontWeight: 500,
                  color: "#071E33"
                }}>
                  {profile?.phone || <span style={{ color: "#999", fontStyle: "italic" }}>Not provided</span>}
                </div>
              </div>
          </div>

            {/* Location */}
            {(profile?.city || profile?.state) && (
              <div style={{
                display: "flex",
                gap: isMobile ? 12 : 16,
                alignItems: "flex-start"
              }}>
                <div style={{
                  width: isMobile ? 40 : 48,
                  height: isMobile ? 40 : 48,
                  borderRadius: 12,
                  background: "#faf8f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <MapPin size={isMobile ? 18 : 20} style={{ color: "#b08d57" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 600,
                    color: "#8b7355",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Location
                  </div>
                  <div style={{
                    fontSize: isMobile ? 15 : 16,
                    fontWeight: 500,
                    color: "#071E33"
                  }}>
                    {[profile?.city, profile?.state].filter(Boolean).join(", ") || <span style={{ color: "#999", fontStyle: "italic" }}>Not provided</span>}
                  </div>
                </div>
          </div>
            )}

            {/* Firm Name */}
          {(profile as any)?.firm_name && (
              <div style={{
                display: "flex",
                gap: isMobile ? 12 : 16,
                alignItems: "flex-start"
              }}>
                <div style={{
                  width: isMobile ? 40 : 48,
                  height: isMobile ? 40 : 48,
                  borderRadius: 12,
                  background: "#faf8f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Building2 size={isMobile ? 18 : 20} style={{ color: "#b08d57" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 600,
                    color: "#8b7355",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Firm Name
                  </div>
                  <div style={{
                    fontSize: isMobile ? 15 : 16,
                    fontWeight: 500,
                    color: "#071E33"
                  }}>
                    {(profile as any).firm_name}
                  </div>
                </div>
            </div>
          )}

            {/* Business Type */}
          {(profile as any)?.business_type && (
              <div style={{
                display: "flex",
                gap: isMobile ? 12 : 16,
                alignItems: "flex-start"
              }}>
                <div style={{
                  width: isMobile ? 40 : 48,
                  height: isMobile ? 40 : 48,
                  borderRadius: 12,
                  background: "#faf8f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Briefcase size={isMobile ? 18 : 20} style={{ color: "#b08d57" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 600,
                    color: "#8b7355",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Business Type
                  </div>
                  <div style={{
                    fontSize: isMobile ? 15 : 16,
                    fontWeight: 500,
                    color: "#071E33"
                  }}>
                    {String((profile as any).business_type || "").charAt(0).toUpperCase() + String((profile as any).business_type || "").slice(1)}
                  </div>
                </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Edit Mode Form */}
      {editMode && (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e8e4dc",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          padding: isMobile ? "24px" : "32px"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? 24 : 32,
            paddingBottom: isMobile ? 20 : 24,
            borderBottom: "2px solid #e8e4dc"
          }}>
            <h2 style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 700,
              color: "#071E33",
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: 0
            }}>
              Edit Profile
            </h2>
            <button
              onClick={() => setEditMode(false)}
              style={{
                width: isMobile ? 36 : 40,
                height: isMobile ? 36 : 40,
                borderRadius: 50,
                border: "1px solid #e8e4dc",
                background: "#fff",
                color: "#8b7355",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.background = "#faf8f5";
                  e.currentTarget.style.borderColor = "#b08d57";
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#e8e4dc";
                }
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{ display: "grid", gap: isMobile ? 20 : 24 }}>
            {/* Email - Disabled */}
            <div>
              <label style={{
                display: "block",
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: "#8b7355",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Email Address
              </label>
              <input 
                value={user.email} 
                disabled
                style={{
                  width: "100%",
                  padding: isMobile ? "12px 16px" : "14px 18px",
                  fontSize: isMobile ? 14 : 15,
                  borderRadius: 12,
                  border: "1px solid #e8e4dc",
                  background: "#faf8f5",
                  color: "#666",
                  boxSizing: "border-box",
                  fontFamily: "inherit"
                }}
                aria-label="Email address"
              />
              <div style={{
                fontSize: isMobile ? 11 : 12,
                color: "#999",
                marginTop: 6
              }}>
                Email cannot be changed
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label style={{
                display: "block",
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: "#8b7355",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                style={{
                  width: "100%",
                  padding: isMobile ? "12px 16px" : "14px 18px",
                  fontSize: isMobile ? 14 : 15,
                  borderRadius: 12,
                  border: "1px solid #e8e4dc",
                  background: "#fff",
                  color: "#071E33",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#b08d57";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176, 141, 87, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e8e4dc";
                  e.currentTarget.style.boxShadow = "none";
                }}
                aria-label="Full name"
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{
                display: "block",
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: "#8b7355",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 1234567890"
                style={{
                  width: "100%",
                  padding: isMobile ? "12px 16px" : "14px 18px",
                  fontSize: isMobile ? 14 : 15,
                  borderRadius: 12,
                  border: "1px solid #e8e4dc",
                  background: "#fff",
                  color: "#071E33",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#b08d57";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176, 141, 87, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e8e4dc";
                  e.currentTarget.style.boxShadow = "none";
                }}
                aria-label="Phone number"
              />
            </div>

            {/* City and State */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? 20 : 24
            }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: "#8b7355",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 16px" : "14px 18px",
                    fontSize: isMobile ? 14 : 15,
                    borderRadius: 12,
                    border: "1px solid #e8e4dc",
                    background: "#fff",
                    color: "#071E33",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#b08d57";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176, 141, 87, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e8e4dc";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  aria-label="City"
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: "#8b7355",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  State
                </label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Enter state"
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 16px" : "14px 18px",
                    fontSize: isMobile ? 14 : 15,
                    borderRadius: 12,
                    border: "1px solid #e8e4dc",
                    background: "#fff",
                    color: "#071E33",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#b08d57";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176, 141, 87, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e8e4dc";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  aria-label="State"
                />
              </div>
            </div>

            {/* Firm Name */}
            <div>
              <label style={{
                display: "block",
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: "#8b7355",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Firm Name <span style={{ fontSize: 11, color: "#999", fontWeight: 400, textTransform: "none" }}>(Optional)</span>
              </label>
              <input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Enter your firm/business name"
                style={{
                  width: "100%",
                  padding: isMobile ? "12px 16px" : "14px 18px",
                  fontSize: isMobile ? 14 : 15,
                  borderRadius: 12,
                  border: "1px solid #e8e4dc",
                  background: "#fff",
                  color: "#071E33",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#b08d57";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176, 141, 87, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e8e4dc";
                  e.currentTarget.style.boxShadow = "none";
                }}
                aria-label="Firm name"
              />
            </div>

            {/* Business Type */}
            <div>
              <label style={{
                display: "block",
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: "#8b7355",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Business Type <span style={{ fontSize: 11, color: "#999", fontWeight: 400, textTransform: "none" }}>(Optional)</span>
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: isMobile ? "12px 16px" : "14px 18px",
                  fontSize: isMobile ? 14 : 15,
                  borderRadius: 12,
                  border: "1px solid #e8e4dc",
                  background: "#fff",
                  color: "#071E33",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#b08d57";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(176, 141, 87, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e8e4dc";
                  e.currentTarget.style.boxShadow = "none";
                }}
                aria-label="Business type"
              >
                <option value="">Select Business Type</option>
                <option value="wholesale">Wholesale</option>
                <option value="retail">Retail</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: isMobile ? 12 : 16,
              marginTop: isMobile ? 8 : 12,
              flexWrap: "wrap"
            }}>
              <button 
                disabled={saving} 
                onClick={save} 
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: isMobile ? "14px 32px" : "16px 40px",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  borderRadius: 50,
                  border: "none",
                  background: saving ? "#ccc" : "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)",
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: saving ? "none" : "0 8px 24px rgba(176, 141, 87, 0.3)",
                  minWidth: isMobile ? 140 : 160
                }}
                onMouseEnter={(e) => {
                  if (!isMobile && !saving) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(176, 141, 87, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile && !saving) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.3)";
                  }
                }}
                aria-label="Save profile"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditMode(false)}
                style={{
                  padding: isMobile ? "14px 32px" : "16px 40px",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  borderRadius: 50,
                  border: "1px solid #e8e4dc",
                  background: "#fff",
                  color: "#8b7355",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  minWidth: isMobile ? 120 : 140
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.background = "#faf8f5";
                    e.currentTarget.style.borderColor = "#b08d57";
                    e.currentTarget.style.color = "#b08d57";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "#e8e4dc";
                    e.currentTarget.style.color = "#8b7355";
                  }
                }}
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
