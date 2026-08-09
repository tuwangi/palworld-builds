import { useMemo, useState } from "preact/hooks";
import { useFavorites } from "./useFavorites";
import { FavoriteButton } from "./FavoriteButton";
import { ELEMENT_BADGE_CLASS, elementBadgeStyle } from "../lib/elementColors";
import { MagnifyingGlassIcon, XMarkIcon } from "./icons";

type Option = { value: string; label: string };

type PalAvatar = { id: string; name: string; iconUrl: string | null };

type BuildSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  purpose: string[];
  elements: string[];
  progression: string;
  requirements: string[];
  hasEquipment: boolean;
  hasRequiredEquipment: boolean;
  pals: PalAvatar[];
};

function PalAvatarChip({ pal }: { pal: PalAvatar }) {
  if (pal.iconUrl) {
    return (
      <img
        src={pal.iconUrl}
        alt=""
        title={pal.name}
        class="size-6 shrink-0 rounded-full bg-white/5 object-cover outline-1 -outline-offset-1 outline-white/10"
      />
    );
  }
  return (
    <span
      title={pal.name}
      aria-hidden="true"
      class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/5 font-display text-[10px] text-zinc-500 outline-1 -outline-offset-1 outline-white/10"
    >
      {pal.name.charAt(0)}
    </span>
  );
}

type Strings = {
  searchLabel: string;
  searchPlaceholder: string;
  filterLegendPurpose: string;
  filterLegendElement: string;
  filterLegendProgression: string;
  filterLegendRequirement: string;
  favoritesOnly: string;
  clearFilters: string;
  resultsCountTemplate: string;
  emptyState: string;
  requiredEquipmentBadge: string;
  saveFavorite: string;
  removeFavorite: string;
};

type Props = {
  builds: BuildSummary[];
  purposeOptions: Option[];
  elementOptions: Option[];
  progressionOptions: Option[];
  requirementOptions: Option[];
  buildHrefTemplate: string;
  strings: Strings;
};

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function neutralChipClass(selected: boolean): string {
  return selected
    ? "rounded-full border border-brand-500/60 bg-brand-500/15 py-1 px-2.5 text-xs font-medium text-brand-300"
    : "rounded-full border border-white/10 bg-white/5 py-1 px-2.5 text-xs font-medium text-zinc-300";
}

function FilterGroup({
  legend,
  options,
  selected,
  onToggle,
  isElement = false,
}: {
  legend: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  isElement?: boolean;
}) {
  return (
    <fieldset>
      <legend class="text-xs font-medium text-zinc-500">{legend}</legend>
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.has(opt.value);
          if (isElement) {
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(opt.value)}
                class={`${ELEMENT_BADGE_CLASS} ${isSelected ? "ring-2 ring-offset-2 ring-offset-zinc-950 ring-(--el-text)" : ""}`}
                style={elementBadgeStyle(opt.value)}
              >
                {opt.label}
              </button>
            );
          }
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(opt.value)}
              class={neutralChipClass(isSelected)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function BuildBrowser({
  builds,
  purposeOptions,
  elementOptions,
  progressionOptions,
  requirementOptions,
  buildHrefTemplate,
  strings,
}: Props) {
  const [search, setSearch] = useState("");
  const [purposes, setPurposes] = useState<Set<string>>(new Set());
  const [elements, setElements] = useState<Set<string>>(new Set());
  const [progressions, setProgressions] = useState<Set<string>>(new Set());
  const [requirements, setRequirements] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favorites, isFavorite, toggle } = useFavorites();

  const activeFilterCount =
    purposes.size + elements.size + progressions.size + requirements.size + (favoritesOnly ? 1 : 0);

  function clearAll() {
    setSearch("");
    setPurposes(new Set());
    setElements(new Set());
    setProgressions(new Set());
    setRequirements(new Set());
    setFavoritesOnly(false);
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return builds.filter((b) => {
      if (favoritesOnly && !favorites.has(b.id)) return false;
      if (purposes.size && !b.purpose.some((p) => purposes.has(p))) return false;
      if (elements.size && !b.elements.some((e) => elements.has(e))) return false;
      if (progressions.size && !progressions.has(b.progression)) return false;
      if (requirements.size && !b.requirements.some((r) => requirements.has(r))) return false;
      if (query) {
        const haystack = `${b.name} ${b.summary} ${b.pals.map((p) => p.name).join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [builds, search, purposes, elements, progressions, requirements, favoritesOnly, favorites]);

  const resultsCount = strings.resultsCountTemplate
    .replace("{filtered}", String(filtered.length))
    .replace("{total}", String(builds.length));

  return (
    <div>
      <div class="relative">
        <MagnifyingGlassIcon class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          name="search"
          aria-label={strings.searchLabel}
          placeholder={strings.searchPlaceholder}
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          class="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-10 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500/50 focus:outline-none sm:text-sm"
        />
      </div>

      <div class="mt-4 space-y-3">
        <FilterGroup
          legend={strings.filterLegendPurpose}
          options={purposeOptions}
          selected={purposes}
          onToggle={(v) => setPurposes((s) => toggleInSet(s, v))}
        />
        <FilterGroup
          legend={strings.filterLegendElement}
          options={elementOptions}
          selected={elements}
          onToggle={(v) => setElements((s) => toggleInSet(s, v))}
          isElement
        />
        <FilterGroup
          legend={strings.filterLegendProgression}
          options={progressionOptions}
          selected={progressions}
          onToggle={(v) => setProgressions((s) => toggleInSet(s, v))}
        />
        <FilterGroup
          legend={strings.filterLegendRequirement}
          options={requirementOptions}
          selected={requirements}
          onToggle={(v) => setRequirements((s) => toggleInSet(s, v))}
        />

        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
            class={neutralChipClass(favoritesOnly)}
          >
            {strings.favoritesOnly}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              class="inline-flex items-center gap-x-1 rounded-full py-1 px-2.5 text-xs font-medium text-zinc-400"
            >
              <XMarkIcon class="size-4 shrink-0" />
              {strings.clearFilters}
            </button>
          )}
        </div>
      </div>

      <p class="mt-5 text-sm tabular-nums text-zinc-500">{resultsCount}</p>

      {filtered.length === 0 ? (
        <div class="mt-4 rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <p class="text-base text-zinc-400 sm:text-sm">{strings.emptyState}</p>
        </div>
      ) : (
        <ul role="list" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((build) => (
            <li key={build.id} class="relative rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5">
              <div class="flex items-start justify-between gap-x-3">
                <h3 class="min-w-0 flex-1">
                  <a
                    href={buildHrefTemplate.replace("{slug}", build.slug)}
                    class="font-display text-base font-semibold text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                  >
                    <span class="absolute inset-0" aria-hidden="true" />
                    {build.name}
                  </a>
                </h3>
                <div class="relative z-10 -mt-1 -mr-1">
                  <FavoriteButton
                    isFavorite={isFavorite(build.id)}
                    onToggle={() => toggle(build.id)}
                    labels={{ save: strings.saveFavorite, remove: strings.removeFavorite }}
                  />
                </div>
              </div>

              <p class="mt-1.5 line-clamp-2 text-base text-pretty text-zinc-400 sm:text-sm">{build.summary}</p>

              <div class="mt-3 flex flex-wrap gap-1.5">
                {build.elements.map((el) => (
                  <span key={el} class={ELEMENT_BADGE_CLASS} style={elementBadgeStyle(el)}>
                    {elementOptions.find((o) => o.value === el)?.label ?? el}
                  </span>
                ))}
                {build.hasRequiredEquipment && (
                  <span class="rounded-full border border-white/10 bg-white/5 py-1 px-2.5 text-xs font-medium text-zinc-300">
                    {strings.requiredEquipmentBadge}
                  </span>
                )}
              </div>

              <div class="mt-3 flex items-center gap-1">
                {build.pals.map((pal, i) => (
                  <PalAvatarChip key={`${pal.id}-${i}`} pal={pal} />
                ))}
              </div>
              <p class="mt-1.5 truncate text-xs text-zinc-500">{build.pals.map((p) => p.name).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
