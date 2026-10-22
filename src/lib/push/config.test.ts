import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { isVapidPrivateKey, isVapidPublicKey, isVapidSubject, pushConfig, pushConfigured } from "./config";

function pair() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const pubB64 = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, "base64url"), Buffer.from(pub.y!, "base64url")]).toString("base64url");
  return { pub: pubB64, priv: privateKey.export({ format: "jwk" }).d! };
}

const { pub, priv } = pair();
const good = { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: "mailto:hugh@example.com" } as unknown as NodeJS.ProcessEnv;

describe("push config fails closed", () => {
  it("reads a valid trio", () => {
    expect(pushConfig(good)).toEqual({ publicKey: pub, privateKey: priv, subject: "mailto:hugh@example.com" });
    expect(pushConfigured(good)).toBe(true);
  });

  it.each(["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"])("is dormant without %s", (name) => {
    expect(pushConfig({ ...good, [name]: undefined })).toBeNull();
    expect(pushConfig({ ...good, [name]: "" })).toBeNull();
    expect(pushConfig({ ...good, [name]: "  " })).toBeNull();
  });

  it("refuses a malformed key", () => {
    expect(isVapidPublicKey(pub)).toBe(true);
    expect(isVapidPublicKey(priv)).toBe(false); // 32 bytes is not a point
    expect(isVapidPrivateKey(priv)).toBe(true);
    expect(isVapidPrivateKey(pub)).toBe(false);
    expect(isVapidPublicKey("not base64 !")).toBe(false);
    expect(pushConfig({ ...good, VAPID_PUBLIC_KEY: priv })).toBeNull();
  });

  it("wants a contact the push services can use", () => {
    expect(isVapidSubject("mailto:a@b.co")).toBe(true);
    expect(isVapidSubject("https://the-99.dev/contact")).toBe(true);
    expect(isVapidSubject("a@b.co")).toBe(false);
    expect(isVapidSubject("http://the-99.dev")).toBe(false);
    expect(isVapidSubject("mailto:")).toBe(false);
  });
});
