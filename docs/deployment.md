# Desplegar Fase 2 (perfiles compartidos)

**Ya desplegado (2026-08-09).** Repo: `github.com/tuwangi/palworld-builds`
(publico). App: `palworld-builds.vercel.app`. Este documento queda como
referencia por si hay que reproducir el setup en otro entorno.

## Por que el repo es publico

Vercel Hobby bloquea el deploy automatico cuando quien hace `git push` en
GitHub no es la cuenta duena del proyecto en Vercel ni parte de su team
(mensaje real: *"attempted to deploy a commit... but they're not a member
of the team"*). Aqui el colaborador que empuja los commits (`daniel-lca`)
es una cuenta de GitHub distinta a la duena del proyecto Vercel (`tuwangi`).
Esa restriccion no aplica a repos publicos, asi que se opto por eso en vez
de pagar Pro o forzar que todos los push salgan de una sola cuenta.

Consecuencia real: el catalogo, el codigo y los iconos self-hosted (assets
de Pocketpair, ya usados como cualquier wiki fan) quedan visibles
publicamente. El `GITHUB_TOKEN` nunca estuvo en el repo — vive solo como
variable de entorno en Vercel — asi que hacer el repo publico no expuso
ninguna credencial.

## Pasos seguidos (referencia)

## 1. Repo en GitHub

Este directorio todavia no es un repositorio git. Pasos:

```bash
git init
git add .
git commit -m "Fase 0-2: catalogo, app bilingue, perfiles compartidos"
```

Luego crear un repo vacio en GitHub (sin README, sin .gitignore — ya existen
aqui) y conectarlo:

```bash
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

## 2. Token de GitHub (fine-grained PAT)

En GitHub → Settings → Developer settings → Fine-grained personal access
tokens → Generate new token:

- **Repository access**: solo este repositorio (no "All repositories").
- **Permissions**: `Contents` → **Read and write**. Ningun otro permiso hace
  falta.
- Expiracion: la que prefieras; renovar cuando toque.

Copia el token una sola vez (GitHub no lo vuelve a mostrar).

## 3. Proyecto en Vercel

1. En Vercel, "Add New Project" → importar el repo de GitHub recien creado.
2. Framework preset: Vercel detecta Astro automaticamente.
3. Antes de desplegar, agregar las variables de entorno (Settings →
   Environment Variables), disponibles para Production y Preview:

   | Variable | Valor | Notas |
   | --- | --- | --- |
   | `GITHUB_TOKEN` | el PAT del paso 2 | marcar como *Sensitive* |
   | `GITHUB_REPO` | `<tu-usuario>/<tu-repo>` | sin `https://`, solo `owner/repo` |
   | `GITHUB_BRANCH` | `main` | opcional, por defecto ya es `main` |

4. Deploy.

## 4. Verificar que funciona

Con el deploy ya arriba:

```bash
curl https://tu-app.vercel.app/api/profile/dani123
```

Debe responder `{"id":"dani123","favorites":[]}` (200) en vez de
`{"error":"backend_not_configured"}` (503). Si sigue devolviendo 503, revisa
que las tres variables de entorno esten bien escritas y que el deploy sea
posterior a haberlas guardado (Vercel no las aplica a deploys ya hechos).

Luego, desde la app: escribir un ID en el campo de perfil de la pagina de
inicio, agregar un favorito, y confirmar que aparece un archivo nuevo en
`data/profiles/<id>.json` en el repo de GitHub (cada guardado crea un commit
automatico ahi, tal como especifica `docs/plan.md` seccion 8).

## Notas

- El primer commit de un perfil nuevo lo crea la funcion serverless, no tu
  git local — no hace falta hacer `git pull` para verlo confirmado, solo
  refrescar la pagina del repo en GitHub.
- Cada favorito marcado o quitado con un perfil activo genera un commit
  (con un retraso de ~1.2s para agrupar cambios rapidos, ver
  `src/components/useFavorites.ts`). Para dos usuarios esto es intrascendente;
  si el catalogo se compartiera mas ampliamente convendria revisar el
  volumen de commits.
- Sin estas tres variables configuradas, la app entera sigue funcionando en
  modo local-only (localStorage): el perfil compartido es un extra, no una
  dependencia dura.

## Proteccion de escritura de perfiles (agosto 2026)

Hasta esta revision, `PUT /api/profile/<id>` no verificaba nada: cualquiera
podia sobrescribir la coleccion de cualquier ID, y cada request generaba un
commit en un repo publico.

Ahora funciona asi, sin romper la promesa de "sin cuenta ni contrasena":

- **Leer sigue siendo abierto.** `GET /api/profile/<id>` responde a cualquiera
  — es lo que hace que compartir un enlace funcione. Ademas devuelve
  `claimed: true|false` para que el cliente sepa si el ID ya tiene dueno.
- **Escribir exige un token.** El navegador genera 32 bytes aleatorios la
  primera vez que usa un ID y los guarda en
  `localStorage["palworld-builds:profile-token:<id>"]`. Se envian como
  `Authorization: Bearer <token>`. El servidor guarda **solo el SHA-256** en
  `data/profiles/<id>.json` (`tokenHash`).
- **El primero que escribe reclama el ID.** Un ID nuevo — o uno creado antes
  de que existieran los tokens, como `tuwangi` y `byaweirdo` — queda ligado al
  primer dispositivo que escriba en el. A partir de ahi, sin ese token es 403.
- **Si pierdes el token**, el ID queda bloqueado para escritura. Define
  `ADMIN_PROFILE_TOKEN` en Vercel y envialo como bearer para recuperarlo o
  reasignarlo sin editar el JSON a mano. Es opcional; si no esta definida, la
  via de administracion simplemente no existe.

Dos limites mas, para que el sync debounced no llene el repo de commits:

- Una escritura que **no cambia nada** devuelve `{"unchanged":true}` y nunca
  llega a GitHub. Esto es lo que realmente corta el spam de commits.
- Un throttle en memoria de 12 escrituras por minuto y por `IP:id`. En
  serverless cada instancia tiene su propia memoria, asi que es un tope
  aproximado, no una cuota real — el limite que sostiene el sistema es el
  anterior.

Un conflicto de `sha` (dos pestanas guardando a la vez) ya no se pierde en
silencio: `writeProfile` relee el blob y reintenta una vez.

### Variables de entorno

| Variable | Obligatoria | Para que |
| --- | --- | --- |
| `GITHUB_TOKEN` | si | PAT fine-grained, `contents:write` solo en este repo |
| `GITHUB_REPO` | si | `owner/repo` |
| `GITHUB_BRANCH` | no | por defecto `main` |
| `ADMIN_PROFILE_TOKEN` | no | recuperar o reasignar un perfil bloqueado |
| `SITE_URL` | no | dominio para canonical/hreflang/sitemap; por defecto `https://palworld-builds.vercel.app` |
