import schema from "../../schemas/team-build.schema.json";

export type Locale = "es" | "en";

type Def = { enum?: string[] };

function enumFrom(defName: string): string[] {
  const def = (schema.$defs as Record<string, Def>)[defName];
  const values = def?.enum;
  if (!values) throw new Error(`Schema $defs.${defName} has no enum — taxonomy source changed`);
  return values;
}

function labelMap(values: string[], labels: Record<string, string>, localeName: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const value of values) {
    const label = labels[value];
    if (!label) throw new Error(`Missing ${localeName} label for taxonomy value "${value}"`);
    map.set(value, label);
  }
  return map;
}

const PURPOSE_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    pal_element_damage: "Daño elemental de Pals",
    player_weapon_damage: "Daño de arma del jugador",
    player_support: "Soporte al jugador",
    active_pal_support: "Soporte al Pal activo",
    hybrid_damage: "Daño híbrido",
    boss_damage: "Daño a jefes",
    capture: "Captura",
    survival: "Supervivencia",
    status_effects: "Efectos de estado",
    exploration: "Exploración",
    mobility: "Movilidad",
    early_progression: "Progresión temprana",
    endgame: "Objetivo endgame",
    utility: "Utilidad",
  },
  en: {
    pal_element_damage: "Pal element damage",
    player_weapon_damage: "Player weapon damage",
    player_support: "Player support",
    active_pal_support: "Active Pal support",
    hybrid_damage: "Hybrid damage",
    boss_damage: "Boss damage",
    capture: "Capture",
    survival: "Survival",
    status_effects: "Status effects",
    exploration: "Exploration",
    mobility: "Mobility",
    early_progression: "Early progression",
    endgame: "Endgame focus",
    utility: "Utility",
  },
};

const ROLE_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    carry: "Carry",
    element_booster: "Potenciador de elemento",
    trainer_damage_support: "Soporte de daño del jugador",
    active_pal_booster: "Potenciador del Pal activo",
    mount: "Montura",
    element_conversion: "Conversión elemental",
    weak_point_support: "Soporte de punto débil",
    status_applier: "Aplicador de estado",
    defensive_support: "Soporte defensivo",
    healing: "Curación",
    mobility: "Movilidad",
    utility: "Utilidad",
    flex: "Flex",
  },
  en: {
    carry: "Carry",
    element_booster: "Element booster",
    trainer_damage_support: "Trainer damage support",
    active_pal_booster: "Active Pal booster",
    mount: "Mount",
    element_conversion: "Element conversion",
    weak_point_support: "Weak-point support",
    status_applier: "Status applier",
    defensive_support: "Defensive support",
    healing: "Healing",
    mobility: "Mobility",
    utility: "Utility",
    flex: "Flex",
  },
};

const REQUIREMENT_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    early_game: "Juego temprano",
    mid_game: "Juego medio",
    endgame: "Contenido endgame",
    legendary: "Legendario",
    breeding: "Cría",
    condensation: "Condensación",
    specific_weapon: "Arma específica",
    specific_mount: "Montura específica",
    rare_content: "Contenido raro",
  },
  en: {
    early_game: "Early game",
    mid_game: "Mid game",
    endgame: "Endgame content",
    legendary: "Legendary",
    breeding: "Breeding",
    condensation: "Condensation",
    specific_weapon: "Specific weapon",
    specific_mount: "Specific mount",
    rare_content: "Rare content",
  },
};

const ELEMENT_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    neutral: "Neutral",
    fire: "Fuego",
    water: "Agua",
    grass: "Planta",
    electric: "Eléctrico",
    ice: "Hielo",
    ground: "Tierra",
    dark: "Oscuro",
    dragon: "Dragón",
  },
  en: {
    neutral: "Neutral",
    fire: "Fire",
    water: "Water",
    grass: "Grass",
    electric: "Electric",
    ice: "Ice",
    ground: "Ground",
    dark: "Dark",
    dragon: "Dragon",
  },
};

const PROGRESSION_LABELS: Record<Locale, Record<string, string>> = {
  es: { early: "Temprana", mid: "Media", endgame: "Endgame", mixed: "Mixta" },
  en: { early: "Early", mid: "Mid", endgame: "Endgame", mixed: "Mixed" },
};

const VERIFICATION_LABELS: Record<Locale, Record<string, string>> = {
  es: { unverified: "Sin verificar", reviewed: "Revisada", cross_checked: "Verificación cruzada" },
  en: { unverified: "Unverified", reviewed: "Reviewed", cross_checked: "Cross-checked" },
};

const EQUIPMENT_KIND_LABELS: Record<Locale, Record<string, string>> = {
  es: { weapon: "Arma", armor: "Armadura", accessory: "Accesorio", shield: "Escudo", glider: "Planeador" },
  en: { weapon: "Weapon", armor: "Armor", accessory: "Accessory", shield: "Shield", glider: "Glider" },
};

const EQUIPMENT_STATUS_LABELS: Record<Locale, Record<string, string>> = {
  es: { recommended: "Recomendado", required: "Obligatorio" },
  en: { recommended: "Recommended", required: "Required" },
};

export const PURPOSE_VALUES = enumFrom("purpose");
export const ROLE_VALUES = enumFrom("role");
export const REQUIREMENT_VALUES = enumFrom("requirement");
export const ELEMENT_VALUES = enumFrom("element");
export const PROGRESSION_VALUES = ["early", "mid", "endgame", "mixed"];
export const VERIFICATION_VALUES = ["unverified", "reviewed", "cross_checked"];
export const EQUIPMENT_KIND_VALUES = ["weapon", "armor", "accessory", "shield", "glider"];
export const EQUIPMENT_STATUS_VALUES = ["recommended", "required"];

export function taxonomyLabels(locale: Locale) {
  const name = locale === "es" ? "Spanish" : "English";
  return {
    purpose: labelMap(PURPOSE_VALUES, PURPOSE_LABELS[locale], name),
    role: labelMap(ROLE_VALUES, ROLE_LABELS[locale], name),
    requirement: labelMap(REQUIREMENT_VALUES, REQUIREMENT_LABELS[locale], name),
    element: labelMap(ELEMENT_VALUES, ELEMENT_LABELS[locale], name),
    progression: labelMap(PROGRESSION_VALUES, PROGRESSION_LABELS[locale], name),
    verification: labelMap(VERIFICATION_VALUES, VERIFICATION_LABELS[locale], name),
    equipmentKind: labelMap(EQUIPMENT_KIND_VALUES, EQUIPMENT_KIND_LABELS[locale], name),
    equipmentStatus: labelMap(EQUIPMENT_STATUS_VALUES, EQUIPMENT_STATUS_LABELS[locale], name),
  };
}
