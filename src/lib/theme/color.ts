// Colour maths for the theme contract suite. Pure functions, no I/O — the
// suite that reads globals.css does the reading.
//
// OKLab coefficients are Björn Ottosson's published sRGB matrix. Chroma is
// deliberately measured on the quantised 8-bit hex rather than a pre-rounding
// OKLCH value: clamping in OKLCH and rounding afterwards re-introduces chroma,
// and five values in this system bust the budget that way.

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function parseHex(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`Not a six-digit hex colour: ${hex}`);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function oklab(hex: string): { L: number; a: number; b: number } {
  const [r, g, b] = parseHex(hex).map(toLinear);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function chroma(hex: string): number {
  const { a, b } = oklab(hex);
  return Math.hypot(a, b);
}

export function deltaEOk(a: string, b: string): number {
  const x = oklab(a);
  const y = oklab(b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}
