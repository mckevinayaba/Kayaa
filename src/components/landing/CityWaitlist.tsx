import { useState } from "react";
import { supabase } from "../../lib/supabase";

function detectContactType(v: string): "email" | "whatsapp" | "other" {
  const t = v.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "email";
  if (/^[+\d][\d\s\-()]{6,}$/.test(t)) return "whatsapp";
  return "other";
}

export function CityWaitlist() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const area = String(fd.get("area") || "").trim();
    const contact = String(fd.get("contact") || "").trim();

    if (area.length < 2) { setError("Tell us your area"); return; }
    if (contact.length < 3) { setError("Add a way to reach you"); return; }

    setSubmitting(true);
    const { error: dbError } = await supabase.from("country_waitlist").insert({
      area,
      contact,
      contact_type: detectContactType(contact),
      country_code: "ZA",
      source: "landing_page",
    });
    setSubmitting(false);
    if (dbError) {
      setError("Couldn't send right now. Try again.");
      return;
    }
    setDone(true);
  };

  return (
    <section
      style={{
        background: "#0D1117",
        borderTop: "1px solid #21262D",
        padding: "80px 6%",
      }}
    >
      <style>{`
        .kayaa-wait-input {
          flex: 1;
          min-width: 200px;
          background: #161B22;
          border: 1px solid #21262D;
          border-radius: 8px;
          padding: 13px 16px;
          font-family: var(--font-body);
          font-size: 15px;
          color: #F0F6FC;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .kayaa-wait-input:focus { border-color: #39D98A; }
        .kayaa-wait-input::placeholder { color: #4B5563; }
        .kayaa-wait-row { display: flex; gap: 10px; flex-wrap: wrap; }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#39D98A",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            margin: "0 0 16px",
          }}
        >
          Neighbourhood by neighbourhood
        </p>
        <h2
          className="reveal"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(24px, 3vw, 36px)",
            color: "#FFFFFF",
            lineHeight: 1.2,
            margin: "0 0 14px",
          }}
        >
          Want kayaa in your area next?
        </h2>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 16,
            color: "#6B7280",
            margin: "0 0 32px",
            lineHeight: 1.6,
          }}
        >
          We're launching one neighbourhood at a time. Tell us yours and we'll
          let you know the moment it goes live.
        </p>

        {done ? (
          <div
            style={{
              background: "rgba(57,217,138,0.08)",
              border: "1px solid rgba(57,217,138,0.3)",
              borderRadius: 12,
              padding: "24px",
              fontFamily: "var(--font-body)",
              color: "#F0F6FC",
            }}
          >
            <strong style={{ color: "#39D98A" }}>You're on the list.</strong>{" "}
            We'll be in touch when kayaa lands in your area.
          </div>
        ) : (
          <form className="reveal reveal-delay-1" onSubmit={onSubmit}>
            <div className="kayaa-wait-row">
              <input
                name="area"
                required
                placeholder="Your suburb or area (e.g. Tembisa)"
                className="kayaa-wait-input"
              />
              <input
                name="contact"
                required
                placeholder="Email or WhatsApp number"
                className="kayaa-wait-input"
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: "#39D98A",
                  color: "#0D1117",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "13px 22px",
                  borderRadius: 8,
                  border: "none",
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {submitting ? "Sending..." : "Notify me →"}
              </button>
            </div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                color: "#6B7280",
                margin: "10px 0 0",
                textAlign: "left",
              }}
            >
              Email or WhatsApp — whichever you actually check.
            </p>
            {error && (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "#F59E0B",
                  margin: "10px 0 0",
                  textAlign: "left",
                }}
              >
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
