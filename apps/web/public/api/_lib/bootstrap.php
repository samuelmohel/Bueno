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

/**
 * Turn PHP's diagnostics into something useful without letting them take the
 * platform down.
 *
 * In development every warning becomes an exception, which is how a silent
 * defect in the session query was caught. In production that is the wrong
 * trade: a deprecation notice from a future PHP release, or a "headers already
 * sent" caused by the host printing a startup warning, would turn a working
 * request into a 500. Those are logged and execution continues.
 */
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if ((error_reporting() & $severity) === 0) {
        return false;
    }

    // Never fatal. Notices and deprecations describe code that still works,
    // and PHP raises them for things outside this application's control.
    $advisory = E_DEPRECATED | E_USER_DEPRECATED | E_NOTICE | E_USER_NOTICE | E_STRICT;
    if (($severity & $advisory) !== 0) {
        error_log(sprintf('[bueno][php] %s in %s:%d', $message, $file, $line));
        return true;
    }

    // Output started before we could send headers — usually the host's php.ini
    // printing a startup warning. Nothing the request can do about it, and
    // throwing here would replace a working response with a 500.
    if (str_contains($message, 'headers already sent')
        || str_contains($message, 'Cannot modify header information')) {
        error_log(sprintf('[bueno][php] %s in %s:%d', $message, $file, $line));
        return true;
    }

    if (Config::isProduction()) {
        error_log(sprintf('[bueno][php] %s in %s:%d', $message, $file, $line));
        return true;
    }

    throw new ErrorException($message, 0, $severity, $file, $line);
});

/**
 * Discard anything emitted before the application started.
 *
 * A misconfigured php.ini can print startup warnings ahead of any script. That
 * text lands in front of the JSON body, making every response unparseable for
 * a reason invisible from the client side.
 */
if (!headers_sent() && ob_get_level() === 0) {
    ob_start();
}

Http::handlePreflight();
Http::cors();

/**
 * Refuse to serve without a signing secret.
 *
 * Sessions are keyed with APP_SECRET. Running without one would mean anyone
 * able to write a row into the sessions table could mint an administrator
 * session, so this fails loudly at the first request rather than appearing to
 * work. The health check reports the same condition with instructions.
 */
try {
    Config::appSecret();
} catch (Throwable $e) {
    error_log('[bueno][boot] ' . $e->getMessage());
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);
    }
    echo json_encode([
        'status'  => 'error',
        'message' => 'The server is not configured. APP_SECRET is missing from .env. '
                   . 'See /api/health.php for details.',
    ]);
    exit;
}

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
