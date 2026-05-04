const CATEGORIES = [
  { emoji: "💈", title: "Barbershops",     tagline: "Your cut, your story.",                  photo: "/landing/09-township-barbershop.jpg" },
  { emoji: "💅", title: "Salons",          tagline: "Where you leave feeling like yourself.",  photo: "/landing/05-salon-container.jpg" },
  { emoji: "🛒", title: "Spaza Shops",     tagline: "Open when nothing else is.",             photo: "/landing/02-koses-general-dealer.jpg" },
  { emoji: "🍖", title: "Shisanyamas",     tagline: "Friday is a feeling.",                   photo: "/landing/04-shisanyama-evening.jpg" },
  { emoji: "🚗", title: "Car Washes",      tagline: "More than the wash.",                    photo: "/landing/03-kwamahlangu-carwash.jpg" },
  { emoji: "⛪", title: "Churches & Halls",tagline: "The heartbeat of the street.",            photo: "/landing/07-taxi-rank-morning.jpg" },
  { emoji: "🏪", title: "Tuckshops",       tagline: "Trusted for generations.",               photo: "/landing/06-tuckshop-window.jpg" },
  { emoji: "✂️", title: "Tailors",         tagline: "Dressed for the occasion.",              photo: "/landing/08-street-tailor.jpg" },
] as const;

export function WhyMatters() {
  return (
    <section
      style={{
        background: "var(--midnight)",
        padding: "100px 6%",
        borderTop: "1px solid var(--border-kayaa)",
      }}
    >
      <style>{`
        .wm-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .wm-card {
          position: relative;
          aspect-ratio: 3/4;
          border-radius: 14px;
          overflow: hidden;
          background: var(--card-kayaa);
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        .wm-card:hover { transform: translateY(-5px); }
        .wm-card img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          filter: contrast(1.05) brightness(0.85);
          transition: filter 0.4s ease, transform 0.6s ease;
        }
        .wm-card:hover img { filter: contrast(1.12) brightness(0.95); transform: scale(1.04); }
        @media (max-width: 1000px) { .wm-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px)  { .wm-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto 60px", textAlign: "center" }}>
        <p className="reveal" style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)",
          textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 18px",
        }}>
          The places we're building for
        </p>
        <h2 className="reveal" style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 46px)", color: "#FFFFFF",
          lineHeight: 1.12, margin: 0,
        }}>
          Some of the places doing the most
          <br />
          <span style={{ color: "var(--green)" }}>are still seen the least.</span>
        </h2>
        <p className="reveal" style={{
          fontFamily: "var(--font-body)", fontSize: 16,
          color: "rgba(240,246,252,0.55)", margin: "20px auto 0",
          maxWidth: 540, lineHeight: 1.6,
        }}>
          Local businesses aren't just commerce. They're community. They're
          the reason a street feels like home. We're making them impossible to miss.
        </p>
      </div>

      <div className="wm-grid">
        {CATEGORIES.map((c, i) => (
          <div key={c.title} className="wm-card reveal" style={{ transitionDelay: `${(i % 4) * 0.08}s` }}>
            <img src={c.photo} alt={c.title} loading="lazy" />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(13,17,23,0.96) 0%, rgba(13,17,23,0.35) 55%, rgba(13,17,23,0) 100%)",
            }} />
            <div style={{
              position: "absolute", left: 16, right: 16, bottom: 16, color: "#FFFFFF",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--green)",
                letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6,
              }}>
                {c.emoji} {c.title}
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
                fontStyle: "italic", color: "rgba(255,255,255,0.8)", lineHeight: 1.3,
              }}>
                {c.tagline}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
