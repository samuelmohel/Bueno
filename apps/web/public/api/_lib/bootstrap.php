<?php
/**
 * Bueno Freight OS — Request bootstrap
 *
 * Every endpoint begins with `require_once __DIR__ . '/_lib/bootstrap.php';`.
 * Centralises error handling, CORS, preflight, and the shared services so an
 * endpoint file contains only its own logic.
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
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/capabilities.php';
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/ratelimit.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/rbac.php';
require_once __DIR__ . '/validate.php';

/**
 * Never render PHP warnings or stack traces into a response body: they leak
 * file paths, SQL, and occasionally credentials. Errors go to the log; the
 * client gets a generic message.
 */
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_exception_handler(static function (Throwable $e): void {
    error_log(sprintf(
        '[bueno][uncaught] %s: %s in %s:%d',
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));

    $payload = ['status' => 'error', 'message' => 'An unexpected error occurred.'];

    // Detail is available in development only.
    if (!Config::isProduction()) {
        $payload['debug'] = [
            'type'    => get_class($e),
            'message' => $e->getMessage(),
            'at'      => $e->getFile() . ':' . $e->getLine(),
        ];
    }

    if (!headers_sent()) {
        Http::cors();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
    }
    echo json_encode($payload);
    exit;
});

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if ((error_reporting() & $severity) === 0) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

Http::handlePreflight();
Http::cors();

/**
 * Opportunistic housekeeping.
 *
 * Expired sessions and stale rate-limit rows need periodic removal, and
 * cPanel shared hosting gives no reliable cron. Running it on roughly one
 * request in 500 keeps the tables bounded without adding latency to the
 * other 499.
 */
if (random_int(1, 500) === 1) {
    Auth::sweepSessions();
    RateLimit::sweep();
}
