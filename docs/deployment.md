# Desplegar Fase 2 (perfiles compartidos)

El codigo de Fase 2 ya esta completo y probado localmente (ver
`docs/plan.md`). Lo que falta es exclusivamente configuracion de cuentas
externas (GitHub, Vercel) que solo el usuario puede hacer — requieren sus
credenciales, no las mias.

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
