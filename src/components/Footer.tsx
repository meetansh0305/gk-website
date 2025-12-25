import { MapPin, Phone, Mail, Globe, Clock, Gem } from "lucide-react";
import { NavLink } from "react-router-dom";

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
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
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
            
            <NavLink 
              to="/contact"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                padding: "10px 16px",
                background: "#a67c52",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                transition: "background 0.2s",
                width: "fit-content"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#8b6914";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#a67c52";
              }}
            >
              <Mail size={16} />
              Send us a Message
            </NavLink>
            
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
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            position: "relative",
            background: "#f5f5f5",
            minHeight: 220
          }}>
            <a
              href="https://maps.app.goo.gl/R4rWtDXH586TB27s6"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                width: "100%",
                height: "220px",
                background: "linear-gradient(135deg, #f5f3ef 0%, #ebe7df 100%)",
                textDecoration: "none",
                color: "#555",
                position: "relative",
                overflow: "hidden"
              }}
              aria-label="View store location on Google Maps"
            >
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                textAlign: "center"
              }}>
                <MapPin size={40} style={{ color: "#a67c52", marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#a67c52" }}>
                  View Store Location
                </div>
                <div style={{ fontSize: 13, color: "#777", lineHeight: 1.6 }}>
                  #51, 2nd Floor, Krishna Niwas<br />
                  Dhanji Street, Mumbai 400 002
                </div>
                <div style={{
                  marginTop: 16,
                  padding: "8px 16px",
                  background: "#a67c52",
                  color: "#fff",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  Click to Open in Google Maps →
                </div>
              </div>
            </a>
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
