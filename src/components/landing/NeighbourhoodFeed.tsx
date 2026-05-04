import { openWaitlist } from "../../lib/waitlist-store";

const FEED_CARDS = [
  {
    name: "Bhuti's Barber",
    type: "Barbershop",
    area: "Alexandra, Joburg",
    photo: "/landing/09-township-barbershop.jpg",
    quote: "Been going here since school. He knows exactly what I want before I say anything.",
    checkins: 247,
  },
  {
    name: "KOSES General Dealer",
    type: "Spaza Shop",
    area: "Alexandra, Joburg",
    photo: "/landing/02-koses-general-dealer.jpg",
    quote: "Open before anyone else. The only place that still gives you on credit when times are tough.",
    checkins: 183,
  },
  {
    name: "KwaMahlangu Car Wash",
    type: "Car Wash",
    area: "Tembisa, Ekurhuleni",
    photo: "/landing/03-kwamahlangu-carwash.jpg",
    quote: "People don't just come for the wash. They come for the conversations.",
    checkins: 312,
  },
  {
    name: "Mzansi Meat",
    type: "Shisanyama",
    area: "Diepkloof, Soweto",
    photo: "/landing/04-shisanyama-evening.jpg",
    quote: "Every celebration in this area somehow ends there.",
    checkins: 528,
  },
  {
    name: "Sisi's Hair & Nails",
    type: "Salon",
    area: "Khayelitsha, Cape Town",
    photo: "/landing/05-salon-container.jpg",
    quote: "She remembered how everyone liked their coffee when they came to wait.",
    checkins: 196,
  },
  {
    name: "Made in Soweto",
    type: "Street Corner",
    area: "Orlando West, Soweto",
    photo: "/landing/01-made-in-soweto.jpg",
    quote: "This corner tells the story of who we are. It deserves to be on the map.",
    checkins: 441,
  },
] as const;

export function NeighbourhoodFeed() {
  return (
    <section
      style={{
        background: "#080C12",
        padding: "100px 6%",
        borderTop: "1px solid var(--border-kayaa)",
        position: "relative",
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      <style>{`
        .nf-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .nf-card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: var(--card-kayaa);
          border: 1px solid var(--border-kayaa);
          transition: transform 0.3s ease, border-color 0.3s ease;
          cursor: pointer;
        }
        .nf-card:hover { transform: translateY(-4px); border-color: rgba(57,217,138,0.25); }
        .nf-card img {
          width: 100%; aspect-ratio: 4/3; object-fit: cover;
          filter: contrast(1.05) brightness(0.88);
          transition: transform 0.5s ease;
        }
        .nf-card:hover img { transform: scale(1.04); }
        @media (max-width: 960px)  { .nf-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px)  { .nf-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* ambient glow */}
      <div style={{
        position: "absolute", bottom: "-20%", left: "50%",
        transform: "translateX(-50%)",
        width: 800, height: 400,
        background: "radial-gradient(ellipse, rgba(57,217,138,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 720, margin: "0 auto 60px", textAlign: "center", position: "relative" }}>
        <p className="reveal" style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)",
          textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 18px",
        }}>
          A preview of what's coming
        </p>
        <h2 className="reveal" style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 46px)", color: "#FFFFFF",
          lineHeight: 1.12, margin: 0,
        }}>
          The neighbourhood,{" "}
          <span style={{ color: "var(--green)" }}>made visible.</span>
        </h2>
        <p className="reveal" style={{
          fontFamily: "var(--font-body)", fontSize: 16,
          color: "rgba(240,246,252,0.55)", margin: "20px auto 0",
          maxWidth: 540, lineHeight: 1.6,
        }}>
          Real places. Real communities. Waiting for a platform that actually gets them.
        </p>
      </div>

      <div className="nf-grid">
        {FEED_CARDS.map((c, i) => (
          <div key={c.name} className="nf-card reveal" style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
            <div style={{ position: "relative", overflow: "hidden" }}>
              <img src={c.photo} alt={`${c.name} — ${c.area}`} loading="lazy" />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 50%, rgba(13,17,23,0.9) 100%)",
              }} />
              <div style={{
                position: "absolute", top: 12, right: 12,
                background: "rgba(13,17,23,0.85)",
                border: "1px solid rgba(57,217,138,0.3)",
                borderRadius: 999, padding: "4px 10px",
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: "var(--green)", letterSpacing: "0.1em",
              }}>
                PREVIEW
              </div>
            </div>
            <div style={{ padding: "16px 18px 20px" }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--green)",
                letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6,
              }}>
                {c.type} · {c.checkins} check-ins
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17,
                color: "#F0F6FC", marginBottom: 4,
              }}>
                {c.name}
              </div>
              <div style={{
                fontFamily: "var(--font-body)", fontSize: 12,
                color: "rgba(255,255,255,0.4)", marginBottom: 12,
              }}>
                📍 {c.area}
              </div>
              <p style={{
                fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: 13,
                color: "rgba(255,255,255,0.6)", lineHeight: 1.55, margin: 0,
                borderLeft: "2px solid rgba(57,217,138,0.3)",
                paddingLeft: 12,
              }}>
                "{c.quote}"
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 48, position: "relative" }}>
        <button
          type="button"
          onClick={() => openWaitlist()}
          style={{
            background: "transparent",
            border: "1px solid rgba(57,217,138,0.4)",
            color: "var(--green)",
            fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14,
            padding: "14px 32px", borderRadius: 10, cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(57,217,138,0.08)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          Nominate the first place on your street →
        </button>
      </div>
    </section>
  );
}
