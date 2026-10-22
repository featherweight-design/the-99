import { describe, expect, it } from "vitest";

import { pushAvailable } from "./available";
import { pushEnabled } from "./flag";
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const keys = {
  VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, "base64url"), Buffer.from(pub.y!, "base64url")]).toString("base64url"),
  VAPID_PRIVATE_KEY: privateKey.export({ format: "jwk" }).d!,
  VAPID_SUBJECT: "mailto:hugh@example.com",
};
const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe("PUSH_ENABLED", () => {
  it("is on only for the exact string true", () => {
    const feed = { HOME_FEED_ENABLED: "true" };
    expect(pushEnabled(env({ PUSH_ENABLED: "true", ...feed }))).toBe(true);
    for (const v of ["1", "TRUE", "on", "off", ""]) expect(pushEnabled(env({ PUSH_ENABLED: v, ...feed }))).toBe(false);
    expect(pushEnabled(env({ ...feed }))).toBe(false);
  });

  it("needs Home's news: a push announces a feed item", () => {
    expect(pushEnabled(env({ PUSH_ENABLED: "true" }))).toBe(false);
  });

  it("is available only with the keys too: neither alone pushes", () => {
    expect(pushAvailable(env({ PUSH_ENABLED: "true", HOME_FEED_ENABLED: "true", ...keys }))).toBe(true);
    expect(pushAvailable(env({ PUSH_ENABLED: "true", HOME_FEED_ENABLED: "true" }))).toBe(false);
    expect(pushAvailable(env({ ...keys }))).toBe(false);
  });
});
