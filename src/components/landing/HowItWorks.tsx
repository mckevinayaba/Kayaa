const CARDS = [
  {
    n: "01",
    icon: "📍",
    title: "Find what's happening nearby",
    body:
      "See which local places are open, busy, or hosting something today. Real places. Real people. Your area.",
  },
  {
    n: "02",
    icon: "✅",
    title: "Check in where you belong",
    body:
      "Walk in. Tap check in. No booking, no payment, no friction. Just you and the place.",
  },
  {
    n: "03",
    icon: "🏡",
    title: "Become a regular",
    body:
      "The more you check in, the more your places know you. Earn your status. Unlock what's only for regulars.",
  },
];

export function HowItWorks() {
  return (
    <section
      style={{
        background: "#0D1117",
        padding: "100px 6%",
        textAlign: "center",
      }}
    >
      <style>{`
        .kayaa-hiw-card { transition: all 0.2s ease; }
        .kayaa-hiw-card:hover {
          border-color: #39D98A !important;
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .kayaa-hiw-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .kayaa-hiw-grid { grid-template-columns: 1fr; }
        }
      `}</style>

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
        How kayaa works
      </p>
      <h2
        className="reveal"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(28px, 3.5vw, 44px)",
          color: "#FFFFFF",
          margin: "0 0 64px",
        }}
      >
        Three things. That's it.
      </h2>

      <div className="kayaa-hiw-grid">
        {CARDS.map((c, i) => (
          <div
            key={c.n}
            className={`kayaa-hiw-card reveal reveal-delay-${i + 1}`}
            style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderRadius: 12,
              padding: "36px 28px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#39D98A",
                marginBottom: 20,
                letterSpacing: "0.14em",
              }}
            >
              {c.n}
            </div>
            <div style={{ fontSize: 40, lineHeight: 1 }}>{c.icon}</div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 20,
                color: "#FFFFFF",
                margin: "12px 0 10px",
              }}
            >
              {c.title}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 15,
                color: "#6B7280",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
