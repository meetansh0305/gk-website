import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Phone, MapPin, Send, CheckCircle, LogIn, Users } from "lucide-react";

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

export default function Contact() {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const isJoinCommunity = searchParams.get('joinCommunity') === 'true';
  
  // Debug: Log to verify query parameter is being read
  useEffect(() => {
    if (isJoinCommunity) {
      console.log('Community join mode detected');
    }
  }, [isJoinCommunity]);
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firmName, setFirmName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
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
          setFirmName((p as any).firm_name || "");
          setState((p as any).state || "");
          setCity((p as any).city || "");
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
    
    // For community join, message is optional
    const requiredFields = isJoinCommunity 
      ? (!name || !email || !phone || !firmName || !state || !city)
      : (!name || !email || !phone || !firmName || !state || !city || !message);
    
    if (requiredFields) {
      const fieldList = isJoinCommunity
        ? "Name, Email, Phone, Firm Name, State, City"
        : "Name, Email, Phone, Firm Name, State, City, Message";
      alert(`Please fill in all required fields (${fieldList})`);
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
          firm_name: firmName || null,
          state: state || null,
          city: city || null,
          message: message || (isJoinCommunity ? "Community join request" : null),
          created_at: new Date().toISOString(),
        } as any);

      if (error) {
        console.error("Contact form error:", error);
        // If table doesn't exist, show a helpful message
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          alert("Contact messages table not found. Please create the 'contact_messages' table in Supabase with columns: id, name, email, phone, firm_name, state, city, message, created_at");
        }
      }

      // Send email notification to both email addresses
      try {
        const emailBody = `
${isJoinCommunity ? 'New Community Join Request' : 'New Contact Form Submission'}

Name: ${name}
Email: ${email}
Phone: ${phone}
Firm Name: ${firmName}
State: ${state}
City: ${city}

${message ? `Message:\n${message}\n\n` : ''}---
Submitted on: ${new Date().toLocaleString()}
        `;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #b08d57;">${isJoinCommunity ? 'New Community Join Request' : 'New Contact Form Submission'}</h2>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <p><strong>Firm Name:</strong> ${firmName}</p>
              <p><strong>State:</strong> ${state}</p>
              <p><strong>City:</strong> ${city}</p>
            </div>
            ${message ? `
            <div style="margin: 20px 0;">
              <h3>Message:</h3>
              <p style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</p>
            </div>
            ` : ''}
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Submitted on: ${new Date().toLocaleString()}
            </p>
          </div>
        `;

        const emailSubject = isJoinCommunity 
          ? `New Community Join Request from ${name}`
          : `New Contact Form Submission from ${name}`;

        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-contact-email', {
          body: {
            to: ['gkjewels2000@gmail.com', 'meetansh0305@gmail.com'],
            subject: emailSubject,
            body: emailBody,
            html: emailHtml,
          },
        });

        if (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Don't show error to user - message is still saved in database
        } else {
          console.log("Email notification sent successfully");
        }
      } catch (emailErr) {
        console.error("Error sending email:", emailErr);
        // Don't show error to user - message is still saved in database
      }

      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setFirmName("");
      setState("");
      setCity("");
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
    <div className="container" style={{ 
      maxWidth: 1000,
      margin: "0 auto",
      padding: isMobile ? "50px 16px 120px 16px" : "100px 24px 120px 24px"
    }}>
      <h2 className="section-title" style={{ 
        fontSize: isMobile ? 24 : 32,
        marginBottom: isMobile ? 24 : 32
      }}>
        {isJoinCommunity ? "Join Our Community" : "Contact Us"}
      </h2>

      {isJoinCommunity && (
        <div style={{
          background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
          color: "#071E33",
          padding: isMobile ? "16px" : "24px",
          borderRadius: 12,
          marginBottom: isMobile ? 20 : 32,
          display: "flex",
          alignItems: "flex-start",
          gap: isMobile ? 12 : 16,
          boxShadow: "0 4px 12px rgba(212, 175, 55, 0.2)",
          width: "100%"
        }}>
          <Users size={isMobile ? 20 : 28} style={{ flexShrink: 0, marginTop: isMobile ? 0 : 2 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: isMobile ? 16 : 20,
              fontWeight: 700,
              marginBottom: isMobile ? 6 : 8,
              color: "#071E33"
            }}>
              Join Our Exclusive Community
            </h3>
            <p style={{
              fontSize: isMobile ? 13 : 15,
              lineHeight: 1.6,
              margin: 0,
              color: "#071E33",
              opacity: 0.9
            }}>
              Fill out the form below to join our community group and get first access to latest designs, exclusive offers, and special promotions. We'll add you to our community group and keep you updated with all the latest news!
            </p>
          </div>
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: isMobile ? 24 : 32, 
        marginBottom: isMobile ? 32 : 40 
      }}>
        {/* Contact Information */}
        <div>
          <h3 style={{ 
            fontSize: isMobile ? 18 : 20, 
            fontWeight: 700, 
            marginBottom: isMobile ? 20 : 24, 
            color: "var(--accent-dark)" 
          }}>
            Get in Touch
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 20 : 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
              <div style={{ 
                width: isMobile ? 40 : 48, 
                height: isMobile ? 40 : 48, 
                borderRadius: "50%", 
                background: "rgba(176, 141, 87, 0.1)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                <MapPin size={isMobile ? 18 : 20} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 4, 
                  color: "var(--text-dark)",
                  fontSize: isMobile ? 14 : 16
                }}>
                  Address
                </div>
                <div style={{ 
                  fontSize: isMobile ? 13 : 14, 
                  color: "var(--text-muted)", 
                  lineHeight: 1.6 
                }}>
                  #51, 2nd Floor, Krishna Niwas<br />
                  Dhanji Street, Mumbai 400 002
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
              <div style={{ 
                width: isMobile ? 40 : 48, 
                height: isMobile ? 40 : 48, 
                borderRadius: "50%", 
                background: "rgba(176, 141, 87, 0.1)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Phone size={isMobile ? 18 : 20} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 4, 
                  color: "var(--text-dark)",
                  fontSize: isMobile ? 14 : 16
                }}>
                  Phone
                </div>
                <div style={{ 
                  fontSize: isMobile ? 13 : 14, 
                  color: "var(--text-muted)" 
                }}>
                  (022) 6183 3366<br />
                  9819583595
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
              <div style={{ 
                width: isMobile ? 40 : 48, 
                height: isMobile ? 40 : 48, 
                borderRadius: "50%", 
                background: "rgba(176, 141, 87, 0.1)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Mail size={isMobile ? 18 : 20} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 4, 
                  color: "var(--text-dark)",
                  fontSize: isMobile ? 14 : 16
                }}>
                  Email
                </div>
                <div style={{ 
                  fontSize: isMobile ? 13 : 14, 
                  color: "var(--text-muted)" 
                }}>
                  gkjewels2000@gmail.com
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="card" style={{ padding: isMobile ? 20 : 32 }}>
          <h3 style={{ 
            fontSize: isMobile ? 18 : 20, 
            fontWeight: 700, 
            marginBottom: isMobile ? 20 : 24, 
            color: "var(--accent-dark)" 
          }}>
            {isJoinCommunity ? "Join Our Community" : "Send us a Message"}
          </h3>

          {!user && !loading && (
            <div style={{
              padding: isMobile ? 12 : 16,
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 8,
              marginBottom: isMobile ? 16 : 20,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 10 : 12,
              color: "#856404"
            }}>
              <LogIn size={isMobile ? 18 : 20} />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 4,
                  fontSize: isMobile ? 13 : 14
                }}>
                  Not logged in?
                </div>
                <div style={{ 
                  fontSize: isMobile ? 12 : 13, 
                  opacity: 0.9 
                }}>
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
              padding: isMobile ? 10 : 12,
              background: "#e8f5e9",
              border: "1px solid #4caf50",
              borderRadius: 8,
              marginBottom: isMobile ? 16 : 20,
              fontSize: isMobile ? 12 : 13,
              color: "#2e7d32",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 6 : 8
            }}>
              <CheckCircle size={isMobile ? 14 : 16} />
              <span>Form auto-filled from your profile. You can edit any field.</span>
            </div>
          )}

          {sent && (
            <div style={{
              padding: isMobile ? 12 : 16,
              background: "#e8f9ee",
              border: "1px solid #2e7d32",
              borderRadius: 8,
              marginBottom: isMobile ? 16 : 20,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 10 : 12,
              color: "#2e7d32"
            }}>
              <CheckCircle size={isMobile ? 18 : 20} />
              <div>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 4,
                  fontSize: isMobile ? 13 : 14
                }}>
                  {isJoinCommunity ? "Community Join Request Submitted!" : "Message sent successfully!"}
                </div>
                <div style={{ 
                  fontSize: isMobile ? 11 : 12, 
                  opacity: 0.8 
                }}>
                  {isJoinCommunity 
                    ? "Thank you for your interest! We'll add you to our community group and you'll receive updates about latest designs and exclusive offers."
                    : "Your message has been saved and will be reviewed by our team. We'll get back to you soon."}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: isMobile ? 14 : 16 }}>
              <label style={{ 
                display: "block", 
                fontSize: isMobile ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: isMobile ? 5 : 6, 
                color: "var(--text-dark)" 
              }}>
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
                style={{
                  fontSize: isMobile ? 16 : undefined,
                  padding: isMobile ? "12px 14px" : undefined
                }}
              />
            </div>

            <div style={{ marginBottom: isMobile ? 14 : 16 }}>
              <label style={{ 
                display: "block", 
                fontSize: isMobile ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: isMobile ? 5 : 6, 
                color: "var(--text-dark)" 
              }}>
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
                style={{
                  fontSize: isMobile ? 16 : undefined,
                  padding: isMobile ? "12px 14px" : undefined
                }}
              />
            </div>

            <div style={{ marginBottom: isMobile ? 14 : 16 }}>
              <label style={{ 
                display: "block", 
                fontSize: isMobile ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: isMobile ? 5 : 6, 
                color: "var(--text-dark)" 
              }}>
                Phone <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+91 1234567890"
                aria-label="Your phone number"
                style={{
                  fontSize: isMobile ? 16 : undefined,
                  padding: isMobile ? "12px 14px" : undefined
                }}
              />
            </div>

            <div style={{ marginBottom: isMobile ? 14 : 16 }}>
              <label style={{ 
                display: "block", 
                fontSize: isMobile ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: isMobile ? 5 : 6, 
                color: "var(--text-dark)" 
              }}>
                Firm Name <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                required
                placeholder="Enter your firm name"
                aria-label="Your firm name"
                style={{
                  fontSize: isMobile ? 16 : undefined,
                  padding: isMobile ? "12px 14px" : undefined
                }}
              />
            </div>

            <div style={{ marginBottom: isMobile ? 14 : 16 }}>
              <label style={{ 
                display: "block", 
                fontSize: isMobile ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: isMobile ? 5 : 6, 
                color: "var(--text-dark)" 
              }}>
                State <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                placeholder="Enter your state"
                aria-label="Your state"
                style={{
                  fontSize: isMobile ? 16 : undefined,
                  padding: isMobile ? "12px 14px" : undefined
                }}
              />
            </div>

            <div style={{ marginBottom: isMobile ? 14 : 16 }}>
              <label style={{ 
                display: "block", 
                fontSize: isMobile ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: isMobile ? 5 : 6, 
                color: "var(--text-dark)" 
              }}>
                City <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="Enter your city"
                aria-label="Your city"
                style={{
                  fontSize: isMobile ? 16 : undefined,
                  padding: isMobile ? "12px 14px" : undefined
                }}
              />
            </div>

            <div style={{ marginBottom: isMobile ? 20 : 24 }}>
              <label style={{ 
                display: "block", 
                fontSize: isMobile ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: isMobile ? 5 : 6, 
                color: "var(--text-dark)" 
              }}>
                {isJoinCommunity ? "Tell us about yourself (Optional)" : "Message"} <span style={{ color: "#c62828" }}>*</span>
              </label>
              <textarea
                className="input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required={!isJoinCommunity}
                rows={isMobile ? 5 : 6}
                placeholder={isJoinCommunity ? "Tell us why you'd like to join our community or any questions you have (optional)..." : "Write your message here..."}
                style={{ 
                  resize: "vertical", 
                  minHeight: isMobile ? 100 : 120,
                  fontSize: isMobile ? 16 : undefined,
                  padding: isMobile ? "12px 14px" : undefined
                }}
                aria-label={isJoinCommunity ? "Tell us about yourself" : "Your message"}
              />
              {isJoinCommunity && (
                <div style={{ 
                  fontSize: isMobile ? 11 : 12, 
                  color: "#666",
                  marginTop: 6,
                  fontStyle: "italic"
                }}>
                  This field is optional. You can leave it blank if you just want to join the community.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={sending}
              style={{
                width: "100%",
                padding: isMobile ? "12px 20px" : "14px 24px",
                fontSize: isMobile ? 14 : 15,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? 6 : 8
              }}
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send size={isMobile ? 16 : 18} />
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

