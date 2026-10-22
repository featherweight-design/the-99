/**
 * Push's server configuration: the VAPID keypair and the contact the push services see, from three variables
 * (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; plan `2026-10-22-push.md`, "Secrets and config").
 *
 * It FAILS CLOSED. Any of the three missing or malformed is `null`: no column, no send, a cron that answers
 * `dormant`. Nothing here throws and nothing logs a key. The switch alone never turns push on; the keys alone never
 * do either. Reads members of the env it is handed and never passes the object on (`check:switch-reads`).
 */
import { createECDH } from "node:crypto";

export type PushConfig = { publicKey: string; privateKey: string; subject: string };

const B64URL = /^[A-Za-z0-9_-]+$/;

function bytes(value: string): Buffer | null {
  if (!B64URL.test(value)) return null;
  return Buffer.from(value, "base64url");
}

/** An uncompressed P-256 point: 65 bytes, the first 0x04. */
export const isVapidPublicKey = (v: string): boolean => {
  const b = bytes(v);
  return b !== null && b.length === 65 && b[0] === 0x04;
};

/** A P-256 scalar: 32 bytes. */
export const isVapidPrivateKey = (v: string): boolean => bytes(v)?.length === 32;

/** The push services need a way to reach the sender: a `mailto:` address or an `https:` URL that parses and names a host. */
export const isVapidSubject = (v: string): boolean => {
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  try {
    const url = new URL(v);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
};

/**
 * Whether the two halves are ONE usable P-256 keypair: the private scalar must be valid and must derive exactly the
 * public point. Length checks alone pass a zero scalar, a point off the curve and halves from different pairs, none of
 * which can sign a push.
 */
export function isVapidKeypair(publicKey: string, privateKey: string): boolean {
  const pub = bytes(publicKey);
  const priv = bytes(privateKey);
  if (!pub || !priv) return false;
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(priv);
    return ecdh.getPublicKey().equals(pub);
  } catch {
    return false;
  }
}

export function pushConfig(env: NodeJS.ProcessEnv): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = env.VAPID_SUBJECT?.trim() ?? "";
  if (!isVapidPublicKey(publicKey) || !isVapidPrivateKey(privateKey) || !isVapidSubject(subject)) return null;
  if (!isVapidKeypair(publicKey, privateKey)) return null;
  return { publicKey, privateKey, subject };
}

export const pushConfigured = (env: NodeJS.ProcessEnv): boolean => pushConfig(env) !== null;
