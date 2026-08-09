import { useState } from "preact/hooks";
import { useFavorites } from "./useFavorites";

type Props = {
  id: string;
  label: string;
  errorLabel: string;
  redirectTo: string;
};

export default function AdoptProfileButton({ id, label, errorLabel, redirectTo }: Props) {
  const { joinProfile, ready } = useFavorites();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!ready) return null;

  async function handleClick() {
    setLoading(true);
    setFailed(false);
    const result = await joinProfile(id);
    if (result.ok) {
      window.location.href = redirectTo;
      return;
    }
    setLoading(false);
    setFailed(true);
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        class="inline-flex items-center rounded-full bg-brand-500 py-2 px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50"
      >
        {label}
      </button>
      {failed && <p class="mt-1.5 text-xs text-zinc-500">{errorLabel}</p>}
    </div>
  );
}
