import { openWaitlist } from "../../lib/waitlist-store";

export function NominationAsk() {
  return (
    <section
      style={{
        background: "var(--midnight)",
        padding: "100px 6%",
        borderTop: "1px solid var(--border-kayaa)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        .na-primary:hover { filter: brightness(1.12); transform: translateY(-2px); }
        .na-secondary:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 60%, rgba(57,217,138,0.06) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <p className="reveal" style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)",
          textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 18px",
        }}>
          You know a place like this
        </p>
        <h2 className="reveal" style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "clamp(28px, 3.8vw, 48px)", color: "#FFFFFF",
          lineHeight: 1.1, margin: "0 0 16px",
        }}>
          Tell us the place in your area
          <br />
          that keeps pulling people back.
        </h2>
        <p className="reveal" style={{
          fontFamily: "var(--font-body)", fontSize: 16,
          color: "rgba(255,255,255,0.5)", lineHeight: 1.65,
          margin: "0 0 36px",
        }}>
          One minute. No account needed. Just one place that deserves to be seen.
        </p>

        <div className="reveal" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => openWaitlist(2)}
            className="na-primary"
            style={{
              background: "var(--green)", color: "#0D1117",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16,
              padding: "16px 36px", borderRadius: 10, border: "none",
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: "0 0 50px rgba(57,217,138,0.2)",
            }}
          >
            Nominate a place →
          </button>
          <button
            type="button"
            onClick={() => openWaitlist(1)}
            className="na-secondary"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 16,
              padding: "16px 36px", borderRadius: 10,
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            Join the neighbourhood waitlist
          </button>
        </div>
      </div>
    </section>
  );
}
