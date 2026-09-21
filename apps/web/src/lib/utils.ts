import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

export function formatDateShort(date: string | Date) {
  return new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

/**
 * A one-time credential for a newly provisioned account.
 *
 * The provisioning form used to default to the PIN `1111` for every account.
 * The server hashes whatever is submitted and forces a change at first
 * sign-in, so the exposure is bounded — but between provisioning and that
 * first sign-in, anyone who knew the address could sign in as the new user and
 * set the password themselves.
 *
 * Generated with the platform CSPRNG. The alphabet omits characters that are
 * misread when a credential is dictated over the phone to a terminal — 0/O,
 * 1/l/I, 5/S, 8/B — because that is how these actually get delivered.
 */
export function generateTemporaryCredential(length = 10): string {
  const alphabet = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';
  const bytes = new Uint32Array(length);

  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    // Server-side render of a form nobody has interacted with yet. Replaced on
    // mount; never the value actually submitted.
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 0xffffffff);
  }

  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
