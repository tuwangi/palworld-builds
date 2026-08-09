import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = new URL("../", import.meta.url);

async function loadJson(relativePath) {
  const text = await readFile(new URL(relativePath, ROOT), "utf8");
  return JSON.parse(text);
}

function fail(errors, message) {
  errors.push(message);
}

async function main() {
  const errors = [];
  const warnings = [];

  const [schema, catalog, palsSnapshot, itemsSnapshot, snapshotMeta] = await Promise.all([
    loadJson("schemas/team-build.schema.json"),
    loadJson("data/catalog.json"),
    loadJson("data/snapshot/pals.json").catch(() => {
      throw new Error(
        "data/snapshot/pals.json not found. Run `npm run snapshot:build` before validating.",
      );
    }),
    loadJson("data/snapshot/items.json").catch(() => {
      throw new Error(
        "data/snapshot/items.json not found. Run `npm run snapshot:build` before validating.",
      );
    }),
    loadJson("data/snapshot/meta.json").catch(() => null),
  ]);

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(schema);

  const schemaValid = validateSchema(catalog);
  if (!schemaValid) {
    for (const err of validateSchema.errors) {
      fail(errors, `[schema] ${err.instancePath || "(root)"} ${err.message}`);
    }
  }

  const validPalIds = new Set(palsSnapshot.pals.map((p) => p.id));
  const itemsById = new Map(itemsSnapshot.items.map((i) => [i.id, i]));

  const seenIds = new Set();
  const seenSlugs = new Set();

  const coverage = {
    totalBuilds: catalog.builds.length,
    byPurpose: {},
    buildsWithoutEquipment: 0,
    buildsWithRequiredEquipment: 0,
    byGameVersion: {},
  };

  for (const build of catalog.builds) {
    const label = build.id ?? build.slug ?? "(unidentified build)";

    if (build.id) {
      if (seenIds.has(build.id)) fail(errors, `[dup] duplicate build id "${build.id}"`);
      seenIds.add(build.id);
    }
    if (build.slug) {
      if (seenSlugs.has(build.slug)) fail(errors, `[dup] duplicate build slug "${build.slug}"`);
      seenSlugs.add(build.slug);
    }

    if (Array.isArray(build.pals)) {
      if (build.pals.length !== 5) {
        fail(errors, `[${label}] must have exactly 5 pal slots, found ${build.pals.length}`);
      }
      for (const [index, slot] of build.pals.entries()) {
        if (slot?.palId && !validPalIds.has(slot.palId)) {
          fail(errors, `[${label}] pals[${index}].palId "${slot.palId}" not found in snapshot`);
        }
      }
    }

    if (Array.isArray(build.equipment)) {
      if (build.equipment.length === 0) {
        coverage.buildsWithoutEquipment += 1;
      }
      for (const [index, item] of build.equipment.entries()) {
        if (!item?.itemId) continue;
        const snapshotItem = itemsById.get(item.itemId);
        if (!snapshotItem) {
          fail(errors, `[${label}] equipment[${index}].itemId "${item.itemId}" not found in snapshot`);
        } else if (snapshotItem.kind === null) {
          fail(
            errors,
            `[${label}] equipment[${index}].itemId "${item.itemId}" exists but is not equipment (itemType "${snapshotItem.itemType}")`,
          );
        }
        if (item.status === "required") coverage.buildsWithRequiredEquipment += 1;
        for (const altId of item.alternatives ?? []) {
          if (!itemsById.has(altId)) {
            fail(errors, `[${label}] equipment[${index}].alternatives contains unknown itemId "${altId}"`);
          }
        }
      }
    }

    if (Array.isArray(build.alternatives)) {
      for (const [index, alt] of build.alternatives.entries()) {
        if (alt?.palId && !validPalIds.has(alt.palId)) {
          fail(errors, `[${label}] alternatives[${index}].palId "${alt.palId}" not found in snapshot`);
        }
        if (alt?.replacesPalId && !validPalIds.has(alt.replacesPalId)) {
          fail(errors, `[${label}] alternatives[${index}].replacesPalId "${alt.replacesPalId}" not found in snapshot`);
        }
      }
    }

    if (build.gameVersion && catalog.gameVersion && build.gameVersion !== catalog.gameVersion) {
      warnings.push(
        `[${label}] gameVersion "${build.gameVersion}" differs from catalog gameVersion "${catalog.gameVersion}"`,
      );
    }

    if (!build.source?.url) {
      fail(errors, `[${label}] source.url is missing or empty`);
    }

    for (const purpose of build.purpose ?? []) {
      coverage.byPurpose[purpose] = (coverage.byPurpose[purpose] ?? 0) + 1;
    }
    if (build.gameVersion) {
      coverage.byGameVersion[build.gameVersion] = (coverage.byGameVersion[build.gameVersion] ?? 0) + 1;
    }
  }

  if (snapshotMeta && catalog.gameVersion !== snapshotMeta.gameVersion) {
    warnings.push(
      `catalog gameVersion "${catalog.gameVersion}" differs from snapshot gameVersion "${snapshotMeta.gameVersion}"`,
    );
  }

  console.log("=== Coverage report ===");
  console.log(JSON.stringify(coverage, null, 2));

  if (warnings.length > 0) {
    console.log("\n=== Warnings ===");
    for (const w of warnings) console.log(`- ${w}`);
  }

  if (errors.length > 0) {
    console.log(`\n=== ${errors.length} validation error(s) ===`);
    for (const e of errors) console.log(`- ${e}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nCatalog is valid.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
