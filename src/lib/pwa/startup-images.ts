/**
 * The iPhone startup images (`apple-touch-startup-image`): what iOS draws while the installed app launches, before any of
 * its own paint. One static picture for everyone: the icon (`src/app/icon.svg`) at 128 points, centred on the manifest's
 * ground (`manifest.ts`), so the launch overlay's first frame (`launch-loader.tsx`) starts from the same spot. Android
 * draws its own from the manifest.
 *
 * iOS picks a file by the exact device-width, device-height and pixel ratio of the screen, so each iPhone screen size is
 * one row; portrait only (the app is not drawn for landscape on a phone). `scripts/gen-startup-images.mts` writes the PNGs
 * from this table, `layout.tsx` links them, and `startup-images.test.ts` reads the bytes back. A new iPhone screen is one
 * row here, then `pnpm gen:startup-images`.
 */

/** The icon's size in CSS points on every screen. */
export const STARTUP_ICON_POINTS = 128;

/** CSS width and height (points) and pixel ratio of each current iPhone screen. Models share a row when the screen does. */
export const STARTUP_SCREENS = [
  { width: 375, height: 667, ratio: 2 }, // SE (2nd and 3rd generation), 8
  { width: 414, height: 736, ratio: 3 }, // 8 Plus
  { width: 375, height: 812, ratio: 3 }, // X, XS, 11 Pro
  { width: 414, height: 896, ratio: 2 }, // XR, 11
  { width: 414, height: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { width: 360, height: 780, ratio: 3 }, // 12 mini, 13 mini
  { width: 390, height: 844, ratio: 3 }, // 12, 12 Pro, 13, 13 Pro, 14
  { width: 428, height: 926, ratio: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { width: 393, height: 852, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 430, height: 932, ratio: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { width: 402, height: 874, ratio: 3 }, // 16 Pro
  { width: 440, height: 956, ratio: 3 }, // 16 Pro Max
] as const;

export type StartupScreen = (typeof STARTUP_SCREENS)[number];

/** The image's size in device pixels. */
export const startupPixels = (s: StartupScreen) => ({ width: s.width * s.ratio, height: s.height * s.ratio });

/** Where the image is served: `public/startup/`, one file per screen. */
export const startupPath = (s: StartupScreen) => `/startup/${s.width}x${s.height}@${s.ratio}x.png`;

export const startupMedia = (s: StartupScreen) =>
  `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`;

/** `metadata.appleWebApp.startupImage`. */
export const STARTUP_IMAGES = STARTUP_SCREENS.map((s) => ({ url: startupPath(s), media: startupMedia(s) }));
