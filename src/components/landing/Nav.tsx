import { Link } from "react-router-dom";
import { openWaitlist } from "../../lib/waitlist-store";

export function Nav() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 200,
        height: "64px",
        padding: "0 32px",
        background: "rgba(13,17,23,0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <style>{`
        .kayaa-nav-link { transition: color 0.2s; }
        .kayaa-nav-link:hover { color: #FFFFFF !important; }
        .kayaa-nav-nominate:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.35) !important; }
        .kayaa-nav-join:hover { filter: brightness(1.12); }
        @media (max-width: 920px) {
          .kayaa-nav-links { display: none !important; }
          .kayaa-nav-nominate { display: none !important; }
        }
      `}</style>

      {/* Logo */}
      <Link
        to="/about"
        style={{
          fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "22px", color: "var(--green)",
          textDecoration: "none",
        }}
      >
        kayaa
      </Link>

      {/* Center links */}
      <div className="kayaa-nav-links" style={{ display: "flex", gap: "28px", alignItems: "center" }}>
        {[
          { label: "How it works", href: "#how" },
          { label: "For places", href: "#features" },
          { label: "About", to: "/about" },
        ].map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              className="kayaa-nav-link"
              style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.55)", textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ) : (
            <a
              key={item.label}
              href={item.href}
              className="kayaa-nav-link"
              style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.55)", textDecoration: "none" }}
            >
              {item.label}
            </a>
          )
        )}
      </div>

      {/* Right buttons */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => openWaitlist()}
          className="kayaa-nav-nominate"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.65)",
            fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "13px",
            padding: "8px 18px", borderRadius: "999px",
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          Nominate a place
        </button>
        <button
          type="button"
          onClick={() => openWaitlist()}
          className="kayaa-nav-join"
          style={{
            background: "var(--green)", color: "#0D1117",
            fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "13px",
            padding: "9px 20px", borderRadius: "999px",
            border: "none", cursor: "pointer", transition: "all 0.2s",
          }}
        >
          Join the waitlist →
        </button>
      </div>
    </nav>
  );
}
