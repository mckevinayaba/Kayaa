const STEPS = [
  {
    n: "01",
    title: "Listen",
    body: "Pay attention to the places people in your neighbourhood keep going back to — but can never quite explain how to find.",
  },
  {
    n: "02",
    title: "Nominate",
    body: "Tell us the name, the type of place, and why it matters. One minute. No account needed. Just the truth about a place.",
  },
  {
    n: "03",
    title: "Make it impossible to miss",
    body: "Your nomination helps us map the places that deserve to be on the map. It shapes which neighbourhoods we launch in first.",
  },
] as const;

export function NeighbourhoodListener() {
  return (
    <section
      style={{
        background: "var(--midnight)",
        padding: "100px 6%",
        borderTop: "1px solid var(--border-kayaa)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background image with strong overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/landing/07-taxi-rank-morning.jpg)",
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.12,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, var(--midnight) 0%, rgba(13,17,23,0.85) 50%, var(--midnight) 100%)",
      }} />

      <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative" }}>
        <div style={{ maxWidth: 640, margin: "0 auto 60px", textAlign: "center" }}>
          <p className="reveal" style={{
            fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)",
            textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 18px",
          }}>
            Be a neighbourhood listener
          </p>
          <h2 className="reveal" style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "clamp(28px, 3.6vw, 46px)", color: "#FFFFFF",
            lineHeight: 1.12, margin: "0 0 16px",
          }}>
            Share a place you love.
            <br />
            <span style={{ color: "var(--green)" }}>Help make it impossible to miss.</span>
          </h2>
          <p className="reveal" style={{
            fontFamily: "var(--font-body)", fontSize: 16,
            color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0,
          }}>
            Community-driven discovery. Not a directory. Not a review app.
            The places that make a neighbourhood — nominated by the people who live there.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 48,
        }}>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="reveal"
              style={{
                background: "rgba(22,27,34,0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(57,217,138,0.15)",
                borderRadius: 16, padding: "28px 24px",
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)",
                letterSpacing: "0.18em", marginBottom: 16,
              }}>
                {s.n}
              </div>
              <h3 style={{
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22,
                color: "#F0F6FC", margin: "0 0 12px",
              }}>
                {s.title}
              </h3>
              <p style={{
                fontFamily: "var(--font-body)", fontSize: 14,
                color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0,
              }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="reveal" style={{ textAlign: "center" }}>
          <a
            href="/welcome"
            style={{
              display: "inline-block",
              background: "var(--green)", color: "#0D1117",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16,
              padding: "16px 36px", borderRadius: 10,
              textDecoration: "none", transition: "all 0.2s",
              boxShadow: "0 0 50px rgba(57,217,138,0.2)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.filter = "brightness(1.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.filter = "none"; }}
          >
            Add a place →
          </a>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "rgba(255,255,255,0.3)", letterSpacing: "0.16em",
            marginTop: 14,
          }}>
            FREE TO JOIN · NO CARD NEEDED · JUST YOUR NEIGHBOURHOOD
          </p>
        </div>
      </div>
    </section>
  );
}
