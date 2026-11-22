import { describe, expect, it } from "vitest";

import { codeEmailParts } from "./code-mail";
import { previewMails, PREVIEW_CODE_SHARED, PREVIEW_SUBJECT_PREFIX } from "./preview-mails";

const ORIGIN = "https://the99.example";

describe("previewMails", () => {
  const mails = previewMails("admin@example.com", ORIGIN);

  it("is the invite, the code and the launch email, all to the one address", () => {
    expect(mails.map((m) => m.template)).toEqual(["invite", "code", "launch"]);
    expect(mails.every((m) => m.to === "admin@example.com")).toBe(true);
  });

  it("starts every subject with [Preview]", () => {
    for (const m of mails) expect(m.subject.startsWith(PREVIEW_SUBJECT_PREFIX)).toBe(true);
  });

  it("carries no list-unsubscribe header and no idempotency key (nothing real is minted)", () => {
    for (const m of mails) {
      expect(m.listUnsubscribe).toBeUndefined();
      expect(m.idempotencyKey).toBeUndefined();
      expect(m.limitsChecked).toBeUndefined();
    }
  });

  it("points every sample link at an inert path, never a claim or an unsubscribe token", () => {
    for (const m of mails) {
      expect(m.html).not.toMatch(/unsubscribe\?t=/);
      expect(m.html).not.toMatch(/\/join\//);
    }
  });

  it("sends the code email once because code and flyer-code are one builder", () => {
    expect(PREVIEW_CODE_SHARED).toEqual(["code", "flyer-code"]);
    const body = codeEmailParts("000000", ORIGIN);
    const code = mails.find((m) => m.template === "code")!;
    expect(code.subject).toBe(PREVIEW_SUBJECT_PREFIX + body.subject);
    expect(code.html).toBe(body.html);
  });
});
