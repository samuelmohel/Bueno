'use client';

import { Toaster } from 'react-hot-toast';
import { BRAND } from '@/lib/theme';
import { ConfirmDialogHost } from './ConfirmDialog';

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
    </>
  );
}
