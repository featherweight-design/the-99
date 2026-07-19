// SingletonFooterNote — server component.
// §Search singleton footer note: mono 10px, #6E6353, center, padding 6px 0, line-height 1.5.
// Desktop-only per the design table (Mobile column shows "—" for all properties).

export function SingletonFooterNote() {
  return (
    <p
      className="hidden md:block font-mono text-[10px] text-center leading-[1.5]"
      style={{ color: "#6E6353", padding: "6px 0" }}
    >
      Commander is singleton — a card already in the deck can&apos;t be re-added except basic lands.
    </p>
  );
}
