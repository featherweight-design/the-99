// @vitest-environment node
//
// The browser half of `probe-image-timing.mjs` needs a signed-in production
// build. These are the decisions it makes about the numbers it brings back —
// and `firstPaintedSample` in particular, because two earlier versions of it
// could not report a failed observation, and each one reported the build as
// healthy while measuring nothing.
import { describe, expect, it } from "vitest";
import { firstPaintedSample, phasesOf, scryfallSize } from "./probe-image-timing.mjs";

const frames = (...bytes: number[]) => bytes.map((b, i) => ({ t: i * 80, bytes: b }));

describe("firstPaintedSample", () => {
  it("locates the frame where the card appears, and bounds it", () => {
    const r = firstPaintedSample(frames(4675, 4675, 140000, 141000));
    expect(r.paintedAtMs).toBe(160);
    // The gap to the last blank frame is the resolution of the figure.
    expect(r.gapMs).toBe(80);
  });

  // THE CASE BOTH EARLIER VERSIONS FAILED. A 404, a wrong URL, an image that
  // never loads: every frame is the same flat box, and a detector that
  // thresholds against its own maximum says the box painted on frame one.
  it("reports no paint when nothing ever changed", () => {
    const r = firstPaintedSample(frames(4675, 4675, 4675, 4675, 4675));
    expect(r.paintedAtMs).toBeNull();
    expect(r.reason).toContain("no transition");
  });

  // The other direction, and the reason the blank-reference version died: with
  // the preload working the box is already painted when first sampled, so there
  // is no transition to find and the probe must say so rather than invent one.
  it("reports no paint when the first frame is already the card", () => {
    const r = firstPaintedSample(frames(162019, 162019, 162019));
    expect(r.paintedAtMs).toBeNull();
    expect(r.reason).toContain("no transition");
  });

  it("has no opinion about an empty run", () => {
    expect(firstPaintedSample([]).paintedAtMs).toBeNull();
    expect(firstPaintedSample([]).reason).toBe("no samples");
  });

  // A single frame cannot show a change, however large it is.
  it("reports no paint from one frame", () => {
    expect(firstPaintedSample(frames(162019)).paintedAtMs).toBeNull();
  });

  it("does not report the gap when the very first frame crosses the threshold", () => {
    const r = firstPaintedSample(frames(140000, 4675, 141000));
    expect(r.paintedAtMs).toBe(0);
    expect(r.gapMs).toBeNull();
  });
});

describe("phasesOf", () => {
  // -1 is CDP's "this phase did not happen", and a reused connection reports it
  // for DNS and TLS — which is the whole distinction the preconnect candidate
  // rests on. Treating -1 as a number would report negative milliseconds.
  it("reads a cold connection's handshake", () => {
    const p = phasesOf({
      timing: { dnsStart: 0, dnsEnd: 6.1, connectStart: 6.1, connectEnd: 150.5, sslStart: 70, sslEnd: 144.4, sendStart: 150.5, receiveHeadersEnd: 223.8 },
      encodedDataLength: 95631,
      status: 200,
    });
    expect(p.dnsMs).toBeCloseTo(6.1);
    expect(p.tlsMs).toBeCloseTo(74.4);
    expect(p.ttfbMs).toBeCloseTo(73.3);
    expect(p.reusedConnection).toBe(false);
  });

  it("marks a reused connection rather than reporting a negative handshake", () => {
    const p = phasesOf({
      timing: { dnsStart: -1, dnsEnd: -1, connectStart: -1, connectEnd: -1, sslStart: -1, sslEnd: -1, sendStart: 0, receiveHeadersEnd: 141.8 },
      encodedDataLength: 95631,
      status: 200,
    });
    expect(p.dnsMs).toBeNull();
    expect(p.tlsMs).toBeNull();
    expect(p.ttfbMs).toBeCloseTo(141.8);
    expect(p.reusedConnection).toBe(true);
  });
});

describe("scryfallSize", () => {
  it("names the size segment the URL asks for", () => {
    expect(scryfallSize("https://cards.scryfall.io/normal/front/e/8/abc.jpg?123")).toBe("normal");
    expect(scryfallSize("https://cards.scryfall.io/art_crop/front/e/8/abc.jpg")).toBe("art_crop");
  });

  it("has no answer for a URL that is not a card image", () => {
    expect(scryfallSize("https://example.com/cat.jpg")).toBeNull();
  });
});
