<?php
/**
 * Bueno Freight OS — Rate limiting
 *
 * Fixed-window counters held in the database so the limit is shared across
 * every PHP worker process. cPanel hosting gives no shared memory cache, and
 * a per-process limit is no limit at all.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}


require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

final class RateLimit
{
    /**
     * Consume one hit from a bucket.
     *
     * @param string $key         identifies the actor, e.g. "login:1.2.3.4"
     * @param int    $limit       hits permitted per window
     * @param int    $windowSecs  window length
     * @return array{allowed:bool,remaining:int,retryAfter:int}
     */
    public static function hit(string $key, int $limit, int $windowSecs): array
    {
        $bucket = substr($key, 0, 191);
        $now    = time();

        try {
            $pdo = Db::conn();

            return Db::transaction(static function (PDO $pdo) use ($bucket, $limit, $windowSecs, $now) {
                $sel = $pdo->prepare('SELECT hits, window_start FROM bueno_rate_limits WHERE bucket = ?');
                $sel->execute([$bucket]);
                $row = $sel->fetch();

                $windowStart = $row ? (int) $row['window_start'] : 0;
                $hits        = $row ? (int) $row['hits'] : 0;

                // Window elapsed (or first ever hit): start a fresh one.
                if ($row === false || ($now - $windowStart) >= $windowSecs) {
                    $sql = Db::upsertSql(
                        'bueno_rate_limits',
                        ['bucket', 'hits', 'window_start'],
                        ['bucket']
                    );
                    $pdo->prepare($sql)->execute([$bucket, 1, (string) $now]);

                    return ['allowed' => true, 'remaining' => $limit - 1, 'retryAfter' => 0];
                }

                if ($hits >= $limit) {
                    return [
                        'allowed'    => false,
                        'remaining'  => 0,
                        'retryAfter' => max(1, $windowSecs - ($now - $windowStart)),
                    ];
                }

                $pdo->prepare('UPDATE bueno_rate_limits SET hits = hits + 1 WHERE bucket = ?')
                    ->execute([$bucket]);

                return [
                    'allowed'    => true,
                    'remaining'  => $limit - ($hits + 1),
                    'retryAfter' => 0,
                ];
            });
        } catch (Throwable $e) {
            // A rate limiter that fails closed would take the whole platform
            // down with the counter table. Log and allow.
            error_log('[bueno][ratelimit] ' . $e->getMessage());
            return ['allowed' => true, 'remaining' => $limit, 'retryAfter' => 0];
        }
    }

    /** Apply a limit, answering 429 and stopping the request if exceeded. */
    public static function enforce(string $key, int $limit, int $windowSecs): void
    {
        $result = self::hit($key, $limit, $windowSecs);

        header('X-RateLimit-Limit: ' . $limit);
        header('X-RateLimit-Remaining: ' . max(0, $result['remaining']));

        if (!$result['allowed']) {
            header('Retry-After: ' . $result['retryAfter']);
            Response::error(
                'Too many requests. Please wait before trying again.',
                429,
                ['retryAfter' => $result['retryAfter']]
            );
        }
    }

    /** Remove expired buckets. Called opportunistically, not on every request. */
    public static function sweep(int $olderThanSecs = 86400): void
    {
        try {
            Db::conn()
                ->prepare('DELETE FROM bueno_rate_limits WHERE CAST(window_start AS INTEGER) < ?')
                ->execute([time() - $olderThanSecs]);
        } catch (Throwable $e) {
            error_log('[bueno][ratelimit.sweep] ' . $e->getMessage());
        }
    }
}
