import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ read: vi.fn(), serve: vi.fn(), inline: vi.fn() }));
vi.mock("../../../../lib/invites/hero-read", () => ({ readHero: m.read }));
vi.mock("../../../../lib/og/serve", () => ({ servePreview: m.serve, inlineImage: m.inline }));
vi.mock("../../../../components/email/invite-hand-image", () => ({ InviteHand: (p: unknown) => p, HAND_SIZE: { width: 560, height: 540 } }));

import { GET } from "./route";

const KEY = "A".repeat(59);
const call = (file: string) => GET(new Request(`https://x/email/hand/${file}`), { params: Promise.resolve({ file }) });
const png = (cache = "public, max-age=1") => new Response("png", { headers: { "content-type": "image/png", "cache-control": cache } });

beforeEach(() => {
  vi.clearAllMocks();
  m.serve.mockImplementation(async () => png());
  m.read.mockResolvedValue({ kind: "plain" });
  m.inline.mockResolvedValue("data:image/jpeg;base64,AA");
  process.env.INVITE_CODE_SECRET = "ab".repeat(32);
});

describe("GET /email/hand/<key>.png", () => {
  it("refuses bad input itself, with the plain hand and no read: it is outside the proxy (a dotted path)", async () => {
    for (const file of ["x.png", `${KEY}`, `${KEY}.jpg`, `../${KEY.slice(3)}.png`, `${KEY}A.png`, `${"A".repeat(58)}!.png`]) {
      const res = await call(file);
      expect(res.status, file).toBe(200);
    }
    expect(m.read).not.toHaveBeenCalled();
    expect(m.serve.mock.calls.every(([o]) => o.key[0] === "invite-hand-plain")).toBe(true);
  });

  it("serves the plain hand, a 200 image and never a 404, for a key that is not a live invite", async () => {
    const res = await call(`${KEY}.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(m.serve.mock.calls[0][0].key[0]).toBe("invite-hand-plain");
    // A deliberate plain hand is cached longer than a live one (it never changes).
    expect(m.serve.mock.calls[0][0].cacheControl).toBe("public, max-age=86400");
  });

  it("draws the sender's hand for a live invite, fetching the art on the server, and falls back to the artless draw", async () => {
    m.read.mockResolvedValue({ kind: "hand", name: { brand: "n" }, commander: { name: "Ghalta", artCropUri: "https://cards.scryfall.io/x.jpg" } });
    await call(`${KEY}.png`);
    const opts = m.serve.mock.calls[0][0];
    expect(opts.key).toEqual(["invite-hand", KEY]);
    expect(opts.size).toEqual({ width: 560, height: 540 });
    expect(opts.cacheControl).toBe("public, max-age=3600");
    expect(opts.revalidate).toBe(86400);
    const withArt = (await opts.draw(true)) as { face: { art: string; commanderName: string } };
    expect(withArt.face).toMatchObject({ art: "data:image/jpeg;base64,AA", commanderName: "Ghalta" });
    expect(m.inline).toHaveBeenCalledWith("https://cards.scryfall.io/x.jpg");
    expect(await opts.draw(false)).toEqual({ face: null });
  });

  it("answers the plain hand, uncached, when the read itself fails", async () => {
    m.read.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await call(`${KEY}.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
