# Traducciones al español

La app es bilingüe (`es` por defecto en la raíz, `en` bajo `/en/`). Hay
**tres** fuentes de texto en español y ninguna se genera en tiempo de
ejecución.

| Qué | Dónde | Clave |
| --- | --- | --- |
| Interfaz (botones, títulos, mensajes) | `src/lib/i18n.ts` | nombre del string |
| Taxonomía (objetivo, rol, elemento, requisito…) | `src/lib/taxonomy.ts` | valor del enum del schema |
| Contenido de las builds (nombre, resumen, notas) | `data/catalog.es.json` | `id` de la build |
| Habilidades de compañero | `data/partner-skills.es.json` | nombre EN de la habilidad |
| Escalado por condensación | `data/partner-skill-scaling.es.json` | `effectType` / `target` EN |

## Por qué las habilidades son datos y no código

Hasta agosto de 2026, `src/lib/partnerSkillLocalization.ts` traducía las
descripciones aplicando ~60 expresiones regulares ordenadas sobre el texto en
inglés. El resultado medido: **las 125 descripciones alcanzables desde una
build seguían conteniendo inglés**, y las reglas se pisaban entre sí porque
`the player's ([A-Za-z ]+)` es codicioso y se tragaba media frase:

```
"la Ataque is increased by  del jugador50%"
"...dealing daño equal to a percent of la attack daño..."
```

Reescribir prosa con sustituciones no puede funcionar: el español reordena
las oraciones y una tabla de reemplazos no sabe dónde termina una cláusula.
Por eso el español vive en un JSON y el módulo solo hace lookup.

**Regla:** si falta una clave, se muestra el inglés. Visiblemente sin traducir
es mejor que traducido con confianza y mal.

## Casos raros que hay que respetar

- **Elgrove** aparece en wiki.gg con el nombre de habilidad **vacío**. No se
  inventa: la clave en `partner-skills.es.json` es `""` y la UI oculta el
  título cuando el nombre está vacío.
- **Cinco pares Pal/variante comparten nombre de habilidad pero no
  descripción** (Gobfin / Gobfin Ignis, Gorirat / Gorirat Terra, Kingpaca /
  Kingpaca Cryst, Menasting / Menasting Terra, Vanwyrm / Vanwyrm Cryst). La
  clave por nombre traduce la variante base; la sección `byPalId` sobrescribe
  la otra. El validador compara **por Pal**, no por nombre, justamente para
  detectar esto.
- **17 Pals usados en builds no tienen habilidad en wiki.gg** (son variantes
  1.0 que solo existen en paldb.gg). La UI lo dice explícitamente en vez de
  mostrar una tarjeta vacía.

## Convenciones

- Nombres de Pals: **en inglés** (la app los muestra así en ambos idiomas).
- Objetos, armas y términos del juego: **traducidos**, igual que en
  `catalog.es.json` ("Rifle de Asalto", "Lanzacohetes", "Aceite de Pal de alta
  calidad").
- Elementos: `Pals de Fuego`, `Pals de Agua`, `Pals de Planta`, `Pals de
  Hielo`, `Pals de Tierra`, `Pals Eléctricos`, `Pals Oscuros`, `Pals Dragón`,
  `Pals Neutrales` — alineado con `taxonomy.ts`.
- `build` es **femenina** en todo el proyecto ("la build", "esta build").
- `(Does not stack)` → `(No es acumulable)`.
- Ninguna cifra cambia al traducir.

## Validación

```bash
npm run validate:translations
```

Comprueba, y falla el build si algo no cuadra:

1. Toda build tiene `name`, `summary`, `pals[]`, `synergyNotes[]`,
   `equipment[]` y `alternatives[]` en español, con la misma longitud de array
   que el inglés.
2. Todo Pal con habilidad tiene entrada en español (por `byPalId` o por
   nombre).
3. Los `effectType` y `target` del escalado tienen etiqueta en español.
4. **Los números coinciden exactamente** entre inglés y español.
5. **El texto español no es inglés**: si un campo contiene dos o más palabras
   funcionales inglesas (`the`, `while`, `increases`, `damage`…), falla. Este
   es el chequeo que faltaba y que dejó pasar las habilidades rotas — los
   nombres propios que sí van en inglés no contienen ninguna de esas palabras,
   así que no producen falsos positivos.
6. Claves huérfanas en ambos sentidos: traducciones que ya no existen en el
   snapshot, y overrides `byPalId` de Pals que ya no existen.

## Cuando se refresca el snapshot

`npm run snapshot:build` puede traer habilidades nuevas o renombradas. En ese
caso `validate:translations` falla indicando exactamente qué clave falta o
sobra. Añadir la traducción al JSON; no tocar el módulo de TypeScript.

Si solo cambian las reglas de limpieza de wikitext (`scripts/lib/wikitext.mjs`),
`npm run snapshot:normalize` las reaplica al snapshot ya descargado sin volver
a pedir nada a la red.
