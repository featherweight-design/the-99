// The card as the scanner read it, for the list's "Your scan" (card-scan PR 4, L2): the embedder's own input, a
// normalised CHW crop, turned back into a small picture. The crop is what the lookup matched, so the photo shows
// exactly what the guesses were chosen from.
import { EMBED_H, EMBED_W, IMAGENET_MEAN, IMAGENET_STD } from "./geometry";

/** Twice the 44x62 the fix region draws, for a sharp photo on a phone's screen. */
export const PHOTO_W = 88;
export const PHOTO_H = 124;

/** A normalised CHW crop as RGBA pixels at `outW` x `outH`, sampled at each output pixel's centre. */
export function cropToRgba(crop: Float32Array, w = EMBED_W, h = EMBED_H, outW = PHOTO_W, outH = PHOTO_H): Uint8ClampedArray<ArrayBuffer> {
  const plane = w * h;
  const out = new Uint8ClampedArray(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(h - 1, Math.floor(((y + 0.5) * h) / outH));
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(w - 1, Math.floor(((x + 0.5) * w) / outW));
      const i = sy * w + sx;
      const o = (y * outW + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round((crop[c * plane + i] * IMAGENET_STD[c] + IMAGENET_MEAN[c]) * 255);
      out[o + 3] = 255;
    }
  }
  return out;
}

/** The crop as a JPEG data URL, or null where there is no canvas (a test DOM) or it cannot encode. */
export function photoOf(crop: Float32Array): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_W;
    canvas.height = PHOTO_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(new ImageData(cropToRgba(crop), PHOTO_W, PHOTO_H), 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.8);
    return url.startsWith("data:image/") ? url : null;
  } catch {
    return null;
  }
}
