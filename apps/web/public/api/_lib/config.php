<?php
/**
 * Bueno Freight OS — Configuration
 *
 * Single place that resolves environment configuration. Previously every
 * endpoint re-parsed .env by hand inside getDbConnection(); that parsing is
 * now here, done once per request and cached.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}


final class Config
{
    /** @var array<string,string>|null */
    private static ?array $env = null;

    /**
     * Load environment from (in order of precedence):
     *   1. real environment variables / SetEnv
     *   2. the first readable .env found walking up from the api directory
     *
     * cPanel deploys drop .env above the document root, so we walk up a few
     * levels rather than assuming a fixed location.
     */
    private static function load(): void
    {
        if (self::$env !== null) {
            return;
        }

        $env = [];
        $candidates = [
            __DIR__ . '/../.env',
            __DIR__ . '/../../.env',
            __DIR__ . '/../../../.env',
            __DIR__ . '/../../../../.env',
        ];

        foreach ($candidates as $path) {
            if (!is_file($path) || !is_readable($path)) {
                continue;
            }
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) {
                continue;
            }
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                if (!str_contains($line, '=')) {
                    continue;
                }
                [$k, $v] = explode('=', $line, 2);
                $k = trim($k);
                $v = trim($v);
                // strip one layer of matching quotes
                if (strlen($v) >= 2) {
                    $first = $v[0];
                    $last  = $v[strlen($v) - 1];
                    if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                        $v = substr($v, 1, -1);
                    }
                }
                // first file to define a key wins
                if (!array_key_exists($k, $env)) {
                    $env[$k] = $v;
                }
            }
            break; // only the nearest .env
        }

        self::$env = $env;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        self::load();

        // Real environment always outranks the .env file.
        $fromEnv = getenv($key);
        if ($fromEnv !== false && $fromEnv !== '') {
            return $fromEnv;
        }
        if (isset(self::$env[$key]) && self::$env[$key] !== '') {
            return self::$env[$key];
        }
        return $default;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $v = self::get($key);
        if ($v === null) {
            return $default;
        }
        return in_array(strtolower($v), ['1', 'true', 'yes', 'on'], true);
    }

    public static function int(string $key, int $default): int
    {
        $v = self::get($key);
        return ($v !== null && is_numeric($v)) ? (int) $v : $default;
    }

    public static function isProduction(): bool
    {
        return strtolower((string) self::get('APP_ENV', 'production')) === 'production';
    }

    /**
     * Secret used to sign session tokens.
     *
     * There is deliberately no usable default. A predictable signing key means
     * anyone can mint a valid admin session, so we would rather fail loudly at
     * boot than run with a guessable secret.
     */
    public static function appSecret(): string
    {
        $secret = self::get('APP_SECRET');
        if ($secret === null || strlen($secret) < 32) {
            throw new RuntimeException(
                'APP_SECRET is missing or shorter than 32 characters. '
                . 'Generate one with: php -r "echo bin2hex(random_bytes(32));" '
                . 'and set it in .env before serving requests.'
            );
        }
        return $secret;
    }

    /**
     * Origins permitted to call the API with credentials.
     * Empty list means same-origin only, which is the correct default here:
     * the SPA is served from the same host as these endpoints.
     *
     * @return string[]
     */
    public static function allowedOrigins(): array
    {
        $raw = self::get('ALLOWED_ORIGINS', '');
        if ($raw === null || trim($raw) === '') {
            return [];
        }
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }
}
