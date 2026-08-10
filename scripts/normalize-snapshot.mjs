/**
 * Re-runs the wikitext cleanup over an already-fetched snapshot, in place.
 *
 * `build-snapshot.mjs` cleans as it writes, but it needs network access to
 * wiki.gg and paldb.gg. When the cleanup rules change, this script applies
 * them to the committed snapshot without a refetch, so the data fix and the
 * source-of-truth fetch stay independently runnable.
 */

import { readFile, writeFile } from "node:fs/promises";
import { cleanWikitext } from "./lib/wikitext.mjs";

const PALS = new URL("../data/snapshot/pals.json", import.meta.url);

function cleanSkill(skill, report) {
  if (!skill) return skill;
  const name = cleanWikitext(skill.name);
  const description = cleanWikitext(skill.description);
  if (name !== skill.name) report.names += 1;
  if (description !== skill.description) report.descriptions += 1;

  const scaling = (skill.scaling ?? []).map((entry) => {
    const effectType = cleanWikitext(entry.effectType);
    const effectValue = cleanWikitext(entry.effectValue);
    const target = cleanWikitext(entry.target);
    if (effectType !== entry.effectType) report.effectTypes += 1;
    if (target !== entry.target) report.targets += 1;
    return { ...entry, effectType, effectValue, target };
  });

  return {
    ...skill,
    name,
    description,
    ...(skill.workType ? { workType: cleanWikitext(skill.workType) } : {}),
    ...(scaling.length > 0 ? { scaling } : {}),
  };
}

async function main() {
  const raw = JSON.parse(await readFile(PALS, "utf8"));
  const report = { names: 0, descriptions: 0, effectTypes: 0, targets: 0 };

  const pals = raw.pals.map((pal) => ({
    ...pal,
    partnerSkill: cleanSkill(pal.partnerSkill, report),
  }));

  await writeFile(PALS, JSON.stringify({ pals }, null, 2) + "\n");
  console.log(
    `Normalized snapshot: ${report.descriptions} description(s), ${report.names} skill name(s), ` +
      `${report.effectTypes} scaling effectType(s), ${report.targets} scaling target(s) rewritten.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
