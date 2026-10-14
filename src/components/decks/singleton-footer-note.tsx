// SingletonFooterNote — server component.
// §Search singleton footer note: mono 10px, var(--fg-locked), center, padding 6px 0, line-height 1.5.
// Desktop-only per the design table (Mobile column shows "—" for all properties).

export function SingletonFooterNote() {
  return (
    <p
      className="hidden md:block font-mono text-[10px] text-center leading-[1.5]"
      style={{ color: "var(--fg-locked)", padding: "6px 0" }}
    >
      Commander is singleton: a card already in the deck can’t be re-added except basic lands.
    </p>
  );
}
