#!/bin/bash
set -e

echo "Starting FreeLedger Backend..."
echo "Checking environment..."

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

echo "Waiting for PostgreSQL..."
until pg_isready -h localhost -p 5432 -U freeledger 2>/dev/null; do
    sleep 1
done

echo "Waiting for Redis..."
until redis-cli -h localhost ping 2>/dev/null; do
    sleep 1
done

echo "Running migrations..."
alembic upgrade head

echo "Starting uvicorn..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
