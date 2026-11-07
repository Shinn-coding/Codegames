import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../src/lib/security-headers.ts";

function headerMap(headers: Array<{ key: string; value: string }>) {
  return Object.fromEntries(
    headers.map((header) => [header.key, header.value]),
  );
}

test("CSP uses the supplied nonce and strict script execution", () => {
  const csp = buildContentSecurityPolicy({
    nonce: "test-nonce",
    isDevelopment: false,
  });

  assert.ok(
    csp.includes("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'"),
  );
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(
    csp.includes(
      "connect-src 'self' https://vercel.com https://blob.vercel-storage.com",
    ),
  );
  assert.ok(csp.includes("upgrade-insecure-requests"));
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.ok(!csp.includes("ws:"));
});

test("development CSP allows eval and HMR websockets", () => {
  const csp = buildContentSecurityPolicy({
    nonce: "dev-nonce",
    isDevelopment: true,
  });

  assert.ok(csp.includes("'unsafe-eval'"));
  assert.ok(csp.includes("ws:"));
  assert.ok(csp.includes("wss:"));
  assert.ok(!csp.includes("upgrade-insecure-requests"));
});

test("CSP only upgrades insecure requests when asked", () => {
  const localProduction = buildContentSecurityPolicy({
    nonce: "local-nonce",
    isDevelopment: false,
    upgradeInsecureRequests: false,
  });

  assert.ok(!localProduction.includes("upgrade-insecure-requests"));
  assert.ok(localProduction.includes("script-src 'self' 'nonce-local-nonce'"));
});

test("security headers include cross-origin isolation defaults", () => {
  const headers = headerMap(buildSecurityHeaders(false));

  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Cross-Origin-Opener-Policy"], "same-origin");
  assert.equal(headers["Cross-Origin-Resource-Policy"], "same-origin");
  assert.equal(headers["X-Permitted-Cross-Domain-Policies"], "none");
  assert.equal(headers["X-XSS-Protection"], "0");
  assert.equal(headers["Strict-Transport-Security"], undefined);
});

test("HSTS is emitted only in production", () => {
  const headers = headerMap(buildSecurityHeaders(true));

  assert.match(
    headers["Strict-Transport-Security"] ?? "",
    /^max-age=63072000; includeSubDomains; preload$/,
  );
});
