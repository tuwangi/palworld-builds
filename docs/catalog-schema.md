# Contrato del catalogo

Este documento define el contrato que debe cumplir el catalogo de `Team Build`.
El esquema formal esta en `schemas/team-build.schema.json`.

## Estructura

El archivo de catalogo sera un objeto con:

```text
schemaVersion: "1.0.0"
gameVersion: "1.0"
builds: TeamBuild[]
```

Cada `TeamBuild` representa exactamente un equipo activo de cinco Pals. Los
IDs de Pal pueden repetirse intencionalmente: cuatro Gobfin y un carry es un
caso valido.

## Reglas de contenido

- `id` y `slug` usan kebab-case ASCII y son estables.
- `pals` tiene exactamente cinco entradas.
- `equipment: []` significa que no hay equipamiento documentado o que no aplica.
- Un elemento de `equipment` siempre tiene `itemId`, `kind` y `status`.
- `status` solo puede ser `recommended` o `required`; la ausencia de equipo se
  representa con un array vacio, no con un objeto ficticio.
- `purpose`, `role`, `requirements`, `elements` y `progression` usan solamente
  los enums del JSON Schema.
- `source.url` y `source.capturedAt` son obligatorios.
- `gameVersion` de las primeras builds es `1.0`.
- `verification` describe la confianza editorial, no una puntuacion de calidad.
- No inventar cifras, requisitos, partner skills o equipamiento que la fuente
  no documente. Si un dato es ambiguo, omitirlo o explicarlo como opcional.

## Referencias externas

La validacion de IDs contra los datos factuales ocurre en el script de catalogo
(`scripts/validate-catalog.mjs`, ejecutable con `npm run validate`), porque
JSON Schema no puede conocer por si solo los Pals y objetos validos. El
snapshot que usa como referencia se genera con `scripts/build-snapshot.mjs`
(`npm run snapshot:build`) y se documenta en `docs/data-sources.md`.

Ese script comprueba:

- cada `palId` existe en el snapshot factual;
- cada `itemId` y alternativa existe;
- `gameVersion` coincide con el snapshot seleccionado;
- cada build tiene cinco slots y enums validos;
- cada fuente tiene URL y fecha validas;
- se genera cobertura por objetivo y builds sin equipamiento.

## Instrucciones para normalizar builds

Para cada fuente, conservar la URL y la fecha de captura. Crear una build solo
cuando el equipo pueda reconstruirse con claridad. No convertir una tier list
general en una build de cinco slots sin evidencia suficiente. Las builds de
Game8 requieren verificacion adicional contra Palworld 1.0 mientras su contenido
termine de migrar.

La normalizacion masiva puede ejecutarse con `opencode-go/deepseek-v4-flash`
despues de que el esquema y las reglas hayan sido revisados.
