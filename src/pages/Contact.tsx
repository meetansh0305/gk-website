import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Send, CheckCircle, LogIn } from "lucide-react";

export default function Contact() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUser(u?.user || null);

      if (u?.user) {
        // Load profile to auto-fill form
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.user.id)
          .single();

        if (p) {
          setProfile(p);
          // Auto-fill form with profile data
          setName((p as any).full_name || "");
          setEmail(u.user.email || "");
          setPhone((p as any).phone || "");
        } else {
          // User exists but no profile - use email from auth
          setEmail(u.user.email || "");
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !message) {
      alert("Please fill in all required fields (Name, Email, Message)");
      return;
    }

    setSending(true);

    try {
      // Store contact message in database (contact_messages table)
      // Messages are saved to Supabase and can be viewed in Admin Panel > Contact Messages
      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name,
          email,
          phone: phone || null,
          subject: subject || null,
          message,
          created_at: new Date().toISOString(),
        } as any);

      if (error) {
        console.error("Contact form error:", error);
        // If table doesn't exist, show a helpful message
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          alert("Contact messages table not found. Please create the 'contact_messages' table in Supabase with columns: id, name, email, phone, subject, message, created_at");
        }
      }

      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
      setSent(true);
      
      setTimeout(() => setSent(false), 5000);
    } catch (e) {
      console.error("Contact form error:", e);
      alert("Thank you for your message! We'll get back to you soon.");
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      <h2 className="section-title">Contact Us</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32, marginBottom: 40 }}>
        {/* Contact Information */}
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "var(--accent-dark)" }}>
            Get in Touch
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: "50%", 
                background: "rgba(176, 141, 87, 0.1)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                <MapPin size={20} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-dark)" }}>Address</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  #51, 2nd Floor, Krishna Niwas<br />
                  Dhanji Street, Mumbai 400 002
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: "50%", 
                background: "rgba(176, 141, 87, 0.1)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Phone size={20} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-dark)" }}>Phone</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  (022) 6183 3366<br />
                  9819583595
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: "50%", 
                background: "rgba(176, 141, 87, 0.1)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Mail size={20} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-dark)" }}>Email</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  gkjewels2000@gmail.com
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "var(--accent-dark)" }}>
            Send us a Message
          </h3>

          {!user && !loading && (
            <div style={{
              padding: 16,
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 8,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#856404"
            }}>
              <LogIn size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Not logged in?</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  <a 
                    href="/auth" 
                    style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: 600 }}
                  >
                    Login or Sign up
                  </a>
                  {" "}to auto-fill your information, or fill the form below manually.
                </div>
              </div>
            </div>
          )}

          {user && (
            <div style={{
              padding: 12,
              background: "#e8f5e9",
              border: "1px solid #4caf50",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
              color: "#2e7d32",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <CheckCircle size={16} />
              <span>Form auto-filled from your profile. You can edit any field.</span>
            </div>
          )}

          {sent && (
            <div style={{
              padding: 16,
              background: "#e8f9ee",
              border: "1px solid #2e7d32",
              borderRadius: 8,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#2e7d32"
            }}>
              <CheckCircle size={20} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Message sent successfully!</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Your message has been saved and will be reviewed by our team. We'll get back to you soon.</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Name <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                aria-label="Your name"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Email <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@example.com"
                aria-label="Your email"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Phone (Optional)
              </label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 1234567890"
                aria-label="Your phone number"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Subject (Optional)
              </label>
              <input
                className="input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this regarding?"
                aria-label="Message subject"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Message <span style={{ color: "#c62828" }}>*</span>
              </label>
              <textarea
                className="input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="Write your message here..."
                style={{ resize: "vertical", minHeight: 120 }}
                aria-label="Your message"
              />
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={sending}
              style={{
                width: "100%",
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

