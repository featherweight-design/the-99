// About's words with a bold phrase inside them (Small items 7, item 6): `**phrase**` in a label's text or a sub line draws
// that phrase in the label lead's bold, as the cart entry's total names "Buy these at Mana Pool". Text with no marker is
// returned as the bare string, so every other label, rule and sub line draws exactly as before (`about-text.test.tsx`).

const BOLD = "font-semibold text-[color:var(--fg)]";

export function AboutText({ text, bold = BOLD }: { text: string; bold?: string }) {
  if (!text.includes("**")) return <>{text}</>;
  return (
    <>
      {text.split("**").map((part, i) => (i % 2 === 1 ? <b key={i} className={bold}>{part}</b> : part))}
    </>
  );
}
