# Deploying Bueno Freight OS

Written for: whoever operates the cPanel server (you, or an ops colleague).

The platform is a **static Next.js export** served by Apache, with a **PHP API**
sitting alongside it in `api/`, talking to **MySQL**. There is no Node process
running in production.

```
/home/speckles/
├── .env                              ← secrets, ABOVE the document root
└── 360.specklessinnovations.com/     ← document root (DEPLOYPATH)
    ├── index.html, _next/, …         ← the exported site
    └── api/
        ├── auth.php, trips.php, …    ← endpoints
        ├── _lib/                     ← internal; denied over HTTP
        └── migrations/               ← schema; denied over HTTP
```

---

## First deployment of this version

This release changes how people sign in, so it needs a one-time setup before
the first deploy. Budget about fifteen minutes.

### 1. Back up the database

Non-negotiable. Migrations alter the `users` table and hash every credential.

cPanel → **Backup** → *Download a MySQL Database Backup*, or over SSH:

```bash
mysqldump -u DB_USER -p DB_NAME > ~/bueno-backup-$(date +%F).sql
```

Keep it until you have confirmed people can sign in.

### 2. Create the environment file

```bash
cd /home/speckles
php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'   # copy the output
nano .env
```

Fill it in using [.env.example](.env.example) as the template. At minimum:

```ini
APP_SECRET=<the 64-character value you just generated>
APP_ENV=production
DB_HOST=localhost
DB_NAME=speckles_bueno
DB_USER=speckles_bueno
DB_PASS=<the database password>
APP_URL=https://360.specklessinnovations.com
MAIL_FROM=dispatch@specklessinnovations.com
```

Then lock it down:

```bash
chmod 600 /home/speckles/.env
```

`APP_SECRET` signs session tokens. There is deliberately no default: a
predictable signing key would let anyone mint an administrator session, so the
API refuses to start without one.

### 2b. If this deployment was running without MySQL

Check `360.specklessinnovations.com/api/` in File Manager. If you see any of:

- `bueno.sqlite`
- `bueno_trips_store.json`, `bueno_deals_store.json`

…then the previous version never had MySQL configured and fell back to writing
into those files. Two consequences:

- **They were downloadable over HTTP.** Anyone could have fetched
  `…/api/bueno_trips_store.json` and read every trip and customer. The new
  `.htaccess` blocks this, but treat the data as having been exposed.
- **Your records will not move themselves.** Pointing the platform at MySQL
  gives you an empty database unless you import first.

**Download all of those files** — that is your backup — then import them:

```bash
# On the server, after the first deploy has created the schema:
cd ~/360.specklessinnovations.com

# Preview what would be imported; writes nothing.
php ~/path/to/repo/scripts/import-legacy-data.php --from=./api

# Do it.
php ~/path/to/repo/scripts/import-legacy-data.php --from=./api --apply
```

If you do not have the repository checked out on the server, run it locally
instead: download the `api` folder, point `--from` at it, and set your live
MySQL credentials in a local `.env`.

The import is **idempotent** — a record whose id already exists is skipped
rather than overwritten, so an interrupted run can simply be repeated. It also
hashes any plaintext PINs it finds, so imported accounts sign in with the
credential they already had.

**Once you have confirmed the data is present in the app, delete the legacy
files from the live server:**

```bash
rm ~/360.specklessinnovations.com/api/bueno.sqlite
rm ~/360.specklessinnovations.com/api/bueno_*_store.json
```

Nothing reads them any more, and leaving them is an unnecessary copy of your
operational data sitting in a web-served directory.

### 3. Check the PHP version

cPanel → **MultiPHP Manager**. The domain needs **PHP 8.1 or newer**, with
`pdo_mysql` and `mbstring` enabled (**MultiPHP INI Editor** → *Extensions*).

### 4. Deploy

cPanel → **Git Version Control** → your repository → **Deploy HEAD Commit**.

The deploy publishes the site, applies database migrations, and verifies the
access protections landed. It stops with an explicit message if `.env` is
missing or a migration fails, rather than publishing a broken site.

### 5. Verify (five checks, two minutes)

Replace the host with your own.

```bash
SITE=https://360.specklessinnovations.com

# 1. Internal library is not readable. Expect 403.
curl -s -o /dev/null -w '%{http_code}\n' $SITE/api/_lib/config.php

# 2. Schema is not readable. Expect 403.
curl -s -o /dev/null -w '%{http_code}\n' $SITE/api/migrations/001_baseline.sql

# 3. User directory needs authentication. Expect 401,
#    and no "pin" anywhere in the body.
curl -s -w '\n%{http_code}\n' $SITE/api/users.php

# 4. Old runtime data files are not downloadable. Expect 403 or 404.
curl -s -o /dev/null -w '%{http_code}\n' $SITE/api/bueno_trips_store.json

# 5. Sign-in page loads. Expect 200.
curl -s -o /dev/null -w '%{http_code}\n' $SITE/auth/login
```

**If check 1 or 2 returns 200**, `AllowOverride` is restricted on this host, so
`.htaccess` is being ignored. The PHP files still refuse to run (they carry
their own guard), but the `.sql` files would be readable. Ask your host to
enable `AllowOverride All` for the document root, or move `api/migrations/`
outside it after each deploy.

### 6. Sign in and set real passwords

Everyone's existing PIN still works — migration 003 hashed them in place.

Accounts still using a well-known default (`1111`, `7777`, `9999`, …) are
flagged, and are sent to **Set your password** at first sign-in. That is
deliberate: those PINs were readable by anyone on the internet before this
release, because `GET /api/users.php` returned them.

**Treat every one of those credentials as compromised.** Have each person set a
new password promptly, and reset any account nobody claims.

---

## Routine deployments

1. Commit and push.
2. cPanel → Git Version Control → **Deploy HEAD Commit**.

The build output in `apps/web/out/` is committed, so the server does not need
Node. **Rebuild before committing whenever you change anything under
`apps/web/src/`:**

```bash
cd apps/web && npx next build       # regenerates out/
cd ../.. && git add apps/web/out && git commit
```

If you forget, the server keeps serving the previous front end while the PHP
updates — which produces confusing "my change did nothing" reports.

---

## Verifying it works end to end

After deploying, sign in as an administrator and confirm:

| Check | Expected |
|---|---|
| Sign in with a correct password | Reaches the dashboard |
| Sign in with `demo1234` | Rejected — the old bypass is gone |
| Permissions tab → toggle a capability for a role | Saves, and survives a reload in another browser |
| Sign in as a consignee | Sees only their own company's trips and invoices |
| Sign in as a cargo officer | No user directory; no pricing fields on a trip |
| Public tracking with a real trip reference | Shows movement, no pricing or contact details |

The permissions matrix is the quickest confidence check: change a role's access,
reload in a different browser, and confirm it followed. It is now stored
server-side, so it should.

---

## Operations

### Adding a user

Admin portal → **Users** → provision. The platform generates a one-time
password and shows it to you **once**. Share it over a channel you trust; it is
stored only as a hash and cannot be recovered. The user must change it at first
sign-in.

Credentials are never emailed. The previous version mailed PINs in plaintext
and logged them to the database.

### Resetting a password

Admin portal → Users → reset credentials. Issues a fresh one-time password and
immediately revokes every session that account has open.

### Reading the audit log

Privileged actions are recorded in `bueno_audit_log`: sign-ins, permission
changes, approvals, disbursements, purges, and every denied attempt.

```sql
SELECT occurred_at, actor_role, action, entity_id, outcome
FROM bueno_audit_log
ORDER BY occurred_at DESC
LIMIT 50;
```

### Rolling back

Redeploy an earlier commit from cPanel Git Version Control.

Migrations do not auto-reverse. They are additive — no column is dropped and
the plaintext `pin` column is blanked rather than removed — so an older build
will run against the newer schema. The exception is authentication: once
credentials are hashed, the old client-side login cannot verify them. If you
must go back that far, restore the database backup from step 1.

---

## Local development

```bash
npm install

# Environment for local work
cp .env.example apps/web/public/.env
# Set APP_SECRET; leave DB_NAME/DB_USER empty to use SQLite.

npm run db:migrate      # create the schema
npm test                # 94 assertions against a disposable database

cd apps/web && npm run dev      # http://localhost:3000
```

The API needs PHP to serve it locally. Either point a local Apache at
`apps/web/public`, or run PHP's built-in server:

```bash
php -S 127.0.0.1:8000 -t apps/web/public
```

`php -S` ignores `.htaccess`, so the deny rules are not active there. That is a
development-only gap; the PHP files still carry their own direct-access guard.

### Changing permissions

`apps/web/src/lib/rbac/capabilities.ts` is the single source of truth. After
editing it:

```bash
npm run rbac:generate   # regenerate the PHP mirror
npm test
```

CI fails if the mirror drifts, which is what stops the client and server from
disagreeing about who may do what.
