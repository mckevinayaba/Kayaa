import { useNavigate } from "react-router-dom";

function Tile({
  label,
  caption,
  children,
  delay,
}: {
  label: string;
  caption: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className={`reveal reveal-delay-${delay} kayaa-proof-tile`}
      style={{
        background: "#0A0E14",
        border: "1px solid #21262D",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "all 0.2s ease",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#39D98A",
          margin: 0,
        }}
      >
        {label}
      </p>
      <div
        style={{
          background: "#0D1117",
          border: "1px solid #21262D",
          borderRadius: 10,
          padding: 14,
          minHeight: 280,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {children}
      </div>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "#6B7280",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {caption}
      </p>
    </div>
  );
}

const labelMono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#6B7280",
  margin: 0,
};

export function AppProof() {
  const navigate = useNavigate();
  return (
    <section
      style={{
        background: "#0D1117",
        padding: "100px 6%",
        borderTop: "1px solid #21262D",
      }}
    >
      <style>{`
        .kayaa-proof-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .kayaa-proof-tile:hover {
          border-color: rgba(57,217,138,0.4) !important;
          transform: translateY(-3px);
        }
        @media (max-width: 900px) {
          .kayaa-proof-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 56 }}>
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
          This is the app
        </p>
        <h2
          className="reveal"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 3.5vw, 44px)",
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          Less talk. More what you actually get.
        </h2>
      </div>

      <div className="kayaa-proof-grid">
        {/* FEED */}
        <Tile label="The Feed · /feed" caption="Real local places near you, sorted by who's open and busy now." delay={1}>
          <p style={labelMono}>Soweto · 2 km</p>
          {[
            { name: "Sbu's Cuts", type: "Barbershop", busy: "Busy now", color: "#39D98A" },
            { name: "Sizwe Shisanyama", type: "Braai spot", busy: "Open", color: "#39D98A" },
            { name: "Mama Zulu's Tuckshop", type: "Tuckshop", busy: "Quiet", color: "#6B7280" },
          ].map((v) => (
            <div
              key={v.name}
              style={{
                background: "#161B22",
                border: "1px solid #21262D",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: "linear-gradient(135deg,#21262D,#0D1117)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "#F0F6FC" }}>
                  {v.name}
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#6B7280" }}>{v.type}</div>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: v.color,
                  border: `1px solid ${v.color}40`,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {v.busy}
              </span>
            </div>
          ))}
        </Tile>

        {/* VENUE */}
        <Tile label="A Venue · /venue/:slug" caption="A place page that finally feels like the place. Stories. Regulars. Check in." delay={2}>
          <div
            style={{
              height: 70,
              borderRadius: 8,
              background: "linear-gradient(135deg,#21262D,#0D1117)",
              border: "1px solid #21262D",
            }}
          />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#F0F6FC" }}>
              Sbu's Cuts
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#6B7280", marginTop: 2 }}>
              Barbershop · Vilakazi St, Soweto
            </div>
          </div>
          <div
            style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderLeft: "2px solid #39D98A",
              borderRadius: 6,
              padding: "8px 10px",
              fontFamily: "var(--font-body)",
              fontStyle: "italic",
              fontSize: 11,
              color: "rgba(240,246,252,0.8)",
              lineHeight: 1.5,
            }}
          >
            "Sbu has been cutting my hair since I was 9."
          </div>
          <div
            style={{
              marginTop: "auto",
              background: "#39D98A",
              color: "#0D1117",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 8,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            Check in →
          </div>
        </Tile>

        {/* BOARD */}
        <Tile label="The Board · /board" caption="Lost & found. For sale. Safety alerts. The real noticeboard, on your phone." delay={3}>
          <div
            style={{
              display: "flex",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "#6B7280",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <span style={{ color: "#39D98A" }}>All</span>
            <span>·</span>
            <span>Lost</span>
            <span>·</span>
            <span>For sale</span>
            <span>·</span>
            <span>Safety</span>
          </div>
          {[
            { tag: "LOST", title: "Black backpack — Maponya Mall", color: "#F59E0B" },
            { tag: "FOR SALE", title: "Bar fridge — R1,200", color: "#39D98A" },
            { tag: "SAFETY", title: "Cable theft on Khumalo St", color: "#EF4444" },
          ].map((p) => (
            <div
              key={p.title}
              style={{
                background: "#161B22",
                border: "1px solid #21262D",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  color: p.color,
                  marginBottom: 4,
                }}
              >
                {p.tag}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#F0F6FC" }}>{p.title}</div>
            </div>
          ))}
          <div
            style={{
              marginTop: "auto",
              fontFamily: "var(--font-body)",
              fontSize: 11,
              color: "#39D98A",
              border: "1px solid rgba(57,217,138,0.3)",
              borderRadius: 6,
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            Reply on WhatsApp →
          </div>
        </Tile>
      </div>

      <div style={{ textAlign: "center", marginTop: 56 }}>
        <button
          onClick={() => navigate("/feed")}
          style={{
            background: "transparent",
            border: "1px solid #39D98A",
            color: "#39D98A",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 14,
            padding: "12px 24px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          See the feed →
        </button>
      </div>
    </section>
  );
}
