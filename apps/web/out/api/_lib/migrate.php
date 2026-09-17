<?php
/**
 * Bueno Freight OS — Migration runner
 *
 * Replaces the previous approach, where db.php issued CREATE TABLE IF NOT
 * EXISTS plus a burst of speculative ALTER TABLE statements wrapped in empty
 * catch blocks on *every* HTTP request. That cost a round of DDL per request,
 * hid genuine schema failures, and left no record of what had been applied.
 *
 * Migrations live in api/migrations. A file may target a specific driver by
 * naming itself <version>_<name>.<driver>.sql; otherwise <version>_<name>.sql
 * is used for every driver.
 *
 * Usage (CLI):
 *   php _lib/migrate.php status
 *   php _lib/migrate.php up
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

final class Migrator
{
    private const TABLE = 'bueno_migrations';

    public function __construct(
        private readonly PDO $pdo,
        private readonly string $dir
    ) {
    }

    public static function make(): self
    {
        return new self(Db::conn(), dirname(__DIR__) . '/migrations');
    }

    private function ensureLedger(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS ' . self::TABLE . ' (
                version     VARCHAR(32)  NOT NULL PRIMARY KEY,
                name        VARCHAR(191) NOT NULL,
                checksum    VARCHAR(64)  NOT NULL,
                applied_at  VARCHAR(32)  NOT NULL
            )'
        );
    }

    /** @return array<string,array{name:string,checksum:string,applied_at:string}> */
    private function applied(): array
    {
        $this->ensureLedger();
        $rows = $this->pdo->query('SELECT * FROM ' . self::TABLE)->fetchAll();
        $out  = [];
        foreach ($rows as $r) {
            $out[(string) $r['version']] = [
                'name'       => (string) $r['name'],
                'checksum'   => (string) $r['checksum'],
                'applied_at' => (string) $r['applied_at'],
            ];
        }
        return $out;
    }

    /**
     * Discover migration files applicable to the active driver.
     *
     * @return array<string,array{version:string,name:string,path:string}>
     */
    public function pending(): array
    {
        $driver  = Db::driver();
        $applied = $this->applied();

        if (!is_dir($this->dir)) {
            return [];
        }

        $files = array_merge(
            glob($this->dir . '/*.sql') ?: [],
            glob($this->dir . '/*.php') ?: []
        );
        sort($files, SORT_STRING);

        $chosen = [];
        foreach ($files as $path) {
            $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            $base = basename($path, '.' . $ext);

            // <version>_<name>[.<driver>]
            if (preg_match('/^(\d+)_([a-z0-9_\-]+?)(?:\.(mysql|sqlite))?$/i', $base, $m) !== 1) {
                continue;
            }
            [, $version, $name] = $m;
            $fileDriver = $m[3] ?? null;

            if ($fileDriver !== null && $fileDriver !== $driver) {
                continue; // targeted at a different engine
            }

            // A driver-specific file wins over the generic one.
            if (isset($chosen[$version]) && $fileDriver === null) {
                continue;
            }

            $chosen[$version] = [
                'version' => $version,
                'name'    => $name,
                'path'    => $path,
            ];
        }

        ksort($chosen, SORT_STRING);

        return array_filter(
            $chosen,
            static fn($m) => !isset($applied[$m['version']]),
        );
    }

    /**
     * Apply all pending migrations.
     *
     * @return string[] versions applied
     */
    public function up(): array
    {
        $this->ensureLedger();
        $done = [];

        foreach ($this->pending() as $migration) {
            $contents = file_get_contents($migration['path']);
            if ($contents === false) {
                throw new RuntimeException('Cannot read migration ' . $migration['path']);
            }

            $isPhp    = str_ends_with(strtolower($migration['path']), '.php');
            $checksum = hash('sha256', $contents);

            // MySQL implicitly commits DDL, so wrapping schema changes in a
            // transaction buys nothing there. SQLite does support
            // transactional DDL, so we use one when available.
            $useTx = !Db::isMysql();
            if ($useTx) {
                $this->pdo->beginTransaction();
            }

            try {
                if ($isPhp) {
                    // A PHP migration returns a callable taking the PDO handle.
                    // Used where the change needs real code rather than SQL,
                    // such as hashing credentials with password_hash().
                    $run = require $migration['path'];
                    if (!is_callable($run)) {
                        throw new RuntimeException(
                            'PHP migration must return a callable(PDO): ' . basename($migration['path'])
                        );
                    }
                    $run($this->pdo);
                } else {
                    foreach ($this->splitStatements($contents) as $statement) {
                        $this->pdo->exec($this->translate($statement));
                    }
                }

                $stmt = $this->pdo->prepare(
                    'INSERT INTO ' . self::TABLE . ' (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)'
                );
                $stmt->execute([
                    $migration['version'],
                    $migration['name'],
                    $checksum,
                    gmdate('Y-m-d\TH:i:s\Z'),
                ]);

                if ($useTx) {
                    $this->pdo->commit();
                }
                $done[] = $migration['version'] . '_' . $migration['name'];
            } catch (Throwable $e) {
                if ($useTx && $this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                throw new RuntimeException(
                    sprintf(
                        'Migration %s_%s failed: %s',
                        $migration['version'],
                        $migration['name'],
                        $e->getMessage()
                    ),
                    0,
                    $e
                );
            }
        }

        return $done;
    }

    /**
     * Translate a statement from the canonical dialect (MySQL) to the active
     * driver.
     *
     * Migrations are written once, in MySQL flavour, because that is what
     * production runs. Rather than maintain a parallel SQLite copy of every
     * migration — the exact duplication that let the old permission
     * definitions drift apart — the handful of mechanical differences are
     * rewritten here.
     *
     * This is deliberately narrow. Anything beyond these substitutions should
     * use a driver-specific migration file instead.
     */
    private function translate(string $sql): string
    {
        if (Db::isMysql()) {
            return $sql;
        }

        // Table options MySQL requires and SQLite rejects.
        $sql = preg_replace(
            '/\s*ENGINE\s*=\s*\w+(\s+DEFAULT\s+CHARSET\s*=\s*\w+)?(\s+COLLATE\s*=\s*\w+)?/i',
            '',
            $sql
        ) ?? $sql;

        // Column-level charset/collation clauses.
        $sql = preg_replace('/\s+CHARACTER\s+SET\s+\w+/i', '', $sql) ?? $sql;
        $sql = preg_replace('/\s+COLLATE\s+\w+/i', '', $sql) ?? $sql;

        // Type names SQLite does not recognise natively.
        $sql = preg_replace('/\bDOUBLE\b/i', 'REAL', $sql) ?? $sql;
        $sql = preg_replace('/\bDATETIME\b/i', 'TEXT', $sql) ?? $sql;
        $sql = preg_replace('/\bAUTO_INCREMENT\b/i', 'AUTOINCREMENT', $sql) ?? $sql;

        // MySQL allows INDEX declarations inside CREATE TABLE; SQLite needs
        // separate CREATE INDEX statements, so inline ones are dropped here
        // and declared explicitly in the migration that needs them.
        $sql = preg_replace('/,\s*(UNIQUE\s+)?(INDEX|KEY)\s+`?\w+`?\s*\([^)]*\)/i', '', $sql) ?? $sql;

        return $sql;
    }

    /**
     * Split a migration file into individual statements.
     *
     * Naive explode(';') breaks on semicolons inside string literals and
     * inside trigger/procedure bodies, so we scan character by character and
     * track quoting state.
     *
     * @return string[]
     */
    private function splitStatements(string $sql): array
    {
        $statements = [];
        $buffer     = '';
        $len        = strlen($sql);
        $inSingle   = false;
        $inDouble   = false;
        $inBacktick = false;
        $inLineComment  = false;
        $inBlockComment = false;

        for ($i = 0; $i < $len; $i++) {
            $ch   = $sql[$i];
            $next = $i + 1 < $len ? $sql[$i + 1] : '';

            if ($inLineComment) {
                if ($ch === "\n") {
                    $inLineComment = false;
                    $buffer .= $ch;
                }
                continue;
            }

            if ($inBlockComment) {
                if ($ch === '*' && $next === '/') {
                    $inBlockComment = false;
                    $i++;
                }
                continue;
            }

            if (!$inSingle && !$inDouble && !$inBacktick) {
                if ($ch === '-' && $next === '-') {
                    $inLineComment = true;
                    continue;
                }
                if ($ch === '/' && $next === '*') {
                    $inBlockComment = true;
                    $i++;
                    continue;
                }
                if ($ch === ';') {
                    $trimmed = trim($buffer);
                    if ($trimmed !== '') {
                        $statements[] = $trimmed;
                    }
                    $buffer = '';
                    continue;
                }
            }

            // Toggle quote state, honouring backslash escapes.
            if ($ch === "'" && !$inDouble && !$inBacktick) {
                $escaped = $i > 0 && $sql[$i - 1] === '\\';
                if (!$escaped) {
                    $inSingle = !$inSingle;
                }
            } elseif ($ch === '"' && !$inSingle && !$inBacktick) {
                $escaped = $i > 0 && $sql[$i - 1] === '\\';
                if (!$escaped) {
                    $inDouble = !$inDouble;
                }
            } elseif ($ch === '`' && !$inSingle && !$inDouble) {
                $inBacktick = !$inBacktick;
            }

            $buffer .= $ch;
        }

        $trimmed = trim($buffer);
        if ($trimmed !== '') {
            $statements[] = $trimmed;
        }

        return $statements;
    }

    /** @return array{driver:string,applied:int,pending:string[]} */
    public function status(): array
    {
        return [
            'driver'  => Db::driver(),
            'applied' => count($this->applied()),
            'pending' => array_map(
                static fn($m) => $m['version'] . '_' . $m['name'],
                array_values($this->pending())
            ),
        ];
    }
}

// ─── CLI entry point ────────────────────────────────────────────────────────
if (PHP_SAPI === 'cli' && isset($argv[0]) && realpath($argv[0]) === realpath(__FILE__)) {
    $command = $argv[1] ?? 'status';

    try {
        $migrator = Migrator::make();

        if ($command === 'status') {
            $s = $migrator->status();
            printf("driver:  %s\n", $s['driver']);
            printf("applied: %d\n", $s['applied']);
            printf("pending: %s\n", $s['pending'] === [] ? '(none)' : implode(', ', $s['pending']));
            exit(0);
        }

        if ($command === 'up') {
            $done = $migrator->up();
            if ($done === []) {
                echo "Already up to date.\n";
            } else {
                foreach ($done as $d) {
                    echo "applied  $d\n";
                }
            }
            exit(0);
        }

        fwrite(STDERR, "Unknown command '$command'. Use: status | up\n");
        exit(2);
    } catch (Throwable $e) {
        fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
        exit(1);
    }
}
