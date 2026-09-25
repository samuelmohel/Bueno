<?php
/**
 * Bueno Freight OS — outbound mail
 *
 * One place that builds, sends and records transactional email, so every
 * message looks the same, every send is auditable, and a failure is visible
 * rather than swallowed.
 *
 * Previously the only mail in the system was built inline in send_mail.php,
 * which nothing ever called — so no message had ever actually been sent.
 *
 * ── On mailing credentials ────────────────────────────────────────────────
 *
 * A password sent by email stays in the recipient's mailbox, in the sending
 * server's queue, and in whatever forwarded copy the recipient makes. It
 * cannot be withdrawn and it does not expire.
 *
 * So this never carries one. An invitation carries a single-use link that
 * expires, and the person sets their own password at the end of it. The link
 * is useless once used or once it lapses, which a password is not.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines a class and must never be requested
// over HTTP.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

final class Mailer
{
    /** The address mail is sent from. */
    public static function fromAddress(): string
    {
        $configured = Config::get('MAIL_FROM');
        if ($configured !== null && filter_var($configured, FILTER_VALIDATE_EMAIL) !== false) {
            return $configured;
        }

        // Falls back to the serving host so mail still originates from a
        // domain this server is authorised for, rather than a hard-coded one
        // that would be rejected by SPF.
        $host = explode(':', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'))[0];
        return 'no-reply@' . preg_replace('/^www\./', '', $host);
    }

    /** Public base URL, for links inside mail. */
    public static function appUrl(): string
    {
        $configured = Config::get('APP_URL');
        if ($configured !== null && $configured !== '') {
            return rtrim($configured, '/');
        }
        $scheme = (($_SERVER['HTTPS'] ?? '') === 'on') ? 'https' : 'http';
        return $scheme . '://' . explode(':', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'))[0];
    }

    /**
     * Send one message and record the attempt.
     *
     * @param  array<string,mixed> $meta Recorded alongside the log entry. Must
     *                                   never contain a credential or a token.
     * @return bool Whether the mail transport accepted it. That is not proof
     *              of delivery — only that the server took it.
     */
    public static function send(
        string $to,
        string $subject,
        string $html,
        string $type,
        array $meta = []
    ): bool {
        $to = trim($to);
        if ($to === '' || filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
            self::record($to, $subject, $type, 'INVALID_ADDRESS', $meta);
            return false;
        }

        $from = self::fromAddress();

        $headers = implode("\r\n", [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: Bueno Logistics <' . $from . '>',
            'Reply-To: ' . $from,
            'X-Mailer: Bueno Freight OS',
            // Transactional mail should not generate out-of-office replies.
            'Auto-Submitted: auto-generated',
        ]);

        $sent = false;
        try {
            $sent = @mail($to, $subject, $html, $headers, '-f' . $from);
        } catch (Throwable $e) {
            error_log('[bueno][mail] transport threw: ' . $e->getMessage());
        }

        if (!$sent) {
            // Shared hosting silently disables mail() often enough that this
            // needs to be findable without adding debug code later.
            error_log(sprintf('[bueno][mail] FAILED type=%s to=%s subject=%s', $type, $to, $subject));
        }

        self::record($to, $subject, $type, $sent ? 'SENT' : 'FAILED', $meta);
        return $sent;
    }

    /** @param array<string,mixed> $meta */
    private static function record(
        string $to,
        string $subject,
        string $type,
        string $status,
        array $meta
    ): void {
        try {
            Db::conn()->prepare(
                'INSERT INTO bueno_email_logs (id, recipient, subject, mailType, status, createdAt, payloadText)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                'mail_' . bin2hex(random_bytes(8)),
                mb_substr($to, 0, 255),
                mb_substr($subject, 0, 255),
                $type,
                $status,
                gmdate('Y-m-d\TH:i:s\Z'),
                json_encode($meta),
            ]);
        } catch (Throwable $e) {
            error_log('[bueno][mail] log write failed: ' . $e->getMessage());
        }
    }

    /** Escape a value for inclusion in mail HTML. */
    public static function e(?string $value, string $fallback = ''): string
    {
        $v = (string) ($value ?? '');
        return htmlspecialchars($v !== '' ? $v : $fallback, ENT_QUOTES, 'UTF-8');
    }

    /**
     * The shared message shell.
     *
     * Inline styles throughout, and a table for the detail rows: mail clients
     * strip stylesheets and many still do not lay out flexbox.
     *
     * @param array<string,string> $rows   label => value, already escaped
     * @param array{label:string,url:string}|null $cta
     */
    public static function layout(
        string $heading,
        string $intro,
        array $rows = [],
        ?array $cta = null,
        string $footnote = ''
    ): string {
        $rowsHtml = '';
        foreach ($rows as $label => $value) {
            $rowsHtml .= '<tr>'
                . '<td style="padding:7px 0;color:#64748b;font-size:12px;white-space:nowrap;">'
                . self::e($label) . '</td>'
                . '<td style="padding:7px 0 7px 16px;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">'
                . $value . '</td>'
                . '</tr>';
        }

        $rowsBlock = $rowsHtml === '' ? '' :
            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;">'
            . '<table style="width:100%;border-collapse:collapse;">' . $rowsHtml . '</table></div>';

        $ctaBlock = $cta === null ? '' :
            '<div style="margin:26px 0;text-align:center;">'
            . '<a href="' . self::e($cta['url']) . '" '
            . 'style="display:inline-block;background:#3F7D22;color:#ffffff;text-decoration:none;'
            . 'padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;">'
            . self::e($cta['label']) . '</a>'
            . '<p style="margin:14px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">'
            . 'If the button does not work, paste this into your browser:<br>' . self::e($cta['url'])
            . '</p></div>';

        $footBlock = $footnote === '' ? '' :
            '<p style="margin:18px 0 0;font-size:12px;color:#64748b;line-height:1.6;">' . $footnote . '</p>';

        return '<!doctype html><html><body style="margin:0;padding:24px;background:#f1f5f9;'
            . 'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">'
            . '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">'
            . '<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;font-weight:700;">'
            . 'Bueno Logistics</p>'
            . '<h1 style="margin:0 0 14px;font-size:20px;color:#0f172a;">' . self::e($heading) . '</h1>'
            . '<p style="margin:0;font-size:14px;line-height:1.65;color:#334155;">' . $intro . '</p>'
            . $rowsBlock . $ctaBlock . $footBlock
            . '<div style="margin-top:28px;border-top:1px solid #f1f5f9;padding-top:16px;'
            . 'font-size:11px;color:#94a3b8;text-align:center;">&copy; ' . date('Y')
            . ' Bueno Logistics Limited</div></div></body></html>';
    }
}
