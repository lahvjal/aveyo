export function AvaOrb({ size }: { size: number }) {
  return (
    <span
      className="ava-orb"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 30% 30%, #7dd3fc, #0ea5e9 55%, #0369a1)",
        boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)"
      }}
      aria-hidden
    />
  );
}
