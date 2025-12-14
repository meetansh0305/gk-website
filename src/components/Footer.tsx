import { MapPin, Phone, Mail, Globe, Clock, Gem } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{ 
      marginTop: 60, 
      background: "linear-gradient(180deg, #f5f3ef 0%, #ebe7df 100%)",
      borderTop: "1px solid #e8e4dc"
    }}>
      {/* Main Footer Content */}
      <div style={{ 
        maxWidth: 1200, 
        margin: "0 auto", 
        padding: "48px 24px 32px",
        display: "grid", 
        gridTemplateColumns: "1fr 1.2fr 1fr", 
        gap: 48 
      }}>
        
        {/* Contact Info */}
        <div>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            letterSpacing: 2, 
            marginBottom: 24,
            color: "#a67c52",
            textTransform: "uppercase"
          }}>
            Contact Us
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <MapPin size={18} style={{ color: "#a67c52", marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 14, lineHeight: 1.6, color: "#555" }}>
                #51, 2nd Floor, Krishna Niwas<br />
                Dhanji Street, Mumbai 400 002
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Phone size={18} style={{ color: "#a67c52" }} />
              <span style={{ fontSize: 14, color: "#555" }}>
                (022) 6183 3366 | 9819583595
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Mail size={18} style={{ color: "#a67c52" }} />
              <span style={{ fontSize: 14, color: "#555" }}>
                gkjewels2000@gmail.com
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Globe size={18} style={{ color: "#a67c52" }} />
              <span style={{ fontSize: 14, color: "#555" }}>
                www.gurkrupajewellers.com
              </span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            letterSpacing: 2, 
            marginBottom: 24,
            color: "#a67c52",
            textTransform: "uppercase"
          }}>
            Visit Our Store
          </h3>
          <div style={{ 
            borderRadius: 16, 
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <iframe
              title="store-map"
              width="100%"
              height="220"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed?pb=!1m18!..."
            />
          </div>
        </div>

        {/* Store Hours */}
        <div>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            letterSpacing: 2, 
            marginBottom: 24,
            color: "#a67c52",
            textTransform: "uppercase"
          }}>
            Store Hours
          </h3>
          
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
            <Clock size={18} style={{ color: "#a67c52", marginTop: 2 }} />
            <div style={{ fontSize: 14, color: "#555", lineHeight: 1.8 }}>
              <div>Mon - Sat: 10:00 AM - 8:00 PM</div>
              <div>Sunday: Closed</div>
            </div>
          </div>

          <div style={{ 
            marginTop: 24,
            padding: 20,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e8e4dc"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Gem size={20} style={{ color: "#d4af37" }} />
              <span style={{ fontWeight: 700, color: "#1a1a1a" }}>Crafting Excellence</span>
            </div>
            <p style={{ fontSize: 13, color: "#777", margin: 0, lineHeight: 1.6 }}>
              Trusted jewellers since 2000, serving customers with premium quality gold ornaments.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{ 
        borderTop: "1px solid #e0dcd4",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16
      }}>
        <img 
          src="/logo.png" 
          alt="GK Logo" 
          style={{ height: 36, opacity: 0.85 }} 
        />
        <span style={{ 
          fontSize: 13, 
          color: "#888",
          letterSpacing: 1
        }}>
          © {new Date().getFullYear()} GURUKRUPA JEWELLERS · All Rights Reserved
        </span>
      </div>
    </footer>
  );
}
