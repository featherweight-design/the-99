import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { rethrowAfterRedirect } from "./engagement-redirect";

describe("rethrowAfterRedirect", () => {
  it("runs the callback and rethrows when the error is a redirect", () => {
    const onRedirect = vi.fn();
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/decks/1;307;" });
    expect(() => rethrowAfterRedirect(redirect, onRedirect)).toThrow(redirect);
    expect(onRedirect).toHaveBeenCalledTimes(1);
  });

  it("does not run the callback for a real failure, and returns so the caller can show it", () => {
    const onRedirect = vi.fn();
    expect(() => rethrowAfterRedirect(new Error("db down"), onRedirect)).not.toThrow();
    expect(onRedirect).not.toHaveBeenCalled();
  });

  it("does not run the callback for another framework error", () => {
    const onRedirect = vi.fn();
    const notFound = Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    expect(() => rethrowAfterRedirect(notFound, onRedirect)).toThrow(notFound);
    expect(onRedirect).not.toHaveBeenCalled();
  });

  it("a callback that throws never replaces the redirect", () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/decks/1;307;" });
    expect(() => rethrowAfterRedirect(redirect, () => { throw new Error("boom"); })).toThrow(redirect);
  });

  it("recognises the error Next's own redirect() throws, so a digest change fails here", () => {
    const onRedirect = vi.fn();
    let thrown: unknown;
    try {
      redirect("/decks/1");
    } catch (e) {
      thrown = e;
    }
    expect(() => rethrowAfterRedirect(thrown, onRedirect)).toThrow();
    expect(onRedirect).toHaveBeenCalledTimes(1);
  });
});
