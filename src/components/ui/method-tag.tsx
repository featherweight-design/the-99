import { howItWorksCopy, type HowMethod } from "../../lib/copy/about";

/**
 * How an answer was reached, as a small outlined word (handoff about_how_it_works, §MethodTag):
 * Plex Mono 10 (10.5 in the long-form key), padding 3/6, radius 4, a 1px `--border-strong` edge,
 * `--fg-muted` text, no fill, never wrapping.
 *
 * ALL FIVE ARE DRAWN THE SAME. No color, shape or weight differs between them, on purpose: a tag
 * that looked more trustworthy than another would be a score, and this section adds none.
 *
 * Plain text, so a screen reader reads the method as part of whatever names the row.
 */
export function MethodTag({ method, size = "row" }: { method: HowMethod; size?: "row" | "key" }) {
  return (
    <span
      data-method={method}
      className={
        "inline-block whitespace-nowrap rounded-[4px] border border-[color:var(--border-strong)] px-[6px] py-[3px] font-mono font-normal normal-case tracking-normal leading-none text-[color:var(--fg-muted)] "
        + (size === "key" ? "text-[10.5px]" : "text-[10px]")
      }
    >
      {howItWorksCopy.methods[method].tag}
    </span>
  );
}

/** A row's tags, 5px apart. */
export function MethodTags({ methods, className = "" }: { methods: readonly HowMethod[]; className?: string }) {
  return (
    <span className={"inline-flex flex-wrap items-center gap-[5px] " + className}>
      {methods.map((m) => (
        <MethodTag key={m} method={m} />
      ))}
    </span>
  );
}
