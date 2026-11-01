import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { sentryIngestHost, sentryOptions } from "./options";
import { KEPT_EXCEPTION_MESSAGES, scrubBreadcrumb, scrubEvent, scrubExceptionValue, scrubUrl } from "./scrub";

const EMAIL = "player@example.com";
const CLERK_ID = "user_2abcDEFghiJKL";

describe("scrubUrl", () => {
  it("cuts the query and hash and replaces a friend or join token", () => {
    expect(scrubUrl("https://x.dev/friend/tok_SECRET?next=/decks#a")).toBe("https://x.dev/friend/[redacted]");
    expect(scrubUrl("/join/QR-123")).toBe("/join/[redacted]");
    expect(scrubUrl("/decks/abc")).toBe("/decks/abc");
  });
});

describe("scrubEvent", () => {
  const event = {
    type: undefined,
    message: `failed for ${EMAIL}`,
    user: { id: CLERK_ID, email: EMAIL, ip_address: "1.2.3.4" },
    server_name: "host-1",
    extra: { body: "{}" },
    transaction: "GET /friend/tok_SECRET",
    contexts: { nextjs: { request_path: "/friend/tok_SECRET?q=private", router_kind: "App Router", route_type: "render" } },
    request: {
      method: "POST",
      url: "https://x.dev/api/stripe-webhook?sig=1",
      data: '{"customer_email":"player@example.com"}',
      cookies: { __session: "jwt" },
      headers: { "stripe-signature": "t=1,v1=abc", cookie: "__session=jwt" },
      query_string: "sig=1",
    },
    exception: {
      values: [
        {
          type: "Error",
          value: `no deck called Sol Ring for ${EMAIL}`,
          stacktrace: { frames: [{ filename: "https://x.dev/friend/tok_SECRET?q=private", abs_path: "https://x.dev/join/QRTOKEN?a=1", function: "onClick", lineno: 7, colno: 3 }] },
        },
      ],
    },
    threads: { values: [{ id: 1, stacktrace: { frames: [{ filename: "https://x.dev/friend/tok_SECRET#h" }] } }] },
    breadcrumbs: [
      { category: "console", message: `log ${EMAIL}` },
      { category: "fetch", data: { url: "/api/x?q=secret" } },
      { category: "navigation", data: { from: "/friend/tok_SECRET?a=1", to: "/decks" } },
      { category: "navigation", data: { from: "/admin/accounts/user_2abcDEFghiJKL", to: "/decks" } },
      { category: "ui.click", message: 'button[aria-label="Remove Hugh from Friday Night Pod"]' },
    ],
  } as unknown as ErrorEvent;

  const out = JSON.stringify(scrubEvent(event));

  it("carries no identity, body, header, cookie, query or message", () => {
    for (const leak of [EMAIL, CLERK_ID, "1.2.3.4", "host-1", "customer_email", "stripe-signature", "v1=abc", "__session", "sig=1", "tok_SECRET", CLERK_ID.slice(0, 10), "Sol Ring", "q=secret", "a=1", "q=private", "QRTOKEN", "Friday Night Pod", "Hugh"]) {
      expect(out, leak).not.toContain(leak);
    }
  });
  it("keeps the method, the path and the exception type", () => {
    const e = scrubEvent(event);
    expect(e.request).toEqual({ method: "POST", url: "https://x.dev/api/stripe-webhook" });
    expect(e.exception?.values?.[0].type).toBe("Error");
    expect(e.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({ filename: "https://x.dev/friend/[redacted]", abs_path: "https://x.dev/join/[redacted]", function: "onClick", lineno: 7, colno: 3 });
    expect(e.transaction).toBe("GET /friend/[redacted]");
  });
  it("keeps only navigation and click breadcrumbs, scrubbed, with no click text", () => {
    expect(scrubEvent(event).breadcrumbs).toEqual([
      { category: "navigation", data: { from: "/friend/[redacted]", to: "/decks" } },
      { category: "navigation", data: { from: "/admin/accounts/[redacted]", to: "/decks" } },
      { category: "ui.click", data: {} },
    ]);
    expect(scrubEvent(event).contexts?.nextjs).toMatchObject({ request_path: "/friend/[redacted]", router_kind: "App Router" });
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console, fetch and xhr", () => {
    for (const category of ["console", "fetch", "xhr", "ui.input", undefined]) {
      expect(scrubBreadcrumb({ category } as Breadcrumb)).toBeNull();
    }
  });
});

describe("sentryOptions", () => {
  it("is dormant without a DSN, and without a named environment", () => {
    expect(sentryOptions(undefined, "production").enabled).toBe(false);
    expect(sentryOptions("https://k@o1.ingest.sentry.io/1", undefined).enabled).toBe(false);
    expect(sentryOptions("https://k@o1.ingest.sentry.io/1", "  ").enabled).toBe(false);
    expect(sentryOptions("https://k@o1.ingest.sentry.io/1", "local").enabled).toBe(false);
    expect(sentryOptions("", "production").enabled).toBe(false);
  });
  it("sends for a DSN and a named environment, errors only", () => {
    const o = sentryOptions("https://k@o1.ingest.sentry.io/1", "staging");
    expect(o.enabled).toBe(true);
    expect(o.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false });
    expect(o).not.toHaveProperty("tracesSampleRate");
    expect(o).not.toHaveProperty("integrations");
    expect(o).not.toHaveProperty("replaysSessionSampleRate");
  });
});

const withValue = (value: string | undefined) =>
  scrubEvent({ type: undefined, exception: { values: [{ type: "Error", value }] } }).exception?.values?.[0].value;

describe("an exception's message", () => {
  const CLERK = [...KEPT_EXCEPTION_MESSAGES].filter((m) => m.startsWith("Clerk: auth()"));

  it("is kept for each string on the closed list, whole", () => {
    expect(KEPT_EXCEPTION_MESSAGES.size).toBe(6);
    for (const m of KEPT_EXCEPTION_MESSAGES) expect(withValue(m), m.slice(0, 40)).toBe(m);
    for (const m of ["unauthenticated", "NEXT_NOT_FOUND", "NEXT_REDIRECT"]) expect(withValue(m)).toBe(m);
    expect(CLERK).toHaveLength(3);
  });

  it("is redacted when it is not exactly on the list, including one that starts like a listed string", () => {
    for (const m of [
      "no deck called Sol Ring",
      "unauthenticated: Sol Ring",
      "unauthenticated ",
      "Unauthenticated",
      "NEXT_REDIRECT;replace;/decks/Sol Ring;307;",
      `${CLERK[0]} Sol Ring`,
      CLERK[0].replace("auth()", "currentUser()"),
      "",
    ]) {
      expect(withValue(m), m).toBe("[redacted]");
    }
    expect(withValue(undefined)).toBe("[redacted]");
  });

  it("keeps only the number of a minified React error, never its link or its arguments", () => {
    expect(scrubExceptionValue("Minified React error #419; visit https://react.dev/errors/419 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.")).toBe("Minified React error #419");
    expect(scrubExceptionValue("Minified React error #418; visit https://react.dev/errors/418?args[]=Sol%20Ring&args[]=div for the full message")).toBe("Minified React error #418");
    expect(scrubExceptionValue("Minified React error #12345")).toBe("[redacted]");
    expect(scrubExceptionValue("Error: Minified React error #419")).toBe("[redacted]");
    expect(scrubExceptionValue("Minified React error #")).toBe("[redacted]");
  });

  it("still drops the event's own message and logentry, on every runtime that shares these options", () => {
    const out = scrubEvent({ type: undefined, message: "Sol Ring", logentry: { message: "Sol Ring" }, exception: { values: [{ type: "Error", value: "unauthenticated" }] } });
    expect(out.message).toBeUndefined();
    expect(out.logentry).toBeUndefined();
  });

  it("lists Clerk's message as Clerk's own source still writes it", () => {
    // The three texts are written out in scrub.ts; if a Clerk upgrade rewords the template this fails and they are re-derived.
    const source = readFileSync(join(process.cwd(), "node_modules/@clerk/nextjs/dist/esm/server/errors.js"), "utf8");
    for (const line of [
      "Clerk: ${helperName}() was called but Clerk can't detect usage of clerkMiddleware(). Please ensure the following:",
      "- ${prefixSteps ? [...prefixSteps, \"\"].join(\"\\n- \") : \" \"}clerkMiddleware() is used in your Next.js ${fileReference} file.",
      "- Your ${fileReference} matcher is configured to match this route or page.",
      "- If you are using the src directory, make sure the ${fileReference} file is inside of it.",
      "If you've verified your configuration and are still seeing this error, there may be a runtime issue or a problem communicating with Clerk.",
      "For more details, see https://clerk.com/err/auth-middleware",
    ]) expect(source).toContain(line);
    // The step line and the file reference come from two other files of the package.
    const auth = readFileSync(join(process.cwd(), "node_modules/@clerk/nextjs/dist/esm/app-router/server/auth.js"), "utf8");
    for (const line of [
      '"middleware.(ts|js) or proxy.(ts|js)"',
      "`Your ${middlewareFileReference} file exists at ./${isSrcAppDir ? \"src/\" : \"\"}${fileName}`",
    ]) expect(auth).toContain(line);
    const versions = readFileSync(join(process.cwd(), "node_modules/@clerk/nextjs/dist/esm/utils/sdk-versions.js"), "utf8");
    expect(versions).toContain('isNext16OrHigher ? "middleware or proxy" : "middleware"');
  });
});

describe("sentryOptions: errors to ignore", () => {
  it("ignores React error #419 and no other number", () => {
    const [re] = sentryOptions("https://k@o1.ingest.sentry.io/1", "staging").ignoreErrors as RegExp[];
    expect(re.test("Minified React error #419; visit https://react.dev/errors/419 for the full message")).toBe(true);
    expect(re.test("Minified React error #4190")).toBe(false);
    expect(re.test("Minified React error #418; visit")).toBe(false);
  });
});

describe("sentryIngestHost", () => {
  it("is the DSN's host, https only", () => {
    expect(sentryIngestHost("https://key@o4.ingest.us.sentry.io/123")).toBe("o4.ingest.us.sentry.io");
    for (const v of [undefined, "", "not a url", "http://k@a.io/1"]) expect(sentryIngestHost(v)).toBeNull();
  });
});
