import { useState } from "preact/hooks";
import { useFavorites } from "./useFavorites";

type Strings = {
  profileHint: string;
  profilePlaceholder: string;
  profileJoinButton: string;
  profileActiveTemplate: string;
  profileLeaveButton: string;
  profileErrorInvalid: string;
  profileErrorUnavailable: string;
};

export default function ProfileControl({ strings }: { strings: Strings }) {
  const { profileId, joinProfile, leaveProfile, ready } = useFavorites();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "invalid" | "unavailable">("idle");

  if (!ready) return null;

  if (profileId) {
    return (
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span class="font-bold text-white">{strings.profileActiveTemplate.replace("{id}", profileId)}</span>
        <button
          type="button"
          onClick={() => {
            leaveProfile();
            window.location.reload();
          }}
          class="text-white/60 underline underline-offset-2 hover:text-white"
        >
          {strings.profileLeaveButton}
        </button>
      </div>
    );
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setStatus("loading");
    const result = await joinProfile(input);
    if (result.ok) {
      window.location.reload();
      return;
    }
    setStatus(result.reason === "invalid_id" ? "invalid" : "unavailable");
  }

  return (
    <div>
      <form onSubmit={handleSubmit} class="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="profileId"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder={strings.profilePlaceholder}
          aria-label={strings.profilePlaceholder}
          class="w-48 rounded-xl border border-white/20 bg-white/10 py-2.5 px-3 text-sm text-white placeholder:text-white/45"
        />
        <button
          type="submit"
          disabled={status === "loading" || input.trim().length === 0}
          class="rounded-xl border border-transparent bg-[var(--coral)] py-2.5 px-3 text-xs font-bold text-white disabled:opacity-50"
        >
          {strings.profileJoinButton}
        </button>
      </form>
      <p class="mt-1.5 text-xs text-white/55">
        {status === "invalid" ? strings.profileErrorInvalid : status === "unavailable" ? strings.profileErrorUnavailable : strings.profileHint}
      </p>
    </div>
  );
}
