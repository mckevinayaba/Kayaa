const NAV_LINKS: { label: string; href: string }[] = [
  { label: "About",         href: "/about" },
  { label: "For Places",    href: "/about#for-places" },
  { label: "How it works",  href: "/about#how-it-works" },
];

export function Footer() {
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
          <a
            href="/about"
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--green)",
              marginBottom: 8,
              textDecoration: "none",
            }}
          >
            kayaa
          </a>
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
          {NAV_LINKS.map((l, i) => (
            <span key={l.href} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <a
                className="kayaa-footer-link"
                href={l.href}
                style={{
                  padding: "0 6px",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--muted-kayaa)",
                  textDecoration: "none",
                }}
              >
                {l.label}
              </a>
              {i < NAV_LINKS.length - 1 && (
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
              href="https://web.facebook.com/profile.php?id=61572162167106"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              Facebook
            </a>
            <a href="mailto:hello@kayaa.africa">Email</a>
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
