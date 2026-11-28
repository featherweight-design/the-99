import { describe, expect, it } from "vitest";
import { lineFor } from "../../lib/admin/email-preview-line";

describe("lineFor", () => {
  it("names what went and Clerk's exclusion on a full send", () => {
    const l = lineFor({ ok: true, sent: ["invite", "code", "launch"], total: 3, stoppedBy: null });
    expect(l.danger).toBe(false);
    expect(l.lines.join(" ")).toContain("Sent 3 of 3: the invite, the sign-up code (also the flyer code), the launch email.");
    expect(l.lines.join(" ")).toContain("Clerk's");
  });

  it("names only the templates that went, with the reason it stopped", () => {
    const l = lineFor({ ok: true, sent: ["invite"], total: 3, stoppedBy: "capped" });
    expect(l.danger).toBe(true);
    expect(l.lines.join(" ")).toContain("Sent 1 of 3: the invite.");
    expect(l.lines.join(" ")).not.toContain("launch email");
    expect(l.lines.join(" ")).toContain("cap is reached");
    expect(lineFor({ ok: true, sent: [], total: 3, stoppedBy: "failed" }).lines.join(" ")).toContain("didn't go through");
  });

  it("draws the cooldown and every refusal as a danger line", () => {
    expect(lineFor({ ok: false, reason: "cooldown", waitSec: 240 })).toEqual({ lines: ["Sent a moment ago. Try again in 4 minutes."], danger: true });
    expect(lineFor({ ok: false, reason: "unconfigured" }).danger).toBe(true);
  });
});
