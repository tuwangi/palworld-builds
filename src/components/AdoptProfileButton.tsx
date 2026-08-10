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
        class="toolbar-button active disabled:opacity-50"
      >
        {label}
      </button>
      {failed && <p class="mt-1.5 text-xs text-[var(--ink-soft)]">{errorLabel}</p>}
    </div>
  );
}
