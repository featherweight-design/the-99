// The side sheet both modes of the Add cards sheet draw: 480px on desktop with no scrim, full
// height on the phone (collection edit R1 §B, R2 §C). One definition, so the two modes cannot drift.
export const SHEET_PANEL_CLASS =
  "fixed inset-0 z-50 flex flex-col overscroll-contain border-0 border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:border-l md:shadow-[-24px_0_60px_rgba(0,0,0,0.45)]";

/** The save bar: Remove / diff / Save on one row, the diff above them on a phone. */
export const SHEET_FOOT_CLASS =
  "flex flex-wrap items-center gap-x-[12px] gap-y-[8px] border-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[18px] pb-[14px] pt-[12px] md:flex-nowrap md:px-[22px] md:pb-[18px] md:pt-[14px]";
