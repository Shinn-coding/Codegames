import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy } from "@/lib/security-headers";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/**
 * The proxy only performs a cheap early redirect when the session cookie is
 * absent. Server components and route handlers call `auth()`/`requireUser()`
 * and are the authoritative authorization boundary. This matters because the
 * production Google flow uses database sessions, which cannot be validated in
 * the edge proxy without a database round-trip on every request.
 */
export default function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDevelopment = process.env.NODE_ENV !== "production";

  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    isDevelopment,
    // Keep local `next start` usable over http:// while still upgrading
    // subresources on the real https deployment.
    upgradeInsecureRequests:
      !isDevelopment &&
      (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://"),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js extracts the nonce from the request CSP header during rendering.
  // Without this header, framework scripts receive a different nonce and the
  // browser blocks them because 'strict-dynamic' is enabled.
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("x-nonce", nonce);

  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/checkout");

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );

  if (isProtected && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
