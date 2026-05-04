import { useEffect, useRef } from "react";

// ── Shared text styles ────────────────────────────────────────────────────────
const LABEL: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#39D98A",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  margin: "0 0 16px",
};

const BODY: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "clamp(15px, 2vw, 17px)" as unknown as number,
  color: "rgba(240,246,252,0.68)",
  lineHeight: 1.8,
  margin: "0 0 20px",
};

const PLACE_STORIES = [
  {
    icon: "💈",
    place: "The barber",
    body: "who has cut three generations of the same family has no visible record of the community he has built — and no simple way to stay connected to the people who already trust him.",
  },
  {
    icon: "🛒",
    place: "The tuckshop",
    body: "that fed a street through lockdown cannot clearly show the consistency of the customers it serves, even though the same people keep coming back every single day.",
  },
  {
    icon: "💅",
    place: "The salon",
    body: "that taught a generation of women how to feel beautiful has no real archive of that trust, no visible trail of what it means to the people who depend on it, and no durable neighbourhood presence beyond the day itself.",
  },
  {
    icon: "🍖",
    place: "The shisanyama where birthdays end,",
    body: "the car wash where football debates happen, the church hall that holds weddings and funerals in the same week, the café people keep recommending, the mechanic people trust with their week, and the clothing shop people return to before every important moment — are often visible only to the people who already know them.",
  },
];

const AREAS = [
  "Sandton", "Rosebank", "Fourways", "Randburg", "Braamfontein",
  "Hillbrow", "Maboneng", "Soweto", "Alexandra", "Tembisa",
  "Khayelitsha", "Mitchells Plain",
];

const NOT_ITEMS = [
  {
    label: "Not a rating game.",
    body: "This is not built to reduce places to stars and scores.",
  },
  {
    label: "Not a global directory.",
    body: "This is built around neighbourhood visibility and local relevance.",
  },
  {
    label: "Not a chain showcase.",
    body: "This is for the places people already trust — not only the places with the biggest budgets.",
  },
  {
    label: "Not another noisy content feed.",
    body: "This is built around places, neighbourhood life, and local visibility.",
  },
  {
    label: "Not a payments app.",
    body: "The cash that already moves through these places is not the first problem. Visibility is.",
  },
  {
    label: "Not live yet.",
    body: "We are pre-launch. One neighbourhood at a time, wherever people speak up first.",
  },
];

// ── Scroll-reveal helper ──────────────────────────────────────────────────────
function useReveal(refs: React.MutableRefObject<(HTMLElement | null)[]>, stagger = 0.12) {
  useEffect(() => {
    const els = refs.current.filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.07, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(28px)";
      el.style.transition = `opacity 0.7s ease ${i * stagger}s, transform 0.7s ease ${i * stagger}s`;
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────

export function WhatKayaaIs() {
  const topRefs    = useRef<(HTMLElement | null)[]>([]);
  const storyRefs  = useRef<(HTMLElement | null)[]>([]);
  const costRefs   = useRef<(HTMLElement | null)[]>([]);
  const whatRefs   = useRef<(HTMLElement | null)[]>([]);
  const helpsRefs  = useRef<(HTMLElement | null)[]>([]);
  const notRefs    = useRef<(HTMLElement | null)[]>([]);

  useReveal(topRefs,   0.12);
  useReveal(storyRefs, 0.10);
  useReveal(costRefs,  0.12);
  useReveal(whatRefs,  0.12);
  useReveal(helpsRefs, 0.12);
  useReveal(notRefs,   0.08);

  return (
    <section
      id="about"
      style={{
        background: "#0D1117",
        borderTop: "1px solid #21262D",
        position: "relative",
      }}
    >
      <style>{`
        .wki-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 100px 6%;
        }
        .wki-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.07);
          margin: clamp(48px, 7vw, 72px) 0;
        }
        .wki-pull {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: clamp(26px, 3.2vw, 40px);
          color: #FFFFFF;
          line-height: 1.2;
          margin: 0 0 28px;
        }
        .wki-pull-green { color: #39D98A; }
        .wki-story-card {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          padding: 24px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .wki-story-card:last-child { border-bottom: none; }
        .wki-story-icon {
          font-size: 28px;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 3px;
        }
        .wki-areas {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 28px 0 0;
        }
        .wki-area-chip {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 999px;
          padding: 5px 12px;
          letter-spacing: 0.04em;
        }
        .wki-cost-box {
          background: rgba(248,113,113,0.05);
          border: 1px solid rgba(248,113,113,0.18);
          border-left: 3px solid rgba(248,113,113,0.6);
          border-radius: 0 12px 12px 0;
          padding: 28px 32px;
          margin: 32px 0;
        }
        .wki-cost-quote {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: clamp(20px, 2.4vw, 28px);
          color: #FFFFFF;
          line-height: 1.25;
          margin: 0 0 16px;
        }
        .wki-what-box {
          background: rgba(57,217,138,0.04);
          border: 1px solid rgba(57,217,138,0.15);
          border-radius: 16px;
          padding: 36px 40px;
          margin: 32px 0;
        }
        .wki-what-headline {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: clamp(24px, 2.8vw, 34px);
          color: #FFFFFF;
          line-height: 1.2;
          margin: 0 0 20px;
        }
        .wki-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 24px 0 0;
          padding: 0;
          list-style: none;
        }
        .wki-list li {
          font-family: var(--font-body);
          font-size: 15px;
          color: rgba(240,246,252,0.65);
          line-height: 1.6;
          padding-left: 20px;
          position: relative;
        }
        .wki-list li::before {
          content: "→";
          position: absolute;
          left: 0;
          color: #39D98A;
          font-size: 13px;
        }
        .wki-not-item {
          padding: 18px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .wki-not-item:last-child { border-bottom: none; }
        .wki-helps-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 32px;
        }
        .wki-helps-card {
          background: #161B22;
          border: 1px solid #21262D;
          border-radius: 14px;
          padding: 24px;
        }
        @media (max-width: 640px) {
          .wki-inner { padding: 72px 6%; }
          .wki-helps-cols { grid-template-columns: 1fr; }
          .wki-what-box { padding: 24px 20px; }
          .wki-cost-box { padding: 20px 20px; }
        }
      `}</style>

      <div className="wki-inner">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div ref={(el) => { topRefs.current[0] = el; }}>
          <p style={LABEL}>About kayaa · An honest letter</p>
          <h2 className="wki-pull">
            We say support local.<br />
            But we{" "}
            <span className="wki-pull-green">cannot even find local.</span>
          </h2>
          <p style={{ ...BODY, fontSize: 16 }}>
            This page is the long version of why kayaa exists. No spin.
            No vague promises. Just the problem, the cost of leaving it
            unsolved, and what kayaa is being built to do about it.
          </p>
        </div>

        <hr className="wki-divider" />

        {/* ── The uncomfortable part ─────────────────────────────────────── */}
        <div ref={(el) => { topRefs.current[1] = el; }}>
          <p style={LABEL}>The uncomfortable part</p>
          <p style={BODY}>
            South Africa is full of neighbourhood places doing extraordinary
            things, and almost none of them are easy to find properly.
          </p>
        </div>

        <div>
          {PLACE_STORIES.map((s, i) => (
            <div
              key={s.place}
              ref={(el) => { storyRefs.current[i] = el; }}
              className="wki-story-card"
            >
              <span className="wki-story-icon">{s.icon}</span>
              <p style={{ ...BODY, margin: 0 }}>
                <strong style={{ color: "#F0F6FC", fontWeight: 700 }}>
                  {s.place}
                </strong>{" "}
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div ref={(el) => { storyRefs.current[PLACE_STORIES.length] = el; }}>
          <p style={{ ...BODY, marginTop: 28 }}>
            Not to the neighbourhood. To everyone else.
          </p>
          <p style={{ ...BODY, fontStyle: "italic", color: "rgba(240,246,252,0.45)" }}>
            The same thing is happening in —
          </p>
          <div className="wki-areas">
            {AREAS.map((a) => (
              <span key={a} className="wki-area-chip">{a}</span>
            ))}
          </div>
          <p style={{ ...BODY, marginTop: 28 }}>
            Different streets. The same wound.
          </p>
        </div>

        <hr className="wki-divider" />

        {/* ── What this costs us ─────────────────────────────────────────── */}
        <div ref={(el) => { costRefs.current[0] = el; }}>
          <p style={LABEL}>What this costs us</p>
        </div>

        <div
          ref={(el) => { costRefs.current[1] = el; }}
          className="wki-cost-box"
        >
          <p className="wki-cost-quote">
            Invisibility is not neutral.<br />
            It costs real things.
          </p>
          <p style={{ ...BODY, margin: 0, fontSize: 15 }}>
            When a place cannot be seen properly, it becomes harder to attract
            new customers, harder to prove value, harder to build continuity,
            harder to create momentum, and harder to grow beyond the limits of
            word of mouth.
          </p>
        </div>

        <div ref={(el) => { costRefs.current[2] = el; }}>
          <p style={BODY}>
            When a place stays invisible for too long, it does not only lose
            attention. It loses opportunity.
          </p>
          <p style={{ ...BODY, color: "rgba(240,246,252,0.82)", fontWeight: 500 }}>
            We keep telling each other to support local. But you cannot support
            what you cannot see clearly. And we have built a country where many
            of the places doing the most are still the ones being seen the least.
          </p>
        </div>

        <hr className="wki-divider" />

        {/* ── What kayaa is ──────────────────────────────────────────────── */}
        <div ref={(el) => { whatRefs.current[0] = el; }}>
          <p style={LABEL}>What kayaa is</p>
        </div>

        <div
          ref={(el) => { whatRefs.current[1] = el; }}
          className="wki-what-box"
        >
          <p className="wki-what-headline">
            A visibility layer for the<br />
            <span style={{ color: "#39D98A" }}>places that already matter.</span>
          </p>
          <p style={{ ...BODY, fontSize: 15, margin: 0 }}>
            kayaa is a neighbourhood-first visibility and discovery platform
            where people can see the places that matter, follow what is
            happening around them, and share useful local updates tied to real
            places — built so that being known does not require a marketing budget.
          </p>
        </div>

        <div ref={(el) => { whatRefs.current[2] = el; }}>
          <p style={BODY}>
            You will be able to open kayaa, see the places around you, follow
            the updates people are sharing, see useful neighbourhood signals and
            alerts, and share photos, videos, and posts tied to the exact place
            they happened. Walk in and tap once to show you were there.
          </p>
          <p style={BODY}>
            Places get a real page, a visible record of community activity, and
            a clearer way to stay connected to the people who already know them
            — and the people nearby who should.
          </p>
          <p style={{ ...BODY, fontStyle: "italic", color: "rgba(240,246,252,0.45)" }}>
            A living neighbourhood layer. Not just a place directory.
          </p>
          <ul className="wki-list">
            <li>Clearer discovery for neighbourhoods.</li>
            <li>Better visibility for places.</li>
            <li>More commercial possibility for businesses.</li>
            <li>More awareness of what is happening around you.</li>
          </ul>
        </div>

        <hr className="wki-divider" />

        {/* ── What kayaa helps do ────────────────────────────────────────── */}
        <div ref={(el) => { helpsRefs.current[0] = el; }}>
          <p style={LABEL}>What kayaa helps do</p>
          <h3 className="wki-pull" style={{ fontSize: "clamp(22px, 2.6vw, 34px)" }}>
            Easier to find.{" "}
            <span className="wki-pull-green">Easier to return to.</span>{" "}
            Easier to grow.
          </h3>
          <p style={BODY}>
            kayaa is being built to help local places become easier to find,
            easier to return to, and easier to grow.
          </p>
        </div>

        <div
          ref={(el) => { helpsRefs.current[1] = el; }}
          className="wki-helps-cols"
        >
          <div className="wki-helps-card">
            <p style={{ ...LABEL, marginBottom: 10 }}>For neighbourhoods</p>
            <p style={{ ...BODY, fontSize: 14, margin: 0 }}>
              Less guesswork, clearer local discovery, and a practical view of
              what is happening nearby — useful alerts, community updates, and
              place-based posts that help people stay more informed, more alert,
              and better connected to local life.
            </p>
          </div>
          <div className="wki-helps-card">
            <p style={{ ...LABEL, marginBottom: 10 }}>For businesses & places</p>
            <p style={{ ...BODY, fontSize: 14, margin: 0 }}>
              Stronger visibility, more repeat recognition, and a better chance
              of turning everyday trust into something visible, usable, and
              commercially meaningful. Because the problem is not only that
              local places are loved — it is that too many of them are still
              digitally hard to see.
            </p>
          </div>
        </div>

        <hr className="wki-divider" />

        {/* ── What kayaa is not ──────────────────────────────────────────── */}
        <div ref={(el) => { notRefs.current[0] = el; }}>
          <p style={LABEL}>What kayaa is not</p>
        </div>

        <div>
          {NOT_ITEMS.map((item, i) => (
            <div
              key={item.label}
              ref={(el) => { notRefs.current[i + 1] = el; }}
              className="wki-not-item"
            >
              <p style={{ ...BODY, margin: 0 }}>
                <strong style={{ color: "#F0F6FC", fontWeight: 700 }}>
                  {item.label}
                </strong>{" "}
                {item.body}
              </p>
            </div>
          ))}
        </div>


      </div>
    </section>
  );
}
