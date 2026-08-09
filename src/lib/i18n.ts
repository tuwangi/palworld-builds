import type { Locale } from "./taxonomy";

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";

type Strings = {
  htmlLang: string;
  dateLocale: string;
  pageTitle: string;
  tagline: string;
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
  backToList: string;
  sectionTeam: string;
  sectionEquipment: string;
  sectionSynergy: string;
  sectionAlternatives: string;
  alternativesPrefix: string;
  replaces: string;
  gameVersionLabel: string;
  verificationLabel: string;
  sourceLabel: string;
  localeSwitchTo: string;
  localeSwitchHref: string;
  profileHint: string;
  profilePlaceholder: string;
  profileJoinButton: string;
  profileActiveTemplate: string;
  profileLeaveButton: string;
  profileErrorInvalid: string;
  profileErrorUnavailable: string;
  profileViewTitleTemplate: string;
  profileAdoptButton: string;
  profileAdoptedNotice: string;
  profileEmptyState: string;
  profileShareHint: string;
};

const STRINGS: Record<Locale, Strings> = {
  es: {
    htmlLang: "es",
    dateLocale: "es",
    pageTitle: "Palworld Builds — encuentra tu equipo de cinco Pals",
    tagline:
      "Equipos de cinco Pals organizados por objetivo, elemento y progresión. Companion personal — no es una plataforma oficial de Pocketpair.",
    searchLabel: "Buscar por nombre de build o Pal",
    searchPlaceholder: "Buscar por nombre de build o Pal…",
    filterLegendPurpose: "Objetivo",
    filterLegendElement: "Elemento",
    filterLegendProgression: "Progresión",
    filterLegendRequirement: "Requisitos",
    favoritesOnly: "Solo favoritos",
    clearFilters: "Limpiar filtros",
    resultsCountTemplate: "{filtered} de {total} builds",
    emptyState: "Ninguna build coincide con estos filtros.",
    requiredEquipmentBadge: "Arma obligatoria",
    saveFavorite: "Guardar en favoritos",
    removeFavorite: "Quitar de favoritos",
    backToList: "Todas las builds",
    sectionTeam: "El equipo",
    sectionEquipment: "Equipamiento",
    sectionSynergy: "Sinergia",
    sectionAlternatives: "Alternativas",
    alternativesPrefix: "Alternativas:",
    replaces: "reemplaza a",
    gameVersionLabel: "Versión del juego",
    verificationLabel: "Verificación",
    sourceLabel: "Fuente",
    localeSwitchTo: "English",
    localeSwitchHref: "/en/",
    profileHint: "Comparte tus favoritos con un ID público, sin cuenta ni contraseña.",
    profilePlaceholder: "ID de perfil, ej. dani123",
    profileJoinButton: "Usar este ID",
    profileActiveTemplate: "Perfil: {id}",
    profileLeaveButton: "Salir",
    profileErrorInvalid: "Ese ID no es válido. Usa letras, números y guiones (3 a 32 caracteres).",
    profileErrorUnavailable: "No se pudo conectar con el perfil. Tus favoritos siguen guardados en este dispositivo.",
    profileViewTitleTemplate: "Colección de {id}",
    profileAdoptButton: "Usar este perfil en este dispositivo",
    profileAdoptedNotice: "Perfil activado en este dispositivo.",
    profileEmptyState: "Este perfil todavía no tiene builds favoritas.",
    profileShareHint: "Comparte este enlace para que alguien más vea esta colección.",
  },
  en: {
    htmlLang: "en",
    dateLocale: "en",
    pageTitle: "Palworld Builds — find your five-Pal team",
    tagline:
      "Five-Pal teams organized by purpose, element and progression. Personal companion app — not an official Pocketpair product.",
    searchLabel: "Search by build name or Pal",
    searchPlaceholder: "Search by build name or Pal…",
    filterLegendPurpose: "Purpose",
    filterLegendElement: "Element",
    filterLegendProgression: "Progression",
    filterLegendRequirement: "Requirements",
    favoritesOnly: "Favorites only",
    clearFilters: "Clear filters",
    resultsCountTemplate: "{filtered} of {total} builds",
    emptyState: "No build matches these filters.",
    requiredEquipmentBadge: "Required weapon",
    saveFavorite: "Save to favorites",
    removeFavorite: "Remove from favorites",
    backToList: "All builds",
    sectionTeam: "The team",
    sectionEquipment: "Equipment",
    sectionSynergy: "Synergy",
    sectionAlternatives: "Alternatives",
    alternativesPrefix: "Alternatives:",
    replaces: "replaces",
    gameVersionLabel: "Game version",
    verificationLabel: "Verification",
    sourceLabel: "Source",
    localeSwitchTo: "Español",
    localeSwitchHref: "/",
    profileHint: "Share your favorites with a public ID — no account, no password.",
    profilePlaceholder: "Profile ID, e.g. dani123",
    profileJoinButton: "Use this ID",
    profileActiveTemplate: "Profile: {id}",
    profileLeaveButton: "Leave",
    profileErrorInvalid: "That ID isn't valid. Use letters, numbers and hyphens (3 to 32 characters).",
    profileErrorUnavailable: "Couldn't reach the profile backend. Your favorites are still saved on this device.",
    profileViewTitleTemplate: "{id}'s collection",
    profileAdoptButton: "Use this profile on this device",
    profileAdoptedNotice: "Profile activated on this device.",
    profileEmptyState: "This profile has no favorite builds yet.",
    profileShareHint: "Share this link so someone else can see this collection.",
  },
};

export function t(locale: Locale): Strings {
  return STRINGS[locale];
}

export function buildPath(locale: Locale, slug?: string): string {
  const suffix = slug ? `builds/${slug}/` : "";
  return locale === DEFAULT_LOCALE ? `/${suffix}` : `/en/${suffix}`;
}

export function profilePath(locale: Locale, id: string): string {
  return locale === DEFAULT_LOCALE ? `/profile/${id}/` : `/en/profile/${id}/`;
}
