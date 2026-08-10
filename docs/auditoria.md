# Auditoria de docs/plan.md

Fecha: 2026-08-09.
Auditor: sesion nueva con `opencode-go/qwen3.8-max` (modelo independiente del que redacto el plan, `opencode-go/gpt-5.6-luna`), segun el procedimiento de la seccion 13 del propio plan.
Alcance: hallazgos y cambios sugeridos. No se reescribe el plan ni se implementa codigo.

Nota de contexto: la sesion que redacto el plan sufrio una compresion prematura de contexto (plugin DCP con mapa de modelos desactualizado comprimia al ~10% de la ventana real). Esta auditoria verifica el plan contra los requisitos originales del usuario, que se conservaron aparte de esa sesion.

## Veredicto general

El plan es solido y utilizable. Supera el checklist de la seccion 13 en casi todos los puntos. Tiene un error factual en fuentes, un gap de infraestructura (probablemente perdido en la compresion de la sesion original) y algunos ajustes menores. Ningun hallazgo bloquea empezar la Fase 0.

## Checklist seccion 13: resultado

| Punto | Resultado |
| --- | --- |
| Alcance personal, no social | OK. Sin votos, comentarios, moderacion, rankings. |
| IDs publicos como colecciones, no autenticacion | OK. Seccion 8 explicita: "El perfil no es una cuenta y el ID no es secreto". |
| Pals repetidos permitidos | OK. Explicito: cinco slots, IDs repetidos, ejemplo cuatro Gobfin + carry. |
| Equipamiento opcional | OK. Estados none/recommended/required; "no debe bloquear una build". |
| Distincion recommended/required | OK. |
| MVP arranca sin backend | OK. localStorage primero, Supabase despues. |
| Fuentes suficientes para 20-30 builds | OK, verificado en vivo (ver Hallazgo H2). |
| Taxonomia sin ambiguedad | OK con matices (ver H5). |
| Motor futuro determinista y explicable | OK. Funcion pura, reglas versionadas, sin DPS exacto. |
| Tareas innecesarias | Dos candidatas (ver H6). |
| Pruebas de validacion del catalogo | Faltan como criterio exigible (ver H7). |

## Hallazgos

### H1 — Error factual: paldb.gg no tiene partner skills (seccion 6)

El plan dice que wiki.gg Cargo y paldb.gg sirven para validar "nombres, elementos, partner skills, armas, objetos y version". Verificado en vivo: paldb.gg declara explicitamente en /about que NO publica partner skills (el join de tablas no esta terminado y prefieren omitirlos antes que mostrarlos vacios).

Cambio sugerido: en seccion 6, asignar la validacion de partner skills a wiki.gg Cargo (tablas `PalPartnerSkill`, 278 filas, y `PalPartnerSkillScale`, 1678 filas con escalado por rank de condensacion). paldb.gg queda para nombres, elementos, stats, objetos y version (es datamineo automatico de los DataTables del juego, la referencia mas fiable y actualizada).

### H2 — Fuentes verificadas en vivo (2026-08-09): suficientes, con un matiz de version

Palworld 1.0 ya lanzo (julio 2026); todo el ecosistema se esta actualizando a 1.0. Estado de cada fuente del plan:

- `palmods.gg/guides/builds`: viva y actualizada a 1.0. 30 guias de builds + 8 plantillas por elemento, equipos de 5 slots con rol por slot, alternativas y efectos resueltos contra el dataset 1.0. Por si sola cubre la meta de 20-30 builds iniciales. Tiene ademas Team Builder propio y una pagina /docs/api que conviene revisar en Fase 0 por si expone datos estructurados.
- `palworld-db.com/team-builder`: viva. Es herramienta (presets, share links, analisis de partner skills stackeados), no catalogo curado; util como referencia y para validar interacciones.
- `game8.co/games/Palworld/archives/439567`: viva (actualizada 2026-08-07) pero muestra el aviso "currently updating our guides to reflect Version 1.0". Contenido mixto pre/post 1.0.
- `palworld.wiki.gg` Cargo: viva. Tablas utiles: Pal (278), PalPartnerSkill, PalPartnerSkillScale, Item (1444), ItemEquipment (625), GameVersions (68). Ojo: cubre 278 Pals frente a los 288 de paldb.gg; la wiki va algo atras en 1.0, por lo que el cross-check debe tratar paldb.gg como autoridad de cobertura.

Cambios sugeridos:
- Seccion 6: anadir que game8 puede contener datos pre-1.0 y que toda build extraida de alli debe verificarse contra 1.0 antes de entrar al catalogo.
- Seccion 9 Fase 0: fijar `gameVersion` inicial del catalogo a "1.0".
- Seccion 11: la tabla `GameVersions` de wiki.gg es el candidato natural para "detectar nueva version".

### H3 — Gap: falta el stack tecnico y el hosting (probable perdida por compresion)

El usuario pidio explicitamente "webapp que se pueda abrir desde cualquier telefono en un navegador, probablemente hosteada en Vercel y GitHub". El plan no menciona stack, hosting ni repo en ninguna seccion.

Cambio sugerido: anadir una seccion breve de infraestructura con la decision (o el criterio para tomarla en Fase 1). Propuesta minima acorde al alcance personal:
- App estatica responsive (Astro o Next.js en modo estatico; sin servidor propio).
- Catalogo como JSON en el repo (fuente de verdad versionada en GitHub).
- Deploy en Vercel conectado al repo.
- Supabase solo en Fase 2, igual que dice el plan.

### H4 — Orden de fases: el perfil por ID podia ser MVP

El usuario dijo que el "login" por ID para favoritos debia ser MVP "si es suficientemente facil". El plan lo mueve a Fase 2. Es defendible (localStorage primero elimina riesgo del MVP), pero conviene dejar escrito que Fase 2 puede adelantarse si Supabase se configura rapido, para no perder la intencion original.

La exclusion de "crear builds" es correcta: el usuario la elimino explicitamente ("la segunda se iria"). No reincorporarla.

### H5 — Taxonomia: solape exploration/mobility, aceptable

`exploration` y `mobility` se solapan (las builds de traversal son ambas). Como `purpose` es un array multi-etiqueta no hay ambiguedad real: se marcan las dos. No hace falta cambiar nada; solo documentar en Fase 0 que el solape es intencional y se resuelve con multi-etiqueta.

### H6 — Tareas candidatas a recortar

- `verification: "unverified" | "reviewed" | "cross_checked"`: tres niveles es quiza sobreingenieria para uso personal. Sugerencia: mantener el campo pero aceptar que en la practica casi todo sera "unverified" o "cross_checked"; no construir UI ni flujos alrededor del estado intermedio.
- Exportacion/importacion local (Fase 1): ya esta marcada como opcional; mantenerla al final de la fase o fuera hasta que haga falta real.

### H7 — Falta: validacion automatizada del catalogo como criterio exigible

La Fase 0 menciona "validar cinco slots" y "validar referencias", pero no existe una prueba automatizada exigible. Sugerencia de anadir a Fase 0 y a los criterios de aceptacion (seccion 12):

- Script de validacion que corre en CI (o pre-commit) y falla si alguna build: no tiene exactamente 5 slots; referencia un palId o itemId inexistente en los datos factuales; usa un valor fuera de los enums de objetivo/rol/requisito/progresion; o tiene `source.url` vacia.
- El mismo script genera el informe de cobertura (builds por objetivo, builds sin equipamiento, etc.).

## Recomendacion de modelos (verificada contra el catalogo actual de opencode GO, 2026-08-09)

La seccion 14 del plan sigue vigente; todos esos modelos existen hoy. Ajustes:

- Redactar/mantener el plan: `opencode-go/deepseek-v4-pro` (1M ctx) o `opencode-go/gpt-5.6-luna` (1.05M ctx) ahora que DCP ya no comprime al 10%.
- Implementar: `opencode-go/kimi-k2.7-code` o `opencode-go/deepseek-v4-pro`.
- Normalizacion repetitiva de builds: `opencode-go/deepseek-v4-flash`.
- Auditoria independiente: `opencode-go/grok-4.5` o `opencode-go/qwen3.8-max` (esta auditoria la hizo qwen3.8-max).

## Resumen de cambios a incorporar en plan.md

1. Seccion 6: partner skills los valida wiki.gg Cargo, no paldb.gg; game8 puede tener datos pre-1.0; paldb.gg es autoridad de cobertura (288 Pals).
2. Nueva seccion de infraestructura: stack estatico + JSON en repo + Vercel + GitHub.
3. Fase 0: fijar gameVersion "1.0"; anadir script de validacion automatizada del catalogo (tambien a seccion 12).
4. Seccion 9/Fase 2: nota de que puede adelantarse si resulta trivial.
5. Seccion 11: usar tabla GameVersions de wiki.gg como detector de versiones.
6. Seccion 4: nota de que exploration/mobility se solapan a proposito (multi-etiqueta).

---

# Auditoria de contenido del catalogo — 2026-08-10

Auditor: sesion de Claude Opus 5. Alcance: verificar cada cifra que el
catalogo afirma sobre un Pal contra los datos reales de wiki.gg
(`PalPartnerSkill` + `PalPartnerSkillScale`), y contra la fuente citada por
cada build.

## Resultado

De **154 slots que citan un porcentaje**:

| Veredicto | Slots | Que significa |
| --- | --- | --- |
| OK | 58 | todas las cifras aparecen en los datos del Pal |
| PARCIAL | 36 | algunas si — normalmente un valor real mas un total derivado (5% x 30 stacks = 150%), que es legitimo |
| CONTRADICHO | 49 | **ninguna** cifra citada existe en los datos del Pal |
| SIN DATOS | 11 | wiki.gg no tiene fila de partner skill para ese Pal |

Reproducible con `npm run audit:scaling`.

## Los tres tipos de error encontrados

**1. Tope equivocado.** Los buffs de ataque por elemento van de +10% a +20%
(verificado en las 12 habilidades de ese tipo del juego, salvo Static
Electricity que si es 15%-30%). El catalogo repetia "15% a 30%" como
plantilla. Corregido donde el efecto coincidia.

**2. Estadistica equivocada.** `rooby` (Tiny Spark) aumenta el **Ataque** de
los Pals de Fuego; estaba descrito como Defensa. Mismo patron en varias
plantillas por elemento, donde el slot 1 siempre decia "Defensa" sin que
existiera tal efecto.

**3. Efecto inexistente.** El caso grave. Ejemplos verificados en vivo:

- `prixter` (4 builds): Scorpion Sonar **encuentra la salida de una mazmorra**.
  Estaba descrito como "+50% a 65% de daño mientras hay Veneno".
- `kikit` (2 builds): reduce el **peso del petroleo crudo**. Descrito como
  "+15% a 30% de Defensa a los Pals de Tierra".
- `quivern` (4 builds) y `dinossom`: su habilidad es daño elemental
  **solo mientras la montas** (+50% a +100%). Descritas como buffs pasivos de
  equipo. **No existe ningun Pal en el juego que aumente el ataque de los Pals
  Dragon** — la unica fila con target "Dragon Pals" es Dragon Hunter, y es
  tasa de objetos.
- `jormuntide` (soak-shock-overload): montura acuatica que evita gastar
  aguante. Descrita como amplificador de daño con Empapado.
- `silvegis` (5 builds): Aegis Shield no publica ninguna curva; las cifras
  "65% a 80% de reduccion de daño de escudo" no salen de ninguna fuente.

## Que dicen las fuentes citadas

- **palmods.gg** (29 builds): las URLs existen (HTTP 200).
- **game8.co** (6 builds): existen. La 443880 **no da** las cifras de
  Ragnahawk ni Gobfin que el catalogo le atribuye. La 440398 si dice "30%
  Attack buff at their Lv. 5 Partner Skill" para Cremis y Hoocrates —
  pero tanto la pagina de wiki.gg como su tabla Cargo dicen +20%, igual que
  las otras once habilidades del mismo tipo. game8 esta desactualizado ahi.
- **reddit.com** (9 builds): **no verificable**. Reddit bloquea el acceso
  automatizado (403 en www, old y proxies), igual que le pasaba a la sesion
  que redacto el plan (ver PLAN.md, "Filtro de calidad de fuente"). Ademas:
  - 5 de las 9 URLs son solo el ID del post, sin slug — un enlace copiado de
    un navegador siempre lleva slug.
  - 4 de los IDs empiezan por `1a...`, rango que corresponde a principios de
    2024, pero describen contenido exclusivo de 1.0 (Eidrolon, Bellanoir
    Libero, Knocklem Ignis).
  - Buscar los titulos citados en la web no devuelve ningun post.

  No se puede afirmar que esas 9 fuentes sean inventadas, pero no se ha
  podido confirmar que existan y su contenido no es reproducible.

## Que se corrigio en esta pasada

17 slots donde el efecto coincidia y solo la cifra estaba mal, en ingles y
español a la vez (Dark Knowledge y Fluffy Wool a 20%, Long-Sleeved Hurray
desde 10%, Queen Bee Command desde 0%, Aerial Marauder 20-40%, Black
Ankylosaur 100-200% de mineral, Blade of Uncontrolled Passion 10-15%, Flame
Wing 5-20%, y los buffs elementales de Bristla, Foxcicle, Dumud x2, Rooby).

## Que NO se corrigio, y por que

Los 49 CONTRADICHO + 11 SIN DATOS restantes no son un problema de numeros:
la afirmacion describe un efecto que ese Pal no tiene. Sustituir la cifra no
arregla nada, y escribir la descripcion real deja varias builds sin
justificacion (¿por que llevar a Prixter en un equipo de veneno si su
habilidad abre mazmorras?). Arreglarlo es re-redactar el catalogo desde
wiki.gg, y en algunos casos retirar la build. Esa es una decision de
producto.

Medida provisional tomada: **33 de las 44 builds bajaron a
`verification: "unverified"`** — las que contienen al menos una afirmacion
contradicha o sin datos. La app mostraba "Verificacion cruzada" sobre builds
cuyas cifras no resisten el cruce, y esa etiqueta era el problema mas urgente.
Las 11 restantes conservan su etiqueta.

## Segunda pasada — reescritura desde wiki.gg (2026-08-10)

Se reescribieron los 60 slots que la clasificacion marcaba como CONTRADICHO o
SIN DATOS, tomando el texto de los datos reales, y se sustituyeron Pals cuando
el efecto que la build necesitaba existia en otro Pal.

Resultado de `npm run audit:scaling`:

| | antes | despues |
| --- | --- | --- |
| OK | 58 | **82** |
| PARCIAL (total derivado, legitimo) | 36 | 37 |
| CONTRADICHO | 49 | **0** |
| SIN DATOS | 11 | **0** |

Los 37 PARCIAL restantes son todos totales derivados y ahora citan tambien el
valor por rango del que salen (ej. Orserk: +1% a +5% por carga, 30 cargas,
+150% a 4★), asi que la cifra es trazable.

### Efectos que se comprobo que NO existen en 1.0

`scripts/effect-index.mjs` invierte el snapshot y responde "quien da el efecto
X". Con el se confirmo que estas tres cosas, que el catalogo daba por hechas,
no las provee **ningun** Pal del juego:

- **Defensa por elemento.** Ninguna habilidad sube la Defensa de los Pals de un
  elemento. Las plantillas tenian un slot dedicado a eso en los ocho elementos.
- **Ataque de Pals Dragon.** El unico efecto con target "Dragon Pals" es
  Dragon Hunter (Cryolinx), y es tasa de objetos.
- **Daño contra enemigos envenenados.** Existen amplificadores para Ceguera
  (Roujay), Cubierto de hiedra (Needoll), Embarrado (Pierdon) y enemigos fuera
  de combate (Hoodle). Veneno no tiene ninguno. Cuatro builds lo asumian via
  Prixter, cuya habilidad real encuentra la salida de una mazmorra.

### Sustituciones de Pal

| Build | Sale | Entra | Por que |
| --- | --- | --- | --- |
| grass-team-template | Nitemary Botan | Warsect | no existe Defensa de Planta; Hard Armor da Defensa real al jugador |
| water-team-template | Gloopie Primo | Teafant | no existe Defensa de Agua; Soothing Shower cura de verdad |
| ice-team-template | Moldron Cryst | Vanwyrm Cryst | sin datos en wiki.gg; Aerial Marauder es amplificador verificado |
| ground-team-template | Kikit | Warsect Terra | Kikit reduce peso de petroleo, no da Defensa |
| dark-team-template | Wistella | Felbat | sin datos; Life Steal es el efecto defensivo Oscuro real |
| dragon-team-template | Dinossom | Chillet | Dinossom potencia daño de Planta montada |
| poison-and-blind-lock | Prixter | Vanwyrm Cryst | no existe amplificador de daño por Veneno |
| knocklem-poison-tank | Prixter | Robinquill Terra | idem |
| bellanoir-glass-cannon-rotation | Prixter | Vanwyrm Cryst | idem |
| poison-barrier | Prixter | Robinquill Terra | idem |
| eidrolon-hybrid-carry | Wistella | Croajiro Noct | buff Oscuro real en vez de una Defensa inventada |
| eidrolon-hybrid-carry | Dinossom | Felbat | Dinossom no aportaba nada a ese equipo |

### Build retirada

`dragon-fire-tower`: tres de sus cinco slots eran bonos de montura que no
pueden estar activos a la vez, un cuarto Pal (Eidrolon Ignis) no tiene fila en
wiki.gg, y su fuente de Reddit no se pudo confirmar. **43 builds** quedan.

### Etiquetas de verificacion, redefinidas

- `cross_checked` (25): cada cifra que cita esta respaldada por wiki.gg **y**
  su URL de fuente resuelve.
- `unverified` (18): la fuente no se pudo confirmar (las 8 de Reddit que
  quedan) o algun slot sigue apoyandose en un Pal sin datos.

Por fuente: palmods.gg 21/8, game8.co 4/2, reddit.com 0/8.
