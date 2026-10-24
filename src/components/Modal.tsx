"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

/** Janela modal baseada no <dialog> nativo: Esc fecha, foco fica preso dentro, clicar fora fecha. */
export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => {
        // Clique no fundo (fora da caixa) fecha.
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="modal-box">
          <div className="modal-head">
            <h2 id="modal-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
              <Icon name="close" />
            </button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
