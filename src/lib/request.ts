import "server-only";
import { headers } from "next/headers";
import { env } from "./env";

/**
 * Client IP for rate limiting and audit logs.
 *
 * X-Forwarded-For is a list the client can prepend to, so the leftmost entry
 * is never trusted. The Next.js server appends the socket address as the last
 * entry; each trusted reverse proxy in front of it (load balancer, CDN) appends
 * one more. With TRUSTED_PROXY_HOPS proxies, the real client is that many
 * entries from the right.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ip = chain[chain.length - 1 - env.TRUSTED_PROXY_HOPS] ?? chain[0];
  return (ip || "unknown").slice(0, 64);
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 256);
}
