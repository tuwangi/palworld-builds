# Palworld Builds Companion

Plan de producto y construccion.

Estado: auditado; hallazgos incorporados (ver `docs/auditoria.md`).
Fecha: 2026-08-09.

## 1. Objetivo

Crear una webapp movil, accesible desde cualquier navegador, para consultar equipos de cinco Pals de Palworld organizados por proposito.

El foco es encontrar rapidamente un equipo util para una situacion concreta:

- dano de Pals por elemento;
- dano del jugador con armas;
- soporte al jugador;
- soporte al Pal activo;
- jefes;
- captura;
- supervivencia;
- exploracion y movilidad;
- progresion temprana o endgame.

Cada equipo puede incluir un arma, armadura o accesorio recomendado cuando la fuente lo indique. El equipamiento no es obligatorio y no debe bloquear una build salvo que sea parte esencial de su sinergia.

La aplicacion es un companion personal. No es una plataforma social ni un producto oficial de Pocketpair.

## 2. Alcance cerrado

### Incluido en el MVP

- Catalogo de equipos de cinco Pals.
- Pals repetidos dentro del equipo, por ejemplo cuatro Gobfin y un carry.
- Objetivo principal y objetivos secundarios.
- Elemento o tipo de dano.
- Rol de cada slot.
- Partner skills relevantes.
- Arma opcional, recomendada o fundamental.
- Armadura y accesorios cuando haya informacion suficiente.
- Requisitos generales: early game, endgame, legendarios, breeding, arma concreta.
- Fuente, version del juego y fecha de verificacion.
- Busqueda por nombre.
- Filtros por objetivo, elemento, progresion y requisitos.
- Favoritos locales.
- Perfil publico por ID simple, por ejemplo `dani123`.
- Compartir el ID con amigos para consultar la misma coleccion.

### Fuera del MVP

- Login real.
- Email, contrasenas o datos personales.
- Archivos de guardado.
- Importacion de partidas.
- IVs detallados.
- Puntos de estadisticas del jugador.
- Builds de bases.
- Rutas completas de breeding.
- Votos, comentarios o moderacion.
- Historial de revisiones visible.
- Rankings globales.
- PvP salvo que exista informacion suficiente y sea un caso separado.
- IA ejecutandose dentro de la aplicacion.

## 3. Terminologia de producto

La entidad principal se llama `Team Build`.

Una build siempre describe un equipo activo de cinco Pals. No se debe convertir el proyecto en una Paldex generalista.

El equipamiento usa tres estados:

- `none`: se representa con `equipment: []`; no hay informacion suficiente o no aplica;
- `recommended`: mejora la build, pero puede sustituirse;
- `required`: la sinergia depende de ese objeto o tipo de arma.

## 4. Taxonomia

### Objetivos

- `pal_element_damage`
- `player_weapon_damage`
- `player_support`
- `active_pal_support`
- `hybrid_damage`
- `boss_damage`
- `capture`
- `survival`
- `status_effects`
- `exploration`
- `mobility`
- `early_progression`
- `endgame`
- `utility`

### Roles de slot

- `carry`
- `element_booster`
- `trainer_damage_support`
- `active_pal_booster`
- `mount`
- `element_conversion`
- `weak_point_support`
- `status_applier`
- `defensive_support`
- `healing`
- `mobility`
- `utility`
- `flex`

### Requisitos

- `early_game`
- `mid_game`
- `endgame`
- `legendary`
- `breeding`
- `condensation`
- `specific_weapon`
- `specific_mount`
- `rare_content`

Las etiquetas son descriptivas, no una puntuacion universal de calidad.

`exploration` y `mobility` se solapan a proposito: una build de traversal puede llevar ambas. Como `purpose` es multi-etiqueta, el solape se resuelve marcando las dos.

## 5. Modelo de datos

### Pal

```ts
type Pal = {
  id: string
  name: string
  slug: string
  elements: string[]
  partnerSkillId?: string
  iconUrl?: string
  gameVersion: string
}
```

### Equipment

```ts
type EquipmentRecommendation = {
  itemId: string
  kind: "weapon" | "armor" | "accessory" | "shield" | "glider"
  status: "recommended" | "required"
  reason?: string
  alternatives?: string[]
}
```

### Team Build

```ts
type TeamBuild = {
  id: string
  slug: string
  name: string
  summary: string
  purpose: string[]
  elements: string[]
  progression: "early" | "mid" | "endgame" | "mixed"
  pals: Array<{
    palId: string
    role: string[]
    explanation: string
  }>
  equipment: EquipmentRecommendation[]
  requirements: string[]
  synergyNotes: string[]
  alternatives?: Array<{
    palId: string
    replacesPalId: string
    reason: string
  }>
  gameVersion: string
  source: {
    url: string
    title?: string
    capturedAt: string
  }
  verification: "unverified" | "reviewed" | "cross_checked"
}
```

El array `pals` debe tener exactamente cinco entradas. Se permiten IDs repetidos.
El contrato formal y las reglas de validacion estan en `schemas/team-build.schema.json` y `docs/catalog-schema.md`.

## 6. Fuentes de datos

### Datos factuales

Fuente estructurada principal (API Cargo de wiki.gg):

- `https://palworld.wiki.gg/wiki/Special:CargoTables`
- Autoridad para partner skills: tablas `PalPartnerSkill` y `PalPartnerSkillScale` (escalado por rank de condensacion, campo `level` 0-4).
- Tambien relevantes: `PalElement` (unica fuente de elementos; una fila por elemento), `Item` (`itemType`/`subtype` dan la categoria de equipamiento), `ItemEquipment` (stats, sin campo de slot), `GameVersions`.
- Cobertura algo por detras del datamine (278 Pals frente a 288); cruzar con paldb.gg.
- El hueco de 10 Pals es real y afecta al catalogo: `Dandilord`, carry de la build "Poison Barrier" de palmods.gg, no existe en la wiki. El snapshot debe parchear esos Pals desde paldb.gg.

El contrato completo del snapshot (endpoints, campos verificados, paginacion, formato de salida) esta en `docs/data-sources.md`.

Fuente de validacion y referencia datamined:

- `https://paldb.gg/about/`
- Autoridad de cobertura: 288 Pals y 1880 objetos, extraccion automatica de los DataTables del juego, refrescada con cada patch.
- No publica partner skills (lo declara explicitamente); para eso se usa wiki.gg.

Division de validacion: nombres, elementos, stats, armas, objetos y version se validan contra paldb.gg; partner skills y su escalado contra wiki.gg Cargo.

### Builds

Fuentes iniciales:

- `https://www.palmods.gg/guides/builds`
- `https://palworld-db.com/team-builder`
- `https://game8.co/games/Palworld/archives/439567`
- Guias y videos concretos cuando documenten claramente el equipo.

Notas de vigencia (verificadas 2026-08-09, Palworld 1.0):

- palmods.gg ya opera con datos 1.0. Inventario confirmado: 22 builds con nombre propio (5 Pals con rol por slot) + 8 plantillas por elemento = 30; cubre por si solo la meta de 20-30 builds iniciales.
- Su `/docs/api` ya esta revisado: es una API de **mods** (`/api/v1/mods`, `/api/v1/categories`, `/api/v1/game-versions`, feed RSS). No expone guias, builds ni equipos. Las builds se extraen del HTML.
- game8 muestra aviso de estar actualizando sus guias a 1.0: toda build extraida de game8 debe verificarse contra datos 1.0 antes de entrar al catalogo.

Las builds se normalizan en el catalogo propio. La app no consulta estas paginas durante la navegacion del usuario.

### Regla de confianza

No introducir cifras o requisitos que la fuente no indique claramente.

Cuando una fuente presenta una recomendacion ambigua, guardar la build pero marcar el dato como opcional o dejarlo vacio.

## 7. Clasificacion

El MVP usa clasificacion manual almacenada en los datos. No se necesita inferencia automatica para publicar las primeras builds.

El futuro motor de sinergias podra usar reglas como:

- partner skill dirigido al trainer + arma explicita -> `player_weapon_damage`;
- varios buffs del mismo elemento + carry -> `pal_element_damage`;
- montura con conversion elemental -> `element_conversion`;
- varios aplicadores del mismo estado -> `status_effects`;
- cuatro boosters y un carry -> `element_booster` + `carry`;
- soporte de escudo, curacion o robo de vida -> `survival`.

Cada clasificacion automatica futura debe ser explicable y mostrar que reglas la produjeron.

## 8. Favoritos y perfiles publicos

El perfil no es una cuenta y el ID no es secreto.

Ejemplo:

```text
/profile/dani123
```

Comportamiento deseado:

- El usuario escribe cualquier ID valido.
- Si no existe, puede crearse ese perfil.
- Los builds favoritos se guardan asociados a ese ID.
- Otra persona puede escribir el mismo ID y ver la coleccion.
- No hay contrasena ni informacion sensible.
- Un ID pertenece a una sola coleccion compartida.

El MVP debe soportar primero favoritos en `localStorage` para funcionar sin backend. La persistencia compartida por ID se implementa cuando la UI y el catalogo esten estabilizados.

Opcion principal: perfiles en el propio repo, sin servicio externo:

```text
data/profiles/<id>.json   (archivos JSON en el repo de GitHub)
```

- El navegador no puede escribir directamente en el repo: lo hace una funcion serverless de Vercel (plan Hobby, gratis) que recibe el ID y la lista de favoritos y lee/escribe el JSON via GitHub API.
- El token de GitHub (fine-grained, solo este repo, solo permiso contents) vive como variable de entorno server-side en Vercel; nunca llega al navegador.
- Coste cero, datos versionados y visibles en el repo, sin terceros.
- El backend solo valida el formato del ID, comprueba que las builds existen y limita el tamano de la coleccion. No hay credenciales ni autenticacion.

Alternativas gratuitas si el enfoque de repo no convence:

- Supabase free tier: suficiente para este volumen, pero pausa proyectos inactivos (~7 dias), molesto para uso personal esporadico.
- Neon Postgres free tier: sin pausa por inactividad (wake-on-request).

Si se usara Supabase:

```text
profiles
- id: text primary key
- created_at

profile_favorites
- profile_id
- build_id
- created_at
- primary key (profile_id, build_id)
```

En cualquier opcion: no crear credenciales ni aplicar autenticacion.

## 9. Arquitectura por fases

### Infraestructura

- Hosting: Vercel (plan Hobby, gratis) conectado al repo de GitHub.
- App estatica responsive (Astro o Next.js en modo estatico), sin servidor propio.
- Catalogo de builds como JSON en el repo: fuente de verdad versionada.
- Unica pieza dinamica: la funcion serverless de perfiles (seccion 8), solo desde Fase 2.

### Fase 0: especificacion y datos

- Confirmar taxonomia. (hecho)
- Crear esquema TypeScript o JSON Schema. (hecho: `schemas/team-build.schema.json`)
- Fijar `gameVersion` inicial del catalogo a "1.0".
- Discovery de fuentes: endpoints, tablas y campos verificados. (hecho: `docs/data-sources.md`)
- Construir el snapshot factual (`data/snapshot/pals.json`, `items.json`, `meta.json`) desde wiki.gg Cargo, parcheando desde paldb.gg los Pals que la wiki no cubre. (hecho: `npm run snapshot:build`, ver detalle abajo)
- Script de validacion automatizada del catalogo que falla si una build: no tiene exactamente cinco slots; referencia un palId o itemId inexistente; usa un valor fuera de los enums (objetivo, rol, requisito, progresion); o tiene `source.url` vacia. Corre en CI y genera un informe de cobertura (builds por objetivo, builds sin equipamiento). (hecho: `npm run validate`, workflow `.github/workflows/validate-catalog.yml`, probado contra un catalogo roto a proposito)
- Crear 20-30 builds iniciales. (hecho: 29 builds en `data/catalog.json`, ver detalle abajo)
- Documentar fuentes y version. (hecho)

### Resultado del catalogo de builds (capturado 2026-08-09)

- 29 builds normalizadas desde `palmods.gg/guides/builds`: 21 builds con nombre
  propio + 8 plantillas por elemento.
- 1 build del inventario original excluida a proposito: "Slow Burn" solo
  nombra 3 de 5 slots (2 quedan "Open Flex slot" sin recomendacion de la
  fuente). Rellenar esos slots habria significado inventar una asociacion
  pal-slot que la fuente no da; se prefirio excluirla a forzar un quinto
  y sexto Pal sin evidencia (regla de confianza, seccion 6).
  Sigue dentro del rango de 20-30 del objetivo del MVP.
- `npm run validate` pasa limpio: 29/29 builds, cinco slots cada una
  (incluyendo casos con Pals repetidos: dos Daedream en "Mobility Melee
  Swarm", dos Bellanoir Libero en "Bellanoir Glass-Cannon Rotation"), cero
  referencias rotas de `palId`/`itemId` en pals, alternatives ni equipment.
- Verificado ademas con un script de auditoria propio (fuera del validador)
  que recorre las 145 referencias de Pal y todas las de equipamiento contra
  el snapshot: 0 problemas.
- Solo 2 builds llevan equipamiento `required` (Explosive Archer, Gunslinger)
  y 0 llevan `recommended` sin ser tambien las mismas dos build con
  weapon central; el resto usa `equipment: []` quedando sin adivinar objetos
  cuando la fuente no listaba una seccion de gear clara para esa build.
- Los picks "community/Reddit" que la fuente marca como elegidos por stats
  generales (sin numero de partner skill documentado, ej. Knocklem, Galeclaw,
  Elphidran, Anubis en varias builds) se guardaron con la `explanation`
  dejando explicito que no hay cifra citable para ese slot, en vez de
  inventar un numero de sinergia.

### Resultado del snapshot (capturado 2026-08-09)

- 289 Pals: 262 desde wiki.gg + 27 parcheados desde paldb.gg (Pals que la wiki
  no tiene, incluye `Dandilord`, carry de "Poison Barrier").
- 16 filas de `Pal` en wiki.gg descartadas por ser ruido sin numero de
  paldeck (`BigFoxWolf`, entradas de slime/murcielago genericas, etc.);
  tratadas como ausentes y recuperadas desde paldb.gg cuando correspondia
  (asi se recupero `Boltmane`, que si es un Pal real).
  `Faleris Noct` no aparecio en el listado de paldb.gg y queda fuera del
  snapshot; revisar manualmente si aparece en una fuente futura.
- 1 discrepancia inversa detectada y conservada, no descartada:
  `Rayhound Cryst` existe en wiki.gg con datos completos pero no aparece en
  el listado actual de paldb.gg. Queda en el snapshot con `source: "wiki.gg"`
  y anotado en `meta.json.palsInWikiNotInPaldbListing` para revision humana.
- 1444 items desde wiki.gg; 324 con `kind` de equipamiento resuelto contra un
  mapeo cerrado de 45 pares `itemType`/`subtype` verificados en vivo (ver
  `docs/data-sources.md`); 0 pares sin mapear en esta captura.
- El script no inventa valores: un elemento fuera del enum aborta la
  captura completa; un par `itemType`/`subtype` no mapeado se reporta en
  `meta.json.unmappedItemKindPairs` en vez de adivinarse.

### Fase 1: MVP local

- Crear app responsive.
- Cargar catalogo estatico.
- Crear listado y filtros.
- Crear detalle de build.
- Crear favoritos en navegador.
- Crear exportacion/importacion local opcional.
- Crear URLs estables por build.

### Fase 2: perfiles compartidos

Puede adelantarse si la funcion de perfiles resulta trivial; el usuario queria esto en el MVP si era facil.

- Crear funcion serverless en Vercel con token fine-grained de GitHub (env server-side).
- Crear perfiles por ID publico como JSON en `data/profiles/`.
- Guardar favoritos por perfil.
- Crear `/profile/:id`.
- Permitir consultar la coleccion de un amigo.
- Mantener fallback a favoritos locales si el backend no esta disponible.

### Fase 3: sinergias y actualizacion

- Crear reglas versionadas.
- Calcular sinergias de manera determinista.
- Mostrar conflictos y duplicados.
- Detectar cambios en Pals, skills y objetos.
- Marcar builds posiblemente afectadas.
- Recomendar sustitutos.
- Generar equipos segun objetivo y restricciones.

## 10. Motor de sinergias futuro

Debe ser independiente del frontend:

```ts
calculateSynergies(build, gameData, rulesVersion): SynergyResult
```

El resultado debe incluir:

- buffs activos;
- objetivo de cada buff;
- si stackea;
- conflictos o efectos duplicados;
- dependencia de arma o montura;
- explicacion legible;
- advertencias de datos incompletos.

No calcular DPS exacto al principio. Los datos disponibles y las mecanicas cambiantes hacen mas fiable mostrar sinergias verificables que prometer una cifra total de dano.

## 11. Actualizaciones

Pipeline futuro. Detector de version: comparar la tabla `GameVersions` de wiki.gg Cargo (o el build number de paldb.gg) contra lo guardado en el catalogo.

```text
Detectar nueva version
-> actualizar datos factuales
-> comparar snapshot anterior
-> localizar Pals/objetos afectados
-> encontrar builds relacionadas
-> marcar para revision
-> publicar cambios
```

No modificar automaticamente una build curada sin conservar una señal de que fue revisada.

## 12. Criterios de aceptacion del MVP

- Un usuario puede encontrar un equipo por objetivo y elemento.
- Cada build muestra exactamente cinco slots.
- Los equipos con Pals repetidos se renderizan correctamente.
- Una build puede no tener equipamiento.
- Un arma puede ser recomendada sin ser obligatoria.
- Una build puede declarar un arma obligatoria.
- La pagina explica el rol de cada Pal.
- Los filtros funcionan en movil.
- Un usuario puede guardar y quitar favoritos.
- Los favoritos sobreviven a una recarga.
- Un perfil publico como `dani123` puede representar una coleccion compartida.
- No se solicita email, contrasena ni datos personales.
- Los datos muestran version y fuente.
- Los datos invalidos no rompen la aplicacion.
- El script de validacion del catalogo pasa en CI: cinco slots por build, referencias existentes, enums validos, fuente presente.

## 13. Auditoria previa a implementacion

Realizada el 2026-08-09 por `opencode-go/qwen3.8-max` en sesion nueva; hallazgos en `docs/auditoria.md`, ya incorporados a este documento.

Una segunda sesion de OpenCode debe auditar este documento antes de escribir codigo.

El auditor debe revisar especificamente:

- si el alcance sigue siendo personal y no social;
- si los IDs publicos estan modelados como colecciones, no como autenticacion;
- si se permiten Pals repetidos;
- si el equipamiento es opcional;
- si el modelo distingue `recommended` de `required`;
- si el MVP puede arrancar sin backend;
- si las fuentes son suficientes para 20-30 builds;
- si la taxonomia evita clasificaciones ambiguas;
- si el motor futuro puede ser determinista y explicable;
- si hay tareas innecesarias que eliminar;
- si faltan pruebas de validacion del catalogo.

El auditor debe producir hallazgos y cambios sugeridos. No debe reescribir el plan completo ni implementar codigo.

## 14. Flujo de modelos recomendado

Catalogo de opencode GO verificado 2026-08-09; todos los modelos existen hoy.

Por fase:

- Fase 0, esquema y diseno del catalogo: `opencode-go/deepseek-v4-pro` o `opencode-go/gpt-5.6-luna` (ventanas de 1M+).
- Fase 0, normalizacion repetitiva de las 20-30 builds: `opencode-go/deepseek-v4-flash`.
- Fase 1, frontend MVP: `opencode-go/kimi-k2.7-code` o `opencode-go/deepseek-v4-pro`.
- Fase 2, funcion de perfiles: `opencode-go/deepseek-v4-pro`.
- Fase 3, reglas de sinergia y pipeline de updates: diseno con `opencode-go/deepseek-v4-pro` o `opencode-go/gpt-5.6-luna`; implementacion con `opencode-go/kimi-k2.7-code`.

Para una auditoria independiente:

- `opencode-go/grok-4.5` o `opencode-go/qwen3.8-max`.

La auditoria debe realizarse en una sesion nueva leyendo este archivo, para evitar que el segundo modelo herede demasiado las conclusiones de la sesion que redacto el plan.

## 15. Proximo paso

Fase 0 completa. Taxonomia, esquema JSON, contrato del catalogo, discovery
de fuentes, snapshot factual (289 Pals, 1444 items), catalogo de 29 builds
y script de validacion con CI, todo verificado en `npm run validate`.

Fase 1 (MVP local) en curso, nucleo funcional ya construido y verificado en
navegador (Playwright): Astro 7 + Preact (isla) + Tailwind v4, modo oscuro
unico (investigado contra palmods.gg y paldb.gg: fuente real de colores por
elemento tomada de paldb.gg, tipografia Manrope/Space Grotesk/JetBrains Mono
inferida del propio palmods.gg). Listado con busqueda, filtros por objetivo,
elemento, progresion y requisitos, favoritos en `localStorage` persistentes
tras recarga, 29 paginas de detalle estaticas via `getStaticPaths`. Capa de
datos (`src/lib/data.ts`) resuelve el join build->Pal->item en tiempo de
build; verificado que `pals.json`/`items.json` (758KB) no llegan al cliente
(bundle de JS total ~32KB).

Bilingue: la app tiene dos arboles de rutas estaticas completas, `/`
(espanol, locale por defecto) y `/en/` (ingles), en vez de un toggle por
JavaScript. Motivo: el usuario juega con un amigo que tiene el juego en
ingles: un enlace compartido (relevante para los perfiles de Fase 2) debe
cargar directo en el idioma de quien lo recibe, no depender de localStorage.

- `src/lib/i18n.ts` y `taxonomyLabels(locale)` en `src/lib/taxonomy.ts`
  cubren toda la interfaz (nav, filtros, etiquetas de taxonomia) en ambos
  idiomas.
- El contenido de las 29 builds (`summary`, `explanation` por Pal,
  `synergyNotes`, razones de alternativas/equipamiento) esta traducido al
  espanol en `data/catalog.es.json`, como capa aparte de `data/catalog.json`
  (que permanece en ingles, fiel a palmods.gg). `src/lib/data.ts` superpone
  la traduccion por posicion de array cuando `locale === "es"`.
- Verificacion de fidelidad numerica: `scripts/validate-translations.mjs`
  (`npm run validate:translations`, tambien en CI) compara cada texto
  ingles/espanol y falla si los porcentajes, segundos o niveles no coinciden
  exactamente entre ambos idiomas. Paso el chequeo en las 29 builds sin
  ningun desajuste.
- Favoritos en `localStorage` son compartidos entre locales (clave por
  `build.id`, no por texto), verificado en navegador: marcar favorito en
  espanol y cambiar a `/en/` conserva el estado.

Iconos: Pals y equipamiento tienen icono real (self-hosted, no hotlink) en
listado y detalle, con fallback honesto (inicial del nombre para Pals sin
icono; nada para items sin icono) en vez de un glifo generico inventado.
Fuente, decisiones y huecos conocidos documentados en
`docs/data-sources.md` seccion 6. Script: `scripts/fetch-icons.mjs`
(`npm run icons:fetch`).

Fase 1 cerrada salvo pulido visual futuro. Exportacion/importacion local de
favoritos se descarta a pedido del usuario: la busqueda cubre esa necesidad.

## Fase 2: perfiles compartidos (codigo completo, pendiente de desplegar)

Implementada siguiendo la arquitectura de la seccion 8: perfiles como JSON
en `data/profiles/<id>.json`, escritos por una funcion serverless via GitHub
Contents API, sin cuentas ni contrasenas.

- **Adaptador**: `@astrojs/vercel`, `output: "static"` (sin cambiar el resto
  del sitio, que sigue pre-renderizado); solo la API y las paginas de perfil
  usan `export const prerender = false` ya que un ID de perfil es texto
  libre del usuario, no se puede pre-generar.
- **API**: `src/pages/api/profile/[id].ts` — `GET` lee el perfil (o
  `favorites: []` si el ID nunca se uso), `PUT` lo actualiza. Ambos validan
  el formato del ID (`src/lib/profileId.ts`, kebab-case, 3-32 caracteres) y
  el `PUT` descarta cualquier `buildId` que no exista en el catalogo o pase
  del limite de 200 favoritos (`src/lib/profile.ts`) — nunca confia en el
  array que manda el navegador.
- **GitHub**: `src/lib/github.ts`, server-only (usa `process.env`, nunca se
  bundlea al cliente). Credenciales via `GITHUB_TOKEN` (fine-grained PAT,
  solo este repo, permiso `Contents: Read and write`), `GITHUB_REPO`,
  `GITHUB_BRANCH`.
- **Cliente**: `src/components/useFavorites.ts` extendido con `joinProfile`
  / `leaveProfile`. Los favoritos siguen viviendo en `localStorage` primero
  siempre; un perfil activo solo agrega una sincronizacion de mejor esfuerzo
  (debounce de 1.2s) hacia el backend. Si el backend no responde, el toggle
  local sigue funcionando sin bloquear ni perder datos — verificado
  apagando el backend (sin variables de entorno) y confirmando que la app
  entera sigue operando en modo local, con un mensaje claro en vez de un
  error silencioso o una pantalla rota.
- **UI**: `ProfileControl.tsx` en la pagina de inicio (unir/salir de un
  perfil); `/profile/:id` y `/en/profile/:id` (`ProfilePage.astro`) muestran
  la coleccion de alguien mas de forma publica, con un boton para adoptar
  ese perfil en el dispositivo actual (fusiona favoritos locales + remotos,
  no los reemplaza silenciosamente).

Verificado en navegador local (sin backend configurado, como corresponde
antes de desplegar): mensajes de error correctos en vez de crashear,
validacion de formato de ID en el cliente antes de llamar a la red, favoritos
locales intactos en todo momento.

**Desplegado y verificado en produccion** (2026-08-09): repo publico en
`github.com/tuwangi/palworld-builds`, proyecto en Vercel conectado,
`GITHUB_TOKEN`/`GITHUB_REPO`/`GITHUB_BRANCH` configurados. Probado en vivo:
`GET`/`PUT` en `/api/profile/:id` contra el repo real, un commit de perfil
de prueba creado y borrado limpiamente, y confirmado que la sanitizacion de
`buildId` inventados funciona en produccion (no solo en local). El repo se
hizo publico a proposito: Vercel Hobby bloquea deploys automaticos cuando
quien hace `git push` no es la cuenta duena del proyecto ni parte de su
team, y ese era el caso aqui (colaborador con cuenta de GitHub distinta).

Bug encontrado y corregido ya en produccion: los iconos (Fase 1) no
aparecian nada mas desplegar, solo el fallback de inicial. Causa: la
comprobacion de "existe el icono" usaba `existsSync` sobre una ruta relativa
a `import.meta.url` del propio `src/lib/data.ts`, que apunta al codigo
fuente real en `astro dev` pero deja de ser valida una vez que Vite empaqueta
ese modulo para produccion. Arreglado leyendo un manifiesto JSON
pre-generado (`data/snapshot/icons-manifest.json`,
`scripts/fetch-icons.mjs`) en vez de tocar el filesystem — verificado esta
vez contra el HTML real servido en produccion, no solo contra los archivos
de `dist/`.

Checklist de despliegue (ya completado, queda como referencia si se necesita
reproducir en otro entorno): `docs/deployment.md`.
