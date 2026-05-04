import { useState, useEffect } from "react";

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        .kayaa-sticky-cta {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 800;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
          background: rgba(13,17,23,0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-top: 1px solid rgba(57,217,138,0.15);
          display: none;
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(.22,.61,.36,1);
        }
        @media (max-width: 768px) {
          .kayaa-sticky-cta { display: block; }
          .kayaa-sticky-cta.visible { transform: translateY(0); }
        }
        .kayaa-sticky-btn:hover { filter: brightness(1.1); }
      `}</style>

      <div className={`kayaa-sticky-cta${visible ? " visible" : ""}`}>
        <a
          href="/welcome"
          className="kayaa-sticky-btn"
          style={{
            display: "block",
            width: "100%",
            background: "#39D98A",
            color: "#0D1117",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 16,
            padding: "16px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            transition: "filter 0.2s",
            boxShadow: "0 0 40px rgba(57,217,138,0.25)",
            textDecoration: "none",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          Get started →
        </a>
      </div>
    </>
  );
}
