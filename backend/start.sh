#!/bin/bash
set -e

echo "Starting FreeLedger Backend..."
echo "Checking environment..."

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

PG_HOST="${PG_HOST:-localhost}"
REDIS_HOST="${REDIS_HOST:-localhost}"

echo "Waiting for PostgreSQL at ${PG_HOST}..."
until pg_isready -h "${PG_HOST}" -p 5432 -U freeledger 2>/dev/null; do
    sleep 1
done

echo "Waiting for Redis at ${REDIS_HOST}..."
until redis-cli -h "${REDIS_HOST}" ping 2>/dev/null; do
    sleep 1
done

echo "Running migrations..."
alembic upgrade head 2>&1 || echo "Warning: migrations failed (tables may already exist, init_db will handle them)"

echo "Starting uvicorn..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level trace
