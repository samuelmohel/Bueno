#!/usr/bin/env bash
# End-to-end checks against a running API.
#   BASE=http://127.0.0.1:8765 bash scripts/tests/api-integration.sh
set -uo pipefail

BASE="${BASE:-http://127.0.0.1:8765}"
PASS=0
FAIL=0

req() { # method path [json] [token]
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-s -w '\n%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ]  && args+=(-d "$body")
  curl "${args[@]}"
}

code_of() { printf '%s' "$1" | tail -n1; }
body_of() { printf '%s' "$1" | sed '$d'; }

check() { # label expected actual
  if [ "$2" = "$3" ]; then
    printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1))
  else
    printf '  [FAIL] %s (expected %s, got %s)\n' "$1" "$2" "$3"; FAIL=$((FAIL+1))
  fi
}

check_contains() { # label needle haystack
  if printf '%s' "$3" | grep -q "$2"; then
    printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1))
  else
    printf '  [FAIL] %s (missing %s)\n' "$1" "$2"; FAIL=$((FAIL+1))
  fi
}

check_not_contains() { # label needle haystack
  if printf '%s' "$3" | grep -q "$2"; then
    printf '  [FAIL] %s (LEAKED %s)\n' "$1" "$2"; FAIL=$((FAIL+1))
  else
    printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1))
  fi
}

echo "=== 1. Unauthenticated access is refused ==="
r=$(req GET /api/users.php);       check "GET users.php requires auth"        401 "$(code_of "$r")"
r=$(req GET /api/permissions.php); check "GET permissions.php requires auth"  401 "$(code_of "$r")"
r=$(req POST /api/permissions.php '{"matrix":{"CUSTOMER":["system.purge_data"]}}')
check "POST permissions.php requires auth" 401 "$(code_of "$r")"

echo
echo "=== 2. Login ==="
r=$(req POST /api/auth.php '{"action":"login","identifier":"admin@bueno.ng","secret":"wrong-password"}')
check "wrong password rejected" 401 "$(code_of "$r")"

r=$(req POST /api/auth.php '{"action":"login","identifier":"admin@bueno.ng","secret":"demo1234"}')
check "old hardcoded bypass demo1234 rejected" 401 "$(code_of "$r")"

r=$(req POST /api/auth.php '{"action":"login","identifier":"nobody@nowhere.test","secret":"whatever"}')
check "unknown account gives same 401 (no enumeration)" 401 "$(code_of "$r")"
check_contains "failure message is generic" "Invalid credentials" "$(body_of "$r")"

r=$(req POST /api/auth.php '{"action":"login","identifier":"admin@bueno.ng","secret":"Str0ngAdminPw!"}')
check "correct password accepted" 200 "$(code_of "$r")"
ADMIN_TOKEN=$(body_of "$r" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
check_not_contains "login response does not leak password_hash" "password_hash" "$(body_of "$r")"
check_not_contains "login response does not leak pin" '"pin"' "$(body_of "$r")"

r=$(req POST /api/auth.php '{"action":"login","identifier":"logistics@hbm.ng","secret":"Cust0merPw!"}')
CUST_TOKEN=$(body_of "$r" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
check "customer login works" 200 "$(code_of "$r")"

r=$(req POST /api/auth.php '{"action":"login","identifier":"ade.bello@bueno.ng","secret":"C4rgoPw!xyz"}')
CARGO_TOKEN=$(body_of "$r" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
check "cargo officer login works" 200 "$(code_of "$r")"

echo
echo "=== 3. Session identity ==="
r=$(req GET /api/auth.php '' "$ADMIN_TOKEN")
check "GET auth.php with token returns session" 200 "$(code_of "$r")"
check_contains "session reports authenticated" '"authenticated":true' "$(body_of "$r")"
check_contains "session carries capabilities" 'system.permissions_edit' "$(body_of "$r")"

r=$(req GET /api/auth.php '' "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
check_contains "forged token is not authenticated" '"authenticated":false' "$(body_of "$r")"

echo
echo "=== 4. Capability enforcement ==="
r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check "admin may list users" 200 "$(code_of "$r")"
check_not_contains "user list does not expose pin"           '"pin"'           "$(body_of "$r")"
check_not_contains "user list does not expose password_hash" 'password_hash'   "$(body_of "$r")"

r=$(req GET /api/users.php '' "$CARGO_TOKEN")
check "cargo officer denied user directory (lacks users.view)" 403 "$(code_of "$r")"

r=$(req POST /api/permissions.php '{"matrix":{"CUSTOMER":["billing"]}}' "$CUST_TOKEN")
check "customer denied permissions edit" 403 "$(code_of "$r")"

r=$(req POST /api/users.php '{"action":"create","fullName":"Mallory Admin","email":"mallory@evil.test","role":"ADMIN"}' "$CARGO_TOKEN")
check "cargo officer denied user creation" 403 "$(code_of "$r")"

echo
echo "=== 5. Privilege escalation is blocked ==="
r=$(req POST /api/permissions.php '{"matrix":{"CUSTOMER":["billing","system.purge_data","system.permissions_edit"],"ADMIN":["permissions","system.permissions_edit"]}}' "$ADMIN_TOKEN")
check "admin may edit the matrix" 200 "$(code_of "$r")"
check_not_contains "sensitive caps stripped from CUSTOMER" 'system.purge_data' "$(body_of "$r" | sed -n 's/.*"CUSTOMER":\(\[[^]]*\]\).*/\1/p')"

r=$(req POST /api/permissions.php '{"matrix":{"ADMIN":["analytics"],"CEO":["analytics"],"MD":["analytics"],"HEAD_OF_OPERATIONS":["analytics"],"HEAD_OF_FINANCE":["analytics"],"ACCOUNTANT":["analytics"],"CARGO_OFFICER":["deals"],"CUSTOMER":["billing"],"CONSIGNEE":["billing"]}}' "$ADMIN_TOKEN")
check "matrix change that would lock everyone out is refused" 422 "$(code_of "$r")"
check_contains "refusal explains the lockout" "locking everyone out" "$(body_of "$r")"

# The matrix is persistent server state and the assertions above deliberately
# rewrote it. Restore defaults so later suites are not silently affected.
r=$(req POST /api/permissions.php '{"action":"RESET_DEFAULTS"}' "$ADMIN_TOKEN")
check "matrix restored to defaults" 200 "$(code_of "$r")"

echo
echo "=== 6. Logout revokes immediately ==="
r=$(req POST /api/auth.php '{"action":"logout"}' "$CUST_TOKEN")
check "logout succeeds" 200 "$(code_of "$r")"
r=$(req GET /api/auth.php '' "$CUST_TOKEN")
check_contains "revoked token no longer authenticates" '"authenticated":false' "$(body_of "$r")"

echo
echo "=== 7. Rate limiting ==="
limited=0
for i in $(seq 1 14); do
  r=$(req POST /api/auth.php '{"action":"login","identifier":"ratelimit-probe@bueno.ng","secret":"x"}')
  [ "$(code_of "$r")" = "429" ] && limited=1 && break
done
check "repeated login attempts get rate limited" 1 "$limited"

echo
echo "=== 8. Provisioning an account end to end ==="
#
# The interface built a user object in the browser and pushed it through the
# generic collection store, which posts {"action":"upsert"} - not a case
# users.php handles. Every provisioning attempt got a 400, the account existed
# only in localStorage until the next poll, and no password hash was ever
# written, so the credential the administrator was shown could not work.
#
# Nothing caught it because no test ever created an account and then tried to
# sign in as it. This does exactly that.

NEWMAIL="provisioned-$$@bueno.ng"

r=$(req POST /api/users.php "{\"action\":\"create\",\"fullName\":\"Provisioned Officer\",\"email\":\"$NEWMAIL\",\"role\":\"CARGO_OFFICER\",\"userType\":\"STAFF\",\"assignedStation\":\"EWK\"}" "$ADMIN_TOKEN")
check "an administrator can provision an account" 201 "$(code_of "$r")"
CREATED_BODY="$(body_of "$r")"
check_contains "the response carries a one-time secret" '"initialSecret"' "$CREATED_BODY"
check_not_contains "it does not echo a password hash" 'password_hash' "$CREATED_BODY"

NEWSECRET=$(printf '%s' "$CREATED_BODY" | sed -n 's/.*"initialSecret":"\([^"]*\)".*/\1/p')

# The account must be in the directory the administrator is looking at.
r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check_contains "the new account appears in the user list" "$NEWMAIL" "$(body_of "$r")"

# And the secret the administrator was shown must be the one that works.
r=$(req POST /api/auth.php "{\"action\":\"login\",\"identifier\":\"$NEWMAIL\",\"secret\":\"$NEWSECRET\"}")
check "the returned secret actually signs in" 200 "$(code_of "$r")"
check_contains "and the account must set its own password" '"mustChangeCredentials":true' "$(body_of "$r")"

# A whole-collection push is what the UI used to send. It must be refused
# rather than silently doing nothing.
r=$(req POST /api/users.php '[{"id":"usr_x","fullName":"Bulk","email":"bulk@bueno.ng","role":"ADMIN"}]' "$ADMIN_TOKEN")
check "a bare array write is rejected" 400 "$(code_of "$r")"
r=$(req POST /api/users.php '{"action":"upsert","id":"usr_x","role":"ADMIN"}' "$ADMIN_TOKEN")
check "an unsupported action is rejected" 400 "$(code_of "$r")"

# Duplicate addresses are refused, matching the unique index on the column.
r=$(req POST /api/users.php "{\"action\":\"create\",\"fullName\":\"Duplicate\",\"email\":\"$NEWMAIL\",\"role\":\"CARGO_OFFICER\"}" "$ADMIN_TOKEN")
check "a second account on the same address is refused" 409 "$(code_of "$r")"


echo
printf 'passed: %d   failed: %d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
