const PLACES = [
  {
    name: "KOSES General Dealer",
    type: "Spaza Shop",
    suburb: "Alexandra, Joburg",
    photo: "/landing/02-koses-general-dealer.jpg",
  },
  {
    name: "Mama's Tuckshop",
    type: "Tuckshop",
    suburb: "Orlando East, Soweto",
    photo: "/landing/06-tuckshop-window.jpg",
  },
  {
    name: "Mzansi Meat",
    type: "Shisanyama",
    suburb: "Diepkloof, Soweto",
    photo: "/landing/04-shisanyama-evening.jpg",
  },
  {
    name: "KwaMahlangu Car Wash",
    type: "Car Wash",
    suburb: "Tembisa, Ekurhuleni",
    photo: "/landing/03-kwamahlangu-carwash.jpg",
  },
  {
    name: "Sisi's Hair & Nails",
    type: "Salon",
    suburb: "Khayelitsha, Cape Town",
    photo: "/landing/05-salon-container.jpg",
  },
  {
    name: "Sam's Tailor",
    type: "Tailor",
    suburb: "Mitchells Plain, Cape Town",
    photo: "/landing/08-street-tailor.jpg",
  },
  {
    name: "Bara Taxi Rank",
    type: "Taxi Rank",
    suburb: "Diepkloof, Soweto",
    photo: "/landing/07-taxi-rank-morning.jpg",
  },
  {
    name: "Made in Soweto",
    type: "Street Corner",
    suburb: "Orlando West, Soweto",
    photo: "/landing/01-made-in-soweto.jpg",
  },
];

export function PlacesGallery() {
  return (
    <section
      style={{
        background: "#0A0E14",
        padding: "100px 6%",
        borderTop: "1px solid #21262D",
      }}
    >
      <style>{`
        .kayaa-gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }
        .kayaa-gallery-tile {
          position: relative;
          aspect-ratio: 4/5;
          border-radius: 12px;
          overflow: hidden;
          background: #161B22;
          transition: transform 0.3s ease;
          cursor: pointer;
        }
        .kayaa-gallery-tile:hover { transform: translateY(-4px); }
        .kayaa-gallery-tile img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          filter: contrast(1.05) brightness(0.92);
          transition: filter 0.4s ease, transform 0.6s ease;
        }
        .kayaa-gallery-tile:hover img { filter: contrast(1.1) brightness(1.05); transform: scale(1.05); }
        @media (max-width: 1000px) { .kayaa-gallery-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .kayaa-gallery-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#39D98A",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            margin: "0 0 16px",
          }}
        >
          The places we're for
        </p>
        <h2
          className="reveal"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 3.5vw, 44px)",
            color: "#FFFFFF",
            margin: 0,
            maxWidth: 720,
            marginInline: "auto",
            lineHeight: 1.15,
          }}
        >
          Soweto. Alex. Tembisa. Khayelitsha.
          <br />
          <span style={{ color: "#39D98A" }}>This is where kayaa lives.</span>
        </h2>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 16,
            color: "rgba(240,246,252,0.6)",
            margin: "20px auto 0",
            maxWidth: 540,
            lineHeight: 1.6,
          }}
        >
          Not the spots Google ranks. The places your neighbourhood actually
          revolves around.
        </p>
      </div>

      <div className="kayaa-gallery-grid">
        {PLACES.map((p) => (
          <div key={p.name} className="kayaa-gallery-tile reveal">
            <img src={p.photo} alt={`${p.name} in ${p.suburb}`} loading="lazy" />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(13,17,23,0.95) 0%, rgba(13,17,23,0.4) 50%, rgba(13,17,23,0) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 14,
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "#39D98A",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {p.type}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 17,
                  lineHeight: 1.2,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.65)",
                  marginTop: 4,
                }}
              >
                {p.suburb}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
