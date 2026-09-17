<?php
/**
 * 003 — Hash existing credentials
 *
 * The users table stored PINs in plaintext, and GET /api/users.php returned
 * them to anyone who asked. This converts every stored PIN into a bcrypt hash
 * so the plaintext stops being a credential.
 *
 * Every existing user keeps working: their current PIN still authenticates,
 * it is simply verified against the hash from now on. The plaintext `pin`
 * column is blanked rather than dropped, so this migration is reversible by
 * restoring from backup without a schema change.
 *
 * Accounts still holding a well-known default PIN are flagged
 * must_change_credentials = 1, so the application can require a real password
 * at next sign-in without locking anybody out today.
 */

declare(strict_types=1);

return static function (PDO $pdo): void {
    // PINs that shipped as defaults in seed data and demo accounts. Anyone
    // still using one of these has, in effect, no credential at all.
    $WELL_KNOWN = ['1111', '2222', '3333', '4444', '6666', '7777', '8888', '9999', '1234', 'demo1234'];

    $now = gmdate('Y-m-d\TH:i:s\Z');

    $rows = $pdo->query('SELECT id, pin, password_hash FROM bueno_users')->fetchAll();

    $update = $pdo->prepare(
        'UPDATE bueno_users
            SET password_hash = ?,
                must_change_credentials = ?,
                pin = ?,
                updated_at = ?
          WHERE id = ?'
    );

    $hashed = 0;
    $flagged = 0;

    foreach ($rows as $row) {
        // Never overwrite a hash that already exists.
        if (!empty($row['password_hash'])) {
            continue;
        }

        $plain = (string) ($row['pin'] ?? '');
        if ($plain === '') {
            $plain = '1111'; // matches the previous column default
        }

        $mustChange = in_array($plain, $WELL_KNOWN, true) ? 1 : 0;
        $hash = password_hash($plain, PASSWORD_BCRYPT);

        // Blank the plaintext column. Keeping the column itself means this
        // migration changes no schema and can be reversed from a backup.
        $update->execute([$hash, $mustChange, '', $now, $row['id']]);

        $hashed++;
        $flagged += $mustChange;
    }

    if (PHP_SAPI === 'cli') {
        printf("         hashed %d credential(s); %d flagged for mandatory reset\n", $hashed, $flagged);
    }
};
