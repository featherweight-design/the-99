import { describe, expect, it } from "vitest";
import { CODE_TTL_MS } from "../invites/rules";
import { codeEmailParts } from "./code-mail";
import { escapeHtml, renderShell, straight } from "./shell";

const ORIGIN = "https://the-99.dev";

describe("codeEmailParts", () => {
  const m = codeEmailParts("042917", ORIGIN);

  it("keeps the subject the shipped mails send, with the code in it", () => {
    expect(m.subject).toBe("Your code for The 99: 042917");
  });

  it("draws the code once as live text with no spaces, in the box", () => {
    expect(m.html).toContain(">042917</p>");
    expect(m.html.match(/042917/g)).toHaveLength(1);
  });

  it("states the code's lifetime, from CODE_TTL_MS, and the ignore line in both parts", () => {
    // The window is whole minutes, so the words never round it.
    expect(CODE_TTL_MS % 60_000).toBe(0);
    for (const part of [m.html, m.text]) {
      expect(part).toContain(`expires in ${CODE_TTL_MS / 60_000} minutes`);
      expect(part).toMatch(/ignore this email/);
    }
  });

  it("builds the tile and the footer link from the origin it is given", () => {
    const staging = codeEmailParts("042917", "https://staging.the-99.dev");
    expect(staging.html).toContain('src="https://staging.the-99.dev/email/mark-112@2x.png"');
    expect(staging.html).toContain(">staging.the-99.dev</a>");
    expect(staging.html).not.toContain("https://the-99.dev");
    expect(staging.text).toContain("https://staging.the-99.dev");
  });

  it("is a dark shell that declares itself dark and reads on a phone", () => {
    expect(m.html).toContain('<meta name="color-scheme" content="dark">');
    expect(m.html).toContain("@media (max-width:620px)");
    expect(m.html).toContain("max-width:600px");
  });

  it("has a plain-text twin with straight quotes, the code alone on a line, and the footer in the drawn order", () => {
    expect(m.text).not.toMatch(/[’‘“”]/);
    expect(m.text.split("\n")).toContain("042917");
    const lines = m.text.trimEnd().split("\n");
    expect(lines.slice(-5)).toEqual([
      "--",
      "You're getting this because someone asked for a code for this address on The 99.",
      "99 problems, but your commander ain't one.",
      "Replies to this email aren't read.",
      "https://the-99.dev",
    ]);
  });

  it("has no em dash and never says Press", () => {
    expect(m.html + m.text).not.toMatch(/—|\bPress\b/);
  });
});

describe("shell helpers", () => {
  it("escapes anything that could be markup", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe("&#60;b&#62;&#34;x&#34; &#38; &#39;y&#39;&#60;/b&#62;");
    const html = renderShell({ origin: ORIGIN, title: "<t>", preheader: "<p>", panel: "", reason: "<r>" });
    expect(html).not.toContain("<t>");
    expect(html).not.toContain("<r>");
  });

  it("straightens curly quotes for the text part", () => {
    expect(straight("Here’s “it”")).toBe(`Here's "it"`);
  });
});
