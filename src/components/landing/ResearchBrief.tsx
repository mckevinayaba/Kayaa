import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function ResearchBrief() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const place_name = String(fd.get("place_name") || "").trim();
    const place_type = String(fd.get("place_type") || "").trim();
    const story = String(fd.get("story") || "").trim();
    const contact = String(fd.get("contact") || "").trim();

    if (place_name.length < 2) {
      setError("Tell us the name");
      return;
    }

    setSubmitting(true);
    const { error: dbError } = await supabase.from("community_stories").insert({
      place_name,
      place_type: place_type || null,
      story: story || null,
      contact: contact || null,
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
      className="kayaa-story"
      style={{
        background: "#0D1117",
        padding: "100px 6%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        .kayaa-story::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }
        .kayaa-story-input {
          width: 100%;
          background: #161B22;
          border: 1px solid #21262D;
          border-radius: 8px;
          padding: 14px 16px;
          font-family: var(--font-body);
          font-size: 15px;
          color: #F0F6FC;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .kayaa-story-input:focus { border-color: #39D98A; }
        .kayaa-story-input::placeholder { color: #4B5563; }
        .kayaa-story-submit { transition: all 0.2s ease; }
        .kayaa-story-submit:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: scale(1.01);
        }
      `}</style>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 600,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#39D98A",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            margin: "0 0 24px",
          }}
        >
          Your turn
        </p>
        <h2
          className="reveal"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 50px)",
            color: "#FFFFFF",
            lineHeight: 1.15,
            margin: "0 0 20px",
          }}
        >
          What is that place
          <br />
          in your area?
        </h2>
        <p
          className="reveal"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 17,
            color: "#6B7280",
            lineHeight: 1.7,
            margin: "0 0 48px",
          }}
        >
          The one that keeps pulling people back. The one that would hurt if it
          closed. Tell us. It deserves to be seen.
        </p>

        {/* Example card */}
        <div
          className="reveal reveal-delay-1"
          style={{
            textAlign: "left",
            background: "#161B22",
            border: "1px solid #21262D",
            borderLeft: "3px solid #39D98A",
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 48,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              color: "#39D98A",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              margin: "0 0 10px",
            }}
          >
            Example · Tembisa
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 18,
              color: "#FFFFFF",
              margin: "0 0 6px",
            }}
          >
            Sizwe Shisanyama
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontStyle: "italic",
              fontSize: 14,
              color: "rgba(240,246,252,0.75)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            "Every celebration somehow ends there. Birthdays, payday Fridays,
            funerals. The braai never stops."
          </p>
        </div>

        {done ? (
          <div
            className="reveal reveal-delay-2"
            style={{
              background: "rgba(57,217,138,0.08)",
              border: "1px solid rgba(57,217,138,0.3)",
              borderRadius: 12,
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🙏</div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 20,
                color: "#FFFFFF",
                margin: "0 0 8px",
              }}
            >
              Thank you.
            </p>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "#6B7280",
                margin: 0,
              }}
            >
              We'll add it to the brief. Every place counts.
            </p>
          </div>
        ) : (
          <form
            className="reveal reveal-delay-2"
            onSubmit={onSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              textAlign: "left",
            }}
          >
            <input
              name="place_name"
              required
              placeholder="Place name (e.g. Mama Zulu's Tuckshop)"
              className="kayaa-story-input"
            />
            <input
              name="place_type"
              placeholder="What kind of place? (Tuckshop, Salon, Car wash...)"
              className="kayaa-story-input"
            />
            <textarea
              name="story"
              rows={4}
              placeholder="Why does it matter? What would the neighbourhood lose without it?"
              className="kayaa-story-input"
              style={{ resize: "vertical", fontFamily: "var(--font-body)" }}
            />
            <input
              name="contact"
              placeholder="Your name or contact (optional)"
              className="kayaa-story-input"
            />
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                color: "#6B7280",
                margin: 0,
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
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="kayaa-story-submit"
              style={{
                marginTop: 8,
                background: "#39D98A",
                color: "#0D1117",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 15,
                padding: "14px 28px",
                borderRadius: 8,
                border: "none",
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Sending..." : "Submit your place →"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
