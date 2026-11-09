import { twMerge } from "tailwind-merge";

// The grabber a phone bottom sheet draws over its head: 40 x 4, the strong border ink, phone only. It began in
// `SocialModal` and is shared with the month jump's sheet (small items 11, `Archive` F2).
//
// The default `pt-[9px]` serves the two original callers (social and receipt modals). Every migrated dialog
// passes `pt-0` because it carries its own top padding.
//
// A sheet whose own padding already sets the grabber's top offset, or whose gap below it differs, passes the
// geometry it carries (`className` on the wrapper, `barClassName` on the bar) rather than drawing its own.
export function SheetGrabber({ className, barClassName }: { className?: string; barClassName?: string }) {
  return (
    <div aria-hidden data-sheet-grabber="" className={twMerge("flex flex-none justify-center pt-[9px] md:hidden", className)}>
      <span className={twMerge("mb-[4px] h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)]", barClassName)} />
    </div>
  );
}
