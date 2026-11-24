"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

/** Janela modal baseada no <dialog> nativo: Esc fecha, foco fica preso dentro, clicar fora fecha. */
export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  // Avisa antes de fechar a aba ou recarregar com um formulário preenchido e não salvo.
  const dirty = useRef(false);
  useEffect(() => {
    dirty.current = false;
    if (!open) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open]);

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
          <div className="modal-body" onInput={() => (dirty.current = true)}>
            {children}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
