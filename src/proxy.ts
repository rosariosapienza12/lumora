import { NextResponse, type NextRequest } from "next/server";

function buildCsp(nonce: string, isDev: boolean, embeddable: boolean) {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // Inline style attributes are needed for animation and element positioning.
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self'`,
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors ${embeddable ? "*" : "'none'"}`,
    isDev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defense in depth: Next.js lets Server Actions through when the Origin
 * header is missing, so reject any state-changing request whose Origin is
 * absent or does not match the host.
 */
function isCrossOrigin(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  // Only the public embed route may be framed by other sites.
  const embeddable = request.nextUrl.pathname.startsWith("/embed/");
  const csp = buildCsp(nonce, isDev, embeddable);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (!embeddable) response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: [
    // Runs on prefetches too: skipping them would also skip the CSRF check above.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
