import { useNavigate } from "react-router-dom";

const LINKS: { label: string; to: string }[] = [
  { label: "Feed", to: "/feed" },
  { label: "Board", to: "/board" },
  { label: "Add Place", to: "/onboarding" },
  { label: "Sign in", to: "/login" },
];

export function Footer() {
  const navigate = useNavigate();
  return (
    <footer
      style={{
        background: "var(--card-kayaa)",
        borderTop: "1px solid var(--border-kayaa)",
        padding: "clamp(32px,5vw,40px) 6% clamp(28px,4vw,32px)",
      }}
    >
      <style>{`
        .kayaa-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .kayaa-footer-link { transition: color 0.2s; }
        .kayaa-footer-link:hover { color: var(--warm-white) !important; }
        .kayaa-footer-tag {
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--muted-kayaa);
          max-width: 420px;
          line-height: 1.55;
        }
        .kayaa-footer-social {
          display: flex; gap: 14px; align-items: center;
        }
        .kayaa-footer-social a {
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--muted-kayaa);
          text-decoration: none;
          transition: color 0.2s;
        }
        .kayaa-footer-social a:hover { color: var(--green); }
        @media (max-width: 600px) {
          .kayaa-footer-inner {
            flex-direction: column;
            text-align: center;
          }
          .kayaa-footer-tag { text-align: center; }
        }
      `}</style>
      <div className="kayaa-footer-inner">
        <div>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--green)",
              marginBottom: 8,
            }}
          >
            kayaa
          </button>
          <p className="kayaa-footer-tag" style={{ margin: 0 }}>
            Built in Johannesburg. Launching across South Africa,
            neighbourhood by neighbourhood.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {LINKS.map((l, i) => (
            <span key={l.to} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button
                className="kayaa-footer-link"
                onClick={() => navigate(l.to)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 6px",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--muted-kayaa)",
                }}
              >
                {l.label}
              </button>
              {i < LINKS.length - 1 && (
                <span style={{ color: "var(--muted-kayaa)", fontSize: 13 }}>·</span>
              )}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <div className="kayaa-footer-social">
            <a
              href="https://wa.me/27000000000"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
            >
              WhatsApp
            </a>
            <a
              href="https://instagram.com/kayaa.app"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              Instagram
            </a>
            <a href="mailto:hello@kayaa.co.za">Email</a>
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              color: "var(--muted-kayaa)",
            }}
          >
            © 2026 kayaa
          </div>
        </div>
      </div>
    </footer>
  );
}
