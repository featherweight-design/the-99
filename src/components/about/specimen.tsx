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
//  - Inert. A specimen is not a control: nothing here navigates, submits or
//    focuses, and `pointer-events: none` is what makes that true of a real
//    component mounted with fixture props rather than merely intended.

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
      data-specimen={label}
      data-width={width}
      className={`pointer-events-none m-0 mt-[10px] select-none overflow-hidden rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[14px] ${
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
