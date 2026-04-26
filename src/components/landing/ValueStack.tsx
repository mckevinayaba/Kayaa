import { useNavigate } from "react-router-dom";

const ITEMS = [
  {
    label: "A real page for your place",
    sub: "Photos, hours, story, regulars — yours forever.",
    old: "R2,500 (web designer)",
  },
  {
    label: "Your regulars on a list you own",
    sub: "Names. Visits. Last seen. Birthdays.",
    old: "R800/month (CRM)",
  },
  {
    label: "WhatsApp updates to your customers",
    sub: "Tell them you're open late. Or quiet today. One tap.",
    old: "R450/month (bulk SMS)",
  },
  {
    label: "Featured in your suburb's feed",
    sub: "When someone nearby opens kayaa, you show up.",
    old: "Priceless",
  },
  {
    label: "Community Proof Report",
    sub: "A monthly PDF showing your real impact — to land funding, leases, or sponsors.",
    old: "R0 anywhere else",
  },
];

export function ValueStack() {
  const navigate = useNavigate();
  return (
    <section
      style={{
        background: "#0F1A14",
        padding: "100px 6%",
        borderTop: "1px solid rgba(57,217,138,0.12)",
        borderBottom: "1px solid rgba(57,217,138,0.12)",
      }}
    >
      <style>{`
        .kayaa-stack-row {
          display: grid;
          grid-template-columns: 28px 1fr auto;
          gap: 18px;
          align-items: start;
          padding: 18px 0;
          border-bottom: 1px dashed rgba(57,217,138,0.18);
        }
        .kayaa-stack-row:last-of-type { border-bottom: none; }
        @media (max-width: 640px) {
          .kayaa-stack-row { grid-template-columns: 24px 1fr; }
          .kayaa-stack-row .kayaa-stack-old { grid-column: 2; padding-top: 4px; }
        }
        .kayaa-cta-claim:hover {
          filter: brightness(1.08);
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(57,217,138,0.45) !important;
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
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
          For owners · what you actually get
        </p>
        <h2
          className="reveal"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(30px, 4vw, 48px)",
            color: "#FFFFFF",
            margin: "0 0 18px",
            lineHeight: 1.1,
          }}
        >
          Everything a marketing agency
          <br />
          would charge you{" "}
          <span
            style={{
              textDecoration: "line-through",
              textDecorationColor: "rgba(255,255,255,0.4)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            R3,750/month
          </span>{" "}
          for.
        </h2>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 17,
            color: "rgba(240,246,252,0.7)",
            margin: "0 0 48px",
            lineHeight: 1.6,
          }}
        >
          For free. While we build. So your place gets seen by the people who'd
          come back every week if they only knew you existed.
        </p>

        <div
          className="reveal"
          style={{
            background: "#0A0E14",
            border: "1px solid rgba(57,217,138,0.25)",
            borderRadius: 14,
            padding: "8px 28px 28px",
            textAlign: "left",
          }}
        >
          {ITEMS.map((it) => (
            <div key={it.label} className="kayaa-stack-row">
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: "#39D98A",
                  color: "#0D1117",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  marginTop: 2,
                }}
                aria-hidden
              >
                ✓
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 17,
                    color: "#F0F6FC",
                    lineHeight: 1.3,
                  }}
                >
                  {it.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    color: "rgba(240,246,252,0.55)",
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {it.sub}
                </div>
              </div>
              <div
                className="kayaa-stack-old"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  textDecoration: "line-through",
                  whiteSpace: "nowrap",
                  paddingTop: 6,
                }}
              >
                {it.old}
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 24,
              padding: "20px 0 4px",
              borderTop: "1px solid rgba(57,217,138,0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                color: "#FFFFFF",
              }}
            >
              Total monthly value
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              <span
                style={{
                  textDecoration: "line-through",
                  color: "rgba(255,255,255,0.45)",
                  marginRight: 12,
                  fontWeight: 600,
                  fontSize: 18,
                }}
              >
                R3,750
              </span>
              <span style={{ color: "#39D98A" }}>R0 forever</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/onboarding")}
          className="kayaa-cta-claim reveal"
          style={{
            marginTop: 40,
            background: "#39D98A",
            color: "#0D1117",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: 17,
            padding: "18px 40px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 10px 32px rgba(57,217,138,0.32)",
            transition: "all 0.2s ease",
          }}
        >
          Claim your place — takes 90 seconds →
        </button>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.14em",
            marginTop: 16,
          }}
        >
          NO CARD · NO CONTRACT · KEEP YOUR DATA
        </p>
      </div>
    </section>
  );
}
