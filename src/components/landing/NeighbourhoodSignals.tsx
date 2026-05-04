import { useEffect, useRef } from "react";

const FEATURES = [
  {
    emoji: "🏠",
    title: "Neighbourhood feed",
    body: "See live activity from places near you. Check-ins, updates, photos — tied to exact locations, not just a generic timeline.",
  },
  {
    emoji: "📍",
    title: "Check-ins",
    body: "One tap says you were there. No booking, no payment, no friction. Builds visible loyalty for the places you love.",
  },
  {
    emoji: "📷",
    title: "Place-based posts",
    body: "Photos and videos pinned to the place they came from. Not a social feed — a living record of your neighbourhood.",
  },
  {
    emoji: "🔥",
    title: "Trending",
    body: "See what's hot near you right now. Which places are packed, which events are happening, what people keep going back to.",
  },
  {
    emoji: "📦",
    title: "In Stock?",
    body: "Check which spazas and local stores have what you need before you leave. Real-time stock updates from places near you.",
  },
  {
    emoji: "⚡",
    title: "Load shedding alerts",
    body: "Know your area's power status instantly. See which local places have generators so you're never caught off guard.",
  },
] as const;

export function NeighbourhoodSignals() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [
      headingRef.current,
      ...cardRefs.current,
    ].filter(Boolean) as HTMLElement[];

    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );

    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(28px)";
      el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return (
    <section
      id="features"
      style={{
        background: "var(--midnight)",
        padding: "clamp(64px, 10vw, 100px) 6%",
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
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
          will-change: opacity, transform;
        }
        .ns-card:hover {
          border-color: rgba(57,217,138,0.35);
          box-shadow: 0 8px 40px rgba(57,217,138,0.07);
        }
        @media (max-width: 900px)  { .ns-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 480px)  { .ns-grid { grid-template-columns: 1fr; gap: 12px; } }
        @media (max-width: 480px)  { .ns-card { padding: 22px 18px; } }
      `}</style>

      {/* ambient glow */}
      <div aria-hidden style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 300,
        background: "radial-gradient(ellipse, rgba(57,217,138,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div
        ref={headingRef}
        style={{ maxWidth: 720, margin: "0 auto clamp(36px,5vw,60px)", textAlign: "center", position: "relative" }}
      >
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A",
          textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 18px",
        }}>
          What kayaa actually does
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 46px)", color: "#FFFFFF",
          lineHeight: 1.12, margin: 0,
        }}>
          See it. Discover it.{" "}
          <span style={{ color: "#39D98A" }}>Help places grow from it.</span>
        </h2>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 16,
          color: "rgba(240,246,252,0.55)", margin: "20px auto 0",
          maxWidth: 540, lineHeight: 1.6,
        }}>
          Place-based sharing tied to real locations, with real neighbourhood
          utility — not a review platform, not social media.
        </p>
      </div>

      <div className="ns-grid">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="ns-card"
          >
            <div style={{ fontSize: 30, marginBottom: 16, lineHeight: 1 }}>{f.emoji}</div>
            <h3 style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
              color: "#F0F6FC", margin: "0 0 10px",
            }}>
              {f.title}
            </h3>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: 14,
              color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: 0,
            }}>
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
