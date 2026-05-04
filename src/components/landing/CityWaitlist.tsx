export function CityWaitlist() {
  return (
    <section
      style={{
        background: "#0D1117",
        borderTop: "1px solid #21262D",
        padding: "100px 6%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 80%, rgba(57,217,138,0.07) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
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
          Neighbourhood by neighbourhood
        </p>
        <h2
          className="reveal"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(26px, 3.2vw, 42px)",
            color: "#FFFFFF",
            lineHeight: 1.15,
            margin: "0 0 18px",
          }}
        >
          Your neighbourhood is{" "}
          <span style={{ color: "#39D98A" }}>waiting to be seen.</span>
        </h2>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 17,
            color: "rgba(240,246,252,0.55)",
            margin: "0 0 44px",
            lineHeight: 1.7,
          }}
        >
          Sign up free. Find the places your area runs on.
          Add the ones that don't have a page yet.
        </p>

        <div className="reveal" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/welcome"
            style={{
              display: "inline-block",
              background: "#39D98A",
              color: "#0D1117",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 16,
              padding: "16px 40px",
              borderRadius: "999px",
              textDecoration: "none",
              transition: "filter 0.2s",
              boxShadow: "0 0 50px rgba(57,217,138,0.2)",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.filter = "brightness(1.1)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.filter = "none")}
          >
            Get started free →
          </a>
          <a
            href="/welcome"
            style={{
              display: "inline-block",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.65)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: 15,
              padding: "16px 32px",
              borderRadius: "999px",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.35)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.18)";
              (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.65)";
            }}
          >
            Sign in
          </a>
        </div>

        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.14em",
            marginTop: 24,
          }}
        >
          FREE TO JOIN · NO CARD · SOUTH AFRICA FIRST
        </p>
      </div>
    </section>
  );
}
