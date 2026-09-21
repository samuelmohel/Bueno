'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { registerConfirmHandler, type ConfirmRequest } from '@/lib/notify';

/**
 * The application's confirmation dialog.
 *
 * Mounted once, in the root layout, and driven by `confirmAction()`.
 *
 * Accessibility is the point of this component existing rather than a styled
 * div: it is an `alertdialog` with its title and body wired to the element via
 * aria-labelledby/aria-describedby, focus moves into it on open and returns to
 * whatever opened it on close, Tab is trapped inside while it is open, and
 * Escape cancels. `window.confirm` gave all of that for free, which is the one
 * thing it had going for it.
 */

interface Pending {
  request: ConfirmRequest;
  resolve: (ok: boolean) => void;
}

export function ConfirmDialogHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    registerConfirmHandler((request, resolve) => {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setPending({ request, resolve });
    });
    return () => registerConfirmHandler(null);
  }, []);

  const settle = useCallback(
    (answer: boolean) => {
      setPending((current) => {
        current?.resolve(answer);
        return null;
      });
      // Return focus to the control that opened the dialog, so keyboard users
      // do not get dropped back at the top of the document.
      previouslyFocused.current?.focus?.();
    },
    []
  );

  // Move focus into the dialog once it is on screen.
  useEffect(() => {
    if (pending) confirmRef.current?.focus();
  }, [pending]);

  // Escape to cancel, and keep Tab inside the dialog while it is open.
  useEffect(() => {
    if (!pending) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        settle(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pending, settle]);

  // Stop the page behind the dialog from scrolling.
  useEffect(() => {
    if (!pending) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [pending]);

  if (!pending) return null;

  const { request } = pending;
  const destructive = request.destructive === true;
  const Icon = destructive ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={() => settle(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              destructive ? 'bg-rose-100 text-rose-700' : 'bg-navy-50 text-navy'
            }`}
          >
            <Icon size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="font-display text-base font-black text-slate-900"
            >
              {request.title}
            </h2>
            <p id="confirm-dialog-body" className="mt-2 text-2xs font-semibold leading-relaxed text-slate-600">
              {request.body}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => settle(false)}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-2xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100"
          >
            {request.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => settle(true)}
            className={`rounded-xl px-5 py-2.5 text-2xs font-black uppercase tracking-wider text-white transition-colors ${
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand hover:bg-brand-dark'
            }`}
          >
            {request.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
