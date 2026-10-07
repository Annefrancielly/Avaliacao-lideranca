import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault(); // Esc: fecha pelo estado do React, não pelo navegador
        if (!busy) onCancel();
      }}
    >
      <header className="dialog__header">
        <span className="dialog__icon">
          <Icon name="lock" size={20} />
        </span>
        <div>
          <h2 id="confirm-dialog-title" className="dialog__title">
            {title}
          </h2>
          {description && <p className="dialog__description">{description}</p>}
        </div>
      </header>
      <div className="dialog__body">{children}</div>
      <footer className="dialog__actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="button"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Enviando…" : confirmLabel}
        </button>
      </footer>
    </dialog>
  );
}
