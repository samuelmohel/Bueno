#!/usr/bin/env bash
# Runs the full API test suite against a disposable database.
#
#   bash scripts/tests/run-all.sh
#
# Starts its own PHP server on a scratch SQLite file, so it never touches a
# development or production database, and tears everything down afterwards.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PHP="${PHP_BIN:-php}"
if ! command -v "$PHP" >/dev/null 2>&1; then
  for candidate in \
    "$LOCALAPPDATA/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe" \
    "/c/Users/$USER/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe"
  do
    [ -x "$candidate" ] && PHP="$candidate" && break
  done
fi
if ! command -v "$PHP" >/dev/null 2>&1 && [ ! -x "$PHP" ]; then
  echo "FATAL: php not found. Set PHP_BIN to the php executable." >&2
  exit 1
fi

PORT="${PORT:-8799}"
BASE="http://127.0.0.1:$PORT"
WORKDIR="$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/bueno-tests-$$")"
mkdir -p "$WORKDIR"
DB_PATH="$WORKDIR/test.sqlite"
ENV_FILE="apps/web/public/.env"
ENV_BACKUP="$WORKDIR/env.backup"

cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null
  if [ -f "$ENV_BACKUP" ]; then mv -f "$ENV_BACKUP" "$ENV_FILE"; else rm -f "$ENV_FILE"; fi
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

# Preserve any existing .env rather than clobbering a developer's settings.
[ -f "$ENV_FILE" ] && cp "$ENV_FILE" "$ENV_BACKUP"

# On Windows, PHP needs a native path for the SQLite DSN.
DB_PATH_NATIVE="$DB_PATH"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) DB_PATH_NATIVE="$(cygpath -m "$DB_PATH" 2>/dev/null || echo "$DB_PATH")" ;;
esac

cat > "$ENV_FILE" <<EOF
APP_ENV=development
APP_SECRET=$("$PHP" -r "echo bin2hex(random_bytes(32));")
SQLITE_PATH=$DB_PATH_NATIVE
SESSION_TTL_SECONDS=3600
EOF
# Deliberately NOT raising LOGIN_RATE_IP here: one of the assertions is that
# repeated sign-in attempts get throttled, and a raised limit would make that
# test pass vacuously. Suites are decoupled by clearing the counters between
# them (reset-limits.php) rather than by disabling the limiter.

echo "── migrating test database ────────────────────────────────────────────"
"$PHP" apps/web/public/api/_lib/migrate.php up || exit 1

echo "── seeding test accounts ──────────────────────────────────────────────"
"$PHP" -r '
require "apps/web/public/api/_lib/db.php";
$pdo = Db::conn();
$ins = $pdo->prepare("INSERT INTO bueno_users (id,fullName,email,role,userType,companyName,assignedStation,status,password_hash,must_change_credentials,pin) VALUES (?,?,?,?,?,?,?,?,?,0,\"\")");
$ins->execute(["usr_admin","Folake Adeyemi","admin@bueno.ng","ADMIN","STAFF",null,"HQ","ACTIVE",password_hash("Str0ngAdminPw!",PASSWORD_BCRYPT)]);
$ins->execute(["usr_cust","Huaxin Desk","logistics@hbm.ng","CUSTOMER","CUSTOMER","HUAXIN BUILDING MATERIALS NIG PLC (HBM)",null,"ACTIVE",password_hash("Cust0merPw!",PASSWORD_BCRYPT)]);
$ins->execute(["usr_cargo","Ade Bello","ade.bello@bueno.ng","CARGO_OFFICER","STAFF",null,"EWK","ACTIVE",password_hash("C4rgoPw!xyz",PASSWORD_BCRYPT)]);
echo "seeded 3 accounts\n";
' || exit 1

echo "── starting server on $BASE ───────────────────────────────────────────"
"$PHP" -S "127.0.0.1:$PORT" -t apps/web/public > "$WORKDIR/server.log" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 40); do
  curl -s -o /dev/null "$BASE/api/auth.php" && break
  sleep 0.25
done

TOTAL_FAIL=0

run_suite() {
  local name="$1" script="$2"
  echo
  echo "══ $name ═══════════════════════════════════════════════════════════"
  # Each suite starts from a clean limiter, since the suites exercise it.
  "$PHP" scripts/tests/reset-limits.php >/dev/null 2>&1
  BASE="$BASE" bash "$script" || TOTAL_FAIL=$((TOTAL_FAIL+1))
}

native() {
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) cygpath -m "$1" 2>/dev/null || echo "$1" ;;
    *) echo "$1" ;;
  esac
}

# A migration test needs a database at a known starting point, so each gets its
# own empty one rather than the shared server database, which is already fully
# migrated and seeded.
run_migration_test() {
  local name="$1" script="$2"
  local slug; slug="$(basename "$script" .php)"
  local mdb="$WORKDIR/mig-$slug.sqlite"
  local menv="$WORKDIR/mig-$slug.env"

  cat > "$menv" <<EOF
APP_ENV=development
APP_SECRET=$("$PHP" -r "echo bin2hex(random_bytes(32));")
SQLITE_PATH=$(native "$mdb")
EOF

  echo
  echo "══ $name ═══════════════════════════════════════════════════════════"
  BUENO_ENV_FILE="$(native "$menv")" "$PHP" "$script" || TOTAL_FAIL=$((TOTAL_FAIL+1))
}

echo
echo "══ capability registry (unit) ═════════════════════════════════════════"
npx tsx --test scripts/tests/rbac.test.ts 2>&1 | grep -E '^# (tests|pass|fail)' || TOTAL_FAIL=$((TOTAL_FAIL+1))

echo
echo "══ generated PHP mirror is in sync ════════════════════════════════════"
npx tsx scripts/generate-rbac.ts check || TOTAL_FAIL=$((TOTAL_FAIL+1))

run_suite "authentication and RBAC" scripts/tests/api-integration.sh
run_suite "endpoint hardening"      scripts/tests/api-endpoints.sh

# Migrations that change how people sign in, or repair damage an earlier
# migration caused, are the ones most likely to cause a production incident.
run_migration_test "migration 003 — credential hashing"  scripts/tests/credential-migration.php
run_migration_test "migration 006 — email uniqueness"    scripts/tests/email-uniqueness-migration.php

echo
if [ "$TOTAL_FAIL" -eq 0 ]; then
  echo "ALL SUITES PASSED"
else
  echo "$TOTAL_FAIL SUITE(S) FAILED"
  echo "server log:"
  tail -30 "$WORKDIR/server.log"
fi
exit "$TOTAL_FAIL"
