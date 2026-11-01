import { Crowned99 } from "../marks";

// The wordmark over the crash screen and over /report (small items 8, board 6: `.cr7`, centred, 22px under the top).
// Neither draws the shell, so the mark stands alone, the mobile header's.
export function CrashWordmark() {
  return (
    <div className="flex justify-center pt-[22px]">
      <Crowned99 variant="mobile-header" />
    </div>
  );
}
