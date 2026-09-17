<?php
/**
 * Bueno Freight OS — Input validation
 *
 * The previous endpoints ran htmlspecialchars() over incoming values before
 * writing them. That is escaping, not validation, and at the wrong layer: it
 * permanently mangles legitimate data (a company named "Smith & Sons" is
 * stored as "Smith &amp; Sons") while doing nothing about type or range.
 *
 * Values are validated and stored raw here. Escaping belongs at render time,
 * which React already does.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}


require_once __DIR__ . '/http.php';

final class ValidationException extends RuntimeException
{
    /** @param array<string,string> $errors */
    public function __construct(public readonly array $errors)
    {
        parent::__construct('Validation failed');
    }
}

final class Validator
{
    /** @var array<string,string> */
    private array $errors = [];

    /** @var array<string,mixed> */
    private array $clean = [];

    /** @param array<string,mixed> $input */
    public function __construct(private readonly array $input)
    {
    }

    /** @param array<string,mixed> $input */
    public static function for(array $input): self
    {
        return new self($input);
    }

    private function raw(string $field): mixed
    {
        return $this->input[$field] ?? null;
    }

    public function string(string $field, bool $required = false, int $max = 255, int $min = 0): self
    {
        $value = $this->raw($field);

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$field] = 'This field is required.';
            } else {
                $this->clean[$field] = null;
            }
            return $this;
        }

        if (!is_scalar($value)) {
            $this->errors[$field] = 'Must be a text value.';
            return $this;
        }

        $value = trim((string) $value);

        if (mb_strlen($value) < $min) {
            $this->errors[$field] = "Must be at least {$min} characters.";
            return $this;
        }
        if (mb_strlen($value) > $max) {
            $this->errors[$field] = "Must be {$max} characters or fewer.";
            return $this;
        }

        // Reject control characters, which have no place in these fields and
        // can be used to forge log lines.
        if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value) === 1) {
            $this->errors[$field] = 'Contains invalid control characters.';
            return $this;
        }

        $this->clean[$field] = $value;
        return $this;
    }

    public function email(string $field, bool $required = false): self
    {
        $value = $this->raw($field);

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$field] = 'An email address is required.';
            } else {
                $this->clean[$field] = null;
            }
            return $this;
        }

        $value = trim((string) $value);
        if (filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            $this->errors[$field] = 'Must be a valid email address.';
            return $this;
        }
        if (mb_strlen($value) > 255) {
            $this->errors[$field] = 'Email address is too long.';
            return $this;
        }

        $this->clean[$field] = strtolower($value);
        return $this;
    }

    public function number(string $field, bool $required = false, ?float $min = null, ?float $max = null): self
    {
        $value = $this->raw($field);

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$field] = 'A number is required.';
            } else {
                $this->clean[$field] = null;
            }
            return $this;
        }

        if (!is_numeric($value)) {
            $this->errors[$field] = 'Must be a number.';
            return $this;
        }

        $num = (float) $value;
        if ($min !== null && $num < $min) {
            $this->errors[$field] = "Must be at least {$min}.";
            return $this;
        }
        if ($max !== null && $num > $max) {
            $this->errors[$field] = "Must be no more than {$max}.";
            return $this;
        }

        $this->clean[$field] = $num;
        return $this;
    }

    public function integer(string $field, bool $required = false, ?int $min = null, ?int $max = null): self
    {
        $this->number($field, $required, $min, $max);
        if (isset($this->clean[$field]) && $this->clean[$field] !== null) {
            $this->clean[$field] = (int) $this->clean[$field];
        }
        return $this;
    }

    /** @param string[] $allowed */
    public function enum(string $field, array $allowed, bool $required = false, ?string $default = null): self
    {
        $value = $this->raw($field);

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$field] = 'A value must be selected.';
            } else {
                $this->clean[$field] = $default;
            }
            return $this;
        }

        $value = (string) $value;
        if (!in_array($value, $allowed, true)) {
            $this->errors[$field] = 'Must be one of: ' . implode(', ', $allowed) . '.';
            return $this;
        }

        $this->clean[$field] = $value;
        return $this;
    }

    public function boolean(string $field, bool $default = false): self
    {
        $value = $this->raw($field);
        if ($value === null) {
            $this->clean[$field] = $default;
            return $this;
        }
        $this->clean[$field] = in_array($value, [true, 1, '1', 'true', 'yes', 'on'], true);
        return $this;
    }

    /** Accept a nested array/object, stored as JSON. */
    public function jsonArray(string $field, int $maxItems = 1000): self
    {
        $value = $this->raw($field);
        if ($value === null) {
            $this->clean[$field] = [];
            return $this;
        }
        if (!is_array($value)) {
            $this->errors[$field] = 'Must be a list.';
            return $this;
        }
        if (count($value) > $maxItems) {
            $this->errors[$field] = "Must contain {$maxItems} items or fewer.";
            return $this;
        }
        $this->clean[$field] = $value;
        return $this;
    }

    /** Free-form identifier: letters, digits, and a conservative symbol set. */
    public function identifier(string $field, bool $required = false, int $max = 100): self
    {
        $this->string($field, $required, $max);
        $value = $this->clean[$field] ?? null;
        if (is_string($value) && preg_match('/^[A-Za-z0-9 _\-.:@+\/]+$/', $value) !== 1) {
            $this->errors[$field] = 'Contains characters that are not permitted in an identifier.';
            unset($this->clean[$field]);
        }
        return $this;
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    /** @return array<string,string> */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * Return the validated values, or answer 422 with the field errors.
     *
     * @return array<string,mixed>
     */
    public function validated(): array
    {
        if ($this->fails()) {
            Response::error('The submitted data is not valid.', 422, ['errors' => $this->errors]);
        }
        return $this->clean;
    }
}
