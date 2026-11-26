"use client";

import { useActionState } from "react";
import { closeCash, openCash, type FormState } from "./actions";

export default function CashSessionPanel({ isOpen, openedLabel, openingLabel, expectedLabel }: { isOpen: boolean; openedLabel: string; openingLabel: string; expectedLabel: string }) {
  const [openState, openAction, opening] = useActionState<FormState, FormData>(openCash, {});
  const [closeState, closeAction, closing] = useActionState<FormState, FormData>(closeCash, {});

  if (!isOpen) {
    return (
      <form action={openAction} className="stack">
        {openState.error ? <div className="notice error" role="alert">{openState.error}</div> : null}
        <div className="muted small">O caixa está fechado. Informe o troco que está na gaveta para abrir.</div>
        <label className="field">
          <span className="label">Troco inicial (R$)</span>
          <input name="opening" inputMode="decimal" placeholder="0,00" />
        </label>
        <div className="row">
          <button className="btn" type="submit" disabled={opening}>{opening ? "Abrindo…" : "Abrir caixa"}</button>
        </div>
      </form>
    );
  }

  return (
    <form action={closeAction} className="stack">
      {closeState.error ? <div className="notice error" role="alert">{closeState.error}</div> : null}
      <div className="small">
        Aberto {openedLabel} · troco inicial <strong>{openingLabel}</strong>
      </div>
      <div className="small">
        Dinheiro esperado na gaveta: <strong>{expectedLabel}</strong>
      </div>
      <label className="field">
        <span className="label">Dinheiro contado (R$)</span>
        <input name="counted" inputMode="decimal" placeholder="0,00" required />
      </label>
      <label className="field">
        <span className="label">Observação</span>
        <input name="note" placeholder="Ex.: sangria para o banco" maxLength={500} />
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={closing}>{closing ? "Fechando…" : "Fechar caixa"}</button>
      </div>
    </form>
  );
}
