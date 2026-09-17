<?php
/**
 * Bueno Freight OS — Audit log
 *
 * Records privileged and state-changing actions. Writing to the log must never
 * break the request that triggered it, so failures here are logged to the PHP
 * error log rather than surfaced.
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

final class Audit
{
    public const SUCCESS = 'SUCCESS';
    public const DENIED  = 'DENIED';
    public const FAILURE = 'FAILURE';

    /**
     * @param array<string,mixed>|null $detail
     */
    public static function record(
        string $action,
        ?string $entity = null,
        ?string $entityId = null,
        string $outcome = self::SUCCESS,
        ?array $detail = null,
        ?array $actor = null
    ): void {
        try {
            $actor ??= Auth::userOrNull();

            $stmt = Db::conn()->prepare(
                'INSERT INTO bueno_audit_log
                    (id, occurred_at, actor_id, actor_role, action, entity, entity_id, outcome, ip, detail)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            $stmt->execute([
                'aud_' . bin2hex(random_bytes(12)),
                gmdate('Y-m-d\TH:i:s\Z'),
                $actor['id'] ?? null,
                $actor['role'] ?? null,
                $action,
                $entity,
                $entityId !== null ? substr($entityId, 0, 200) : null,
                $outcome,
                Http::clientIp(),
                $detail !== null ? json_encode($detail, JSON_UNESCAPED_SLASHES) : null,
            ]);
        } catch (Throwable $e) {
            error_log('[bueno][audit] ' . $e->getMessage());
        }
    }
}
