<?php
/**
 * Bueno Freight OS — Database connection
 *
 * Connection handling only. Schema creation moved to the migration runner
 * (_lib/migrate.php) so that DDL no longer runs on every single request, and
 * the "rebranding" string rewrites moved to a one-off data migration instead
 * of executing on every read.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}


require_once __DIR__ . '/config.php';
require_once __DIR__ . '/http.php';

final class Db
{
    private static ?PDO $pdo = null;
    private static string $driver = '';

    public static function conn(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = Config::get('DB_HOST', 'localhost');
        $name = Config::get('DB_NAME');
        $user = Config::get('DB_USER');
        $pass = Config::get('DB_PASS');
        $port = Config::int('DB_PORT', 3306);

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        $mysqlConfigured = $name !== null && $user !== null;

        if ($mysqlConfigured) {
            try {
                $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $name);
                self::$pdo    = new PDO($dsn, $user, $pass ?? '', $options);
                self::$driver = 'mysql';
                return self::$pdo;
            } catch (PDOException $e) {
                // Silently falling back to a local SQLite file here would mean
                // writes land in a different database than reads did a moment
                // ago — data loss that looks like the app "forgetting" records.
                // If MySQL was configured, a connection failure is fatal.
                error_log('[bueno] MySQL connection failed: ' . $e->getMessage());

                // On the command line — migrations, the importer, cron — the
                // operator needs the actual reason. Hiding it behind a generic
                // HTTP message leaves them with no way to diagnose a failed
                // deploy.
                if (PHP_SAPI === 'cli') {
                    throw new RuntimeException(
                        'Cannot connect to MySQL as "' . $user . '" to database "' . $name . '" on ' . $host . '.'
                        . PHP_EOL . '  Driver said: ' . $e->getMessage()
                        . PHP_EOL . '  Check in cPanel > MySQL Databases that:'
                        . PHP_EOL . '    - the database and user both exist, with their account prefix'
                        . PHP_EOL . '    - the user is ADDED TO the database, with ALL PRIVILEGES'
                        . PHP_EOL . '    - DB_PASS in .env matches the current password',
                        0,
                        $e
                    );
                }

                // Over HTTP, say nothing useful to a stranger.
                if (Config::isProduction()) {
                    Response::error('Database temporarily unavailable.', 503);
                }
                throw $e;
            }
        }

        // No MySQL configured — local/offline development against SQLite.
        $path = Config::get('SQLITE_PATH', __DIR__ . '/../bueno.sqlite');
        self::$pdo    = new PDO('sqlite:' . $path, null, null, $options);
        self::$driver = 'sqlite';
        self::$pdo->exec('PRAGMA journal_mode = WAL');
        self::$pdo->exec('PRAGMA foreign_keys = ON');
        self::$pdo->exec('PRAGMA busy_timeout = 5000');

        return self::$pdo;
    }

    public static function driver(): string
    {
        if (self::$driver === '') {
            self::conn();
        }
        return self::$driver;
    }

    public static function isMysql(): bool
    {
        return self::driver() === 'mysql';
    }

    /**
     * Does this server accept the row-alias form of an upsert?
     *
     * MySQL 8.0.19 introduced `... AS new ON DUPLICATE KEY UPDATE c = new.c`
     * and 8.0.20 deprecated the older VALUES() form. MariaDB reports high
     * version numbers but does not implement the alias, so it is excluded by
     * name rather than by number.
     */
    private static function supportsUpsertAlias(): bool
    {
        static $supported = null;
        if ($supported !== null) {
            return $supported;
        }

        try {
            $version = (string) self::conn()->getAttribute(PDO::ATTR_SERVER_VERSION);
        } catch (Throwable $e) {
            return $supported = false;
        }

        if (stripos($version, 'mariadb') !== false) {
            return $supported = false;
        }

        return $supported = version_compare($version, '8.0.19', '>=');
    }

    /**
     * Run a callable inside a transaction, rolling back on any throw.
     *
     * @template T
     * @param callable(PDO):T $fn
     * @return T
     */
    public static function transaction(callable $fn)
    {
        $pdo = self::conn();
        if ($pdo->inTransaction()) {
            return $fn($pdo);
        }
        $pdo->beginTransaction();
        try {
            $result = $fn($pdo);
            $pdo->commit();
            return $result;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Build a portable "insert or update" statement.
     *
     * MySQL and SQLite disagree on upsert syntax, and the old code handled it
     * by running the MySQL form, catching the exception, then retrying with
     * REPLACE INTO. REPLACE deletes-then-inserts, which silently blanks any
     * column not named in the statement and detonates dependent foreign keys.
     * This builds the correct native upsert for the active driver instead.
     *
     * @param string   $table
     * @param string[] $columns    all columns being written
     * @param string[] $keyColumns conflict target (usually the primary key)
     * @param string[] $updatable  columns to overwrite on conflict; defaults to
     *                             every non-key column
     */
    public static function upsertSql(
        string $table,
        array $columns,
        array $keyColumns = ['id'],
        ?array $updatable = null
    ): string {
        $cols         = implode(', ', array_map(static fn($c) => "`$c`", $columns));
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $updatable ??= array_values(array_diff($columns, $keyColumns));

        if ($updatable === []) {
            // Nothing to update: make the statement a no-op on conflict.
            return self::isMysql()
                ? "INSERT IGNORE INTO `$table` ($cols) VALUES ($placeholders)"
                : "INSERT INTO `$table` ($cols) VALUES ($placeholders) ON CONFLICT DO NOTHING";
        }

        if (self::isMysql()) {
            // VALUES() inside ON DUPLICATE KEY UPDATE was deprecated in MySQL
            // 8.0.20 and is rejected by newer servers. The replacement is a
            // row alias, available from 8.0.19. Older servers and MariaDB do
            // not understand the alias, so pick by version rather than
            // assuming either form works everywhere.
            if (self::supportsUpsertAlias()) {
                $assign = implode(', ', array_map(
                    static fn($c) => "`$c` = `new`.`$c`",
                    $updatable
                ));
                return "INSERT INTO `$table` ($cols) VALUES ($placeholders) AS `new` "
                     . "ON DUPLICATE KEY UPDATE $assign";
            }

            $assign = implode(', ', array_map(
                static fn($c) => "`$c` = VALUES(`$c`)",
                $updatable
            ));
            return "INSERT INTO `$table` ($cols) VALUES ($placeholders) ON DUPLICATE KEY UPDATE $assign";
        }

        $conflict = implode(', ', array_map(static fn($c) => "`$c`", $keyColumns));
        $assign   = implode(', ', array_map(
            static fn($c) => "`$c` = excluded.`$c`",
            $updatable
        ));
        return "INSERT INTO `$table` ($cols) VALUES ($placeholders) "
             . "ON CONFLICT ($conflict) DO UPDATE SET $assign";
    }
}
