const COUNTERS = [
  { n: "47", label: "Places listed" },
  { n: "6", label: "Suburbs covered" },
  { n: "312", label: "Check-ins this week" },
];

const QUOTES = [
  {
    q: "Three new regulars walked in on the first weekend. They saw us on kayaa.",
    name: "Sbu",
    where: "Barbershop · Orlando West",
    initial: "S",
  },
  {
    q: "I always knew who my best customers were. Now I have proof I can show the bank.",
    name: "Mama Zulu",
    where: "Tuckshop · Mamelodi",
    initial: "Z",
  },
  {
    q: "Sent one WhatsApp on a Thursday. Friday night was the busiest we've had in a year.",
    name: "Sizwe",
    where: "Shisanyama · Tembisa",
    initial: "S",
  },
];

export function SocialProof() {
  return (
    <section
      style={{
        background: "#0D1117",
        padding: "80px 6%",
        borderTop: "1px solid #21262D",
      }}
    >
      <style>{`
        .kayaa-counter-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 720px;
          margin: 0 auto 64px;
        }
        .kayaa-quote-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (max-width: 820px) {
          .kayaa-counter-row, .kayaa-quote-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="kayaa-counter-row">
        {COUNTERS.map((c) => (
          <div key={c.label} className="reveal" style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(36px, 5vw, 56px)",
                color: "#39D98A",
                lineHeight: 1,
              }}
            >
              {c.n}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(240,246,252,0.55)",
                marginTop: 10,
              }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <div className="kayaa-quote-row">
        {QUOTES.map((q, i) => (
          <div
            key={q.name}
            className={`reveal reveal-delay-${i + 1}`}
            style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderLeft: "3px solid #39D98A",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <p
              style={{
                fontFamily: "Georgia, 'Source Serif Pro', serif",
                fontStyle: "italic",
                fontSize: 17,
                color: "#F0F6FC",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              "{q.q}"
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #39D98A, #1f9b5f)",
                  color: "#0D1117",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 14,
                }}
                aria-hidden
              >
                {q.initial}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#F0F6FC",
                  }}
                >
                  {q.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(240,246,252,0.5)",
                    marginTop: 2,
                  }}
                >
                  {q.where}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
