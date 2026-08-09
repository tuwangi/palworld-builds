# Snapshot factual: fuentes y contrato

Resultado de la Fase 0.1a (discovery). Verificado en vivo el 2026-08-09.

Este documento es autocontenido: describe como construir `data/snapshot/pals.json`
y `data/snapshot/items.json` sin necesidad de repetir la exploracion.

## Resumen de decisiones

- Fuente primaria del snapshot: **wiki.gg Cargo API** (JSON, sin auth, sin clave).
- Fuente de cobertura y parches: **paldb.gg** (sin API; requiere scraping HTML).
- Elementos de cada Pal: tabla **`PalElement`**, no `Pal` ni `PalStat`.
- Categoria de objeto (`kind`): tabla **`Item`** (`itemType` + `subtype`), no `ItemEquipment`.
- Las builds **no** se obtienen por API: la API publica de palmods.gg es de mods.

## 1. wiki.gg Cargo API

Endpoint base:

```text
https://palworld.wiki.gg/api.php?action=cargoquery&format=json
```

Verificado: responde JSON valido sin autenticacion. Parametros usados:

| Parametro | Uso |
| --- | --- |
| `tables` | nombre de la tabla Cargo |
| `fields` | lista de campos separados por coma; `_pageName` disponible siempre |
| `where` | SQL parcial; `IN (...)` y `LIKE` funcionan |
| `group_by` | funciona; util para enumerar valores distintos |
| `limit` | maximo 500 por peticion |
| `offset` | paginacion verificada (probado offset=1400 sobre `Item`) |

Forma de la respuesta (cada fila envuelta en `title`):

```json
{"cargoquery":[{"title":{"palName":"Anubis","paldeckNumber":"139"}}]}
```

Espaciar las peticiones ~1 por segundo. Con `limit=500` el snapshot completo
son menos de 15 peticiones.

### Tablas que se usan

| Tabla | Filas | Para que |
| --- | --- | --- |
| `Pal` | 278 | lista canonica de Pals |
| `PalElement` | 354 | elementos |
| `PalPartnerSkill` | 278 | partner skill y descripcion |
| `PalPartnerSkillScale` | 1678 | escalado por rank de condensacion |
| `Item` | 1444 | lista de objetos y su categoria |
| `ItemEquipment` | 625 | stats de equipamiento |
| `GameVersions` | 68 | deteccion de version (Fase 3) |

### Campos por tabla (verificados)

`Pal` — `palName`, `paldeckNumber`, `palSize`, `partnerSkill`, `palGear`,
`hungerRate`, `isNocturnal`, `sellPrice`.

Nota: `Pal` **no** contiene elemento. Las variantes elementales son filas
propias con sufijo `B` en el paldeck: `Robinquill Terra` = `076B`,
`Jormuntide Ignis` = `121B`, `Bellanoir Libero` = `195B`.

`PalElement` — `palName`, `element`. **Una fila por elemento**: un Pal dual
aparece dos veces (`Astegon` → `Dark`, `Astegon` → `Dragon`). Agrupar por
`palName` al normalizar.

`PalPartnerSkill` — `palName`, `partnerSkill`, `description` (wikitext),
`type`. Ojo: `type` aqui es aptitud de trabajo (ej. `Watering`), no elemento
de combate.

`PalPartnerSkillScale` — `partnerSkill`, `effectType`, `effectValue`,
`level`, `target`. `level` es el rank de condensacion (0-4). Un mismo skill
puede tener varios `effectType`, por eso hay 1678 filas para 278 skills.
Join por `partnerSkill`, no por `palName`.

`Item` — `itemName`, `itemType`, `subtype`, `description` (wikitext),
`sellValue`, `weight`, `rarity`, `techName`.

`ItemEquipment` — `itemName`, `itemQuality`, `sellValue`, `durability`,
`attack`, `defense`, `healthBonus`, `shieldValue`, `gliderSpeed`,
`staminaDrain`, `capturePower`, `equipEffect` (wikitext), `ammoType`,
`barSizeRate`. **No tiene campo de slot ni categoria.**

### Mapeo de `kind`

El enum del esquema es `weapon | armor | accessory | shield | glider`.
Ese valor sale de `Item.itemType` + `Item.subtype`, no de `ItemEquipment`.

Primer paso obligatorio de la implementacion: enumerar los pares reales
antes de escribir el mapeo. No inventar valores.

```text
https://palworld.wiki.gg/api.php?action=cargoquery&tables=Item
  &fields=itemType,subtype&group_by=itemType,subtype&limit=500&format=json
```

Valores observados sueltos durante el discovery, insuficientes por si solos:
`itemType` ∈ {`Weapon`, `Accessory`, `Consumable`, `Schematic`, `Other Item`, ...},
`subtype` ∈ {`Ranged`, `Tool`, `Pendant`, `Hat`, ...}.

Escribir el mapeo resultante en este documento como tabla cerrada. Cualquier
par sin mapear se registra en el informe, no se adivina.

### Mapeo cerrado (verificado 2026-08-09, 45 pares reales via `group_by`)

Hallazgo: `Shield` no es un `itemType` propio, es un `subtype` dentro de
`Armor`. Sin este `group_by` se habria mapeado mal.

| `itemType` | `subtype` | `kind` |
| --- | --- | --- |
| `Accessory` | (cualquiera: ``, `Charm`, `Pendant`, `Ring`, `Support Whistle`, `Undershirt`) | `accessory` |
| `Armor` | ``, `Body Armor`, `Head Armor`, `Hat` | `armor` |
| `Armor` | `Shield` | `shield` |
| `Glider` | `` | `glider` |
| `Weapon` | (cualquiera: ``, `Grenade`, `Melee`, `Ranged`, `Tool`) | `weapon` |
| `Ammo`, `Consumable`, `Implant`, `Key Item`, `Material`, `Other Item`, `Schematic`, `Sphere`, `Sphere Module` | cualquiera | `null` (no es equipamiento) |

Cualquier par de `itemType`/`subtype` no listado arriba que aparezca en una
ejecucion futura debe registrarse en el informe de cobertura, no mapearse
por adivinanza.

## 2. paldb.gg

Sin API, sin export, sin endpoint JSON. Los datos salen del datamine de los
DataTables del juego (914 tablas exportadas desde una instalacion de servidor
dedicado), revalidados en cada patch.

Estado al 2026-08-09: **288 Pals**, 1880 objetos, 421 passives, build
`4797047678`, actualizado el 2026-08-06.

Rutas utiles:

```text
https://paldb.gg/pals/                 lista completa, 288 en una sola pagina
https://paldb.gg/pal/robinquill-terra/ ficha individual, slug kebab-case
https://paldb.gg/items/                objetos
```

El slug de paldb coincide con el `id` que necesita nuestro esquema
(`^[a-z0-9][a-z0-9-]*$`), lo que permite usar el mismo esquema de slug en
ambas fuentes.

paldb.gg **no publica partner skills** y lo declara de forma explicita: el
join de tablas no esta terminado y prefieren omitirlas antes que mostrar un
campo vacio. Por eso el reparto es:

| Dato | Autoridad |
| --- | --- |
| Partner skills y su escalado | wiki.gg Cargo |
| Cobertura, nombres, elementos, stats, objetos, version | paldb.gg |

### El hueco de cobertura es real

278 (wiki) frente a 288 (paldb): faltan 10 Pals en la wiki.

Comprobado con una muestra de 15 nombres usados por las builds de
palmods.gg: 14 existen en la wiki, **`Dandilord` no**. Y `Dandilord` es el
carry de la build "Poison Barrier".

Conclusion: el snapshot no puede construirse solo con wiki.gg. Procedimiento:

1. Bajar los 278 de wiki.gg con todos sus campos.
2. Scrapear la lista de 288 de `paldb.gg/pals/`.
3. Diferencia = los ~10 que faltan.
4. Para cada uno, scrapear su ficha en paldb y anadirlo al snapshot con
   `source: "paldb"` y `partnerSkill: null`.
5. El informe de cobertura lista esos Pals como incompletos.

La validacion **no** debe rechazar una build por referenciar un Pal parcheado
desde paldb; si debe rechazar un `palId` que no exista en ninguna fuente.

## 3. Builds: la API de palmods.gg no sirve

`palmods.gg/docs/api` documenta una API publica real, pero es de **mods**:
`/api/v1/mods`, `/api/v1/mods/{idOrSlug}/files`, `/api/v1/categories`,
`/api/v1/game-versions`, `/api/v1/collections/{idOrSlug}`, `/feed` RSS.
Ningun endpoint expone guias, builds ni equipos.

Las builds se extraen del HTML de `palmods.gg/guides/builds`. El sitio es
Next.js; probar primero si una pagina de guia individual trae `__NEXT_DATA__`
o payload RSC antes de parsear HTML a mano (la pagina indice no lo mostraba).

Inventario confirmado: **22 builds con nombre propio** (equipo de 5 Pals con
rol por slot) + **8 plantillas por elemento** = 30. Cubre la meta de 20-30 sin
recurrir a game8, cuyo contenido sigue migrando a 1.0.

Ejemplos del listado: Explosive Archer, Slow Burn, Full Tackle Box, Loot
Goblin, Aegis Wall, Gunslinger, Catch Squad, Traversal Kit, Poison and Blind
Lock, Knocklem Poison Tank, Frostallion Charge Rifle, Mobility Melee Swarm,
Sustain and Rescue Squad, Anubis Hard-Tower Ground Team, Fast-Kill
Exploration Party, Life-Steal Player Tank, Bellanoir Glass-Cannon Rotation,
Soak/Shock Overload, Poison Barrier, Skutlass Katana Rush, Death From Above.

Las builds usan variantes elementales como Pals distintos (Robinquill Terra,
Jormuntide Ignis, Prixter Lux, Bellanoir Libero). El snapshot debe tratarlas
como entradas independientes, que es como ya vienen en ambas fuentes.

## 4. Formato de salida del snapshot

```text
data/snapshot/pals.json
data/snapshot/items.json
data/snapshot/meta.json
```

`meta.json` guarda `capturedAt`, `gameVersion` (`"1.0"`), el build number de
paldb y los conteos por fuente, para que la deteccion de versiones de la
Fase 3 tenga contra que comparar.

`pals.json`:

```ts
type SnapshotPal = {
  id: string              // slug kebab-case; "Robinquill Terra" -> robinquill-terra
  name: string
  paldeckNumber: string   // "076B" para variantes
  elements: string[]      // enum del esquema, en minusculas
  isVariant: boolean      // paldeckNumber termina en letra
  partnerSkill: {
    name: string
    description: string
    workType: string
    scaling: Array<{ level: number; effectType: string; effectValue: string; target: string }>
  } | null                // null en los Pals parcheados desde paldb
  source: "wiki.gg" | "paldb"
}
```

`items.json`:

```ts
type SnapshotItem = {
  id: string
  name: string
  itemType: string
  subtype: string
  kind: "weapon" | "armor" | "accessory" | "shield" | "glider" | null
  rarity: string
  equipment?: {           // solo si aparece en ItemEquipment
    attack?: number
    defense?: number
    healthBonus?: number
    shieldValue?: number
    gliderSpeed?: number
    capturePower?: number
    ammoType?: string
  }
  source: "wiki.gg"
}
```

`kind: null` significa que el objeto no es equipamiento o que su par
`itemType`/`subtype` no esta mapeado. Un `itemId` referenciado por una build
con `kind: null` es un error de validacion.

## 5. Normalizacion de elementos

El esquema usa `neutral | fire | water | grass | electric | ice | ground |
dark | dragon`. `PalElement.element` viene capitalizado (`Water`, `Ground`,
`Dark`). Pasar a minusculas y validar contra el enum; cualquier valor fuera
del enum aborta el snapshot en vez de descartarse en silencio.

## 6. Iconos (Pals y equipamiento)

Capturado 2026-08-09 con `scripts/fetch-icons.mjs` (`npm run icons:fetch`).

Decision: **self-host, no hotlink**. Los iconos se descargan una vez y se
commitean en `public/icons/{pals,items}/<id>.webp`. Motivo: no depender del
ancho de banda de paldb.gg en produccion ni de que sus rutas no cambien.

### Fuente

- Pals: `https://paldb.gg/pals/` trae un `<img src="/pal/<CodeName>.webp"
  alt="<Nombre>">` por tarjeta. El nombre en `alt` es lo que se pasa por el
  mismo `slugify()` del snapshot para obtener el `id` — no se adivina el
  nombre de archivo (son codenames internos, ej. `Dandilord` es
  `FlowerPrince.webp`).
- Items: la pagina de listado (`/items/`) **no** trae iconos, solo texto.
  Cada pagina individual (`/item/<slug>/`) si trae un `<img
  src="/item/<CodeName>.webp">`. Por eso los iconos de equipamiento se piden
  uno por uno, solo para los `itemId` que el catalogo realmente referencia
  (8 en total al momento de escribir esto), no para los 1444 items del
  snapshot completo.

### Cobertura y huecos conocidos (no se inventa nada, se documenta)

- Pals: 287/288 de la lista actual de paldb.gg descargados sin error.
- `rayhound-cryst`: sin icono. Es el mismo caso ya documentado en la seccion
  2 (Pal presente en wiki.gg pero ausente del listado de paldb.gg); sigue
  sin icono porque la fuente de iconos es exclusivamente paldb.gg.
- `ra`: un Pal que nuestro snapshot habia registrado como parche desde
  paldb.gg ya no aparece en el listado actual de paldb.gg bajo ningun href
  ni nombre de tarjeta. No se usa en ninguna de las 29 builds; queda sin
  icono y sin investigar mas a fondo por ahora.
- Items: 7/8 descargados. `three-shot-bow` no tiene imagen en su pagina
  individual de paldb.gg (sin `.webp` en el HTML) — es un arma con sabor de
  meme dentro del juego, es plausible que carezca de arte propio.

El script escribe `data/snapshot/icons-report.json` con el detalle exacto de
lo descargado y lo faltante en cada corrida.

### Como se resuelve la ausencia de icono en la UI

`src/lib/data.ts` calcula `iconUrl: string | null` una sola vez (build time,
via `existsSync` sobre `public/icons/`) para cada Pal e item resuelto, y lo
expone tanto en `BuildSummary` (listado) como en `BuildDetail` (detalle).
Ni el listado (isla de Preact, sin acceso a `fs`) ni el detalle (paginas
Astro estaticas) vuelven a decidir por su cuenta si un icono existe; ambos
leen el mismo campo ya resuelto, evitando que la logica de "existe o no"
viva en dos sitios y se desincronice.

Sin icono: se muestra un circulo neutro con la primera letra del nombre del
Pal (`PalAvatar.astro` para paginas estaticas, `PalAvatarChip` en
`BuildBrowser.tsx` para el listado). Para items sin icono, no se muestra
nada — el nombre ya es suficiente y un glifo generico seria mas enganoso
que informativo.
