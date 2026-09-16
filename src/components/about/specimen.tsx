// The chassis every figure sits in.
//
// Three rules from the handoff's grammar (README "The grammar, in four rules"),
// and each one is load-bearing rather than cosmetic:
//
//  - `--surface-sunken` inside a `--border` hairline at radius 8, so a figure
//    reads as a specimen of the app rather than as a piece of this page.
//  - `aria-hidden` IN FULL. A figure repeats what the caption and the key lines
//    already say; announced, it would read every mark twice and name controls
//    that cannot be pressed.
//  - Inert, and `inert` is the attribute that means it. `aria-hidden` hides a
//    node from the accessibility tree and `pointer-events: none` stops a
//    pointer, and NEITHER removes anything from the tab order — so a keyboard
//    reader was landing on `CommitmentsCard`'s link and `SetCell`'s button
//    inside figures, where Enter navigated away from the page. The claim that
//    nothing here focuses was false on two figures before this.

export function Specimen({
  children,
  label,
  width = "plate",
}: {
  children: React.ReactNode;
  /** Names the figure for the annotation key; never announced. */
  label?: string;
  /**
   * From the entry's own `width`. A plate takes the column; an inset is a
   * 300px figure with the caption beside it — one row or one control, where a
   * full-width frame would be a lot of empty box around a small mark.
   *
   * Compact collapses both to the same thing: at 390px there is no room for a
   * figure beside anything.
   */
  width?: "inset" | "plate";
}) {
  return (
    <figure
      aria-hidden
      inert
      data-specimen={label}
      data-width={width}
      className={`pointer-events-none m-0 mt-[10px] select-none overflow-hidden rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[16px] py-[14px] ${
        width === "inset" ? "min-[1000px]:max-w-[300px]" : ""
      }`}
    >
      {children}
    </figure>
  );
}

/**
 * A labelled cell inside a plate. The word under a mark is the annotation —
 * the grammar forbids leaders, arrows and hover, so the label sits beneath the
 * thing it names and nowhere else.
 */
export function SpecimenCell({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-[6px]">
      <div className="flex min-h-[22px] items-center">{children}</div>
      <span className="font-mono text-[10px] leading-[1.35] text-[color:var(--fg-faint)]">
        {caption}
      </span>
    </div>
  );
}

/**
 * A plate's grid: four across from the app's wide stop, two below it.
 *
 * `min-[1000px]:`, not `md:`. The compact state runs to 1000px here, which is
 * `CHASSIS_WIDE_MIN_PX` — the width the rest of the app changes shape at. At
 * `md` a 768–999px reader gets the desktop grid while every other surface
 * around it is still compact.
 */
export function SpecimenGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-[14px] min-[1000px]:grid-cols-4">{children}</div>;
}

/** An inset's stack. One cell per line, because 300px does not hold four. */
export function SpecimenRows({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-[12px]">{children}</div>;
}

/** Rows when compact, the four-column grid from the app's wide stop. */
export function SpecimenResponsive({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-[12px] min-[1000px]:grid-cols-4 min-[1000px]:gap-[14px]">
      {children}
    </div>
  );
}

/**
 * A legend's frame — and the one figure kind that is NOT inert.
 *
 * `Specimen` is `aria-hidden` because a mounted component repeats what the
 * caption and the key lines already say: announced, it reads every mark twice.
 * A legend is the opposite case. Its content exists nowhere else on the page —
 * Discover's five orders and their glosses are drawn here and in no caption —
 * so hiding it from the accessibility tree hides the entry's whole subject from
 * the readers least able to recover it elsewhere.
 *
 * So a legend is a description list, read normally, in the same frame. The
 * hairline still says "this is a specimen of the app"; the difference is
 * whether the thing inside is a picture of information or the information.
 */
export function LegendBox({
  children,
  label,
  width = "plate",
}: {
  children: React.ReactNode;
  label?: string;
  width?: "inset" | "plate";
}) {
  return (
    <figure
      data-specimen={label}
      data-width={width}
      data-legend=""
      className={`m-0 mt-[10px] overflow-hidden rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[16px] py-[14px] ${
        width === "inset" ? "min-[1000px]:max-w-[300px]" : ""
      }`}
    >
      <dl className="m-0 flex flex-col gap-[8px]">{children}</dl>
    </figure>
  );
}
