import { describe, expect, it } from "vitest";
import { launchEmailParts, LAUNCH_IMAGES } from "./launch-mail";

const UNSUB = "https://staging.the-99.dev/unsubscribe?t=" + "x".repeat(43);
const parts = (source: "landing" | "flyer") => launchEmailParts({ origin: "https://staging.the-99.dev", source, unsubscribeUrl: UNSUB });

describe("launchEmailParts", () => {
  it("draws Sign up free twice to one link, in the html and the text twin", () => {
    const { html, text } = parts("landing");
    expect(html.match(/<a href="https:\/\/staging\.the-99\.dev\/sign-up"[^>]*>Sign up free<\/a>/g)?.length).toBe(2);
    expect(html.match(/<a href="https:\/\/staging\.the-99\.dev\/sign-up"[^>]*>https:\/\/staging\.the-99\.dev\/sign-up<\/a>/g)?.length).toBe(1);
    expect(text.match(/https:\/\/staging\.the-99\.dev\/sign-up/g)?.length).toBe(2);
  });

  it("builds every image from the origin, never a fixed host", () => {
    const { html } = parts("landing");
    for (const file of LAUNCH_IMAGES) expect(html).toContain(`https://staging.the-99.dev/email/${file}`);
    expect(html).not.toContain("https://the-99.dev/");
  });

  it("carries the address's unsubscribe link in the footer and the text twin", () => {
    const { html, text } = parts("landing");
    expect(html).toContain(`href="${UNSUB}"`);
    expect(text).toContain(`we'll delete this address now:\n${UNSUB}\n`);
  });

  it("says where the address came from", () => {
    expect(parts("landing").text).toContain("launch list at the-99.dev.");
    expect(parts("flyer").text).toContain("launch list from a flyer.");
  });

  it("uses straight quotes in the text twin and the tagline in both", () => {
    const { html, text } = parts("flyer");
    expect(text).not.toMatch(/[‘’“”]/);
    expect(text).toContain("99 problems, but your commander ain't one.");
    expect(html).toContain("99 problems, but your commander ain’t one.");
  });
});
