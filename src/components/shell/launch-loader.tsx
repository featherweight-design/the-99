"use client";

import { useEffect } from "react";
import { publicPagesCopy } from "../../lib/copy/public-pages";
import { LAUNCH_ATTR, markLaunchSeen } from "../../lib/pwa/launch-detect";

/**
 * Cinzel 900's "9", outlined, as `src/app/icon.svg` draws it (`launch-detect.test.ts` holds the two equal). Outlined so
 * nothing on the launch waits for a font.
 */
export const NUMERAL_PATH =
  "M116 -38 112 -31Q219 2 279.5 43.0Q340 84 368.0 136.0Q396 188 403.0 253.5Q410 319 410 402Q410 485 406.0 540.5Q402 596 386.5 623.5Q371 651 334 651Q297 651 278.0 626.5Q259 602 252.0 563.0Q245 524 245 478Q245 421 251.5 389.0Q258 357 269.5 341.5Q281 326 295 320Q318 311 337.5 317.0Q357 323 370 331L377 323Q363 292 333.0 272.0Q303 252 264.0 246.0Q225 240 185.0 249.5Q145 259 111.5 285.5Q78 312 58.0 357.0Q38 402 40 467Q42 534 73.0 589.0Q104 644 168.0 677.0Q232 710 331 711Q478 713 556.5 633.0Q635 553 635 381Q635 274 603.0 189.5Q571 105 506.0 49.0Q441 -7 344.0 -30.5Q247 -54 116 -38Z";

// The crown's three diamonds as icon.svg draws them (viewBox "8 7 48 17"): [points, which one it is].
const DIAMONDS = [
  { points: "15.697,10.174 20.916,15.393 15.697,20.612 10.478,15.393", lights: "ll-dl" },
  { points: "32.000,7.999 39.394,15.393 32.000,22.787 24.606,15.393", lights: "ll-dc" },
  { points: "48.303,10.174 53.522,15.393 48.303,20.612 43.084,15.393", lights: "ll-dr" },
] as const;

/**
 * The lockup at scale 1: the crown (205.7 x 72.8) over the numeral (171.4 x 100.7), both centred on the origin the
 * parent places. `lit` is the flyer's, whose diamonds light in turn; the card's two are still. The numeral sits in its
 * own box so the flyer can move and grow it on landing (`ll-num`).
 */
function Mark({ lit }: { lit?: boolean }) {
  return (
    <>
      <svg aria-hidden="true" viewBox="8 7 48 17" width="205.7" height="72.8" className="ll-crown">
        {DIAMONDS.map((d) => (
          <polygon key={d.lights} points={d.points} className={lit ? d.lights : undefined} />
        ))}
      </svg>
      <div className={lit ? "ll-numeral ll-num" : "ll-numeral"}>
        <svg aria-hidden="true" viewBox="12 28 40 23.5" width="171.4" height="100.7" className="ll-numeral-svg">
          <path transform="translate(12.903 49.849) scale(0.028293 -0.028293)" d={NUMERAL_PATH} />
          <path transform="translate(32.000 49.849) scale(0.028293 -0.028293)" d={NUMERAL_PATH} />
        </svg>
      </div>
    </>
  );
}

/**
 * The cold-start launch animation (design/design_handoff_the99_app_loader): the splash's icon grows, lands on a card that
 * flips face up, the crown lights on its face and the mark lifts into the phone header's logo while Home fades up.
 *
 * Drawn in every signed-in document and shown only when the head script marked `<html data-launch>` (`launch-detect.ts`):
 * the stylesheet keeps it `display: none` otherwise, and with reduced motion. It is an overlay, so Home renders and loads
 * underneath the whole time, and it hides itself by animation, so a page whose script never runs is not held. It always
 * plays in Low Sun, whatever the reader's theme, to continue the splash; the whole of its look is in globals.css
 * (`.launch-loader`).
 *
 * This is the one place the "seen" flag is written, on every signed-in mount: a signed-out document never has an overlay to
 * play, and "seen" means the session's first document load has happened, whether or not it qualified for the loader.
 */
export function LaunchLoader() {
  useEffect(markLaunchSeen, []);

  return (
    <div
      className="launch-loader"
      data-theme="amonkhet"
      aria-hidden="true"
      // The overlay's own animation is the clock: `data-launch` goes when it ends, not on a timer that starts at hydration.
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) document.documentElement.removeAttribute(LAUNCH_ATTR);
      }}
    >
      <div className="ll-ground" />
      <div className="ll-card">
        <div className="ll-card-box">
          <div className="ll-side ll-back-side">
            {/* The back's ground fades in under the mark; the mark itself is the splash's icon and is there from the first frame. */}
            <div className="ll-back">
              <div className="ll-rule ll-rule-back" />
            </div>
            <div className="ll-origin ll-origin-back">
              <Mark />
            </div>
          </div>
          <div className="ll-side ll-face-side">
            <div className="ll-face-clip">
              <div className="ll-rule ll-rule-face" />
              <div className="ll-origin ll-origin-face">
                <Mark />
              </div>
              <div className="ll-label">{publicPagesCopy.shell.wordmark}</div>
              <div className="ll-glint" />
            </div>
          </div>
        </div>
      </div>
      <div className="ll-fly">
        <div className="ll-fly-box">
          <div className="ll-halo" />
          <Mark lit />
        </div>
      </div>
    </div>
  );
}
