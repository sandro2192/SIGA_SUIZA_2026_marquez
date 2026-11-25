#!/bin/sh
set -e

echo "=========================================="
echo "🚀 Iniciando SIGA Backend (Railway)"
echo "=========================================="

PORT="${PORT:-8000}"
export PORT
echo "📡 Puerto principal: $PORT"

cleanup() {
    echo "🛑 Deteniendo servicios internos..."
    kill 0 2>/dev/null || true
    exit 0
}
trap cleanup EXIT INT TERM

if [ -n "$DATABASE_URL" ]; then
    echo "📦 DATABASE_URL detectada de Railway."
    export DB_URL="$DATABASE_URL"
fi

if [ "$SKIP_MIGRATIONS" != "true" ]; then
    echo "🔄 Ejecutando migraciones de base de datos..."
    alembic upgrade head || echo "⚠️ Alembic upgrade head falló o fue omitido — continuando..."
fi

export SIGA_MODULE_USUARIOS_URL="http://127.0.0.1:8001"
export SIGA_MODULE_PLANES_ESTUDIO_URL="http://127.0.0.1:8002"
export SIGA_MODULE_PROGRAMAS_ESTUDIO_URL="http://127.0.0.1:8005"
export SIGA_MODULE_GESTION_ACADEMICA_URL="http://127.0.0.1:8006"
export SIGA_MODULE_AUDITORIA_URL="http://127.0.0.1:8007"
export SIGA_MODULE_EVALUACION_URL="http://127.0.0.1:8008"
export SIGA_MODULE_ADMISION_URL="http://127.0.0.1:8009"

echo "⚙️ Levantando 7 microservicios internos..."
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --app-dir modules/mod-usuarios &
python -m uvicorn main:app --host 127.0.0.1 --port 8002 --app-dir modules/mod-planes-estudio &
python -m uvicorn main:app --host 127.0.0.1 --port 8005 --app-dir modules/mod-programas-estudio &
python -m uvicorn main:app --host 127.0.0.1 --port 8006 --app-dir modules/mod-gestion-academica &
python -m uvicorn main:app --host 127.0.0.1 --port 8007 --app-dir modules/mod-auditoria &
python -m uvicorn main:app --host 127.0.0.1 --port 8008 --app-dir modules/mod-evaluacion &
python -m uvicorn main:app --host 127.0.0.1 --port 8009 --app-dir modules/mod-admision &

# Esperar a que los 7 microservicios respondan /health antes de arrancar el
# core, para que el registro inicial los marque como HEALTHY (no OFFLINE).
echo "⏳ Esperando a que los microservicios respondan /health..."
python - <<'PY' || true
import time, urllib.request
ports = [8001, 8002, 8005, 8006, 8007, 8008, 8009]
ok = 0
for _ in range(30):
    ok = 0
    for p in ports:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{p}/health", timeout=1)
            ok += 1
        except Exception:
            pass
    if ok == len(ports):
        break
    time.sleep(1)
print(f"microservicios listos: {ok}/{len(ports)}")
PY

# Railway enruta el trafico publico hacia el puerto 8000 del contenedor
# (verificado en los logs de red: 100.64.0.1 -> contenedor:8000), mientras que
# la variable $PORT llega como 8080 y el core terminaba escuchando ahi -> 502.
CORE_PORT="${SIGA_CORE_PORT:-8000}"

echo "🌐 Iniciando Core Gateway en 0.0.0.0:$CORE_PORT..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$CORE_PORT"
