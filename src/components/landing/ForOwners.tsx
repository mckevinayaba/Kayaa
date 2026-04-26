import { useNavigate } from "react-router-dom";

const FEATURES = [
  "See who your real regulars are",
  "Know who hasn't visited in 14+ days",
  "Send a WhatsApp nudge in one tap",
  "Download your Community Proof Report",
  "Post events and stories to your regulars",
  "Get discovered by people nearby",
];

const STATS = [
  { n: "12", color: "#39D98A", label: "Today" },
  { n: "47", color: "#F0F6FC", label: "This Week" },
  { n: "3", color: "#F59E0B", label: "Lapsed" },
  { n: "2", color: "#39D98A", label: "New Faces" },
];

const ROWS = [
  { name: "Thabo", badge: "Regular", visit: "Visit #11", strong: false },
  { name: "Sipho", badge: "Loyal", visit: "Visit #18", strong: true },
  { name: "Lerato", badge: "Newcomer", visit: "Visit #1", muted: true },
] as { name: string; badge: string; visit: string; strong?: boolean; muted?: boolean }[];

export function ForOwners() {
  const navigate = useNavigate();
  return (
    <section
      style={{
        background: "#161B22",
        borderTop: "1px solid #21262D",
        borderBottom: "1px solid #21262D",
        padding: "100px 6%",
      }}
    >
      <style>{`
        .kayaa-owners-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          max-width: 1000px;
          margin: 0 auto;
          align-items: center;
        }
        @media (max-width: 900px) {
          .kayaa-owners-grid {
            grid-template-columns: 1fr;
            gap: 60px;
          }
        }
        @keyframes kayaaPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(57,217,138,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(57,217,138,0); }
        }
        .kayaa-owners-cta { transition: all 0.2s ease; }
        .kayaa-owners-cta:hover { filter: brightness(1.08); transform: scale(1.01); }
      `}</style>

      <div className="kayaa-owners-grid">
        {/* LEFT */}
        <div className="reveal">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#39D98A",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              margin: "0 0 16px",
            }}
          >
            For place owners
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              color: "#FFFFFF",
              lineHeight: 1.15,
              margin: "0 0 24px",
            }}
          >
            Your community
            <br />
            is real.
            <br />
            Now make it
            <br />
            visible.
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 16,
              color: "#6B7280",
              lineHeight: 1.7,
              margin: "0 0 36px",
              whiteSpace: "pre-line",
            }}
          >
            {`You already know your regulars by face. You know who comes every Saturday. You know who disappeared three weeks ago.\n\nkayaa gives that knowledge a record — so you can reach them when it's quiet, and prove your community exists to anyone who needs to see it.`}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    background: "rgba(57,217,138,0.1)",
                    border: "1px solid rgba(57,217,138,0.3)",
                    borderRadius: 4,
                    color: "#39D98A",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    color: "#F0F6FC",
                  }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/onboarding")}
            className="kayaa-owners-cta"
            style={{
              marginTop: 36,
              background: "#39D98A",
              color: "#0D1117",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
              padding: "14px 28px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Add your place — it's free →
          </button>
        </div>

        {/* RIGHT — phone mockup */}
        <div className="reveal reveal-delay-2">
          <div
            style={{
              maxWidth: 300,
              margin: "0 auto",
              background: "#0A0E14",
              border: "1px solid #21262D",
              borderRadius: 24,
              padding: 20,
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(57,217,138,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Top bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#39D98A",
                }}
              >
                kayaa
              </span>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#39D98A",
                    animation: "kayaaPulse 2s infinite",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 10,
                    color: "#39D98A",
                  }}
                >
                  Live
                </span>
              </span>
            </div>

            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 12,
                color: "#F0F6FC",
                marginBottom: 16,
              }}
            >
              Good morning, Sbu's Cuts ☀️
            </div>

            {/* Stat tiles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {STATS.map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#161B22",
                    border: "1px solid #21262D",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 22,
                      color: s.color,
                      lineHeight: 1.1,
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 9,
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "#6B7280",
                textTransform: "uppercase",
                marginBottom: 10,
                letterSpacing: "0.12em",
              }}
            >
              Today's visitors
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ROWS.map((r) => {
                const badgeBg = r.muted
                  ? "rgba(107,114,128,0.15)"
                  : r.strong
                    ? "rgba(57,217,138,0.2)"
                    : "rgba(57,217,138,0.12)";
                const badgeColor = r.muted ? "#6B7280" : "#39D98A";
                return (
                  <div
                    key={r.name}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid #21262D",
                      borderRadius: 6,
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#39D98A",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: 11,
                        color: "#F0F6FC",
                      }}
                    >
                      {r.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 9,
                        background: badgeBg,
                        color: badgeColor,
                        borderRadius: 999,
                        padding: "2px 7px",
                        flexShrink: 0,
                      }}
                    >
                      {r.badge}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 9,
                        color: "#6B7280",
                        marginLeft: "auto",
                      }}
                    >
                      {r.visit}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                borderTop: "1px solid #21262D",
                marginTop: 14,
                paddingTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "#6B7280" }}>
                3 lapsed this week
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 9,
                  color: "#39D98A",
                  border: "1px solid rgba(57,217,138,0.3)",
                  borderRadius: 4,
                  padding: "3px 8px",
                }}
              >
                Nudge →
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
