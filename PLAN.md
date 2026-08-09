# Tarea: agregar builds comunitarias (Reddit y similares) al catálogo

## Contexto del proyecto

Companion web de Palworld: catálogo de "Team Builds" (equipos de 5 Pals) en
`data/catalog.json` (inglés, fuente de verdad) + `data/catalog.es.json`
(traducción al español, mismo shape, alineada por posición de array). El
esquema formal está en `schemas/team-build.schema.json` y las reglas de
contenido en `docs/catalog-schema.md`. Ya hay 29 builds cargadas, todas
normalizadas desde `palmods.gg/guides/builds` (un sitio que ya cruza sus
datos contra las tablas reales del juego).

Esta tarea es distinta: buscar builds directamente en comunidades (Reddit
u otras) que **no** estén ya cubiertas por las 29 existentes, y agregarlas
con el mismo nivel de rigor.

## Por qué esto NO es solo copiar y pegar un post

Palworld ya lleva varios parches desde 1.0. Un post de Reddit puede traer
cifras de una versión anterior, redondeadas de memoria, o directamente
inventadas por el autor sin verificar. La regla de confianza del proyecto
(ver `docs/catalog-schema.md`) es: **no introducir cifras que la fuente no
documente con claridad, y cuando haya duda, verificar contra los datos
reales del juego antes de escribir un número.**

Por eso el proceso correcto por cada build candidata es:

1. Leer el post/hilo y sacar la **composición**: qué 5 Pals, qué rol
   cumple cada uno, por qué (según el autor).
2. **No confiar en las cifras que da el post.** Para cada Pal de la
   composición, consultar su partner skill real contra wiki.gg Cargo (ver
   `docs/data-sources.md` sección 1, y `scripts/lib/cargo.mjs` que ya
   implementa el cliente). Ejemplo de consulta:

   ```
   https://palworld.wiki.gg/api.php?action=cargoquery&format=json
     &tables=PalPartnerSkill&fields=palName,partnerSkill,description,type
     &where=palName="NombreDelPal"
   ```

   y para el escalado por rango de condensación, `PalPartnerSkillScale`
   (join por el nombre del partner skill, no por el nombre del Pal).
3. Escribir la `explanation` de cada Pal con las cifras **verificadas**,
   no las del post. Si el post dice algo que wiki.gg no puede confirmar
   (por ejemplo, un daño total agregado tipo "esto pega 200,000 de daño"),
   se puede mencionar como resultado de comunidad bajo condiciones
   específicas — nunca como cifra garantizada — igual que ya se hizo en
   `frostallion-charge-rifle` (revisar esa entrada en `data/catalog.json`
   como ejemplo exacto de cómo manejar esto).
4. Si el post no nombra 5 Pals concretos con claridad (por ejemplo, dice
   "y los otros 2 slots los llenas tú"), **no forzar una quinta y sexta
   entrada inventada.** Se descarta esa build. Ya pasó una vez con una
   guía llamada "Slow Burn" que solo nombraba 3 de 5 slots — quedó fuera
   del catálogo a propósito, ver `docs/plan.md` para la nota completa.
5. Cada `palId` e `itemId` que se use tiene que existir en el snapshot
   factual. Verificar con:

   ```bash
   node scripts/lookup.mjs pal "Nombre del Pal"
   node scripts/lookup.mjs item "Nombre del item"
   ```

   Si no aparece, no se usa ese id — no se inventa uno.
6. Marcar `"verification": "cross_checked"` (no `"reviewed"`) en estas
   entradas nuevas, porque a diferencia de las 29 anteriores, aquí sí se
   está cruzando la fuente original (Reddit) contra una segunda fuente
   factual (wiki.gg) de forma explícita.

## Builds que ya existen (no duplicar)

Cada línea es `id — nombre — pals`:

```
explosive-archer — Explosive Archer — loomen, robinquill-terra, robinquill, solenne, vanwyrm-cryst
gunslinger — Gunslinger — solenne, frostplume, nyafia, orserk, vanwyrm-cryst
frostallion-charge-rifle — Frostallion Charge Rifle — frostallion, vanwyrm-cryst, xenogard, cryolinx-terra, solenne
full-tackle-box — Full Tackle Box — solmora-lux, jelliette, gloopie, whalaska-ignis, lunaris
poison-and-blind-lock — Poison and Blind Lock — venusa, roujay, prixter, bakemi, solenne
saya-and-selyne-hard-rotation — Saya and Selyne Hard Rotation — eidrolon, shaolong, orserk, blazamut-ryu, quivern
loot-goblin — Loot Goblin — astegon, dumud-gild, splatterina, lunaris, fuddler
aegis-wall — Aegis Wall — silvegis, lapiron, warsect, teafant, celesdir
catch-squad — Catch Squad — wispaw, muffly, souffline, yakumo, katress
traversal-kit — Traversal Kit — verdash, valentail, celaray, gorirat-terra, starryon
knocklem-poison-tank — Knocklem Poison Tank — knocklem, bakemi, prixter, dumud, lapure
mobility-melee-swarm — Mobility Melee Swarm — verdash, galeclaw, loupmoon, daedream, daedream
sustain-and-rescue-squad — Sustain and Rescue Squad — elphidran, tetroise, whalaska, lyleen, herbil
anubis-hard-tower-ground-team — Anubis Hard-Tower Ground Team — anubis, dualith-noct, surfent-terra, orserk, kikit
fast-kill-exploration-party — Fast-Kill Exploration Party — eidrolon, maraith, croajiro-noct, killamari, wispaw
life-steal-player-tank — Life-Steal Player Tank — felbat, solenne, xenogard, silvegis, tetroise-primo
bellanoir-glass-cannon-rotation — Bellanoir Glass-Cannon Rotation — bellanoir-libero, bellanoir-libero, orserk, prixter, bakemi
soak-shock-overload — Soak/Shock Overload — ophydia, jormuntide, prixter-lux, slowatt, univolt
poison-barrier — Poison Barrier — dandilord, prixter, bakemi, silvegis, felbat
skutlass-katana-rush — Skutlass Katana Rush — skutlass-ignis, pupperai, loupmoon-cryst, warsect-terra, solenne
death-from-above — Death From Above — croajiro, valentail, frostplume, galeclaw, solenne
fire-team-template — Fire Team Template — kelpsea-ignis, rooby, finsider-ignis, renjishi, jormuntide-ignis
grass-team-template — Grass Team Template — bristla, nitemary-botan, ribbuny-botan, dandilord, lyleen
water-team-template — Water Team Template — kelpsea, gloopie-primo, penking-lux, neptilius, panthalus
electric-team-template — Electric Team Template — sparkit, dinossom-lux, univolt, helzephyr-lux, snock
ice-team-template — Ice Team Template — foxcicle, rayhound-cryst, moldron-cryst, frostallion, muffly
ground-team-template — Ground Team Template — dumud, kikit, turtacle-terra, surfent-terra, pierdon
dark-team-template — Dark Team Template — hoocrates, wistella, croajiro-noct, venusa, roujay
dragon-team-template — Dragon Team Template — quivern, dinossom, blazamut-ryu, orserk, shaolong
```

Una build nueva no tiene que evitar reusar Pals individuales (muchos Pals
ya aparecen en varias builds), solo evitar ser la **misma composición de 5**
que ya está arriba.

## Filtro de calidad de fuente

- Solo builds para **Palworld 1.0** (o compatibles — el juego relanzó 1.0 a
  mediados de 2026, cualquier post de antes de esa fecha probablemente
  tiene cifras viejas; verificar la fecha del post).
- Preferir posts con evidencia de que funcionan de verdad (muchos upvotes,
  comentarios confirmando, capturas de daño real) sobre teorías sin probar.
- Si Reddit está bloqueado para tus herramientas de navegación igual que
  para las mías, probar con otras comunidades: foros de Steam, Discord
  público indexado, YouTube (descripciones/comentarios de video con la
  composición escrita), u otros subreddits relacionados.

## Formato exacto de cada build nueva

Copiar el shape exacto de cualquier entrada existente en
`data/catalog.json` (los 5 `pals[]` con `role` del enum de
`schemas/team-build.schema.json`, `equipment` solo si la fuente es clara
sobre un arma/objeto concreto, `synergyNotes`, `alternatives` opcional,
`source.url` apuntando al post real, `source.capturedAt` con la fecha de
hoy en ISO, `gameVersion: "1.0"`).

Para cada build nueva, agregar también la traducción en
`data/catalog.es.json` bajo la misma clave `id`, seedo mismo shape
(`summary`, `pals[]` alineado por posición con el array de pals del inglés,
`synergyNotes[]`, `equipment[]`, `alternatives[]`) — **sin cambiar ningún
número al traducir.**

## Validación obligatoria antes de dar por terminada cada tanda

```bash
npm run validate               # schema + referencias existentes
npm run validate:translations  # compara EN vs ES, falla si un número no coincide
```

Ambos tienen que pasar en limpio. `validate:translations` compara los
números (porcentajes, segundos, niveles) entre la versión en inglés y la
española de cada campo de texto — si algo no cuadra exactamente, es señal
de que se alteró una cifra al traducir.

## Modelo recomendado

No uses el modelo más barato/mecánico para esto. La tarea de verificar
cifras contra wiki.gg y decidir si un post es reconstruible como 5 slots
reales requiere el mismo criterio que se usó para las 29 builds
originales — un modelo de gama alta (`opencode-go/deepseek-v4-pro` o
`opencode-go/kimi-k2.7-code`, según lo que tengas disponible). Un modelo
barato tipo `flash` tiende a rellenar huecos con números plausibles en vez
de admitir que la fuente no los da — exactamente lo que esta tarea busca
evitar.

## Al terminar

Agregar cuantas builds reales y verificables consigas (no hay un número
objetivo fijo). Reportar cuáles se descartaron y por qué (fuente
insuficiente, cifras no verificables, o duplicado de una build existente).
