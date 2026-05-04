import { useEffect, useState, useCallback, useRef, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

type Slide = {
  photo: string;
  alt: string;
  brightness: number;
  contrast: number;
  overlay: string;
  render: () => React.ReactNode;
};

const photoFilter = (b: number, c: number) =>
  `contrast(${c}) brightness(${b})`;

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#39D98A",
  margin: 0,
};

const headlineStyle = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: "clamp(34px, 5.2vw, 68px)",
  lineHeight: 1.05,
  color: "#FFFFFF",
  margin: 0,
  ...extra,
});

const supportStyle = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "var(--font-body)",
  fontWeight: 400,
  fontSize: 17,
  color: "rgba(255,255,255,0.7)",
  lineHeight: 1.55,
  margin: 0,
  ...extra,
});

const slideNumberStyle: CSSProperties = {
  position: "absolute",
  top: 24,
  right: 32,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.4)",
  zIndex: 12,
};

export function HeroCarousel() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides: Slide[] = [
    {
      photo: "/landing/01-made-in-soweto.jpg",
      alt: "Made in Soweto — township street life",
      brightness: 0.65,
      contrast: 1.08,
      overlay:
        "linear-gradient(to right, rgba(13,17,23,0.82) 0%, rgba(13,17,23,0.55) 55%, rgba(13,17,23,0.1) 100%)",
      render: () => (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "0 6% max(9%, env(safe-area-inset-bottom, 0px) + 24px)",
            zIndex: 10,
          }}
        >
          <p style={{ ...labelStyle, marginBottom: 20 }}>kayaa · South Africa</p>
          <h1 style={headlineStyle({ fontSize: "clamp(38px, 5.6vw, 74px)", maxWidth: 820 })}>
            We say support local.
            <br />
            But we{" "}
            <span style={{ color: "#39D98A" }}>cannot even find</span>{" "}
            local.
          </h1>

          {/* CTA buttons — visible on first slide like kayaa.app */}
          <div
            data-secondary="true"
            className="kayaa-hero-cta-row"
            style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}
          >
            <a
              href="/welcome"
              className="kayaa-hero-nominate"
              style={{
                display: "inline-block",
                background: "#39D98A", color: "#0D1117",
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16,
                padding: "15px 30px", borderRadius: 999,
                textDecoration: "none", transition: "all 0.2s",
                boxShadow: "0 0 40px rgba(57,217,138,0.3)",
              }}
            >
              Get started free
            </a>
            <a
              href="/welcome"
              className="kayaa-hero-waitlist"
              style={{
                display: "inline-block",
                background: "rgba(13,17,23,0.6)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "#FFFFFF",
                fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 16,
                padding: "15px 30px", borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.3)",
                textDecoration: "none", transition: "all 0.2s",
              }}
            >
              Sign in
            </a>
          </div>

          {/* Share row */}
          <div
            data-secondary="true"
            className="kayaa-hero-share-row"
            style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}
          >
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "kayaa", text: "The neighbourhood app for South Africa", url: window.location.origin });
                } else {
                  navigator.clipboard.writeText(window.location.origin);
                }
              }}
              className="kayaa-hero-share"
              style={{
                background: "rgba(13,17,23,0.5)", backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-body)", fontSize: 13,
                padding: "9px 18px", borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span>↗</span> Share this with your street
            </button>
            <a
              href="https://wa.me/27663365296"
              target="_blank"
              rel="noopener noreferrer"
              className="kayaa-hero-whatsapp"
              style={{
                background: "rgba(37,211,102,0.15)", backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "#25D366",
                fontFamily: "var(--font-body)", fontSize: 13,
                padding: "9px 18px", borderRadius: 999,
                border: "1px solid rgba(37,211,102,0.3)",
                cursor: "pointer", transition: "all 0.2s",
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <span>💬</span> WhatsApp
            </a>
          </div>
        </div>
      ),
    },
    {
      photo: "/landing/09-township-barbershop.jpg",
      alt: "Bhuti's Barber — township barbershop in Alexandra",
      brightness: 0.7,
      contrast: 1.1,
      overlay:
        "linear-gradient(to right, rgba(13,17,23,0) 0%, rgba(13,17,23,0) 30%, rgba(13,17,23,0.95) 100%)",
      render: () => (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: "#39D98A",
              zIndex: 11,
            }}
          />
          <div
            className="kayaa-hero-right-content"
            style={{
              position: "absolute",
              right: "6%",
              top: "50%",
              transform: "translateY(-50%)",
              maxWidth: 520,
              textAlign: "right",
              zIndex: 10,
            }}
          >
            <p style={{ ...labelStyle, marginBottom: 18 }}>The Barbershop</p>
            <h2 style={headlineStyle()}>
              He knows your cut.
              <br />
              He knows your story.
              <br />
              He's just never been{" "}
              <span style={{ color: "#39D98A" }}>able to reach you</span>
              <br />
              when it's quiet.
            </h2>
            <p data-secondary="true" style={supportStyle({ marginTop: 24, fontSize: 16 })}>
              Every regular is invisible without a record.
            </p>
          </div>
        </>
      ),
    },
    {
      photo: "/landing/04-shisanyama-evening.jpg",
      alt: "Mzansi Meat shisanyama braai in Soweto at dusk",
      brightness: 0.7,
      contrast: 1.1,
      overlay:
        "linear-gradient(to top, rgba(13,17,23,0.97) 0%, rgba(13,17,23,0.6) 40%, rgba(13,17,23,0.1) 100%)",
      render: () => (
        <>
          <div
            className="kayaa-hero-stamp"
            style={{
              position: "absolute",
              top: "30%",
              right: "8%",
              maxWidth: 280,
              background: "rgba(13,17,23,0.85)",
              border: "1px solid rgba(57,217,138,0.25)",
              borderLeft: "3px solid #39D98A",
              borderRadius: 8,
              padding: 16,
              zIndex: 11,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: 13,
                color: "rgba(255,255,255,0.8)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              "Every celebration somehow ends there."
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#39D98A",
                marginTop: 8,
                letterSpacing: "0.14em",
              }}
            >
              REGULAR · TEMBISA
            </p>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "0 10% 8%",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            <p style={{ ...labelStyle, marginBottom: 18 }}>Friday Nights</p>
            <h2 style={headlineStyle()}>
              Friday is a feeling.
              <br />
              <span style={{ color: "#39D98A" }}>Not a day.</span>
            </h2>
            <p data-secondary="true" style={supportStyle({ marginTop: 24, maxWidth: 600, marginLeft: "auto", marginRight: "auto" })}>
              The shisanyama doesn't need an Instagram page. It needs its
              regulars to find it.
            </p>
          </div>
        </>
      ),
    },
    {
      photo: "/landing/03-kwamahlangu-carwash.jpg",
      alt: "KwaMahlangu Car Wash in Tembisa",
      brightness: 0.75,
      contrast: 1.1,
      overlay:
        "linear-gradient(to bottom right, rgba(13,17,23,0.9) 0%, rgba(13,17,23,0.3) 60%, rgba(13,17,23,0) 100%)",
      render: () => (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "18% 6% 0",
              zIndex: 10,
              maxWidth: 720,
            }}
          >
            <p style={{ ...labelStyle, marginBottom: 18 }}>The Car Wash</p>
            <h2 style={headlineStyle()}>
              People don't come
              <br />
              just for the wash.
              <br />
              They come for the{" "}
              <span style={{ color: "#39D98A" }}>conversations.</span>
            </h2>
            <p data-secondary="true" style={supportStyle({ marginTop: 24, maxWidth: 420, fontSize: 16 })}>
              The connections. The football debates. The referrals. The
              everyday life that happens while they wait.
            </p>
          </div>
          <div
            className="kayaa-hero-stamp"
            style={{
              position: "absolute",
              bottom: "12%",
              right: "6%",
              background: "rgba(13,17,23,0.9)",
              border: "1px solid #21262D",
              borderBottom: "2px solid #39D98A",
              borderRadius: 4,
              padding: "20px 24px",
              zIndex: 11,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 14,
                color: "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              RESPECT LOCAL
              <br />
              SUPPORT LOCAL
            </p>
          </div>
        </>
      ),
    },
    {
      photo: "/landing/06-tuckshop-window.jpg",
      alt: "Township tuckshop window with school kids buying chips",
      brightness: 0.7,
      contrast: 1.05,
      overlay:
        "radial-gradient(ellipse at 70% 50%, rgba(13,17,23,0) 0%, rgba(13,17,23,0.8) 60%, rgba(13,17,23,0.97) 100%)",
      render: () => (
        <div
          style={{
            position: "absolute",
            left: "6%",
            top: "50%",
            transform: "translateY(-50%)",
            maxWidth: 560,
            zIndex: 10,
          }}
        >
          <p style={{ ...labelStyle, marginBottom: 18 }}>The Tuckshop</p>
          <h2 style={headlineStyle()}>Trusted for years.</h2>
          <p
            style={{
              ...headlineStyle({
                color: "rgba(255,255,255,0.7)",
                fontSize: "clamp(32px, 5vw, 60px)",
                marginTop: 8,
              }),
            }}
          >
            Full every weekend.
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(36px, 5vw, 68px)",
              lineHeight: 1,
              color: "#39D98A",
              margin: "8px 0 0",
            }}
          >
            Still hard to find.
          </p>
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 32,
              flexWrap: "wrap",
            }}
          >
            {[
              { n: "79%", l: "Not on Google Maps" },
              { n: "R900B", l: "Township economy" },
              { n: "0", l: "Tools for cash regulars" },
            ].map((f) => (
              <div key={f.n}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 32,
                    color: "#39D98A",
                    lineHeight: 1,
                  }}
                >
                  {f.n}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 6,
                  }}
                >
                  {f.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      photo: "/landing/05-salon-container.jpg",
      alt: "Sisi's Hair & Nails container salon in Khayelitsha",
      brightness: 0.75,
      contrast: 1.1,
      overlay:
        "linear-gradient(to top left, rgba(13,17,23,0.95) 0%, rgba(13,17,23,0.5) 50%, rgba(13,17,23,0.1) 100%)",
      render: () => (
        <div
          className="kayaa-hero-right-content"
          style={{
            position: "absolute",
            right: "6%",
            bottom: "10%",
            textAlign: "right",
            maxWidth: 480,
            zIndex: 10,
          }}
        >
          <p style={{ ...labelStyle, marginBottom: 18 }}>The Salon</p>
          <h2 style={headlineStyle()}>
            This place made
            <br />
            so many women feel
            <br />
            <span style={{ color: "#39D98A" }}>seen.</span>
          </h2>
          <p data-secondary="true" style={supportStyle({ marginTop: 24, fontSize: 16 })}>
            Not a spa. Not a franchise. The place on your street that always
            had a space for you.
          </p>
          <div
            style={{
              borderTop: "1px solid rgba(57,217,138,0.2)",
              paddingTop: 16,
              marginTop: 24,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
                margin: 0,
              }}
            >
              "She remembered how everyone liked their coffee when they came
              to wait."
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#39D98A",
                marginTop: 8,
                letterSpacing: "0.14em",
              }}
            >
              REGULAR · SANDTON
            </p>
          </div>
        </div>
      ),
    },
    {
      photo: "/landing/07-taxi-rank-morning.jpg",
      alt: "Minibus taxi rank in the morning, commuters and marshal",
      brightness: 0.55,
      contrast: 1.05,
      overlay: "rgba(13,17,23,0.82)",
      render: () => (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
            zIndex: 10,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(44px, 7vw, 88px)",
              lineHeight: 1.05,
              color: "#FFFFFF",
              margin: 0,
              maxWidth: 1100,
            }}
          >
            Every place that
            <br />
            makes a neighbourhood.
            <br />
            <span style={{ color: "#39D98A" }}>One network.</span>
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 18,
              color: "rgba(255,255,255,0.6)",
              maxWidth: 500,
              margin: "24px auto 0",
              lineHeight: 1.6,
            }}
          >
            Find your local places. Check in. Or add your place and let your
            community find you.
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 44,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => navigate("/login")}
              className="kayaa-cta-explore"
              style={{
                background: "#39D98A",
                color: "#0D1117",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: 16,
                padding: "16px 36px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 60px rgba(57,217,138,0.3)",
                transition: "all 0.2s ease",
              }}
            >
              Check in nearby →
            </button>
            <button
              onClick={() => navigate("/onboarding")}
              className="kayaa-cta-add"
              style={{
                background: "transparent",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.3)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 16,
                padding: "16px 36px",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              I run a place — add it free
            </button>
          </div>
          <p
            data-secondary="true"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.18em",
              marginTop: 20,
            }}
          >
            NO CARD · NO DOWNLOAD · JUST OPEN
          </p>
        </div>
      ),
    },
  ];

  const total = slides.length;

  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);
  const prev = useCallback(
    () => setActive((a) => (a - 1 + total) % total),
    [total],
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.code === "Space") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // touch / swipe
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return (
    <section
      aria-label="kayaa story"
      className="kayaa-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        width: "100%",
        height: "100dvh",
        position: "relative",
        overflow: "hidden",
        background: "#0D1117",
      }}
    >
      <style>{`
        .kayaa-cta-explore:hover { filter: brightness(1.1); transform: scale(1.02); }
        .kayaa-cta-add:hover { background: rgba(255,255,255,0.08) !important; border-color: #FFFFFF !important; }
        .kayaa-arrow:hover { background: rgba(13,17,23,0.9) !important; border-color: rgba(57,217,138,0.5) !important; }
        .kayaa-hero-nominate:hover { filter: brightness(1.12); transform: translateY(-1px); }
        .kayaa-hero-waitlist:hover { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.5) !important; }
        .kayaa-hero-share:hover { background: rgba(255,255,255,0.1) !important; color: #FFFFFF !important; }
        .kayaa-hero-whatsapp:hover { background: rgba(37,211,102,0.25) !important; }
        .kayaa-dot { transition: all 0.3s ease; }
        @media (max-width: 500px) {
          .kayaa-hero-cta-row { flex-direction: column !important; }
          .kayaa-hero-nominate, .kayaa-hero-waitlist {
            width: 100%; text-align: center; justify-content: center;
            font-size: 15px !important; padding: 14px 20px !important;
          }
          .kayaa-hero-share-row { flex-direction: column !important; }
          .kayaa-hero-share, .kayaa-hero-whatsapp {
            width: 100%; justify-content: center; text-align: center;
          }
          .kayaa-hero-stamp { display: none !important; }
        }
        .kayaa-progress-fill { animation: kayaaProgress 5s linear forwards; }
        .kayaa-progress-fill.kayaa-paused { animation-play-state: paused; }
        @keyframes kayaaProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @media (max-width: 768px) {
          .kayaa-arrow { display: none !important; }
          /* Right-aligned slide content — switch to left-bottom on mobile */
          .kayaa-hero-right-content {
            right: 6% !important; left: 6% !important;
            top: auto !important; bottom: 10% !important;
            transform: none !important; text-align: left !important;
            max-width: 100% !important;
          }
        }
        @media (max-height: 760px) {
          .kayaa-hero h1, .kayaa-hero h2 {
            font-size: clamp(26px, 4.2vw, 52px) !important;
            line-height: 1.05 !important;
          }
          .kayaa-hero p[data-secondary="true"],
          div[data-secondary="true"] { display: none !important; }
        }
        @media (max-height: 620px) {
          .kayaa-hero h1, .kayaa-hero h2 {
            font-size: clamp(22px, 3.8vw, 38px) !important;
          }
        }
        @media (max-width: 480px) {
          .kayaa-hero h1 { font-size: clamp(30px, 7.5vw, 44px) !important; }
        }
      `}</style>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,0.1)",
          zIndex: 50,
        }}
      >
        <div
          key={`${active}-${paused ? "p" : "r"}`}
          className={`kayaa-progress-fill ${paused ? "kayaa-paused" : ""}`}
          style={{
            height: "100%",
            background: "#39D98A",
            width: 0,
          }}
        />
      </div>

      {slides.map((s, i) => (
        <div
          key={i}
          aria-hidden={i !== active}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === active ? 1 : 0,
            transition: "opacity 0.8s ease",
            pointerEvents: i === active ? "auto" : "none",
            background: "linear-gradient(135deg, #0D1117, #161B22)",
          }}
        >
          <img
            src={s.photo}
            alt={s.alt}
            loading={i === 0 ? "eager" : "lazy"}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: photoFilter(s.brightness, s.contrast),
              zIndex: 0,
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: s.overlay,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          {s.render()}
          <div style={slideNumberStyle}>
            {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button
        aria-label="Previous slide"
        onClick={prev}
        className="kayaa-arrow"
        style={{
          position: "absolute",
          left: 24,
          top: "50%",
          transform: "translateY(-50%)",
          width: 44,
          height: 44,
          borderRadius: 999,
          background: "rgba(13,17,23,0.5)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.8)",
          cursor: "pointer",
          zIndex: 20,
          fontSize: 18,
          transition: "all 0.2s",
        }}
      >
        ‹
      </button>
      <button
        aria-label="Next slide"
        onClick={next}
        className="kayaa-arrow"
        style={{
          position: "absolute",
          right: 24,
          top: "50%",
          transform: "translateY(-50%)",
          width: 44,
          height: 44,
          borderRadius: 999,
          background: "rgba(13,17,23,0.5)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.8)",
          cursor: "pointer",
          zIndex: 20,
          fontSize: 18,
          transition: "all 0.2s",
        }}
      >
        ›
      </button>

      {/* Dots */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          zIndex: 50,
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setActive(i)}
            className="kayaa-dot"
            style={{
              width: i === active ? 24 : 6,
              height: 6,
              borderRadius: i === active ? 999 : "50%",
              border: "none",
              cursor: "pointer",
              background:
                i === active ? "#39D98A" : "rgba(255,255,255,0.25)",
              padding: 0,
            }}
          />
        ))}
      </div>
    </section>
  );
}
