#!/bin/sh
set -e

if [ "$SKIP_MIGRATIONS" != "true" ]; then
    # Build DB URL for Alembic
    if [ -z "$DB_URL" ]; then
        if [ -n "$DATABASE_URL" ]; then
            export DB_URL="$DATABASE_URL"
        else
            export DB_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
        fi
    fi

    echo "Running database migrations..."
    if alembic upgrade head; then
        echo "Migrations applied successfully."
    else
        echo "WARNING: alembic upgrade head failed — starting without migrations."
    fi
fi

if [ "$#" -eq 0 ]; then
    # En Railway (o si se fuerza con SIGA_ALL_IN_ONE=true) el contenedor debe
    # levantar TODO: core gateway + los 7 microservicios internos en 127.0.0.1.
    # Sin esto solo corre el gateway y todos los /api/* responden 503.
    if [ -n "$RAILWAY_ENVIRONMENT" ] || [ -n "$RAILWAY_PROJECT_ID" ] || [ "$SIGA_ALL_IN_ONE" = "true" ]; then
        echo "Starting SIGA all-in-one (Core Gateway + 7 microservicios)..."
        exec sh ./start_railway.sh
    fi
    echo "Starting SIGA Core con Hot Reload..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Starting Module with command: $@"
    exec "$@"
fi