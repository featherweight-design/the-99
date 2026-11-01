// The wordmark over the crash screen and over /report (small items 8, board 6: `.cr7 .wm7`): three diamonds in small
// accent type over a 26px Cinzel "99", centred, 22px under the top. Neither screen draws the shell, so the mark stands alone.
export function CrashWordmark() {
  return (
    <div className="flex justify-center pt-[22px]">
      <span className="flex flex-col items-center gap-[2px]">
        <em aria-hidden="true" className="text-[9px] not-italic tracking-[3px] text-[color:var(--accent-text)]">
          ◆ ◆ ◆
        </em>
        <b className="font-[family-name:var(--font-display)] text-[26px] leading-none font-bold text-[color:var(--fg)]">99</b>
      </span>
    </div>
  );
}
