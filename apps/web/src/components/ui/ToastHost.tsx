'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BRAND } from '@/lib/theme';
import { notify } from '@/lib/notify';
import { ConfirmDialogHost } from './ConfirmDialog';

/** Human labels for the collections a write can fail against. */
const COLLECTION_LABELS: Record<string, string> = {
  bueno_trips: 'trip',
  bueno_deals: 'deal',
  bueno_wagons: 'wagon',
  bueno_invoices: 'invoice',
  bueno_requests: 'fund requisition',
  bueno_trip_costs: 'cost voucher',
  bueno_negotiations: 'negotiation',
  bueno_notifications: 'notification',
  bueno_client_requests: 'client request',
  bueno_users: 'account',
};

/**
 * Report writes the server refused.
 *
 * StateEngine has always dispatched `bueno_write_failed` when a collection
 * write was rejected — and nothing listened to it, so a refusal reached the
 * console and went no further. The record stayed in local state, looked saved,
 * and vanished at the next poll.
 *
 * That silence hid a real defect for a long time: deals.php validated `status`
 * against a vocabulary the application does not use, so every deal ever
 * created was rejected with 422 and no one could tell. The write was optimistic
 * and the failure invisible; between them the interface reported success for
 * something that had not happened.
 */
function WriteFailureReporter() {
  useEffect(() => {
    const onFailure = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      const what = COLLECTION_LABELS[detail.collection] ?? 'change';
      const status = Number(detail.status) || 0;

      if (status === 403) {
        notify.error(`You do not have permission to save that ${what}.`);
      } else if (status === 409) {
        notify.error(
          `That ${what} was changed by someone else. Reload before saving again.`
        );
      } else if (status === 0) {
        notify.error(`Could not reach the server — that ${what} was not saved.`);
      } else {
        notify.error(
          detail.message
            ? `That ${what} was not saved: ${detail.message}`
            : `That ${what} was not saved.`
        );
      }
    };

    window.addEventListener('bueno_write_failed', onFailure);
    return () => window.removeEventListener('bueno_write_failed', onFailure);
  }, []);

  return null;
}

/**
 * Mounts the application's feedback surfaces once, at the root.
 *
 * `react-hot-toast` was already a dependency but had never been wired up, so
 * the application fell back to `window.alert`. The Toaster region is announced
 * politely by screen readers, which a native alert box is not.
 */
export function ToastHost() {
  return (
    <>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          className: 'font-sans',
          style: {
            borderRadius: '0.75rem',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.75rem 1rem',
            maxWidth: '26rem',
          },
          success: { iconTheme: { primary: BRAND.green, secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#E11D48', secondary: '#FFFFFF' } },
        }}
      />
      <ConfirmDialogHost />
      <WriteFailureReporter />
    </>
  );
}
