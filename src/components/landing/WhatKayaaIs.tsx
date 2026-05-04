import { useEffect, useRef } from "react";
import { openWaitlist } from "../../lib/waitlist-store";

const NOT_LIST = [
  { icon: "⭐", text: "Not a rating game", sub: "No stars, no reviews to farm, no punishing a place for one bad day." },
  { icon: "🌍", text: "Not a global directory", sub: "We're not Yelp. We're not Google Maps. We're built for your street, not every street." },
  { icon: "🏢", text: "Not a chain showcase", sub: "Kayaa is for the places that don't have a marketing team — the ones that survive on word of mouth." },
  { icon: "📱", text: "Not another noisy feed", sub: "No ads, no viral nonsense. Just what's happening near you, from people who actually live there." },
  { icon: "💳", text: "Not a payments app", sub: "We're not trying to sit between you and a place. Just helping you find it and come back." },
  { icon: "🚧", text: "Not live yet", sub: "We're building in the open. Join the waitlist and help shape what Kayaa becomes for your area." },
];

export function WhatKayaaIs() {
  const sectionRef   = useRef<HTMLElement>(null);
  const headingRef   = useRef<HTMLDivElement>(null);
  const helpsRef     = useRef<HTMLDivElement>(null);
  const notRef       = useRef<HTMLDivElement>(null);
  const noteRef      = useRef<HTMLDivElement>(null);
  const cardRefs     = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const topEls = [headingRef.current, helpsRef.current].filter(Boolean) as HTMLElement[];
    const io1 = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
            io1.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    topEls.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = `opacity 0.65s ease ${i * 0.15}s, transform 0.65s ease ${i * 0.15}s`;
      io1.observe(el);
    });

    const notEl = notRef.current;
    const noteEl = noteRef.current;
    const io2 = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
            io2.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    [notEl, noteEl].filter(Boolean).forEach((el) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity 0.65s ease, transform 0.65s ease";
      io2.observe(el);
    });

    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    const io3 = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLDivElement).style.opacity = "1";
            (e.target as HTMLDivElement).style.transform = "translateY(0)";
            io3.unobserve(e.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" },
    );
    cards.forEach((card, i) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
      card.style.transition = `opacity 0.55s ease ${i * 0.08}s, transform 0.55s ease ${i * 0.08}s`;
      io3.observe(card);
    });

    return () => { io1.disconnect(); io2.disconnect(); io3.disconnect(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      style={{
        background: "#0D1117",
        padding: "100px 6%",
        borderTop: "1px solid #21262D",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        .wki-not-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 40px;
        }
        .wki-not-card {
          background: #161B22;
          border: 1px solid #21262D;
          border-radius: 14px;
          padding: 22px 20px;
          transition: border-color 0.2s ease;
          will-change: opacity, transform;
        }
        .wki-not-card:hover { border-color: rgba(57,217,138,0.25); }
        @media (max-width: 900px) { .wki-not-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 540px) { .wki-not-grid { grid-template-columns: 1fr; } }
        .wki-helps-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 80px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .wki-helps-grid { grid-template-columns: 1fr; gap: 32px; }
          .wki-note-inner { padding: 32px 24px !important; }
        }
      `}</style>

      {/* Ambient glow */}
      <div aria-hidden style={{
        position: "absolute", top: "20%", right: "-10%",
        width: 500, height: 400,
        background: "radial-gradient(ellipse, rgba(57,217,138,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Section label ───────────────────────────────────────────── */}
        <div ref={headingRef} style={{ textAlign: "center", marginBottom: 72 }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A",
            textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 16px",
          }}>
            What kayaa is
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "clamp(28px, 3.6vw, 46px)", color: "#FFFFFF",
            lineHeight: 1.12, margin: "0 auto", maxWidth: 720,
          }}>
            Built for the places{" "}
            <span style={{ color: "#39D98A" }}>your street runs on.</span>
          </h2>
        </div>

        {/* ── What kayaa helps do ──────────────────────────────────────── */}
        <div ref={helpsRef} className="wki-helps-grid">
          <div>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A",
              textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 20px",
            }}>
              What kayaa helps do
            </p>
            <h3 style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: "clamp(22px, 2.4vw, 32px)", color: "#FFFFFF",
              lineHeight: 1.2, margin: "0 0 20px",
            }}>
              Easier to find.{" "}
              <span style={{ color: "#39D98A" }}>Easier to return to.</span>{" "}
              Easier to grow.
            </h3>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: 16,
              color: "rgba(240,246,252,0.60)", lineHeight: 1.75, margin: 0,
            }}>
              Kayaa is being built to help local places become easier to find,
              easier to return to, and easier to grow.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderRadius: 16, padding: "24px 28px",
            }}>
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 10px",
              }}>
                For neighbours
              </p>
              <p style={{
                fontFamily: "var(--font-body)", fontSize: 15,
                color: "rgba(240,246,252,0.65)", lineHeight: 1.7, margin: 0,
              }}>
                Less guesswork, clearer local discovery. Know what's open, what's
                stocked, what's happening — before you leave your door.
              </p>
            </div>
            <div style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderRadius: 16, padding: "24px 28px",
            }}>
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 10px",
              }}>
                For places
              </p>
              <p style={{
                fontFamily: "var(--font-body)", fontSize: 15,
                color: "rgba(240,246,252,0.65)", lineHeight: 1.7, margin: 0,
              }}>
                Stronger visibility, more repeat recognition. The regulars who
                already love you become a visible signal that brings more people in.
              </p>
            </div>
          </div>
        </div>

        {/* ── What kayaa is not ────────────────────────────────────────── */}
        <div ref={notRef}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A",
            textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 12px",
          }}>
            What kayaa is not
          </p>
          <h3 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(22px, 2.4vw, 32px)", color: "#FFFFFF",
            lineHeight: 1.2, margin: "0 0 4px",
          }}>
            We made some deliberate choices.
          </h3>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 15,
            color: "rgba(240,246,252,0.45)", margin: 0,
          }}>
            These are features, not gaps.
          </p>

          <div className="wki-not-grid">
            {NOT_LIST.map((item, i) => (
              <div
                key={item.text}
                ref={(el) => { cardRefs.current[i] = el; }}
                className="wki-not-card"
              >
                <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 12 }}>{item.icon}</div>
                <p style={{
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: 16, color: "#F0F6FC", margin: "0 0 8px",
                }}>
                  {item.text}
                </p>
                <p style={{
                  fontFamily: "var(--font-body)", fontSize: 13,
                  color: "rgba(255,255,255,0.48)", lineHeight: 1.6, margin: 0,
                }}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── A note from us ───────────────────────────────────────────── */}
        <div
          ref={noteRef}
          className="wki-note-inner"
          style={{
            marginTop: 80,
            background: "rgba(57,217,138,0.04)",
            border: "1px solid rgba(57,217,138,0.15)",
            borderRadius: 20,
            padding: "48px 52px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative quote mark */}
          <div aria-hidden style={{
            position: "absolute", top: 24, right: 36,
            fontFamily: "var(--font-display)", fontSize: 120,
            color: "rgba(57,217,138,0.06)", lineHeight: 1,
            fontWeight: 900, userSelect: "none",
          }}>
            "
          </div>

          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A",
            textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 20px",
          }}>
            A note from us
          </p>
          <p style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(18px, 2vw, 24px)", color: "#FFFFFF",
            lineHeight: 1.4, margin: "0 0 20px", maxWidth: 680,
          }}>
            We are South Africans building this for South African neighbourhoods.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 15,
            color: "rgba(240,246,252,0.60)", lineHeight: 1.8,
            margin: "0 0 16px", maxWidth: 680,
          }}>
            We grew up in these streets. We know the barbershop that's been on
            the corner for 20 years and doesn't have a Google listing. The spaza
            that everyone in the block uses but nobody outside knows about. The
            church hall that doubles as a community hub every weekend.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 15,
            color: "rgba(240,246,252,0.60)", lineHeight: 1.8,
            margin: "0 0 32px", maxWidth: 680,
          }}>
            Kayaa isn't about building a tech company. It's about making the
            invisible parts of our neighbourhoods visible — and giving the places
            that hold communities together the tools to keep doing it. One street
            at a time.
          </p>
          <button
            type="button"
            onClick={() => openWaitlist()}
            style={{
              background: "#39D98A", color: "#0D1117",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
              padding: "12px 28px", borderRadius: "999px",
              border: "none", cursor: "pointer",
              transition: "filter 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "none")}
          >
            Join the waitlist →
          </button>
        </div>

      </div>
    </section>
  );
}
