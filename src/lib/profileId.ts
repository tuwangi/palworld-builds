/**
 * Pure, dependency-free rules for profile IDs — safe to import from both
 * server code (API route) and client bundles (the favorites hook), unlike
 * src/lib/data.ts or src/lib/profile.ts which touch node:fs.
 */
export const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;

export function isValidProfileId(id: string): boolean {
  return PROFILE_ID_PATTERN.test(id);
}

export const MAX_FAVORITES = 200;
