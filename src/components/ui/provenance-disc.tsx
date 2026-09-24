/**
 * The outlined ⓘ disc that marks something the app wrote rather than the player: the fill
 * ledger's header, and a deck intent the build seeded. One component, so the two stay the same
 * mark (18px on a phone, 20px from `md`).
 *
 * With a `label` it is announced as an image carrying that label; without one it is decoration
 * beside text that already says the same.
 */
export function ProvenanceDisc({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={`flex-none flex items-center justify-center rounded-full font-mono w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-[10px] md:text-[11px] ${className}`}
      style={{ border: "1px solid var(--accent-shadow)", color: "var(--accent)" }}
    >
      i
    </span>
  );
}
