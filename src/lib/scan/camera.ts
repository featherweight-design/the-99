// The camera a scanner opens, and two things it reads off it: the torch, where the device has one, and a frame too
// dark to read a card from. Pure where it can be; the parts that touch a track take it as an argument.

/** The back camera, asked for at 1080p; a phone that cannot give it gives what it has. */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  audio: false,
};

type TorchTrack = {
  getCapabilities?: () => { torch?: boolean } & Record<string, unknown>;
  applyConstraints: (c: MediaTrackConstraints) => Promise<void>;
};

export type Torch = { available: boolean; set(on: boolean): Promise<boolean> };

/**
 * The track's torch, where it reports one. iOS Safari reports no `torch` capability (and older WebKit no
 * `getCapabilities` at all), so the torch is simply unavailable there and nothing is offered: never an error. A
 * `set` that the device refuses answers false and leaves the camera running.
 */
export function torchOf(track: TorchTrack | null | undefined): Torch {
  let caps: { torch?: boolean } | null = null;
  try {
    caps = track?.getCapabilities?.() ?? null;
  } catch {
    caps = null;
  }
  const available = caps?.torch === true;
  return {
    available,
    async set(on: boolean) {
      if (!available || !track) return false;
      try {
        await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Mean luma (0 to 255, Rec. 601) under which a frame is too dark to read a card from. */
export const DARK_LUMA = 40;

/** The mean luma of an RGBA frame, sampled every `step`th pixel (a phone frame needs no more to judge darkness). */
export function meanLuma(rgba: Uint8ClampedArray, step = 16): number {
  const px = rgba.length >> 2;
  if (px === 0) return 0;
  let sum = 0;
  let n = 0;
  for (let p = 0; p < px; p += step) {
    const i = p << 2;
    sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    n++;
  }
  return sum / n;
}

/** Whether a frame is too dark to read: the scanner offers the torch (or asks for light) rather than read on. */
export function isDark(rgba: Uint8ClampedArray, threshold = DARK_LUMA): boolean {
  return meanLuma(rgba) < threshold;
}
