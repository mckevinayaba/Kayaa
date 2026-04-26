export function EditorialPhotoBreak() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "min(60vh, 480px)",
        overflow: "hidden",
        background: "#0D1117",
      }}
    >
      <img
        src="/landing/01-made-in-soweto.jpg"
        alt="Made in Soweto — street life"
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "contrast(1.1) brightness(0.75)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(13,17,23,0.85) 0%, rgba(13,17,23,0.3) 60%, rgba(13,17,23,0) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 6%",
          maxWidth: 1100,
        }}
      >
        <div style={{ maxWidth: 580 }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#39D98A",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              margin: "0 0 18px",
            }}
          >
            Field note · Vilakazi Street
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(30px, 4.5vw, 56px)",
              lineHeight: 1.1,
              color: "#FFFFFF",
              margin: 0,
            }}
          >
            This is the South Africa
            <br />
            <span style={{ color: "#39D98A" }}>
              Google Maps forgot.
            </span>
          </h2>
        </div>
      </div>
    </section>
  );
}
