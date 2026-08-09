import { HeartIcon } from "./icons";

type Props = {
  isFavorite: boolean;
  onToggle: () => void;
  labels: { save: string; remove: string };
  withLabel?: boolean;
};

export function FavoriteButton({ isFavorite, onToggle, labels, withLabel = false }: Props) {
  const label = isFavorite ? labels.remove : labels.save;
  const heartClass = isFavorite ? "size-4 shrink-0 text-brand-500" : "size-4 shrink-0 text-zinc-500";

  if (withLabel) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isFavorite}
        class="inline-flex items-center gap-x-2 rounded-full border border-white/10 bg-white/5 py-2 pr-4 pl-3 text-sm font-medium text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <HeartIcon class={heartClass} />
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
      class="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <span class="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2" aria-hidden="true" />
      <HeartIcon class={heartClass} />
    </button>
  );
}
