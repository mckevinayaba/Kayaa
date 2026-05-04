import { useEffect, useRef } from "react";

const STEPS = [
  {
    n: "01",
    icon: "📍",
    title: "Pick your neighbourhood",
    body: "Set your area, see what's nearby. Kayaa shows you the places your street actually revolves around — not what's trending on the other side of the city.",
  },
  {
    n: "02",
    icon: "🔍",
    title: "Discover local places",
    body: "Cafés, spazas, gyms, events and more. Every recurring place people return to gets a living page — updated by the community that keeps showing up.",
  },
  {
    n: "03",
    icon: "💬",
    title: "Connect with neighbours",
    body: "Ask questions, share updates, check in. The more you engage, the more your neighbourhood comes alive. Places know their regulars. Regulars know their places.",
  },
] as const;

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLDivElement).style.opacity = "1";
            (entry.target as HTMLDivElement).style.transform = "translateY(0)";
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );

    cards.forEach((card, i) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(32px)";
      card.style.transition = `opacity 0.65s ease ${i * 0.2}s, transform 0.65s ease ${i * 0.2}s`;
      io.observe(card);
    });

    return () => io.disconnect();
  }, []);

  // Also reveal the heading
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how"
      style={{
        background: "#0D1117",
        padding: "clamp(64px, 10vw, 100px) 6%",
        borderTop: "1px solid #21262D",
      }}
    >
      <style>{`
        .kayaa-hiw-card { will-change: opacity, transform; }
        .kayaa-hiw-card:hover {
          border-color: #39D98A !important;
          box-shadow: 0 0 32px rgba(57,217,138,0.08);
        }
        .kayaa-hiw-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          max-width: 960px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .kayaa-hiw-grid { grid-template-columns: 1fr; gap: 14px; }
          .kayaa-hiw-card { padding: 28px 22px !important; }
        }
      `}</style>

      <div ref={headingRef} style={{ textAlign: "center", marginBottom: "clamp(40px,6vw,64px)" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "#39D98A", textTransform: "uppercase",
          letterSpacing: "0.16em", margin: "0 0 16px",
        }}>
          How kayaa works
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 46px)", color: "#FFFFFF",
          margin: 0, lineHeight: 1.1,
        }}>
          Three steps.{" "}
          <span style={{ color: "#39D98A" }}>One shift.</span>
        </h2>
      </div>

      <div className="kayaa-hiw-grid">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="kayaa-hiw-card"
            style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderRadius: 16,
              padding: "36px 28px",
              transition: "border-color 0.25s ease, box-shadow 0.25s ease",
            }}
          >
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "#39D98A", letterSpacing: "0.18em", marginBottom: 20,
            }}>
              {s.n}
            </div>
            <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 16 }}>{s.icon}</div>
            <h3 style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: 20, color: "#FFFFFF", margin: "0 0 12px",
            }}>
              {s.title}
            </h3>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: 15,
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
