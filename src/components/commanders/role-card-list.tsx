// The green chip that names an owned card, used by the EDHREC overlap lists.

export function OwnedChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center font-mono rounded-full"
      style={{
        fontSize: "11.5px",
        background: "var(--surface-raised)",
        border: "1px solid color-mix(in srgb, var(--success) 40%, var(--bg))",
        padding: "4px 10px",
        color: "var(--fg-body)",
        gap: 6,
      }}
    >
      {/* Green dot */}
      <span
        className="block shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: "var(--success)" }}
      />
      {name}
    </span>
  );
}
