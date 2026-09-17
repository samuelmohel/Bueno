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
