/**
 * Push's server configuration: the VAPID keypair and the contact the push services see, from three variables
 * (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; plan `2026-10-22-push.md`, "Secrets and config").
 *
 * It FAILS CLOSED. Any of the three missing or malformed is `null`: no column, no send, a cron that answers
 * `dormant`. Nothing here throws and nothing logs a key. The switch alone never turns push on; the keys alone never
 * do either. Reads members of the env it is handed and never passes the object on (`check:switch-reads`).
 */

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

/** The push services need a way to reach the sender: a `mailto:` address or an `https:` URL. */
export const isVapidSubject = (v: string): boolean => /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^https:\/\/[^\s/]+\S*$/.test(v);

export function pushConfig(env: NodeJS.ProcessEnv): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = env.VAPID_SUBJECT?.trim() ?? "";
  if (!isVapidPublicKey(publicKey) || !isVapidPrivateKey(privateKey) || !isVapidSubject(subject)) return null;
  return { publicKey, privateKey, subject };
}

export const pushConfigured = (env: NodeJS.ProcessEnv): boolean => pushConfig(env) !== null;
