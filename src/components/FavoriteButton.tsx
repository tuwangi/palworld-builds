import { HeartIcon, HeartOutlineIcon } from "./icons";

type Props = {
  isFavorite: boolean;
  onToggle: () => void;
  labels: { save: string; remove: string };
  withLabel?: boolean;
};

export function FavoriteButton({ isFavorite, onToggle, labels, withLabel = false }: Props) {
  const label = isFavorite ? labels.remove : labels.save;
  const heartClass = isFavorite ? "size-4 shrink-0 text-[var(--coral)]" : "size-4 shrink-0 text-[var(--ink-soft)]";

  if (withLabel) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isFavorite}
        class="favorite-button inline-flex items-center gap-x-2 rounded-full border border-[var(--line)] bg-white/70 py-2 pr-4 pl-3 text-sm font-bold text-[var(--ink)]"
      >
        {isFavorite ? <HeartIcon class={`favorite-icon ${heartClass}`} /> : <HeartOutlineIcon class={`favorite-icon ${heartClass}`} />}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={label}
      class="favorite-button relative inline-flex size-9 shrink-0 items-center justify-center rounded-full"
    >
      <span class="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2" aria-hidden="true" />
      {isFavorite ? <HeartIcon class={`favorite-icon ${heartClass}`} /> : <HeartOutlineIcon class={`favorite-icon ${heartClass}`} />}
    </button>
  );
}
