# Entorno Docker + pgAdmin

Guía para levantar SIGA completo con Docker Compose usando el PostgreSQL local
(administrado desde pgAdmin) como fuente de verdad de los datos.

---

## 1. Arquitectura del entorno

```
┌──────────────────────────── Host Windows ────────────────────────────┐
│                                                                      │
│  PostgreSQL 18 (servicio postgresql-x64-18)   puerto 5432            │
│  Base de datos: siga_suiza_2026                                       │
│  Usuario: postgres          Password: admin                           │
│                                                                      │
│  ┌────────────────────── Docker Desktop ──────────────────────────┐  │
│  │                                                                │  │
│  │  siga-frontend  :5173  (Vite dev server)                       │  │
│  │  siga-core      :8000  (FastAPI Gateway + Identity)            │  │
│  │  mod-usuarios   :8001   mod-planes-estudio      :8002          │  │
│  │  mod-programas  :8005   mod-gestion-academica   :8006          │  │
│  │  mod-auditoria  :8007   mod-evaluacion          :8008          │  │
│  │  mod-admision   :8009                                          │  │
│  │  nats           :4222 (monitor :8222)                          │  │
│  │  redis          :6379                                          │  │
│  │  pgadmin        :5050  ── host.docker.internal:5432 ───────────┼──┘
│  └────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────┘
```

Los contenedores llegan al PostgreSQL del host mediante
`host.docker.internal:5432`. El archivo `pg_hba.conf` del PostgreSQL ya autoriza
las redes Docker (`172.16.0.0/12` y `192.168.0.0/16`) y escucha en `*`.

---

## 2. Configuración

El archivo `.env` de la raíz contiene las credenciales que usa Docker Compose:

```dotenv
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=siga_suiza_2026

PGADMIN_DEFAULT_EMAIL=admin@siga.edu
PGADMIN_DEFAULT_PASSWORD=admin
```

> `.env` está en `.gitignore`; usa `.env.example` como plantilla.

---

## 3. Comandos habituales

```powershell
# Levantar todo (usa las imágenes ya construidas)
docker compose up -d --no-build

# Reconstruir después de cambiar dependencias (requirements.txt / package.json)
docker compose up -d --build

# Estado y salud de los servicios
docker compose ps
curl http://localhost:8000/core/status

# Logs de un servicio
docker compose logs -f siga-core

# Detener todo (conserva volúmenes)
docker compose down

# Detener y borrar volúmenes (¡borra la configuración de pgAdmin!)
docker compose down -v
```

---

## 4. Accesos

| Servicio | URL | Credenciales |
|---|---|---|
| Frontend | http://localhost:5173 | `admin@siga.edu` / `admin123` |
| Core API | http://localhost:8000/health | — |
| Swagger Core | http://localhost:8000/docs | — |
| Estado de módulos | http://localhost:8000/core/status | — |
| pgAdmin (contenedor) | http://localhost:5050 | `admin@siga.edu` / `admin` |
| NATS monitoring | http://localhost:8222 | — |

El resto de cuentas de prueba está en
[90-CREDENCIALES-PRUEBA.md](90-CREDENCIALES-PRUEBA.md).

### pgAdmin

El contenedor crea automáticamente el servidor **SIGA - PostgreSQL local**
(`host.docker.internal:5432`, usuario `postgres`, BD `siga_suiza_2026`).
Al abrir el servidor por primera vez, pgAdmin pedirá la contraseña de la base:
`admin`.

También puedes usar el pgAdmin instalado en Windows
(`C:\Program Files\PostgreSQL\18\pgAdmin 4`) y registrar el servidor con:

- Host: `localhost`
- Port: `5432`
- Maintenance database: `siga_suiza_2026`
- Username: `postgres`
- Password: `admin`

> El primer arranque del contenedor `pgadmin` tarda 2–3 minutos mientras
> inicializa su base SQLite interna. Es normal que `:5050` no responda de
> inmediato.

---

## 5. Healthchecks y dependencias

- Cada microservicio expone `/health` y tiene healthcheck propio.
- `siga-core` espera a que los 7 módulos estén *healthy* antes de arrancar,
  evitando que el registro de módulos falle por timeout.
- `siga-frontend` y `pgadmin` esperan a que `siga-core` esté *healthy*.
- Todos los servicios usan `restart: unless-stopped`.

---

## 6. Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `core/status` muestra módulos `unhealthy` | Verifica `docker compose ps`; los healthchecks deben estar en `healthy`. Reinicia con `docker compose restart siga-core`. |
| Core no conecta a la BD | Comprueba que el servicio `postgresql-x64-18` esté corriendo y que `DB_PASSWORD` coincida con la del usuario `postgres`. |
| `:5050` no responde | Espera 2–3 minutos tras `docker compose up`; revisa `docker compose logs pgadmin`. |
| Cambió `requirements.txt` | Reconstruye: `docker compose up -d --build`. |
| Cambió `package.json` | Reconstruye el frontend y recrea el volumen `frontend_node_modules`. |

Para validar la conexión a la BD desde un contenedor:

```powershell
docker compose exec siga-core python -c "import socket; socket.create_connection(('host.docker.internal', 5432), 5); print('OK')"
```
