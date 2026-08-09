import { useFavorites } from "./useFavorites";
import { FavoriteButton } from "./FavoriteButton";

type Props = {
  buildId: string;
  labels: { save: string; remove: string };
};

export default function DetailFavoriteButton({ buildId, labels }: Props) {
  const { isFavorite, toggle, ready } = useFavorites();

  if (!ready) return <div class="h-10 w-40 animate-pulse rounded-full bg-white/5" />;

  return <FavoriteButton isFavorite={isFavorite(buildId)} onToggle={() => toggle(buildId)} labels={labels} withLabel />;
}
