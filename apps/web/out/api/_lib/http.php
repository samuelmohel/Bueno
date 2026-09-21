<?php
/**
 * Bueno Freight OS — HTTP request/response helpers
 *
 * The previous endpoints echoed JSON directly and answered HTTP 200 for every
 * outcome including failures, so clients could not distinguish success from
 * error without parsing the body. Everything now goes through Response, which
 * sets a truthful status code.
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

final class Http
{
    private static bool $corsSent = false;

    /**
     * Emit CORS headers.
     *
     * Previously every endpoint sent `Access-Control-Allow-Origin: *`, which
     * let any website on the internet read operational data from a logged-in
     * employee's browser. We now echo back only an explicitly allowed origin,
     * and default to same-origin (no header at all).
     */
    public static function cors(): void
    {
        if (self::$corsSent) {
            return;
        }
        self::$corsSent = true;

        $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = Config::allowedOrigins();

        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        }

        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, If-None-Match');
        header('Access-Control-Max-Age: 600');
    }

    public static function securityHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: same-origin');
        header('Cache-Control: no-store');
    }

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    /** Answer CORS preflight and stop. */
    public static function handlePreflight(): void
    {
        if (self::method() === 'OPTIONS') {
            self::cors();
            http_response_code(204);
            exit;
        }
    }

    /**
     * Decode the JSON request body.
     *
     * @return array<mixed>
     */
    public static function jsonBody(int $maxBytes = 4194304): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        if (strlen($raw) > $maxBytes) {
            Response::error('Request body too large.', 413);
        }
        try {
            $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            Response::error('Request body is not valid JSON.', 400);
        }
        return is_array($decoded) ? $decoded : [];
    }

    public static function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        // Some cPanel/CGI setups strip Authorization; fall back to getallheaders.
        if ($header === '' && function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                if (strcasecmp($name, 'Authorization') === 0) {
                    $header = $value;
                    break;
                }
            }
        }

        if (preg_match('/^Bearer\s+(.+)$/i', trim((string) $header), $m) === 1) {
            return trim($m[1]);
        }
        return null;
    }

    public static function clientIp(): string
    {
        // Only trust a forwarded header when the deployment says it is behind
        // a proxy; otherwise it is client-controlled and trivially spoofed.
        if (Config::bool('TRUST_PROXY', false)) {
            $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
            if ($fwd !== '') {
                $first = trim(explode(',', $fwd)[0]);
                if (filter_var($first, FILTER_VALIDATE_IP) !== false) {
                    return $first;
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}

final class Response
{
    /**
     * @param array<string,mixed> $payload
     */
    public static function json(array $payload, int $status = 200): never
    {
        // On the command line there is no HTTP response to send, and exiting 0
        // after an error makes a failed migration look like a success to the
        // calling shell — which is exactly how a broken deploy reported
        // "Deployment complete".
        if (PHP_SAPI === 'cli') {
            $message = (string) ($payload['message'] ?? '');
            if ($status >= 400) {
                fwrite(STDERR, 'ERROR: ' . ($message !== '' ? $message : 'request failed') . PHP_EOL);
                exit(1);
            }
            if ($message !== '') {
                echo $message . PHP_EOL;
            }
            exit(0);
        }

        // Drop anything the runtime printed before us — a startup warning from
        // the host's php.ini would otherwise sit in front of the JSON and make
        // the response unparseable.
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        Http::cors();
        Http::securityHeaders();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($status);
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * @param array<string,mixed> $extra
     */
    public static function ok(array $extra = []): never
    {
        self::json(array_merge(['status' => 'success'], $extra), 200);
    }

    /**
     * @param array<mixed> $data
     * @param array<string,mixed> $extra
     */
    public static function data(array $data, array $extra = []): never
    {
        self::json(array_merge([
            'status'     => 'success',
            'data'       => array_values($data),
            'count'      => count($data),
            'serverTime' => gmdate('Y-m-d\TH:i:s\Z'),
        ], $extra), 200);
    }

    /**
     * @param array<string,mixed> $extra
     */
    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        self::json(array_merge([
            'status'  => 'error',
            'message' => $message,
        ], $extra), $status);
    }
}
