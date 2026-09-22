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

/*
 * There is no client-side credential generator.
 *
 * One briefly lived here, to replace a provisioning form that defaulted every
 * new account to the PIN '1111'. It was the wrong layer: users.php already
 * generates the one-time secret with generate_initial_secret() and returns it
 * once on creation, and that is the value actually hashed into the database.
 * A second generator in the browser could only ever disagree with it — which
 * is precisely what went wrong: the administrator was shown the credential the
 * form had made up, while the account was created with the server's.
 */
