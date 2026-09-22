"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Hide the close affordance for a modal that requires an explicit
   *  in-content choice (e.g. exam submit confirmation) rather than a
   *  dismissible dialog. */
  dismissible?: boolean;
}

export function Modal({ open, onClose, title, children, dismissible = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !dismissible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, dismissible, onClose]);

  // Focus the panel on open so keyboard/screen-reader users land inside
  // the dialog rather than staying on whatever triggered it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-4"
      onClick={dismissible ? onClose : undefined}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-lg bg-paper px-6 py-5 outline-none"
      >
        {title && <h2 className="mb-3 text-lg">{title}</h2>}
        {children}
      </div>
    </div>
  );

  // Portal to document.body so the modal isn't clipped by an ancestor's
  // overflow/transform, and z-index conflicts with page content are moot.
  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
