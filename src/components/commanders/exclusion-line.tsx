// The exclusion line (§4). Between the bar and the first row: the list worked,
// and it still removed things.
//
// Not a live region. The page already announces the re-rank, and announcing the
// exclusions too would report one event twice.
//
// Not a control either. It is a receipt — every correction it might offer is
// already a control in the bar above it.

import { Emphasised, localised } from "./emphasis";

export function ExclusionLine({
  text,
  figures,
  className,
}: {
  text: string;
  /** The counts inside `text`, lifted to `--fg-body`. Found in the finished
      sentence rather than composed around it, as every marked figure on this
      plane is. */
  figures: number[];
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-[10px] px-[14px] sm:px-[34px] ${className ?? ""}`}>
      {/* The same 6px rotated diamond the end-of-ranking rule uses, so the two
          receipts on this page are furniture of one family. */}
      <span
        aria-hidden
        className="w-[6px] h-[6px] rotate-45 shrink-0 translate-y-[4px]"
        style={{ background: "var(--border-strong)" }}
      />
      <p
        className="font-mono m-0 text-[10.5px] sm:text-[11.5px]"
        style={{ color: "var(--fg-faint)", lineHeight: 1.6 }}
      >
        <Emphasised text={text} values={figures.map(localised)} color="var(--fg-body)" />
      </p>
    </div>
  );
}
