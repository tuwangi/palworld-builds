import catalogJson from "../../data/catalog.json";
import catalogEsJson from "../../data/catalog.es.json";
import palsJson from "../../data/snapshot/pals.json";
import itemsJson from "../../data/snapshot/items.json";
import iconsManifestJson from "../../data/snapshot/icons-manifest.json";
import type { Locale } from "./taxonomy";
import { localizePartnerSkill, type LocalizedPartnerSkill } from "./partnerSkillLocalization";

export type SnapshotPartnerSkill = {
  name: string;
  description: string;
  workType?: string;
  scaling?: { level: number; effectType: string; effectValue: string; target?: string }[];
};
type SnapshotPal = { id: string; name: string; elements: string[]; partnerSkill: SnapshotPartnerSkill | null };
type SnapshotItem = { id: string; name: string; kind: string | null };

type EquipmentEntry = {
  itemId: string;
  kind: string;
  status: "recommended" | "required";
  reason?: string;
  alternatives?: string[];
};

type PalSlot = {
  palId: string;
  role: string[];
  explanation: string;
  recommendedSkills?: string[];
  recommendedPassives?: string[];
  specialNote?: string;
};

type Alternative = { palId: string; replacesPalId: string; reason: string };

type RawBuild = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  purpose: string[];
  elements: string[];
  progression: string;
  pals: PalSlot[];
  equipment: EquipmentEntry[];
  requirements: string[];
  synergyNotes: string[];
  alternatives?: Alternative[];
  gameVersion: string;
  source: { url: string; title?: string; capturedAt: string };
  verification: string;
};

type EsTranslation = {
  name?: string;
  summary: string;
  pals: string[];
  synergyNotes: string[];
  equipment: string[];
  alternatives: string[];
};

const catalog = catalogJson as { schemaVersion: string; gameVersion: string; builds: RawBuild[] };
const esTranslations = (catalogEsJson as { builds: Record<string, EsTranslation> }).builds;
const pals = (palsJson as { pals: SnapshotPal[] }).pals;
const items = (itemsJson as { items: SnapshotItem[] }).items;

const palIndex = new Map(pals.map((p) => [p.id, p]));
const itemIndex = new Map(items.map((i) => [i.id, i]));

function resolvePal(palId: string): SnapshotPal {
  const pal = palIndex.get(palId);
  if (!pal) throw new Error(`Build references unknown palId "${palId}"`);
  return pal;
}

function resolveItem(itemId: string): SnapshotItem {
  const item = itemIndex.get(itemId);
  if (!item) throw new Error(`Build references unknown itemId "${itemId}"`);
  return item;
}

function esFor(buildId: string): EsTranslation | undefined {
  return esTranslations[buildId];
}

/**
 * Icons are self-hosted (fetched once via scripts/fetch-icons.mjs) rather
 * than hotlinked from paldb.gg. Which ids have one is read from a
 * pre-generated manifest, not checked against the filesystem at
 * build/runtime — `existsSync` relative to a source file's `import.meta.url`
 * works in `astro dev` (unbundled) but breaks once Vite bundles this module
 * into dist/, since the bundled chunk no longer lives next to public/icons/.
 * A plain JSON import has no such path dependency, so both the static
 * detail pages and the client-side listing island agree on whether an icon
 * exists regardless of how the module got bundled.
 */
const iconManifest = iconsManifestJson as { pals: string[]; items: string[] };
const palIconIds = new Set(iconManifest.pals);
const itemIconIds = new Set(iconManifest.items);

function palIconUrl(palId: string): string | null {
  return palIconIds.has(palId) ? `/icons/pals/${palId}.webp` : null;
}

function itemIconUrl(itemId: string): string | null {
  return itemIconIds.has(itemId) ? `/icons/items/${itemId}.webp` : null;
}

export type PalAvatar = { id: string; name: string; iconUrl: string | null };

export type BuildSummary = {
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

export type ResolvedPalSlot = {
  palId: string;
  name: string;
  elements: string[];
  role: string[];
  explanation: string;
  iconUrl: string | null;
  partnerSkill: LocalizedPartnerSkill | null;
  recommendedSkills: string[];
  recommendedPassives: string[];
  specialNote?: string;
};

export type ResolvedEquipment = {
  itemId: string;
  name: string;
  kind: string;
  status: "recommended" | "required";
  reason?: string;
  iconUrl: string | null;
  alternatives: { itemId: string; name: string }[];
};

export type ResolvedAlternative = {
  palId: string;
  palName: string;
  palIconUrl: string | null;
  palElements: string[];
  palPartnerSkill: LocalizedPartnerSkill | null;
  replacesPalId: string;
  replacesPalName: string;
  reason: string;
};

export type BuildDetail = Omit<BuildSummary, "pals"> & {
  pals: ResolvedPalSlot[];
  equipment: ResolvedEquipment[];
  synergyNotes: string[];
  alternatives: ResolvedAlternative[];
  gameVersion: string;
  source: { url: string; title?: string; capturedAt: string };
  verification: string;
};

function toSummary(build: RawBuild, locale: Locale): BuildSummary {
  const es = locale === "es" ? esFor(build.id) : undefined;
  return {
    id: build.id,
    slug: build.slug,
    name: es?.name ?? build.name,
    summary: es?.summary ?? build.summary,
    purpose: build.purpose,
    elements: build.elements,
    progression: build.progression,
    requirements: build.requirements,
    hasEquipment: build.equipment.length > 0,
    hasRequiredEquipment: build.equipment.some((e) => e.status === "required"),
    pals: build.pals.map((slot) => {
      const pal = resolvePal(slot.palId);
      return { id: pal.id, name: pal.name, iconUrl: palIconUrl(pal.id) };
    }),
  };
}

function toDetail(build: RawBuild, locale: Locale): BuildDetail {
  const es = locale === "es" ? esFor(build.id) : undefined;
  return {
    ...toSummary(build, locale),
    pals: build.pals.map((slot, i) => {
      const pal = resolvePal(slot.palId);
      return {
        palId: slot.palId,
        name: pal.name,
        elements: pal.elements,
        role: slot.role,
        explanation: es?.pals[i] ?? slot.explanation,
        iconUrl: palIconUrl(pal.id),
        partnerSkill: pal.partnerSkill ? localizePartnerSkill(pal.partnerSkill, pal.id, locale) : null,
        recommendedSkills: slot.recommendedSkills ?? [],
        recommendedPassives: slot.recommendedPassives ?? [],
        specialNote: slot.specialNote,
      };
    }),
    equipment: build.equipment.map((eq, i) => {
      const item = resolveItem(eq.itemId);
      return {
        itemId: eq.itemId,
        name: item.name,
        kind: eq.kind,
        status: eq.status,
        reason: es?.equipment[i] ?? eq.reason,
        iconUrl: itemIconUrl(item.id),
        alternatives: (eq.alternatives ?? []).map((altId) => ({ itemId: altId, name: resolveItem(altId).name })),
      };
    }),
    synergyNotes: build.synergyNotes.map((note, i) => es?.synergyNotes[i] ?? note),
    alternatives: (build.alternatives ?? []).map((alt, i) => ({
      palId: alt.palId,
      palName: resolvePal(alt.palId).name,
      palIconUrl: palIconUrl(alt.palId),
      palElements: resolvePal(alt.palId).elements,
      palPartnerSkill: (() => {
        const skill = resolvePal(alt.palId).partnerSkill;
        return skill ? localizePartnerSkill(skill, alt.palId, locale) : null;
      })(),
      replacesPalId: alt.replacesPalId,
      replacesPalName: resolvePal(alt.replacesPalId).name,
      reason: es?.alternatives[i] ?? alt.reason,
    })),
    gameVersion: build.gameVersion,
    source: build.source,
    verification: build.verification,
  };
}

export function getBuildSummaries(locale: Locale): BuildSummary[] {
  return catalog.builds.map((b) => toSummary(b, locale));
}

export function getBuildDetails(locale: Locale): BuildDetail[] {
  return catalog.builds.map((b) => toDetail(b, locale));
}

export function getBuildBySlug(slug: string, locale: Locale): BuildDetail | undefined {
  const build = catalog.builds.find((b) => b.slug === slug);
  return build ? toDetail(build, locale) : undefined;
}

export const catalogMeta = { schemaVersion: catalog.schemaVersion, gameVersion: catalog.gameVersion };
