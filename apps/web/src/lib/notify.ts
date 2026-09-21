'use client';

import toast from 'react-hot-toast';

/**
 * Bueno Freight OS — user feedback
 *
 * Replaces `window.alert` and `window.confirm`.
 *
 * Those block the browser's main thread, cannot be styled, say "360.speckless
 * innovations.com says…" above the message, and on a destructive action give
 * no indication of what is about to be destroyed. They are also untestable and
 * are suppressed outright by some mobile browsers when not triggered directly
 * by a user gesture — which meant errors could vanish silently.
 */

export const notify = {
  success(message: string) {
    return toast.success(message, { duration: 4000 });
  },

  error(message: string) {
    // Longer, because an error usually has to be read and acted on.
    return toast.error(message, { duration: 7000 });
  },

  info(message: string) {
    return toast(message, { duration: 4500, icon: 'ℹ️' });
  },

  /** Shows a spinner while `work` runs, then a success or failure message. */
  async promise<T>(
    work: Promise<T>,
    messages: { loading: string; success: string; error?: string }
  ): Promise<T> {
    return toast.promise(work, {
      loading: messages.loading,
      success: messages.success,
      error: (err: unknown) =>
        messages.error ?? (err instanceof Error ? err.message : 'Something went wrong.'),
    });
  },

  dismissAll() {
    toast.dismiss();
  },
};

// ── Confirmation dialogs ────────────────────────────────────────────────────
//
// `confirmAction` is a promise, so call sites read almost exactly as they did
// with `window.confirm`:
//
//   if (!(await confirmAction({ ... }))) return;
//
// The dialog itself is rendered by ConfirmDialogHost, mounted once in the root
// layout. A module-level subscriber avoids threading React context through
// fifteen files.

export interface ConfirmRequest {
  title: string;
  /** What will happen. Be specific — this is the last chance to stop. */
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red and requires an explicit second look. */
  destructive?: boolean;
}

type Listener = (req: ConfirmRequest, resolve: (ok: boolean) => void) => void;

let listener: Listener | null = null;

/** Called by ConfirmDialogHost on mount. */
export function registerConfirmHandler(fn: Listener | null): void {
  listener = fn;
}

export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  // If the host is not mounted the safe answer is "no". Silently proceeding
  // with a destructive action because the UI failed to load is not acceptable.
  if (!listener) {
    console.error('confirmAction called before ConfirmDialogHost mounted; refusing.');
    return Promise.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    listener!(request, resolve);
  });
}
