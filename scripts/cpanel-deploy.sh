#!/bin/bash
#
# Bueno Freight OS — cPanel deployment
#
# Called by .cpanel.yml, which is kept to the simplest possible form because
# cPanel's YAML parser is strict and rejects the folded multi-line scalars this
# logic would otherwise need.
#
# Publishes the built site, applies database migrations, and verifies the
# access protections landed. Fails loudly rather than publishing a half-working
# site.
#
# Run manually (from the repository checkout):
#   bash scripts/cpanel-deploy.sh

set -u

DEPLOYPATH="${DEPLOYPATH:-/home/speckles/360.specklessinnovations.com}"
ENVFILE="${ENVFILE:-/home/speckles/.env}"

say()  { echo "  $*"; }
fail() { echo "DEPLOY FAILED: $*" >&2; exit 1; }

echo "== Bueno deployment =="
say "target : $DEPLOYPATH"

# ── Locate a PHP the application can run on ─────────────────────────────────
#
# The deploy shell's default `php` is frequently the old system binary rather
# than the version the domain uses in MultiPHP Manager. The application needs
# 8.1+, so pick the first binary that qualifies instead of failing later with
# confusing syntax errors.

PHPBIN=""
for candidate in \
  /opt/cpanel/ea-php84/root/usr/bin/php \
  /opt/cpanel/ea-php83/root/usr/bin/php \
  /opt/cpanel/ea-php82/root/usr/bin/php \
  /opt/cpanel/ea-php81/root/usr/bin/php \
  /usr/local/bin/php \
  /usr/bin/php
do
  if [ -x "$candidate" ]; then
    version=$("$candidate" -r 'echo PHP_MAJOR_VERSION * 100 + PHP_MINOR_VERSION;' 2>/dev/null)
    if [ -n "$version" ] && [ "$version" -ge 801 ] 2>/dev/null; then
      PHPBIN="$candidate"
      break
    fi
  fi
done

if [ -z "$PHPBIN" ]; then
  fail "no PHP 8.1+ binary found. Set the domain to PHP 8.1 or newer in cPanel > MultiPHP Manager."
fi
say "php    : $PHPBIN ($("$PHPBIN" -r 'echo PHP_VERSION;'))"

# ── Refuse to publish an unconfigured site ──────────────────────────────────

if [ ! -f "$ENVFILE" ]; then
  echo "DEPLOY FAILED: $ENVFILE is missing." >&2
  echo "The API cannot sign sessions without APP_SECRET and would reject every" >&2
  echo "request. Create it before deploying — see DEPLOYMENT.md." >&2
  exit 1
fi

# A present-but-unconfigured .env is the more common mistake, and publishing
# against one puts up a site that returns 503 to every request.
SECRET_LEN=$(grep -E '^APP_SECRET=' "$ENVFILE" | head -1 | cut -d= -f2- | tr -d '"'"'"' \r\n' | wc -c)
if [ "${SECRET_LEN:-0}" -lt 33 ]; then
  echo "DEPLOY FAILED: APP_SECRET in $ENVFILE is missing or shorter than 32 characters." >&2
  echo "Sessions are keyed with it, so the API returns 503 until it is set." >&2
  echo "Generate one with:" >&2
  echo "  $PHPBIN -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'" >&2
  exit 1
fi
say "env    : APP_SECRET present"

# A PHP that prints startup warnings will prepend them to every API response,
# ahead of the JSON, because they are emitted before any application code runs
# and therefore before display_errors can be turned off. The result is an API
# that returns unparseable responses for no visible reason.
STARTUP_NOISE=$("$PHPBIN" -r 'echo "OK";' 2>/dev/null)
if [ "$STARTUP_NOISE" != "OK" ]; then
  echo "WARNING: this PHP emits output at startup, before any script runs:" >&2
  echo "  ${STARTUP_NOISE%OK}" >&2
  echo "  That text will be prepended to API responses and break JSON parsing." >&2
  echo "  Fix it in cPanel > MultiPHP INI Editor, or set display_errors = Off." >&2
fi

# ── Publish ─────────────────────────────────────────────────────────────────
#
# `out/*` does not match the top-level dotfile, so .htaccess is copied
# explicitly. Dotfiles inside subdirectories (api/.htaccess and friends) are
# carried by the recursive copy.

[ -d apps/web/out ] || fail "apps/web/out is missing. Run 'npx next build' in apps/web and commit the result."
mkdir -p "$DEPLOYPATH" || fail "cannot create $DEPLOYPATH"

cp -R apps/web/out/* "$DEPLOYPATH/"            || fail "could not copy site files"
cp -f apps/web/out/.htaccess "$DEPLOYPATH/"    || fail "could not copy the root .htaccess"
say "published site files"

# ── Database schema ─────────────────────────────────────────────────────────
#
# Idempotent: already-applied migrations are skipped via a ledger table. This
# is the only thing that creates tables — the previous version built them with
# DDL inside every HTTP request, which no longer happens.

cd "$DEPLOYPATH" || fail "cannot enter $DEPLOYPATH"

echo "-- migrations --"
"$PHPBIN" api/_lib/migrate.php up || fail "database migration did not complete. See the error above."

# Do not rely on the exit code alone. Confirm from the reported status that
# the schema is genuinely current — an earlier version of this script printed
# "Deployment complete" over a migration that had failed, because the runner
# exited 0 after emitting an error.
STATUS_OUT=$("$PHPBIN" api/_lib/migrate.php status 2>&1) || fail "could not read migration status."
echo "$STATUS_OUT"

echo "$STATUS_OUT" | grep -q 'pending: (none)' \
  || fail "migrations are still pending — the schema is not up to date."

if echo "$STATUS_OUT" | grep -q 'driver:  *sqlite'; then
  echo "" >&2
  echo "WARNING: the API is using SQLite, not MySQL." >&2
  echo "  Tables were created in a local file, NOT in your cPanel database, and" >&2
  echo "  will not appear in phpMyAdmin. Set DB_NAME, DB_USER and DB_PASS in" >&2
  echo "  $ENVFILE, and add the user to the database in cPanel > MySQL Databases." >&2
fi

# ── Confirm the protections landed ──────────────────────────────────────────

for f in api/.htaccess api/_lib/.htaccess api/migrations/.htaccess; do
  [ -f "$DEPLOYPATH/$f" ] || fail "missing $f — the copy did not include it."
done
say "access protections in place"

echo "== Deployment complete =="
