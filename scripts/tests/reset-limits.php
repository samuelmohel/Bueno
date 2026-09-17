<?php
/**
 * Clears rate-limit counters and login lockouts between test suites.
 *
 * The suites deliberately exercise the rate limiter, which then blocks the
 * next suite from signing in. Real behaviour, unhelpful test coupling.
 */
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/apps/web/public/api/_lib/db.php';

$pdo = Db::conn();
$pdo->exec('DELETE FROM bueno_rate_limits');
$pdo->exec("UPDATE bueno_users SET failed_attempts = 0, locked_until = NULL");
echo "rate limits and lockouts cleared\n";
