# Despliegue Vercel + Railway

Arquitectura del entorno desplegado:

```
Vercel (frontend React/Vite)
        │
        ├── VITE_API_URL ──► https://sigasuiza2026marquez-production.up.railway.app
        │                     (Core API + 7 microservicios)
        │
        └── VITE_WS_URL  ──► wss://sigasuiza2026marquez-production.up.railway.app

Railway (backend + PostgreSQL gestionado)
```

## Frontend (Vercel)

URL: **https://siga-suiza-2026-marquez.vercel.app**

> El dominio `https://siga-suiza-2026.vercel.app` corresponde a un despliegue
> antiguo y no debe usarse.

`siga_frontend/.env.production` define el backend público que Vite inyecta en
el build de producción:

```dotenv
VITE_API_URL=https://sigasuiza2026marquez-production.up.railway.app
VITE_WS_URL=wss://sigasuiza2026marquez-production.up.railway.app
```

Además, `vercel.json` incluye rewrites de `/auth`, `/api`, `/core` y `/ws`
hacia Railway, de modo que el frontend también funciona si no se define
`VITE_API_URL` en el panel de Vercel.

> Cualquier cambio en estas URLs requiere volver a desplegar en Vercel.

## Backend (Railway)

Proyecto: `victorious-elegance`
Servicio: `SIGA_SUIZA_2026_marquez`
Dominio: `https://sigasuiza2026marquez-production.up.railway.app`

Variables relevantes:

```dotenv
DATABASE_URL=postgresql+asyncpg://...@sakura.proxy.rlwy.net:15807/railway
DEBUG=false
```

El backend ejecuta `alembic upgrade head` al arrancar y luego levanta los 7
microservicios en procesos internos (ver `siga_backend/start_railway.sh`).

## Base de datos de Railway

El 2026-11-20 la BD de Railway no tenía usuarios ni la tabla
`core_role_permissions`. Se completó el esquema y se ejecutaron los seeders de
identidad:

```powershell
# Crear tablas faltantes (core_role_permissions, core_modules, core_audit_logs)
psql -h sakura.proxy.rlwy.net -p 15807 -U postgres -d railway -f scripts/fix_railway_missing_tables.sql

# Marcar la migración actual
docker compose exec -e "DB_URL=postgresql+psycopg://..." siga-core alembic stamp b1c2d3e4f5a6

# Crear roles, permisos y usuarios de prueba
docker compose exec -e "DATABASE_URL=postgresql+asyncpg://..." siga-core python seed_identity.py
```

## Credenciales de acceso

| Entorno | Usuario | Contraseña |
|---|---|---|
| SIGA (local y Vercel) | `admin@siga.edu` | `admin123` |
| pgAdmin | `admin@siga.edu` | `admin` |
| PostgreSQL local | `postgres` | `admin` |
| PostgreSQL Railway | `postgres` | Ver `railway variables` |

## Verificación

```powershell
curl https://sigasuiza2026marquez-production.up.railway.app/health
curl -X POST "https://sigasuiza2026marquez-production.up.railway.app/auth/login?email=admin%40siga.edu&password=admin123"
```
