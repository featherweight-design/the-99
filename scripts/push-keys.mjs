// Prints a new VAPID keypair for web push. Touches nothing: no .env, no file, no network, no Vercel. Hugh sets the
// three variables in Vercel himself (plan 2026-10-22-push.md, "Secrets and config"); run it once per Vercel project,
// because each project carries its own pair. Rotating a pair invalidates every subscription made under the old one.
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const publicB64 = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]).toString("base64url");

console.log(`VAPID_PUBLIC_KEY=${publicB64}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
console.log("VAPID_SUBJECT=mailto:you@example.com   # replace with a real contact");
console.error("\nSet these in Vercel yourself: Production scope, VAPID_PRIVATE_KEY Sensitive. Never put them in .env or a file.");
