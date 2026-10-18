import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAN_CONTENT_POLICY_URL, fanContentNotice, passageOneParts, policyLinkAria } from "./fan-content-notice";

// The notice's words are Hugh's (L4). They live in the brief; this pins the code to them, so a change has to change the brief first.
const brief = readFileSync(join(process.cwd(), "docs/superpowers/design-briefs/2026-10-17-fan-content-notice.md"), "utf8");
const flat = brief.replace(/\n\s*>/g, " ").replace(/\s+/g, " ");

describe("the locked notice text", () => {
  it("is the brief's text, character for character", () => {
    expect(flat).toContain(fanContentNotice.passageOne);
    expect(flat).toContain(fanContentNotice.passageTwo);
  });

  it("links only the words 'Fan Content Policy', and the parts rejoin to the passage", () => {
    const { before, link, after } = passageOneParts();
    expect(link).toBe("Fan Content Policy");
    expect(before + link + after).toBe(fanContentNotice.passageOne);
    expect(before.startsWith("The 99 is unofficial Fan Content permitted under the ")).toBe(true);
    expect(after.startsWith(". Not approved/endorsed by Wizards.")).toBe(true);
  });

  it("holds no em dash, and the link goes to Wizards and says it opens in a new tab", () => {
    expect(JSON.stringify(fanContentNotice)).not.toContain("—");
    expect(FAN_CONTENT_POLICY_URL).toBe("https://company.wizards.com/en/legal/fancontentpolicy");
    expect(policyLinkAria).toBe("Fan Content Policy, opens in a new tab");
  });
});
