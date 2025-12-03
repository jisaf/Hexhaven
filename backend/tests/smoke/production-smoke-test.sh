#!/bin/bash
#
# Production Smoke Test
# Verifies critical endpoints are accessible after deployment
#
# Usage:
#   ./production-smoke-test.sh [BASE_URL]
#   Example: ./production-smoke-test.sh https://test.hexhaven.net
#

set -e

BASE_URL="${1:-https://test.hexhaven.net}"
API_BASE="$BASE_URL/api"

echo "========================================"
echo "Production Smoke Test"
echo "Target: $BASE_URL"
echo "========================================"
echo ""

# Test 1: Health Check
echo "[1/6] Health Check..."
HEALTH=$(curl -k -s -w "\n%{http_code}" "$BASE_URL/health")
STATUS_CODE=$(echo "$HEALTH" | tail -1)
RESPONSE=$(echo "$HEALTH" | head -1)

if [ "$STATUS_CODE" = "200" ] && echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo "✅ PASS: Health endpoint responding"
else
  echo "❌ FAIL: Health check failed (HTTP $STATUS_CODE)"
  echo "   Response: $RESPONSE"
  exit 1
fi
echo ""

# Test 2: Scenarios Endpoint
echo "[2/6] Scenarios List..."
SCENARIOS=$(curl -k -s -w "\n%{http_code}" "$API_BASE/scenarios")
STATUS_CODE=$(echo "$SCENARIOS" | tail -1)
RESPONSE=$(echo "$SCENARIOS" | head -1)

if [ "$STATUS_CODE" = "200" ] && echo "$RESPONSE" | grep -q '"scenarios"'; then
  SCENARIO_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
  echo "✅ PASS: Scenarios endpoint ($SCENARIO_COUNT scenarios)"
else
  echo "❌ FAIL: Scenarios endpoint failed (HTTP $STATUS_CODE)"
  echo "   Response: $RESPONSE"
  exit 1
fi
echo ""

# Test 3: Character Classes Endpoint
echo "[3/6] Character Classes..."
CLASSES=$(curl -k -s -w "\n%{http_code}" "$API_BASE/character-classes")
STATUS_CODE=$(echo "$CLASSES" | tail -1)
RESPONSE=$(echo "$CLASSES" | head -1)

if [ "$STATUS_CODE" = "200" ] && echo "$RESPONSE" | grep -q '"name"'; then
  CLASS_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
  echo "✅ PASS: Character classes endpoint ($CLASS_COUNT classes)"
else
  echo "❌ FAIL: Character classes failed (HTTP $STATUS_CODE)"
  exit 1
fi
echo ""

# Test 4: Rooms Endpoint (requires auth but should return 401, not 502)
echo "[4/6] Rooms Endpoint (auth check)..."
ROOMS=$(curl -k -s -w "\n%{http_code}" "$API_BASE/rooms")
STATUS_CODE=$(echo "$ROOMS" | tail -1)

if [ "$STATUS_CODE" = "200" ]; then
  echo "✅ PASS: Rooms endpoint responding (HTTP 200)"
elif [ "$STATUS_CODE" = "401" ]; then
  echo "✅ PASS: Rooms endpoint responding (HTTP 401 - auth required)"
else
  echo "❌ FAIL: Rooms endpoint failed (HTTP $STATUS_CODE)"
  echo "   Response: $(echo "$ROOMS" | head -1)"
  exit 1
fi
echo ""

# Test 5: User Registration
echo "[5/6] User Registration..."
TIMESTAMP=$(date +%s)
REG_RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"smoke_${TIMESTAMP}\", \"password\": \"SmokeTest123!\"}")

STATUS_CODE=$(echo "$REG_RESPONSE" | tail -1)
RESPONSE=$(echo "$REG_RESPONSE" | head -1)

if [ "$STATUS_CODE" = "201" ] && echo "$RESPONSE" | grep -q '"accessToken"'; then
  echo "✅ PASS: User registration working"
  ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo "❌ FAIL: Registration failed (HTTP $STATUS_CODE)"
  echo "   Response: $RESPONSE"
  exit 1
fi
echo ""

# Test 6: Character Creation (authenticated)
echo "[6/6] Character Creation..."
# Get a valid class ID
CLASSES_LIST=$(curl -k -s "$API_BASE/character-classes")
CLASS_ID=$(echo "$CLASSES_LIST" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

CHAR_RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST "$API_BASE/user-characters" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"name\": \"SmokeChar\", \"classId\": \"$CLASS_ID\"}")

STATUS_CODE=$(echo "$CHAR_RESPONSE" | tail -1)
RESPONSE=$(echo "$CHAR_RESPONSE" | head -1)

if [ "$STATUS_CODE" = "201" ] && echo "$RESPONSE" | grep -q '"id"'; then
  echo "✅ PASS: Character creation working"
else
  echo "❌ FAIL: Character creation failed (HTTP $STATUS_CODE)"
  echo "   Response: $RESPONSE"
  exit 1
fi
echo ""

echo "========================================"
echo "✅ ALL SMOKE TESTS PASSED"
echo "========================================"
echo ""
echo "Production deployment is healthy and functional."
echo ""
