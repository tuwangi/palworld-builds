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
