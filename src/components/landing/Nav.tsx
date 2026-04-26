import { useNavigate } from "react-router-dom";

export function Nav() {
  const navigate = useNavigate();
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: "64px",
        padding: "0 32px",
        background: "rgba(13,17,23,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <a
        href="/"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "22px",
          color: "var(--green)",
          textDecoration: "none",
          textShadow: "0 1px 12px rgba(0,0,0,0.55)",
        }}
      >
        kayaa
      </a>
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <a
          href="/login"
          className="kayaa-signin"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "rgba(255,255,255,0.6)",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
        >
          Sign in
        </a>
        <button
          onClick={() => navigate("/login")}
          className="kayaa-add-btn"
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "13px",
            color: "#0D1117",
            background: "#39D98A",
            border: "none",
            padding: "9px 20px",
            borderRadius: "999px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Check in →
        </button>
      </div>
      <style>{`
        .kayaa-signin:hover { color: #FFFFFF !important; }
        .kayaa-add-btn:hover { filter: brightness(1.1); }
      `}</style>
    </nav>
  );
}
