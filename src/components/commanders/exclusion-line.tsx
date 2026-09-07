// The exclusion line (§4). Between the bar and the first row: the list worked,
// and it still removed things.
//
// Not a live region. The page already announces the re-rank, and announcing the
// exclusions too would report one event twice.
//
// Not a control either. It is a receipt — every correction it might offer is
// already a control in the bar above it.

import { Emphasised } from "./emphasis";

export function ExclusionLine({
  text,
  figures,
  className,
}: {
  text: string;
  /** The figures inside `text`, lifted to `--fg-body`. Found in the finished
      sentence rather than composed around it, as every marked figure on this
      plane is, and already formatted: the threshold and the nearest miss carry
      their percent sign, which is what the drawing marks and what stops a bare
      `30` matching some other figure. */
  figures: string[];
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline gap-[10px] px-[14px] sm:px-[34px] sm:pt-[14px] ${className ?? ""}`}
    >
      {/* The same 6px rotated diamond the end-of-ranking rule uses, so the two
          receipts on this page are furniture of one family. */}
      <span
        aria-hidden
        className="w-[6px] h-[6px] rotate-45 shrink-0 mt-[4px] sm:mt-[5px]"
        style={{ background: "var(--border-strong)" }}
      />
      {/* Weight 400: the marks are a colour lift, not a bolding. The figures
          carry the same weight as the sentence they sit in. */}
      <p
        className="font-mono m-0 text-[10.5px] sm:text-[11.5px]"
        style={{ color: "var(--fg-faint)", lineHeight: 1.6 }}
      >
        <Emphasised text={text} values={figures} color="var(--fg-body)" weight={400} />
      </p>
    </div>
  );
}
