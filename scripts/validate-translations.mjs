import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function loadJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

const NUMBER_RE = /\d+(?:[.,]\d+)?%?/g;

function numberTokens(text) {
  if (!text) return [];
  return (text.match(NUMBER_RE) ?? []).map((t) => t.replace(",", "")).sort();
}

/**
 * Number parity was the only thing this script used to check, and that let a
 * whole class of breakage through: a "translation" that is still English has
 * identical figures and passed clean. Every partner skill description shipped
 * that way.
 *
 * These are function words with no Spanish homograph, so a Spanish sentence
 * containing two or more of them is not Spanish. Pal and item proper nouns
 * (Frostallion, Plasma Rifle, Cotton Candy) deliberately stay English and
 * contain none of these, so they don't trip it.
 */
const ENGLISH_MARKERS =
  /\b(the|and|with|while|when|player|increases|reduces|attacks|damage|enemy|enemies|seconds|stacks|effect|from|your|their|its|into|over|between|this|that|does|not|are|is|by|of|to|for|be|can|will|more|less|than|each|other|drop|dropped|team|party|mount|mounted|ridden|restores|deals|grants|gains|allows|becomes|during|after|before|only|near|around|inside|both|same|assigned|ranch|base)\b/gi;

function englishLeak(text) {
  if (!text) return [];
  const hits = text.match(ENGLISH_MARKERS) ?? [];
  return [...new Set(hits.map((h) => h.toLowerCase()))];
}

function compareField(errors, label, en, es) {
  if (!es) {
    errors.push(`[${label}] missing Spanish translation`);
    return;
  }
  const enNums = numberTokens(en);
  const esNums = numberTokens(es);
  if (JSON.stringify(enNums) !== JSON.stringify(esNums)) {
    errors.push(
      `[${label}] number mismatch — EN has [${enNums.join(", ")}], ES has [${esNums.join(", ")}]\n  EN: ${en}\n  ES: ${es}`,
    );
  }
  const leak = englishLeak(es);
  if (leak.length >= 2) {
    errors.push(`[${label}] Spanish text still reads as English (${leak.join(", ")})\n  ES: ${es}`);
  }
}

async function checkBuilds(errors) {
  const catalog = await loadJson("data/catalog.json");
  const translations = await loadJson("data/catalog.es.json").catch(() => {
    throw new Error("data/catalog.es.json not found. Run the translation step first.");
  });

  for (const build of catalog.builds) {
    const es = translations.builds[build.id];
    if (!es) {
      errors.push(`[${build.id}] missing entry in catalog.es.json`);
      continue;
    }

    compareField(errors, `${build.id}.name`, build.name, es.name);
    compareField(errors, `${build.id}.summary`, build.summary, es.summary);

    if ((es.pals ?? []).length !== build.pals.length) {
      errors.push(`[${build.id}.pals] length mismatch — EN has ${build.pals.length}, ES has ${(es.pals ?? []).length}`);
    } else {
      build.pals.forEach((slot, i) => compareField(errors, `${build.id}.pals[${i}]`, slot.explanation, es.pals[i]));
    }

    if ((es.synergyNotes ?? []).length !== build.synergyNotes.length) {
      errors.push(
        `[${build.id}.synergyNotes] length mismatch — EN has ${build.synergyNotes.length}, ES has ${(es.synergyNotes ?? []).length}`,
      );
    } else {
      build.synergyNotes.forEach((note, i) =>
        compareField(errors, `${build.id}.synergyNotes[${i}]`, note, es.synergyNotes[i]),
      );
    }

    const equipmentWithReason = build.equipment;
    if ((es.equipment ?? []).length !== equipmentWithReason.length) {
      errors.push(
        `[${build.id}.equipment] length mismatch — EN has ${equipmentWithReason.length}, ES has ${(es.equipment ?? []).length}`,
      );
    } else {
      equipmentWithReason.forEach((eq, i) => compareField(errors, `${build.id}.equipment[${i}]`, eq.reason, es.equipment[i]));
    }

    const alternatives = build.alternatives ?? [];
    if ((es.alternatives ?? []).length !== alternatives.length) {
      errors.push(
        `[${build.id}.alternatives] length mismatch — EN has ${alternatives.length}, ES has ${(es.alternatives ?? []).length}`,
      );
    } else {
      alternatives.forEach((alt, i) =>
        compareField(errors, `${build.id}.alternatives[${i}]`, alt.reason, es.alternatives[i]),
      );
    }
  }

  return catalog.builds.length;
}

/**
 * Partner skills are translated as data keyed by the English skill name, so
 * the failure mode is a missing or stale key rather than a bad sentence — a
 * key that no longer matches the snapshot silently falls back to English in
 * the UI. Both directions are checked so a refreshed snapshot can't quietly
 * un-translate the app.
 */
async function checkPartnerSkills(errors) {
  const { pals } = await loadJson("data/snapshot/pals.json");
  const { skills, byPalId } = await loadJson("data/partner-skills.es.json");
  const { effectTypes, targets } = await loadJson("data/partner-skill-scaling.es.json");

  const effectTypesInUse = new Set();
  const targetsInUse = new Set();
  const namesInUse = new Set();
  const withSkill = pals.filter((pal) => pal.partnerSkill);

  // Checked per Pal, not per skill name: five Pal/variant pairs share a name
  // but ship different descriptions, so a name-keyed check would validate one
  // of them against the other's text.
  for (const pal of withSkill) {
    const skill = pal.partnerSkill;
    namesInUse.add(skill.name);
    for (const row of skill.scaling ?? []) {
      effectTypesInUse.add(row.effectType);
      targetsInUse.add(row.target ?? "");
    }

    const es = byPalId[pal.id] ?? skills[skill.name];
    const label = `${pal.id}/${skill.name || "(unnamed skill)"}`;
    if (!es) {
      errors.push(`[partnerSkill:${label}] no Spanish entry in data/partner-skills.es.json`);
      continue;
    }
    compareField(errors, `partnerSkill:${label}.description`, skill.description, es.description);
    // A skill whose English name is empty (wiki.gg gap) legitimately has an
    // empty Spanish name too.
    if (skill.name && !es.name) errors.push(`[partnerSkill:${label}] empty Spanish name`);
  }

  for (const name of Object.keys(skills)) {
    if (!namesInUse.has(name)) {
      errors.push(`[partnerSkill:${name || "(unnamed skill)"}] translated but no longer present in the snapshot`);
    }
  }
  const palIds = new Set(pals.map((pal) => pal.id));
  for (const palId of Object.keys(byPalId)) {
    if (!palIds.has(palId)) {
      errors.push(`[partnerSkill:byPalId:${palId}] override for a Pal that is no longer in the snapshot`);
    }
  }

  for (const value of effectTypesInUse) {
    if (!(value in effectTypes)) {
      errors.push(`[scaling.effectType] no Spanish label for "${value}"`);
    }
  }
  for (const value of targetsInUse) {
    if (!(value in targets)) {
      errors.push(`[scaling.target] no Spanish label for "${value}"`);
    }
  }

  return withSkill.length;
}

async function main() {
  const errors = [];
  const buildCount = await checkBuilds(errors);
  const skillCount = await checkPartnerSkills(errors);

  if (errors.length > 0) {
    console.log(`=== ${errors.length} translation issue(s) ===`);
    for (const e of errors) console.log(`- ${e}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Translations OK: ${buildCount} builds and ${skillCount} partner skills — every field translated, all numeric tokens match EN source.`,
  );
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
