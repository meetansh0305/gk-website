export default function Footer() {
  return (
    <footer style={{ marginTop: 40, background: "#f7f7f7", padding: "24px 0" }}>
      <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        
        {/* MAP */}
        <div>
          <h3 style={{ marginBottom: 8 }}>Location:</h3>
          <iframe
            title="store-map"
            width="100%"
            height="280"
            style={{ border: 0, borderRadius: 12 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed?pb=!1m18!..."
          ></iframe>
        </div>

        {/* ADDRESS */}
        <div>
          <h3 style={{ marginBottom: 8 }}>Office Location:</h3>
          <div>
            #51, 2nd Floor<br />
            Krishna Niwas<br />
            Dhanji Street<br />
            Mumbai 400 002
          </div>

          <div style={{ marginTop: 12 }}>
            <div><b>Tel:</b> (022) 6183 3366</div>
            <div><b>Phone:</b> 9819583595 / 9320083595</div>
            <div><b>Email:</b> gkjewels2000@gmail.com</div>
            <div><b>Website:</b> www.gurkrupajewellers.com</div>
          </div>
        </div>
      </div>

      {/* LOGO CENTER */}
      <div style={{ marginTop: 30, textAlign: "center" }}>
        <img src="/logo.png" alt="GK Logo" style={{ height: 50, opacity: 0.9 }} />
      </div>

      <div style={{ textAlign: "center", paddingTop: 16, opacity: 0.6 }}>
        © {new Date().getFullYear()} GURUKRUPA JEWELLERS
      </div>
    </footer>
  );
}
