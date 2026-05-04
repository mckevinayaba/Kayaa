const SIGNALS = [
  {
    emoji: "🏠",
    title: "Neighbourhood feed",
    body: "See live activity from places near you. Check-ins, updates, photos — tied to exact locations.",
  },
  {
    emoji: "📍",
    title: "Check-ins",
    body: "One tap says you were there. No friction. Builds visible loyalty for the places you love.",
  },
  {
    emoji: "📸",
    title: "Place-based posts",
    body: "Photos and videos pinned to the place they came from. Not a timeline — a living neighbourhood.",
  },
  {
    emoji: "🔔",
    title: "Neighbourhood alerts",
    body: "Events, specials, closures. Know what's happening on your street before you leave the house.",
  },
  {
    emoji: "👥",
    title: "Regulars",
    body: "Repeat check-ins make loyalty visible. Places can see who keeps coming back and say thank you.",
  },
  {
    emoji: "📊",
    title: "Place dashboard",
    body: "No marketing budget needed. Understand your community, see who's checking in, post an update.",
  },
] as const;

export function NeighbourhoodSignals() {
  return (
    <section
      id="features"
      style={{
        background: "var(--midnight)",
        padding: "100px 6%",
        borderTop: "1px solid var(--border-kayaa)",
        position: "relative",
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      <style>{`
        .ns-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .ns-card {
          background: var(--card-kayaa);
          border: 1px solid var(--border-kayaa);
          border-radius: 16px;
          padding: 28px 24px;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .ns-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 40px rgba(57,217,138,0.08);
          border-color: rgba(57,217,138,0.25);
        }
        @media (max-width: 900px)  { .ns-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px)  { .ns-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* ambient glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 300,
        background: "radial-gradient(ellipse, rgba(57,217,138,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 720, margin: "0 auto 60px", textAlign: "center", position: "relative" }}>
        <p className="reveal" style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)",
          textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 18px",
        }}>
          What kayaa actually does
        </p>
        <h2 className="reveal" style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 46px)", color: "#FFFFFF",
          lineHeight: 1.12, margin: 0,
        }}>
          See it. Discover it.{" "}
          <span style={{ color: "var(--green)" }}>Help places grow from it.</span>
        </h2>
        <p className="reveal" style={{
          fontFamily: "var(--font-body)", fontSize: 16,
          color: "rgba(240,246,252,0.55)", margin: "20px auto 0",
          maxWidth: 540, lineHeight: 1.6,
        }}>
          Place-based sharing tied to real locations, with real neighbourhood
          utility — not a review platform, not social media.
        </p>
      </div>

      <div className="ns-grid">
        {SIGNALS.map((s, i) => (
          <div key={s.title} className="ns-card reveal" style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
            <div style={{ fontSize: 28, marginBottom: 16, lineHeight: 1 }}>{s.emoji}</div>
            <h3 style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
              color: "#F0F6FC", margin: "0 0 10px",
            }}>
              {s.title}
            </h3>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: 14,
              color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: 0,
            }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
