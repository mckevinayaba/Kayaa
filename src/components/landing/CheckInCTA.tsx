import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function CheckInCTA() {
  const { user } = useAuth();

  // Don't show this section to logged-in users
  if (user) return null;

  return (
    <section
      aria-label="Check in nearby"
      style={{
        position: "relative",
        padding: "120px 24px",
        background:
          "linear-gradient(180deg, #0D1117 0%, #0a1f15 50%, #0D1117 100%)",
        overflow: "hidden",
      }}
    >
      {/* glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 600,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(57,217,138,0.18) 0%, rgba(57,217,138,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          maxWidth: 760,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "#39D98A",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Free · No card · 30 seconds
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(36px, 5.5vw, 64px)",
            lineHeight: 1.05,
            color: "#FFFFFF",
            margin: "16px 0 20px",
          }}
        >
          Check in to a place
          <br />
          <span style={{ color: "#39D98A" }}>nearby today.</span>
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 18,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.7)",
            maxWidth: 560,
            margin: "0 auto 36px",
          }}
        >
          Sign up free and you'll see the spaza, salon, car wash and shisanyama
          your neighbours actually rate — and tell them you were there.
        </p>

        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/login"
            className="kayaa-checkin-cta"
            style={{
              background: "#39D98A",
              color: "#0D1117",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 16,
              padding: "18px 40px",
              borderRadius: 8,
              textDecoration: "none",
              boxShadow: "0 0 60px rgba(57,217,138,0.35)",
              display: "inline-block",
            }}
          >
            Check in nearby →
          </Link>
          <Link
            to="/login"
            style={{
              background: "transparent",
              color: "#FFFFFF",
              border: "1px solid rgba(255,255,255,0.25)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: 16,
              padding: "18px 32px",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Sign in
          </Link>
        </div>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.35)",
            marginTop: 24,
          }}
        >
          EMAIL · GOOGLE · NO DOWNLOAD
        </p>
      </div>

      <style>{`
        .kayaa-checkin-cta { transition: transform .2s ease, filter .2s ease; }
        .kayaa-checkin-cta:hover { transform: translateY(-2px); filter: brightness(1.08); }
      `}</style>
    </section>
  );
}
