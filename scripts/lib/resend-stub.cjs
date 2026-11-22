// Loaded into a LOCAL dev server with NODE_OPTIONS="--require <this file>" and RESEND_STUB_LOG=<file>: answers Resend's
// send endpoint with a 200 and appends one JSON line per mail (recipient, subject, template tag) to the log. Nothing leaves the
// machine, and the key and the bodies are never logged. Every other fetch passes through untouched.
/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS preload for NODE_OPTIONS=--require */
const fs = require("node:fs");
const real = globalThis.fetch;
globalThis.fetch = async function stubbed(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url === "https://api.resend.com/emails" && process.env.RESEND_STUB_LOG) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    fs.appendFileSync(process.env.RESEND_STUB_LOG, JSON.stringify({ to: body.to, subject: body.subject, template: body.tags?.[0]?.value ?? null }) + "\n");
    return new Response(JSON.stringify({ id: "stub" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return real.call(this, input, init);
};
