/**
 * Server-only GitHub Contents API client for reading/writing
 * `data/profiles/<id>.json`. Never import this from client-bundled code —
 * it reads GITHUB_TOKEN from process.env and must only run in the API
 * route / on-demand pages (both marked `export const prerender = false`).
 *
 * Required env vars (set in Vercel project settings, never committed):
 * - GITHUB_TOKEN: fine-grained PAT, scoped to this repo only, contents:write
 * - GITHUB_REPO: "owner/repo"
 * - GITHUB_BRANCH: optional, defaults to "main"
 */

const API_BASE = "https://api.github.com";

export type StoredProfile = {
  id: string;
  favorites: string[];
  updatedAt: string;
};

class GitHubNotConfiguredError extends Error {
  constructor() {
    super("GitHub profile backend is not configured (missing GITHUB_TOKEN or GITHUB_REPO).");
    this.name = "GitHubNotConfiguredError";
  }
}

function config() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repo) throw new GitHubNotConfiguredError();
  return { token, repo, branch };
}

function contentsUrl(repo: string, path: string) {
  return `${API_BASE}/repos/${repo}/contents/${path}`;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "palworld-builds-companion",
  };
}

export { GitHubNotConfiguredError };

/**
 * Returns the stored profile and its blob `sha` (needed to update it later),
 * or `null` if the profile file doesn't exist yet — a brand-new ID is a
 * valid, empty collection, not an error.
 */
export async function readProfile(id: string): Promise<{ profile: StoredProfile; sha: string } | null> {
  const { token, repo, branch } = config();
  const path = `data/profiles/${id}.json`;
  const res = await fetch(`${contentsUrl(repo, path)}?ref=${encodeURIComponent(branch)}`, {
    headers: authHeaders(token),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);

  const body = (await res.json()) as { content: string; sha: string };
  const json = Buffer.from(body.content, "base64").toString("utf8");
  return { profile: JSON.parse(json) as StoredProfile, sha: body.sha };
}

/**
 * Creates or updates `data/profiles/<id>.json`. Pass the `sha` returned by
 * `readProfile` when updating an existing file; omit it (or pass
 * `undefined`) when creating a new one.
 */
export async function writeProfile(id: string, favorites: string[], sha: string | undefined): Promise<void> {
  const { token, repo, branch } = config();
  const path = `data/profiles/${id}.json`;
  const profile: StoredProfile = { id, favorites, updatedAt: new Date().toISOString() };
  const content = Buffer.from(JSON.stringify(profile, null, 2) + "\n", "utf8").toString("base64");

  const res = await fetch(contentsUrl(repo, path), {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `profile: update ${id} (${favorites.length} favorite${favorites.length === 1 ? "" : "s"})`,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) throw new Error(`GitHub write failed (${res.status}): ${await res.text()}`);
}
