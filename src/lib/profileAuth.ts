/**
 * Write protection for shared profiles.
 *
 * A profile ID is deliberately public and guessable — that is the sharing
 * mechanism. What was missing is that anyone could also *overwrite* any
 * profile: `PUT /api/profile/tuwangi` took the body at face value, so a
 * stranger could blank someone's collection, and each request minted a commit
 * in a public repo.
 *
 * The fix keeps the no-account promise: the first device to use an ID claims
 * it by presenting a random token it generated locally; the server stores only
 * the SHA-256 of that token. Later writes must present the same token. Reads
 * stay open, so sharing a link still works with no credential at all.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length >= 16 && token.length <= 200 ? token : null;
}

export type WriteDecision =
  | { allowed: true; tokenHash: string | undefined }
  | { allowed: false; reason: "token_required" | "token_invalid" };

/**
 * `storedHash === undefined` covers two cases that behave the same way: a
 * brand-new ID, and the handful of profiles written before tokens existed.
 * Both are claimed by the first writer that presents a token. Anything with a
 * stored hash requires that exact token, with one escape hatch: ADMIN_PROFILE_TOKEN
 * lets the repo owner fix or reclaim a profile without hand-editing the JSON.
 */
export function decideWrite(storedHash: string | undefined, presented: string | null): WriteDecision {
  const admin = process.env.ADMIN_PROFILE_TOKEN;
  if (admin && presented && constantTimeEquals(presented, admin)) {
    return { allowed: true, tokenHash: storedHash };
  }

  if (!presented) return { allowed: false, reason: "token_required" };

  if (!storedHash) return { allowed: true, tokenHash: hashToken(presented) };

  return constantTimeEquals(hashToken(presented), storedHash)
    ? { allowed: true, tokenHash: storedHash }
    : { allowed: false, reason: "token_invalid" };
}

/**
 * Best-effort throttle. Serverless instances don't share memory, so this is a
 * speed bump against a naive loop, not a real quota — the load-bearing limit
 * is that a write which changes nothing never reaches GitHub at all (see the
 * no-op check in the route), which is what kept commit spam possible before.
 */
const WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

export function rateLimit(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_WRITES_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every((at) => now - at >= WINDOW_MS)) hits.delete(k);
  }
  return true;
}

export function sameFavorites(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}
