#!/usr/bin/env bash
# End-to-end checks of the collection endpoints: capability gating, row-level
# scoping, workflow enforcement, and the writes that used to be open.
#   BASE=http://127.0.0.1:8765 bash scripts/tests/api-endpoints.sh
set -uo pipefail

BASE="${BASE:-http://127.0.0.1:8765}"
PASS=0; FAIL=0

req() { # method path [json] [token]
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-s -w '\n%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ]  && args+=(-d "$body")
  curl "${args[@]}"
}
code_of() { printf '%s' "$1" | tail -n1; }
body_of() { printf '%s' "$1" | sed '$d'; }

check() {
  if [ "$2" = "$3" ]; then printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1))
  else printf '  [FAIL] %s (expected %s, got %s)\n' "$1" "$2" "$3"; FAIL=$((FAIL+1)); fi
}
check_contains() {
  if printf '%s' "$3" | grep -q "$2"; then printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1))
  else printf '  [FAIL] %s (missing "%s" in: %s)\n' "$1" "$2" "$(printf '%s' "$3" | head -c 200)"; FAIL=$((FAIL+1)); fi
}
check_not_contains() {
  if printf '%s' "$3" | grep -q "$2"; then printf '  [FAIL] %s (LEAKED %s)\n' "$1" "$2"; FAIL=$((FAIL+1))
  else printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1)); fi
}

login() { # identifier secret -> token
  local r; r=$(req POST /api/auth.php "{\"action\":\"login\",\"identifier\":\"$1\",\"secret\":\"$2\"}")
  body_of "$r" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

ADMIN=$(login admin@bueno.ng 'Str0ngAdminPw!')
CUST=$(login logistics@hbm.ng 'Cust0merPw!')
CARGO=$(login ade.bello@bueno.ng 'C4rgoPw!xyz')

if [ -z "$ADMIN" ]; then echo "FATAL: could not obtain an admin token"; exit 1; fi

# The permission matrix is persistent server state, so a prior run that edited
# it would silently change what every later assertion means. Reset to defaults.
req POST /api/permissions.php '{"action":"RESET_DEFAULTS"}' "$ADMIN" >/dev/null
# Re-login so the session picks up the restored capability set.
ADMIN=$(login admin@bueno.ng 'Str0ngAdminPw!')
CUST=$(login logistics@hbm.ng 'Cust0merPw!')
CARGO=$(login ade.bello@bueno.ng 'C4rgoPw!xyz')

# Extract a JSON string field without a JSON parser being available.
json_field() { printf '%s' "$2" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }

echo "=== 1. Unauthenticated writes are refused ==="
for ep in trips deals invoices wagons requests trip_costs negotiations notifications gps send_mail; do
  r=$(req POST "/api/$ep.php" '{"action":"upsert","record":{"company":"X"}}')
  c=$(code_of "$r")
  if [ "$c" = "401" ] || [ "$c" = "403" ]; then
    printf '  [PASS] POST %s.php refused (%s)\n' "$ep" "$c"; PASS=$((PASS+1))
  else
    printf '  [FAIL] POST %s.php returned %s\n' "$ep" "$c"; FAIL=$((FAIL+1))
  fi
done

echo
echo "=== 2. Unauthenticated PURGE_ALL is refused ==="
for ep in trips deals invoices requests; do
  r=$(req POST "/api/$ep.php" '{"action":"PURGE_ALL"}')
  c=$(code_of "$r")
  if [ "$c" = "401" ] || [ "$c" = "403" ]; then
    printf '  [PASS] purge %s.php refused (%s)\n' "$ep" "$c"; PASS=$((PASS+1))
  else
    printf '  [FAIL] purge %s.php returned %s\n' "$ep" "$c"; FAIL=$((FAIL+1))
  fi
done

echo
echo "=== 3. Purge requires explicit confirmation even for an admin ==="
r=$(req POST /api/trips.php '{"action":"PURGE_ALL"}' "$ADMIN")
check "purge without confirm is refused" 422 "$(code_of "$r")"
check_contains "refusal explains how to confirm" "irreversible" "$(body_of "$r")"

echo
echo "=== 4. Creating a trip ==="
r=$(req POST /api/trips.php '{"action":"upsert","record":{"company":"HUAXIN BUILDING MATERIALS NIG PLC (HBM)","cargoType":"Huaxin Portland Cement (50kg bags)","quantity":"1610","origin":"EWK","destination":"MNY","status":"LOADING","clientEmail":"logistics@hbm.ng"}}' "$CARGO")
check "cargo officer may create a trip" 201 "$(code_of "$r")"
TRIP_ID=$(json_field id "$(body_of "$r")")
printf '         trip id: %s\n' "$TRIP_ID"

r=$(req POST /api/trips.php '{"action":"upsert","record":{"company":"OTHER CORP","origin":"EWK","destination":"MNY"}}' "$ADMIN")
check "admin may create a trip for another company" 201 "$(code_of "$r")"

echo
echo "=== 5. Row-level scoping: a consignee sees only their own trips ==="
r=$(req GET /api/trips.php '' "$CUST")
check "consignee may list trips" 200 "$(code_of "$r")"
check_contains "sees own company" "HUAXIN" "$(body_of "$r")"
check_not_contains "does NOT see another company's trip" "OTHER CORP" "$(body_of "$r")"

r=$(req GET /api/trips.php '' "$ADMIN")
check_contains "admin sees both companies" "OTHER CORP" "$(body_of "$r")"

echo
echo "=== 6. Field-level authority: pricing is finance-only ==="
r=$(req POST /api/trips.php "{\"action\":\"upsert\",\"record\":{\"id\":\"$TRIP_ID\",\"company\":\"HUAXIN BUILDING MATERIALS NIG PLC (HBM)\",\"tripRevenue\":99999999}}" "$CARGO")
check "cargo officer write accepted" 200 "$(code_of "$r")"
check_not_contains "but tripRevenue was NOT applied" '"tripRevenue":99999999' "$(body_of "$r")"

echo
echo "=== 7. Optimistic concurrency ==="
r=$(req POST /api/trips.php "{\"action\":\"upsert\",\"record\":{\"id\":\"$TRIP_ID\",\"company\":\"HUAXIN BUILDING MATERIALS NIG PLC (HBM)\",\"version\":1}}" "$CARGO")
check "a stale version is rejected" 409 "$(code_of "$r")"
check_contains "conflict explains what to do" "changed since you loaded it" "$(body_of "$r")"

echo
echo "=== 8. Requisition approval chain cannot be skipped ==="
r=$(req POST /api/requests.php '{"action":"upsert","record":{"title":"Tarpaulin covering","amount":350000,"category":"TARPAULIN","stage":"DISBURSED","status":"DISBURSED"}}' "$CARGO")
check "cargo officer may raise a requisition" 201 "$(code_of "$r")"
check_contains "forced back to the first stage despite the payload" '"stage":"Admin"' "$(body_of "$r")"
check_not_contains "did NOT arrive pre-disbursed" '"status":"DISBURSED"' "$(body_of "$r")"
REQ_ID=$(json_field id "$(body_of "$r")")

r=$(req POST /api/requests.php "{\"action\":\"advance\",\"id\":\"$REQ_ID\",\"decision\":\"APPROVE\"}" "$CARGO")
check "cargo officer cannot approve (lacks capability)" 403 "$(code_of "$r")"

r=$(req POST /api/requests.php "{\"action\":\"advance\",\"id\":\"$REQ_ID\",\"decision\":\"APPROVE\"}" "$ADMIN")
check "admin advances it one stage" 200 "$(code_of "$r")"
check_contains "moved to the next stage, not straight to disbursed" 'Head of Operations' "$(body_of "$r")"

r=$(req POST /api/requests.php "{\"action\":\"upsert\",\"record\":{\"id\":\"$REQ_ID\",\"title\":\"Edited after approval\",\"amount\":9999999}}" "$CARGO")
check "an approved requisition can no longer be edited" 409 "$(code_of "$r")"

echo
echo "=== 9. Self-approval is blocked ==="
r=$(req POST /api/requests.php '{"action":"upsert","record":{"title":"Admin raises own request","amount":50000}}' "$ADMIN")
OWN_REQ=$(json_field id "$(body_of "$r")")
r=$(req POST /api/requests.php "{\"action\":\"advance\",\"id\":\"$OWN_REQ\",\"decision\":\"APPROVE\"}" "$ADMIN")
check "cannot approve a requisition you raised" 403 "$(code_of "$r")"
check_contains "refusal says why" "raised yourself" "$(body_of "$r")"

echo
echo "=== 10. Consignees cannot issue invoices ==="
r=$(req POST /api/invoices.php '{"action":"upsert","record":{"companyName":"HUAXIN BUILDING MATERIALS NIG PLC (HBM)","totalAmount":1000000}}' "$CUST")
check "consignee denied invoice creation" 403 "$(code_of "$r")"

echo
echo "=== 11. Mail is no longer an open relay ==="
r=$(req POST /api/send_mail.php '{"to":"attacker@evil.test","type":"TRIP_DISPATCH","tripId":"anything"}')
check "unauthenticated mail refused" 401 "$(code_of "$r")"
r=$(req POST /api/send_mail.php '{"to":"attacker@evil.test","type":"TRIP_DISPATCH","tripId":"does-not-exist"}' "$ADMIN")
check "unknown trip refused (recipient not caller-controlled)" 404 "$(code_of "$r")"

echo
echo "=== 12. Public enquiry form still works, but provisions nothing ==="
r=$(req POST /api/client_requests.php '{"action":"submit","companyName":"Prospect Ltd","contactName":"A Buyer","email":"buyer@prospect.test","volume":"5000 bags","route":"EWK-MNY"}')
check "public enquiry accepted without auth" 201 "$(code_of "$r")"
check_not_contains "no PIN is issued" '"pin"' "$(body_of "$r")"
check_not_contains "no account is returned" '"staffId"' "$(body_of "$r")"

r=$(req POST /api/auth.php '{"action":"login","identifier":"buyer@prospect.test","secret":"1111"}')
check "the enquirer canNOT log in with the old default PIN" 401 "$(code_of "$r")"

echo
echo "=== 13. Validation rejects nonsense ==="
r=$(req POST /api/gps.php '{"tripId":"t1","lat":999,"lng":0}' "$CARGO")
check "out-of-range latitude rejected" 422 "$(code_of "$r")"
r=$(req POST /api/trip_costs.php '{"action":"upsert","record":{"tripId":"t1","title":"x","amount":"not-a-number"}}' "$ADMIN")
check "non-numeric amount rejected" 422 "$(code_of "$r")"

echo
echo "=== 14. Caching: an unchanged list answers 304 ==="
ETAG=$(curl -s -D - -o /dev/null "$BASE/api/trips.php" -H "Authorization: Bearer $ADMIN" | grep -i '^etag:' | tr -d '\r' | awk '{print $2}')
if [ -n "$ETAG" ]; then
  C=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/trips.php" -H "Authorization: Bearer $ADMIN" -H "If-None-Match: $ETAG")
  check "repeat poll with ETag returns 304" 304 "$C"
else
  printf '  [FAIL] no ETag header returned\n'; FAIL=$((FAIL+1))
fi

echo
echo "=== 15. Public tracking is public, but discloses little ==="
r=$(req GET "/api/public_track.php?ref=$TRIP_ID")
check "anonymous lookup of a real reference succeeds" 200 "$(code_of "$r")"
check_contains "shows movement status" "tripStatus" "$(body_of "$r")"
check_not_contains "does NOT expose trip revenue"    "tripRevenue"       "$(body_of "$r")"
check_not_contains "does NOT expose trip cost"       "tripCost"          "$(body_of "$r")"
check_not_contains "does NOT expose consignee email" "clientEmail"       "$(body_of "$r")"
check_not_contains "does NOT expose escort phone"    "escortPhone"       "$(body_of "$r")"
check_not_contains "does NOT expose officer names"   "cargoOfficerName"  "$(body_of "$r")"

r=$(req GET "/api/public_track.php?ref=NOPE-does-not-exist")
check "unknown reference gives a plain 404" 404 "$(code_of "$r")"

r=$(req GET "/api/public_track.php")
check "no reference is rejected (there is no listing mode)" 422 "$(code_of "$r")"

echo
printf 'passed: %d   failed: %d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
