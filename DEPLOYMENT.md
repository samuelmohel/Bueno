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

cPanel → **MultiPHP Manager**. On CloudLinux hosts the same page is called
**Select PHP Version**; if neither exists, your host controls the version and
you will need to raise a ticket.

The domain needs **PHP 8.1 or newer**, with `pdo_mysql` and `mbstring` enabled
(**MultiPHP INI Editor** → *Extensions*, or the *Extensions* tab of *Select PHP
Version*). Switching version resets the extension list to that version's
defaults, so check them again afterwards.

> **This is two settings, not one.** The version a domain serves web requests
> with is separate from the version cron jobs and the deploy script use. The
> deploy script picks the newest PHP it can find, so migrations can report
> success against 8.4 while every page on the site returns a blank HTTP 500
> from 7.4. That failure writes nothing to the application log, because the
> interpreter dies before any application code runs.
>
> `/api/health.php` reports the version the *web server* is using, and is
> written in syntax old enough to answer even when the rest of the application
> cannot load. Open it in a browser — it is a URL, not a shell command.

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

There were two separate disclosures, both now closed:

1. `GET /api/users.php` returned every user row, PIN included, to anyone who
   asked. Closed by capability-gating the endpoint and never selecting the
   credential columns.
2. The published JavaScript bundle contained a `SEED_USERS` array with sixteen
   accounts and their plaintext PINs — `ceo@bueno.ng` / `9999`,
   `admin@bueno.ng` / `7777`, every consignee on `1111`. It was compiled in
   because the constant was exported from a client component. Anyone who
   opened the site could read it. Removed in `e009b20`.

The second one also disclosed the list of valid sign-in addresses, which is
worth assuming an attacker now has even after the passwords change.

### 7. Duplicate sign-in addresses

Migration 005 rewrote both `%lafarge%` and `%dangote%` onto
`logistics@hbm.ng`, so two accounts share one address. Sign-in takes the first
matching row, so one of those people cannot get in at all.

Migration 006 repairs this automatically: the account with a usable credential
keeps the address, and the other is renamed to `logistics+duplicate2@hbm.ng`
and **suspended**. It is not deleted — it owns trips and audit history.

After deploying, check whether any account was moved aside:

```sql
SELECT id, fullName, email, status FROM bueno_users WHERE email LIKE '%+duplicate%';
```

Work out who each one is, give them their own address, and set the status back
to `ACTIVE`. Until you do, that person cannot sign in — which was already true
before the migration, just invisibly.

---

## Routine deployments

1. Commit and push.
2. cPanel → Git Version Control → **Deploy HEAD Commit**.

The build output in `apps/web/out/` is committed, so the server does not need
Node. **Rebuild before committing whenever you change anything under
`apps/web/src/`:**

```bash
npm run verify                      # types, lint, PHP lint, 130 assertions
npm run build                       # stamps build-info and regenerates out/
git add -A && git commit
```

If you forget, the server keeps serving the previous front end while the PHP
updates — which produces confusing "my change did nothing" reports.
`/api/health.php` reports the commit the published artifact was built from,
which is the quickest way to tell whether a fix is actually live.

`npm run verify` is what CI would run. It fails on a type error, an
accessibility regression (an unlabelled form control, a `<div>` with a click
handler), a hard-coded brand hex, a `window.alert`, a PHP syntax error, or any
failing assertion.

### Rebuilding on Windows

`next build` occasionally dies with `kill EPERM` or a V8 out-of-memory error
when run through turbo. Running it directly, with a larger heap, is reliable:

```bash
cd apps/web && NODE_OPTIONS=--max-old-space-size=6144 npx next build
cd ../.. && npx tsx scripts/write-build-info.ts   # re-stamps out/ as well
```

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

---

## How a consignee is joined to their work

This is worth understanding before provisioning a customer account, because it
is the one link in the system held together by a string rather than an id.

A consignee sees a trip, deal, invoice or negotiation when **the company name
on their account matches the company name stored on the record**. There is no
customer id joining the two. The API applies the match in SQL, so records
outside their company never leave the database — but equally, a record whose
company name does not match belongs to nobody.

The comparison ignores case and surrounding spaces, so `HBM Nig Plc` and
`  hbm nig plc ` are the same organisation. It does not ignore anything else:
`HBM` and `HBM Nig Plc` are two different companies as far as the system is
concerned.

### Before you tell a customer their portal is live

```bash
BUENO_ENV_FILE=/home/speckles/.env php scripts/check-consignee-links.php
```

It prints, for every consignee account, how many trips, deals, invoices and
negotiations they will actually see — and then every company name in the data
that matches no account at all. Those last ones are work nobody can see.

Two failure modes it catches:

- **An account with no company name.** Scoping matches on that field, so the
  user signs in and sees nothing, with nothing on screen to explain it.
- **Records spelt differently from the account.** Imported history is the
  usual cause: the legacy data may say `HUAXIN BUILDING MATERIALS NIG PLC
  (HBM)` where the new account says `Huaxin Building Materials`.

Fix either by correcting the account's company name to match the records, or
by correcting the records. The script changes nothing itself.

### When one customer is recorded under two names

The report will show this as two entries that are obviously the same company:

```
  "HUAXIN BUILDING MATERIALS NIG PLC (HBM)"
      trips: 2,  deals: 1
  "HUAXIN BUILDING MATERIALS PLC"
      trips: 1,  deals: 1
```

One account matches one spelling, so whichever you provision, part of that
customer's history stays invisible to them — and nothing on screen says so.
Consolidate before creating the account:

```bash
# Shows what it would change. Writes nothing.
php scripts/merge-company-name.php   --from="HUAXIN BUILDING MATERIALS PLC"   --to="HUAXIN BUILDING MATERIALS NIG PLC (HBM)"

# Same command with --apply to do it.
```

It rewrites trips, deals, invoices, negotiations and any account already
carrying the old spelling, inside a transaction — either all of it or none.
Re-running it is harmless.

Choose the fuller legal name as the target: it is the one that will appear on
manifests and invoices.

### The limitation you should know about

**Renaming a company detaches its history.** Change the company name on an
account and every existing trip, deal and invoice stops matching — silently.
Nothing is deleted, but the customer's portal empties.

The durable fix is a company registry: each organisation gets a stable id,
records point at the id, and the display name becomes an attribute that can
change freely. That is a schema change and a data migration, and it is the
single most valuable structural improvement still outstanding. Until it is
done, treat a consignee's company name as an identifier and do not edit it
casually — and if you must, run the script above afterwards.

---

## Inviting a user rather than relaying a password

Provisioning an account emails the person a link. They follow it, choose their
own password, and are signed in. No password is ever emailed.

That is deliberate. A password sent by email stays in the recipient's mailbox,
in the sending server's queue, and in any forward of it. It cannot be withdrawn
and it does not expire. An invitation link is single-use, lapses after
`INVITATION_TTL_SECONDS` (7 days by default), and is revoked the instant a new
one is issued.

The one-time password still exists and is still shown to you — because mail on
shared hosting fails often enough that onboarding must not depend on it. The
dialog tells you which happened:

- **"Account created and invitation sent"** — they have the email. The password
  shown is only a fallback.
- **"Account created — invitation NOT emailed"** — nothing reached them. The
  dialog gives you the link to pass on yourself, or the password to read out.

**Send invitation** in the account's edit dialog issues a fresh link at any
time. Any previous link stops working immediately.

### If invitations are not arriving

1. **Check `MAIL_FROM` in `/home/speckles/.env`.** It must be a mailbox on a
   domain this server is authorised to send for. A mismatch fails SPF and the
   message is rejected or filed as spam.
2. **Look at what was attempted.** Every send is recorded:
   ```sql
   SELECT createdAt, recipient, mailType, status FROM bueno_email_logs
    ORDER BY createdAt DESC LIMIT 20;
   ```
   `FAILED` means the server refused it; `SENT` means it was accepted for
   delivery, which is not proof it arrived.
3. **Check the API error log** for `[bueno][mail] FAILED`, which records the
   type, recipient and subject of anything the transport rejected.

Delivery is never assumed. If mail cannot be sent, the link is still shown to
you, so an account can always be handed over.

---

## Outstanding operational tasks

These need a person with cPanel access; none of them can be done from the
repository.

| # | Task | Why |
|---|---|---|
| 1 | **Rotate the MySQL password** and update `/home/speckles/.env` | The current password was pasted into a support conversation, so it must be assumed disclosed. cPanel → MySQL Databases → *Current Users* → Change Password, then edit `.env` and redeploy. |
| 2 | **Delete the leftover cron jobs** | Several were added while diagnosing the PHP version problem and some run every minute. cPanel → Cron Jobs → delete everything that is not deliberately scheduled. |
| 3 | **Delete the legacy data files** | `bueno.sqlite`, `bueno_trips_store.json` and `bueno_deals_store.json` in `.../360.specklessinnovations.com/api/` were downloadable over HTTP before the `.htaccess` rules landed. Nothing reads them now. Confirm the data is in MySQL (`scripts/verify-deployment.php`), then delete them. |
| 4 | **Fix the PHP warnings** | MultiPHP INI Editor: `session.gc_divisor` → `1000`, `display_errors` → `Off`. Startup warnings are printed before any script runs, so they land *in front of* JSON responses and make them unparseable. |
| 5 | **Review suspended duplicate accounts** | See step 7 above. |
| 6 | **Watch the CSP report-only violations** | Open the browser console on each portal for a release cycle. If nothing is reported, rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `apps/web/public/.htaccess` to start enforcing it. |

### Known, deliberately not changed

- **Green text on white.** `#62BC37` on white is roughly 2.6:1, below the 4.5:1
  WCAG AA requires for body text. `text-brand-text` (a darker green) exists for
  this, but swapping it blindly would break the places where the same colour
  sits on a dark surface — it needs someone looking at the screens.
- **`AdminPortal.tsx` is one 6,500-line component** with 61 `useState` hooks.
  The routes are now code-split so nobody downloads it unnecessarily, but
  splitting the component itself into per-tab modules is a separate piece of
  work with real regression risk.
- **245 `: any` annotations.** TypeScript compiles but is not meaningfully
  protecting the domain model. Introducing real types for `Trip`, `Deal`,
  `Invoice` and `User` is the highest-value follow-up.
