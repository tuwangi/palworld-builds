import type { APIRoute } from "astro";
import { readProfile, writeProfile, GitHubNotConfiguredError } from "../../../lib/github";
import { sanitizeFavorites } from "../../../lib/profile";
import { isValidProfileId } from "../../../lib/profileId";
import { bearerToken, decideWrite, rateLimit, sameFavorites } from "../../../lib/profileAuth";

export const prerender = false;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  if (!isValidProfileId(id)) {
    return json({ error: "invalid_id" }, 400);
  }

  try {
    const existing = await readProfile(id);
    return json(
      {
        id,
        favorites: existing?.profile.favorites ?? [],
        // Lets the client tell "unclaimed, you can take it" from "claimed by
        // someone else" before it bothers pushing.
        claimed: Boolean(existing?.profile.tokenHash),
        exists: Boolean(existing),
      },
      200,
    );
  } catch (err) {
    if (err instanceof GitHubNotConfiguredError) {
      return json({ error: "backend_not_configured" }, 503);
    }
    console.error("profile GET failed", err);
    return json({ error: "backend_unavailable" }, 502);
  }
};

export const PUT: APIRoute = async ({ params, request, clientAddress }) => {
  const id = params.id ?? "";
  if (!isValidProfileId(id)) {
    return json({ error: "invalid_id" }, 400);
  }

  let address = "unknown";
  try {
    address = clientAddress;
  } catch {
    // clientAddress throws on prerendered routes in some adapters; the id
    // bucket below still applies.
  }
  if (!rateLimit(`${address}:${id}`)) {
    return json({ error: "rate_limited" }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const favoritesInput = (body as { favorites?: unknown })?.favorites;
  const favorites = sanitizeFavorites(favoritesInput);
  const presented = bearerToken(request);

  try {
    const existing = await readProfile(id);
    const decision = decideWrite(existing?.profile.tokenHash, presented);
    if (!decision.allowed) {
      return json({ error: decision.reason }, decision.reason === "token_required" ? 401 : 403);
    }

    // A no-op write would still create a commit in the repo. Skipping it is
    // what makes the debounced client sync safe to fire on every toggle.
    if (existing && sameFavorites(existing.profile.favorites, favorites) && existing.profile.tokenHash) {
      return json({ id, favorites, unchanged: true }, 200);
    }

    await writeProfile(id, favorites, existing?.sha, decision.tokenHash);
    return json({ id, favorites }, 200);
  } catch (err) {
    if (err instanceof GitHubNotConfiguredError) {
      return json({ error: "backend_not_configured" }, 503);
    }
    console.error("profile PUT failed", err);
    return json({ error: "backend_unavailable" }, 502);
  }
};
