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
}

async function main() {
  const errors = [];
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

  if (errors.length > 0) {
    console.log(`=== ${errors.length} translation issue(s) ===`);
    for (const e of errors) console.log(`- ${e}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Translations OK: ${catalog.builds.length} builds, all numeric tokens match EN source.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
