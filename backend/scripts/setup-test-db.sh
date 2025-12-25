#!/bin/bash
# Setup test database for backend tests
# Creates user, database, schema, and seeds data if not already configured

set -e

TEST_DB_USER="hexhaven"
TEST_DB_PASS="hexhaven"
TEST_DB_NAME="hexhaven_test"
TEST_DB_HOST="127.0.0.1"
TEST_DB_PORT="5432"

export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASS}@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}?schema=public"

echo "Setting up test database..."

# Check if we can connect to PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Error: psql not found. Please install PostgreSQL client."
    exit 1
fi

# Check if user exists, create if not
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${TEST_DB_USER}'" 2>/dev/null || echo "0")
if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating database user '${TEST_DB_USER}'..."
    sudo -u postgres psql -c "CREATE USER ${TEST_DB_USER} WITH PASSWORD '${TEST_DB_PASS}';" 2>/dev/null
    echo "✓ User created"
else
    echo "✓ User '${TEST_DB_USER}' already exists"
fi

# Check if database exists, create if not
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${TEST_DB_NAME}'" 2>/dev/null || echo "0")
if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database '${TEST_DB_NAME}'..."
    sudo -u postgres psql -c "CREATE DATABASE ${TEST_DB_NAME} OWNER ${TEST_DB_USER};" 2>/dev/null
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${TEST_DB_NAME} TO ${TEST_DB_USER};" 2>/dev/null
    echo "✓ Database created"
else
    echo "✓ Database '${TEST_DB_NAME}' already exists"
fi

# Push Prisma schema
echo "Syncing Prisma schema..."
cd "$(dirname "$0")/.."
npx prisma db push --skip-generate --accept-data-loss 2>&1 | grep -v "^warn" || true
echo "✓ Schema synced"

# Check if data exists, seed if empty
NEEDS_SEED=$(PGPASSWORD="${TEST_DB_PASS}" psql -h "${TEST_DB_HOST}" -U "${TEST_DB_USER}" -d "${TEST_DB_NAME}" -tAc "SELECT COUNT(*) FROM \"CharacterClass\"" 2>/dev/null || echo "0")
if [ "$NEEDS_SEED" = "0" ]; then
    echo "Seeding test database..."
    npx prisma db seed 2>&1 | grep -E "^(✓|✅|Seeding|Starting)" || true
    echo "✓ Database seeded"
else
    echo "✓ Database already seeded (${NEEDS_SEED} character classes found)"
fi

echo ""
echo "✅ Test database setup complete!"
echo "   Connection: postgresql://${TEST_DB_USER}:****@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"
