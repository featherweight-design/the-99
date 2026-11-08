// The grabber a phone bottom sheet draws over its head: 40 x 4, the strong border ink, phone only. It began in
// `SocialModal` and is shared with the month jump's sheet (small items 11, `Archive` F2).
export function SheetGrabber() {
  return (
    <div aria-hidden data-sheet-grabber="" className="flex flex-none justify-center pt-[9px] md:hidden">
      <span className="mb-[4px] h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)]" />
    </div>
  );
}
