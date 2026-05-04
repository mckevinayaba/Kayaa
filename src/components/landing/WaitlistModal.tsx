import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { onWaitlistOpen } from "../../lib/waitlist-store";

// ── 37 place types (matches Lovable) ─────────────────────────────────────────
const PLACE_TYPES = [
  "Barbershop", "Salon / Hair", "Spaza Shop", "Tuckshop", "Shisanyama",
  "Tavern / Shebeen", "Car Wash", "Mechanic / Garage", "Church / Hall",
  "Mosque", "Café / Coffee Shop", "Restaurant", "Fast Food / Take-away",
  "Food Truck / Street Food", "Gym / Fitness", "Boxing / Martial Arts",
  "Tutoring / School", "Library / Study Hub", "Clinic / Doctor", "Pharmacy",
  "Hardware Store", "Supermarket", "Clothing / Fashion", "Tailor",
  "Music Studio", "Nail Bar", "Barber College", "Hair Products",
  "Internet Café", "Photography Studio", "Crèche / Day Care",
  "Kids Activity", "Taxi Rank / Stop", "Market / Flea Market",
  "Sports Ground", "Community Centre", "Other",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalisePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) d = "27" + d.slice(1);
  if (!d.startsWith("27") && d.length === 9) d = "27" + d;
  return "+" + d;
}

function validateContact(v: string): string | null {
  const t = v.trim();
  if (!t) return "Please enter an email or WhatsApp number.";
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  const isPhone = /^[+\d][\d\s\-()]{6,}$/.test(t);
  if (!isEmail && !isPhone) return "Enter a valid email or WhatsApp number.";
  return null;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function WaitlistModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // form state
  const [area, setArea] = useState("");
  const [userType, setUserType] = useState<"neighbour" | "place_owner">("neighbour");
  const [placeName, setPlaceName] = useState("");
  const [placeType, setPlaceType] = useState("");
  const [placeTypeSearch, setPlaceTypeSearch] = useState("");
  const [placeArea, setPlaceArea] = useState("");
  const [placeWhy, setPlaceWhy] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // subscribe to open events
  useEffect(() => {
    return onWaitlistOpen(() => {
      setOpen(true);
      setStep(0);
      setDone(false);
      setError("");
    });
  }, []);

  // focus first input on step change
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, step]);

  // keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setStep(0);
    setDone(false);
    setError("");
  }

  // ── Step navigation ──────────────────────────────────────────────────────
  const STEPS = userType === "place_owner" ? 4 : 3;

  function advance() {
    setError("");
    if (step === 0) {
      if (area.trim().length < 2) { setError("Tell us your area."); return; }
      setStep(1);
    } else if (step === 1) {
      // user type step — always valid
      if (userType === "place_owner") {
        setStep(2); // go to place nomination
      } else {
        setStep(userType === "neighbour" ? 2 : 2);
      }
    } else if (step === 2) {
      if (userType === "place_owner") {
        if (!placeName.trim()) { setError("What is the place called?"); return; }
        if (!placeType) { setError("Pick a place type."); return; }
        setStep(3);
      } else {
        // neighbour → go to contact
        submit();
      }
    } else if (step === 3) {
      submit();
    }
  }

  async function submit() {
    const contactErr = validateContact(contact);
    if (!name.trim()) { setError("What should we call you?"); return; }
    if (contactErr) { setError(contactErr); return; }

    setSubmitting(true);
    setError("");

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
    const emailVal = isEmail ? contact.trim().toLowerCase() : null;
    const whatsappVal = !isEmail ? normalisePhone(contact.trim()) : null;

    // Insert into waitlist_signups
    const { error: e1 } = await supabase.from("waitlist_signups").insert({
      name: name.trim(),
      email: emailVal ?? `wa_${Date.now()}@kayaa.placeholder`,
      whatsapp: whatsappVal,
      neighbourhood: area.trim(),
      user_type: userType,
    });

    // Insert place nomination if applicable
    if (userType === "place_owner" && placeName.trim()) {
      await supabase.from("place_nominations").insert({
        place_name: placeName.trim(),
        place_type: placeType,
        area: placeArea.trim() || area.trim(),
        why: placeWhy.trim() || null,
        submitter_name: name.trim(),
        submitter_contact: contact.trim(),
        contact_type: isEmail ? "email" : "whatsapp",
      });
    }

    setSubmitting(false);

    if (e1 && e1.code !== "23505") {
      setError("Something went wrong — please try again.");
      return;
    }

    setDone(true);
  }

  const filteredTypes = PLACE_TYPES.filter((t) =>
    t.toLowerCase().includes(placeTypeSearch.toLowerCase()),
  );

  const progress = done ? 100 : Math.round(((step) / STEPS) * 100);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Join the Kayaa waitlist"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 901,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "#161B22",
            border: "1px solid #21262D",
            borderRadius: 20,
            width: "100%",
            maxWidth: 500,
            maxHeight: "92vh",
            overflowY: "auto",
            pointerEvents: "auto",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Progress bar */}
          <div style={{ height: 3, background: "#21262D", borderRadius: "20px 20px 0 0" }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: "#39D98A",
              borderRadius: "20px 20px 0 0",
              transition: "width 0.4s cubic-bezier(.22,.61,.36,1)",
            }} />
          </div>

          <div style={{ padding: "28px 28px 32px" }}>
            {/* Close */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button
                onClick={close}
                style={{
                  background: "transparent", border: "none",
                  color: "rgba(255,255,255,0.4)", fontSize: 22,
                  cursor: "pointer", lineHeight: 1, padding: "4px 8px",
                }}
              >
                ×
              </button>
            </div>

            {/* ── Done state ─────────────────────────────────────────────── */}
            {done ? (
              <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
                <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>🎉</div>
                <h2 style={{
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: 26, color: "#F0F6FC", marginBottom: 12,
                }}>
                  You're on the list!
                </h2>
                <p style={{
                  fontFamily: "var(--font-body)", fontSize: 15,
                  color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 28,
                }}>
                  We'll reach out when Kayaa arrives in{" "}
                  <strong style={{ color: "#F0F6FC" }}>{area}</strong>.
                  Building this one neighbourhood at a time.
                </p>
                <button
                  onClick={close}
                  style={{
                    background: "#39D98A", color: "#0D1117",
                    fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15,
                    padding: "14px 32px", borderRadius: 10, border: "none", cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* ── Step 0: Area ─────────────────────────────────────── */}
                {step === 0 && (
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>
                      Step 1 of {STEPS}
                    </p>
                    <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#F0F6FC", marginBottom: 8 }}>
                      Where are you?
                    </h2>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
                      We're launching neighbourhood by neighbourhood.
                    </p>
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && advance()}
                      placeholder="Your suburb or area (e.g. Soweto, Tembisa)"
                      style={inputSt}
                    />
                  </div>
                )}

                {/* ── Step 1: Who are you ───────────────────────────── */}
                {step === 1 && (
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>
                      Step 2 of {STEPS}
                    </p>
                    <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#F0F6FC", marginBottom: 8 }}>
                      What brings you to Kayaa?
                    </h2>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
                      This helps us tailor how we reach out to you.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {([
                        { v: "neighbour", emoji: "🏘️", title: "I'm a neighbour", desc: "I want to find and support local places in my area." },
                        { v: "place_owner", emoji: "🏪", title: "I run a place", desc: "I want my business visible to locals who keep coming back." },
                      ] as const).map(opt => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setUserType(opt.v)}
                          style={{
                            background: userType === opt.v ? "rgba(57,217,138,0.08)" : "#0D1117",
                            border: `1.5px solid ${userType === opt.v ? "#39D98A" : "#21262D"}`,
                            borderRadius: 12,
                            padding: "16px 18px",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: userType === opt.v ? "#39D98A" : "#F0F6FC" }}>
                            {opt.emoji} {opt.title}
                          </div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 2 (place owner): Nominate a place ─────────── */}
                {step === 2 && userType === "place_owner" && (
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>
                      Step 3 of {STEPS} — Your place
                    </p>
                    <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#F0F6FC", marginBottom: 8 }}>
                      Tell us about your place
                    </h2>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
                      We'll prioritise getting your page set up first.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <label style={labelSt}>Place name *</label>
                        <input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          type="text"
                          value={placeName}
                          onChange={(e) => setPlaceName(e.target.value)}
                          placeholder="e.g. Bhuti's Barber, Mama's Kitchen"
                          style={inputSt}
                        />
                      </div>
                      <div>
                        <label style={labelSt}>Place type *</label>
                        <input
                          type="text"
                          value={placeTypeSearch}
                          onChange={(e) => setPlaceTypeSearch(e.target.value)}
                          placeholder="Search or pick a type..."
                          style={{ ...inputSt, marginBottom: 8 }}
                        />
                        <div style={{
                          display: "flex", flexWrap: "wrap", gap: 6,
                          maxHeight: 140, overflowY: "auto",
                        }}>
                          {filteredTypes.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => { setPlaceType(t); setPlaceTypeSearch(""); }}
                              style={{
                                padding: "6px 14px",
                                background: placeType === t ? "rgba(57,217,138,0.12)" : "#0D1117",
                                border: `1px solid ${placeType === t ? "#39D98A" : "#21262D"}`,
                                borderRadius: 999,
                                fontFamily: "var(--font-body)", fontSize: 12,
                                color: placeType === t ? "#39D98A" : "rgba(255,255,255,0.6)",
                                cursor: "pointer",
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={labelSt}>Area (if different from above)</label>
                        <input
                          type="text"
                          value={placeArea}
                          onChange={(e) => setPlaceArea(e.target.value)}
                          placeholder={area || "Suburb or street"}
                          style={inputSt}
                        />
                      </div>
                      <div>
                        <label style={labelSt}>Why do people keep coming back? (optional)</label>
                        <textarea
                          value={placeWhy}
                          onChange={(e) => setPlaceWhy(e.target.value)}
                          placeholder="What makes your place special to the neighbourhood?"
                          rows={3}
                          style={{ ...inputSt, resize: "vertical", paddingTop: 12, paddingBottom: 12 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2 (neighbour) / Step 3 (place owner): Contact ── */}
                {((step === 2 && userType === "neighbour") || (step === 3 && userType === "place_owner")) && (
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#39D98A", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>
                      Last step
                    </p>
                    <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#F0F6FC", marginBottom: 8 }}>
                      How do we reach you?
                    </h2>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
                      No spam. One message when Kayaa hits {area || "your area"}.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <label style={labelSt}>Your name *</label>
                        <input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="First name is fine"
                          autoComplete="given-name"
                          style={inputSt}
                        />
                      </div>
                      <div>
                        <label style={labelSt}>Email or WhatsApp *</label>
                        <input
                          type="text"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && submit()}
                          placeholder="+27 66... or you@email.com"
                          autoComplete="email"
                          style={inputSt}
                        />
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                          Whichever you actually check.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p style={{
                    fontFamily: "var(--font-body)", fontSize: 13,
                    color: "#F87171", marginTop: 16,
                  }}>
                    {error}
                  </p>
                )}

                {/* Footer buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => { setStep(s => s - 1); setError(""); }}
                      style={{
                        background: "transparent",
                        border: "1px solid #21262D",
                        color: "rgba(255,255,255,0.5)",
                        fontFamily: "var(--font-body)", fontSize: 14,
                        padding: "12px 22px", borderRadius: 10, cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={advance}
                    disabled={submitting}
                    style={{
                      background: submitting ? "rgba(57,217,138,0.5)" : "#39D98A",
                      color: "#0D1117",
                      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15,
                      padding: "12px 28px", borderRadius: 10, border: "none",
                      cursor: submitting ? "default" : "pointer",
                      flex: 1,
                    }}
                  >
                    {submitting ? "Saving…" : step === (STEPS - 1) ? "Join the waitlist →" : "Continue →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared input styles ───────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: "100%",
  background: "#0D1117",
  border: "1px solid #21262D",
  borderRadius: 10,
  padding: "13px 16px",
  color: "#F0F6FC",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const labelSt: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 8,
};
