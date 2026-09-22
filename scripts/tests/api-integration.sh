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
echo "=== 9. The permissions matrix is readable and enforced ==="
#
# The editor rendered normalizeMatrix(localStorage), and normalizeMatrix(null)
# returns the shipped defaults - so an administrator saw every default
# capability ticked no matter what the database held. A capability revoked on
# the server appeared granted, while the endpoint it guards answered 403.
# fetchRolePermissions() existed and was called from nowhere.
#
# These assertions pin the contract the editor depends on: what GET returns is
# what POST stored, and what the API enforces.

# Baseline: an administrator can read the directory.
r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check "admin can read the directory to begin with" 200 "$(code_of "$r")"

# Read the matrix, and revoke one capability from ADMIN.
r=$(req GET /api/permissions.php '' "$ADMIN_TOKEN")
check "the matrix is readable" 200 "$(code_of "$r")"
check_contains "and reports ADMIN holding users.view" 'users.view' "$(body_of "$r")"

r=$(req POST /api/permissions.php '{"roleKey":"ADMIN","permissions":["permissions","system.permissions_edit","users","users.create"]}' "$ADMIN_TOKEN")
check "a role can be narrowed" 200 "$(code_of "$r")"

# The read-back must show the revocation, not the defaults. This is the exact
# disagreement that made a ticked checkbox sit over a 403.
r=$(req GET /api/permissions.php '' "$ADMIN_TOKEN")
ADMIN_ROW=$(printf '%s' "$(body_of "$r")" | sed -n 's/.*"ADMIN":\[\([^]]*\)\].*/\1/p')
check_not_contains "the read-back reflects the revocation" 'users.view' "$ADMIN_ROW"
check_contains "and retains what was kept" 'users.create' "$ADMIN_ROW"

# ...and the API enforces exactly that.
r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check "the directory is now refused, matching the stored matrix" 403 "$(code_of "$r")"

# Restore, so the rest of the suite runs against defaults.
r=$(req POST /api/permissions.php '{"action":"RESET_DEFAULTS"}' "$ADMIN_TOKEN")
check "defaults can be restored" 200 "$(code_of "$r")"
r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check "and the directory is readable again" 200 "$(code_of "$r")"

# The server must refuse a matrix that locks everybody out of the editor.
r=$(req POST /api/permissions.php '{"matrix":{"ADMIN":[],"CEO":[],"MD":[],"HEAD_OF_OPERATIONS":[],"HEAD_OF_FINANCE":[],"ACCOUNTANT":[],"CARGO_OFFICER":[],"CUSTOMER":[],"CONSIGNEE":[]}}' "$ADMIN_TOKEN")
check "a matrix that locks everyone out is refused" 422 "$(code_of "$r")"
r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check "and the refusal changed nothing" 200 "$(code_of "$r")"


echo
echo "=== 10. Deleting an account ==="
#
# Deletion is irreversible, so the guards matter more than the happy path:
# you must not be able to delete yourself out of a session, or remove the last
# account capable of administering the platform.

# A disposable account to delete.
DELMAIL="deleteme-$$@bueno.ng"
r=$(req POST /api/users.php "{\"action\":\"create\",\"fullName\":\"Temporary Account\",\"email\":\"$DELMAIL\",\"role\":\"CARGO_OFFICER\",\"userType\":\"STAFF\",\"assignedStation\":\"EWK\"}" "$ADMIN_TOKEN")
check "a disposable account is created" 201 "$(code_of "$r")"
DELID=$(printf '%s' "$(body_of "$r")" | sed -n 's/.*"id":"\(usr_[^"]*\)".*/\1/p')

# The caller must not be able to delete the account they are signed in with.
# body_of takes the response as an argument; piping into it leaves $1 unset,
# which silently yields an empty id and makes the assertion below pass for the
# wrong reason (a validation error rather than the self-delete guard).
ADMIN_ME=$(body_of "$(req GET /api/auth.php '' "$ADMIN_TOKEN")")
ADMINID=$(printf '%s' "$ADMIN_ME" | grep -o '"id":"usr_[^"]*"' | head -1 | cut -d'"' -f4)
check "the signed-in admin id was resolved" 1 "$([ -n "$ADMINID" ] && echo 1 || echo 0)"
r=$(req POST /api/users.php "{\"action\":\"delete\",\"id\":\"$ADMINID\"}" "$ADMIN_TOKEN")
check "you cannot delete your own account" 422 "$(code_of "$r")"

# A cargo officer holds no users.delete capability.
r=$(req POST /api/users.php "{\"action\":\"delete\",\"id\":\"$DELID\"}" "$CARGO_TOKEN")
check "a cargo officer cannot delete accounts" 403 "$(code_of "$r")"

# The real thing.
r=$(req POST /api/users.php "{\"action\":\"delete\",\"id\":\"$DELID\"}" "$ADMIN_TOKEN")
check "an administrator can delete an account" 200 "$(code_of "$r")"

r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check_not_contains "the account is gone from the directory" "$DELMAIL" "$(body_of "$r")"

# Deleting it again is a 404, not a silent success.
r=$(req POST /api/users.php "{\"action\":\"delete\",\"id\":\"$DELID\"}" "$ADMIN_TOKEN")
check "deleting it twice reports not found" 404 "$(code_of "$r")"

# A deleted account cannot sign in, whatever credential it held.
r=$(req POST /api/auth.php "{\"action\":\"login\",\"identifier\":\"$DELMAIL\",\"secret\":\"anything\"}")
check "the deleted account cannot sign in" 401 "$(code_of "$r")"

# The audit trail must survive the subject of the audit.
r=$(req GET "/api/users.php" '' "$ADMIN_TOKEN")
check "the directory still works after a deletion" 200 "$(code_of "$r")"

# The platform must never be left with nobody able to administer it. Reached
# here by granting delete to a role that cannot administer permissions, then
# having it try to remove the last account that can — the one path where the
# self-delete guard does not already stop you.
r=$(req POST /api/permissions.php '{"roleKey":"CARGO_OFFICER","permissions":["deals","fleet","users","users.view","users.delete"]}' "$ADMIN_TOKEN")
check "a role can be granted delete for this check" 200 "$(code_of "$r")"

r=$(req POST /api/users.php "{\"action\":\"delete\",\"id\":\"$ADMINID\"}" "$CARGO_TOKEN")
check "deleting the last administrator is refused" 422 "$(code_of "$r")"
check_contains "and says why" 'lock everyone out' "$(body_of "$r")"

r=$(req GET /api/users.php '' "$ADMIN_TOKEN")
check "the administrator still exists" 200 "$(code_of "$r")"
check_contains "and is still in the directory" 'admin@bueno.ng' "$(body_of "$r")"

r=$(req POST /api/permissions.php '{"action":"RESET_DEFAULTS"}' "$ADMIN_TOKEN")
check "defaults restored after the check" 200 "$(code_of "$r")"


echo
printf 'passed: %d   failed: %d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
