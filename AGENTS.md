<!-- bmad:context -->
<!-- Verified 2026-11-09 against 7a51dc6. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## vms

Frontend de operación de VMS (live, VOD, fast channels, CDN) para Mediaset. Next.js 16 App Router + NextAuth v5 (Entra ID), React Query, Tailwind; los route handlers de `app/api/` hacen de BFF hacia Enigma, Jules, Atenea y las CDN. Artefactos BMad en `_bmad-output/`. Tickets en Jira, proyecto MLTMED.

## Policy

- Trabaja solo en este fork (`origin` = `jgbeliz88/vms`); nunca hagas push ni abras PR contra `grupomediaset/*` — el equipo lo sube a Mediaset.
- PR a `dev` desde `feat/MLTMED-<n>-<desc>` o `fix/MLTMED-<n>-<desc>`; no crees `release/*`, `hotfix/*` ni tags.
- Nunca ejecutes nada que toque PRE/PRO, registries (ACR, Nexus) o infra real: `kubectl`, `terraform` (y `make` en `ci/`), `vault`, `az`, `docker push`. Propón el comando al humano. (Un hook de `.claude/settings.json` lo bloquea en Claude Code.)
- `ci/**` y `Dockerfile` son de Sistemas (`.github/CODEOWNERS`); no los cambies salvo que la tarea lo pida, y dilo en la PR.
- Nunca subas secretos ni `.env*`; en despliegue vienen de Vault (`ci/k8s/*/resources/00-vault.yaml`), en local solo `.env.local` sin versionar.
- Código nuevo con tests unitarios: TODO — no hay framework de tests; la elección está pendiente con el equipo. No añadas uno por tu cuenta.
- No publiques nada de este proyecto en Slack ni en canales de otros equipos (ni anuncios de PR, merge o despliegue); informa solo en la terminal.

## Where things are

- Auth y roles: `auth.ts` (Entra ID, JWT 8 h), `proxy.ts` (exige `vms_access_app`; excluye `api/auth` y `api/status-*`), permisos finos en `lib/auth/permissions.ts`.
- Variables de entorno de servidor: `app/api/_lib/env-urls.ts` (`import "server-only"`).
- Lógica por dominio en `features/<dominio>/`; UI en `components/<dominio>/`; páginas en `app/<dominio>/page.tsx`.

## Running and verifying

- Runtime Node 24 (imagen base del `Dockerfile`); el repo no declara `engines`.
- No hay script de typecheck ni de tests: verifica con `npx tsc --noEmit` y `npm run lint` antes de abrir PR.
- `npm run format` reescribe todo el repo (`prettier --write .`); formatea solo lo que tocas con `npx prettier --write <ficheros>`.
- `npm run dev` necesita `AUTH_AZURE_AD_*` y URLs reales; para probar permisos usa `DEV_EXTRA_ROLES=<rol,...>` (solo con `NODE_ENV=development`), nunca roles hardcodeados.

## Conventions that differ from defaults

- Llamadas HTTP salientes desde `app/api/` vía `fetchVMS` (`app/api/_lib/fetch.ts`), no `fetch` directo.
- Query keys de React Query solo desde `lib/query-keys.ts`.
- Commits Conventional con scope de dominio: `fix(vod): …`, `feat(live): …`.

<!-- /bmad:context -->
