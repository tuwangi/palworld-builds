import { useMemo, useState } from "preact/hooks";
import { useFavorites } from "./useFavorites";
import { FavoriteButton } from "./FavoriteButton";
import { ELEMENT_BADGE_CLASS, elementBadgeStyle } from "../lib/elementColors";
import { AdjustmentsHorizontalIcon, HeartIcon, MagnifyingGlassIcon, XMarkIcon } from "./icons";

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
  filtersLabel: string;
  catalogEyebrow: string;
  catalogHeading: string;
  noMatchesHeading: string;
  emptyStateHint: string;
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
    <fieldset class="filter-group">
      <legend>{legend}</legend>
      <div class="filter-options">
        {options.map((option) => {
          const selectedNow = selected.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selectedNow}
              onClick={() => onToggle(option.value)}
              class={`${isElement ? ELEMENT_BADGE_CLASS : "filter-chip"} ${selectedNow ? "selected" : ""}`}
              style={isElement ? elementBadgeStyle(option.value) : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PalStack({ pals }: { pals: PalAvatar[] }) {
  return (
    <div class="pal-stack" aria-label={pals.map((pal) => pal.name).join(", ")}>
      {pals.map((pal, index) =>
        pal.iconUrl ? (
          <img key={`${pal.id}-${index}`} src={pal.iconUrl} alt="" title={pal.name} />
        ) : (
          <span key={`${pal.id}-${index}`} title={pal.name} aria-hidden="true">{pal.name.charAt(0)}</span>
        ),
      )}
    </div>
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { favorites, isFavorite, toggle } = useFavorites();

  const activeFilterCount = purposes.size + elements.size + progressions.size + requirements.size + (favoritesOnly ? 1 : 0);

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
    return builds.filter((build) => {
      if (favoritesOnly && !favorites.has(build.id)) return false;
      if (purposes.size && !build.purpose.some((value) => purposes.has(value))) return false;
      if (elements.size && !build.elements.some((value) => elements.has(value))) return false;
      if (progressions.size && !progressions.has(build.progression)) return false;
      if (requirements.size && !build.requirements.some((value) => requirements.has(value))) return false;
      if (query) {
        const haystack = `${build.name} ${build.summary} ${build.pals.map((pal) => pal.name).join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [builds, search, purposes, elements, progressions, requirements, favoritesOnly, favorites]);

  const resultsCount = strings.resultsCountTemplate
    .replace("{filtered}", String(filtered.length))
    .replace("{total}", String(builds.length));

  return (
    <section aria-labelledby="catalog-title">
      <div class="catalog-toolbar">
        <div class="toolbar-row">
          <label class="search-shell">
            <span class="sr-only">{strings.searchLabel}</span>
            <MagnifyingGlassIcon />
            <input
              type="search"
              name="search"
              aria-label={strings.searchLabel}
              placeholder={strings.searchPlaceholder}
              value={search}
              onInput={(event) => setSearch((event.currentTarget as HTMLInputElement).value)}
            />
          </label>
          <div class="toolbar-actions">
            <button
              type="button"
              class={`toolbar-button ${filtersOpen ? "active" : ""}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((value) => !value)}
            >
              <AdjustmentsHorizontalIcon class="size-4" />
              <span>{strings.filtersLabel}</span>
              {activeFilterCount > 0 && <span class="grid size-5 place-items-center rounded-full bg-white/20 text-[10px]">{activeFilterCount}</span>}
            </button>
            <button
              type="button"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((value) => !value)}
              class={`toolbar-button ${favoritesOnly ? "active" : ""}`}
            >
              <HeartIcon class="size-4" />
              <span class="hidden sm:inline">{strings.favoritesOnly}</span>
            </button>
          </div>
        </div>
        {filtersOpen && (
          <div class="filter-panel">
            <div class="filter-groups">
              <FilterGroup legend={strings.filterLegendPurpose} options={purposeOptions} selected={purposes} onToggle={(value) => setPurposes((set) => toggleInSet(set, value))} />
              <FilterGroup legend={strings.filterLegendElement} options={elementOptions} selected={elements} onToggle={(value) => setElements((set) => toggleInSet(set, value))} isElement />
              <FilterGroup legend={strings.filterLegendProgression} options={progressionOptions} selected={progressions} onToggle={(value) => setProgressions((set) => toggleInSet(set, value))} />
              <FilterGroup legend={strings.filterLegendRequirement} options={requirementOptions} selected={requirements} onToggle={(value) => setRequirements((set) => toggleInSet(set, value))} />
            </div>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearAll} class="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--coral-dark)]">
                <XMarkIcon class="size-4" /> {strings.clearFilters}
              </button>
            )}
          </div>
        )}
      </div>

      <div class="results-bar">
        <div>
          <p class="eyebrow">{strings.catalogEyebrow}</p>
          <h2 id="catalog-title" class="results-heading">{strings.catalogHeading}</h2>
        </div>
        <p class="results-count">{resultsCount}</p>
      </div>

      {filtered.length === 0 ? (
        <div class="empty-state">
          <strong>{strings.noMatchesHeading}</strong>
          <p>{strings.emptyState} {strings.emptyStateHint}</p>
          <button type="button" onClick={clearAll} class="toolbar-button mt-5">{strings.clearFilters}</button>
        </div>
      ) : (
        <ul role="list" class="build-grid">
          {filtered.map((build, index) => (
            <li key={build.id} class="build-card">
              <div class="build-card-top">
                <div>
                  <span class="build-card-index">{String(index + 1).padStart(2, "0")} / BUILD</span>
                  <h3><a href={buildHrefTemplate.replace("{slug}", build.slug)}>{build.name}</a></h3>
                </div>
                <div class="relative z-[1]">
                  <FavoriteButton isFavorite={isFavorite(build.id)} onToggle={() => toggle(build.id)} labels={{ save: strings.saveFavorite, remove: strings.removeFavorite }} />
                </div>
              </div>
              <p class="build-card-summary">{build.summary}</p>
              <div class="build-card-meta">
                {build.elements.map((element) => <span key={element} class={ELEMENT_BADGE_CLASS} style={elementBadgeStyle(element)}>{elementOptions.find((option) => option.value === element)?.label ?? element}</span>)}
                {build.hasRequiredEquipment && <span class="filter-chip">{strings.requiredEquipmentBadge}</span>}
              </div>
              <div class="build-card-team">
                <PalStack pals={build.pals} />
                <span class="build-card-arrow" aria-hidden="true">↗</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
