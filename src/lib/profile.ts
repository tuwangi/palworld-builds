import { getBuildSummaries } from "./data";
import { MAX_FAVORITES } from "./profileId";

let validBuildIds: Set<string> | null = null;

function allBuildIds(): Set<string> {
  if (!validBuildIds) {
    validBuildIds = new Set(getBuildSummaries("es").map((b) => b.id));
  }
  return validBuildIds;
}

/**
 * Keeps only real, existing build ids, drops duplicates, and caps the
 * collection size — never trusts a client-submitted favorites array as-is.
 */
export function sanitizeFavorites(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const valid = allBuildIds();
  const seen = new Set<string>();
  for (const entry of input) {
    if (typeof entry !== "string") continue;
    if (!valid.has(entry)) continue;
    seen.add(entry);
    if (seen.size >= MAX_FAVORITES) break;
  }
  return [...seen];
}
