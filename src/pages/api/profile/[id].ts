import type { APIRoute } from "astro";
import { readProfile, writeProfile, GitHubNotConfiguredError } from "../../../lib/github";
import { sanitizeFavorites } from "../../../lib/profile";
import { isValidProfileId } from "../../../lib/profileId";

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
    return json({ id, favorites: existing?.profile.favorites ?? [] }, 200);
  } catch (err) {
    if (err instanceof GitHubNotConfiguredError) {
      return json({ error: "backend_not_configured" }, 503);
    }
    console.error("profile GET failed", err);
    return json({ error: "backend_unavailable" }, 502);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "";
  if (!isValidProfileId(id)) {
    return json({ error: "invalid_id" }, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const favoritesInput = (body as { favorites?: unknown })?.favorites;
  const favorites = sanitizeFavorites(favoritesInput);

  try {
    const existing = await readProfile(id);
    await writeProfile(id, favorites, existing?.sha);
    return json({ id, favorites }, 200);
  } catch (err) {
    if (err instanceof GitHubNotConfiguredError) {
      return json({ error: "backend_not_configured" }, 503);
    }
    console.error("profile PUT failed", err);
    return json({ error: "backend_unavailable" }, 502);
  }
};
