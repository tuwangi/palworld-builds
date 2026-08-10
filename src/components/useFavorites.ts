import { useEffect, useRef, useState } from "preact/hooks";
import { isValidProfileId } from "../lib/profileId";

const FAVORITES_KEY = "palworld-builds:favorites";
const PROFILE_KEY = "palworld-builds:profile";
const TOKEN_KEY_PREFIX = "palworld-builds:profile-token:";
const SYNC_DEBOUNCE_MS = 1200;

/**
 * Write token for a profile ID. It never leaves this device except as a
 * bearer header, and the server only ever stores its SHA-256 — so the ID
 * stays shareable while the collection stays writable by its owner alone.
 */
function readToken(profileId: string): string | null {
  return localStorage.getItem(TOKEN_KEY_PREFIX + profileId);
}

function ensureToken(profileId: string): string {
  const existing = readToken(profileId);
  if (existing) return existing;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(TOKEN_KEY_PREFIX + profileId, token);
  return token;
}

function readFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeFavorites(ids: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

function readProfileId(): string | null {
  return localStorage.getItem(PROFILE_KEY);
}

function writeProfileId(id: string | null) {
  if (id) localStorage.setItem(PROFILE_KEY, id);
  else localStorage.removeItem(PROFILE_KEY);
}

async function pushToProfile(profileId: string, favorites: Set<string>): Promise<boolean> {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(profileId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ensureToken(profileId)}`,
      },
      body: JSON.stringify({ favorites: [...favorites] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type JoinProfileResult =
  | { ok: true }
  | { ok: false; reason: "invalid_id" | "unavailable" | "not_yours" };

/**
 * Favorites always live in localStorage first — that's what makes the app
 * work with no backend at all. A profile ID is an optional add-on: once
 * set, every toggle also gets pushed (debounced) to the shared GitHub-backed
 * collection, but a failed push never blocks the local toggle from working.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setFavorites(readFavorites());
    setProfileId(readProfileId());
    setReady(true);
  }, []);

  function scheduleSync(next: Set<string>) {
    const pid = readProfileId();
    if (!pid) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      pushToProfile(pid, next);
    }, SYNC_DEBOUNCE_MS);
  }

  function toggle(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavorites(next);
      scheduleSync(next);
      return next;
    });
  }

  /**
   * Adopts a profile ID on this device: merges its remote favorites with
   * whatever is already local (never silently discards local picks), then
   * reloads so every island on the page re-reads the same, now-consistent
   * localStorage state.
   *
   * Reading someone else's collection is always allowed; writing to it is not.
   * If the ID is already claimed and this device has no token for it, the
   * merge still lands locally and the profile is simply not adopted for sync —
   * reported back as `not_yours` rather than failing silently on every push.
   */
  async function joinProfile(rawId: string): Promise<JoinProfileResult> {
    const id = rawId.trim().toLowerCase();
    if (!isValidProfileId(id)) return { ok: false, reason: "invalid_id" };

    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(id)}`);
      if (!res.ok) return { ok: false, reason: "unavailable" };
      const data = (await res.json()) as { favorites?: string[]; claimed?: boolean };
      const merged = new Set([...readFavorites(), ...(data.favorites ?? [])]);
      writeFavorites(merged);

      if (data.claimed && !readToken(id)) {
        return { ok: false, reason: "not_yours" };
      }

      writeProfileId(id);
      const pushed = await pushToProfile(id, merged);
      if (!pushed) {
        writeProfileId(null);
        return { ok: false, reason: "not_yours" };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  }

  function leaveProfile() {
    writeProfileId(null);
  }

  return {
    favorites,
    isFavorite: (id: string) => favorites.has(id),
    toggle,
    ready,
    profileId,
    joinProfile,
    leaveProfile,
  };
}
