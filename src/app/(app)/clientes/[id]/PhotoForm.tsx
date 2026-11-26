"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { PHOTO_ACCEPT, PHOTO_MAX_MB } from "@/lib/employee-photo-shared";
import { addClientPhoto, type PhotoState } from "./fotos-actions";

export default function PhotoForm({ clientId, today }: { clientId: number; today: string }) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(addClientPhoto.bind(null, clientId), {});
  const ref = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState("");
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setFileName("");
    }
  }, [state]);
  return (
    <form action={action} ref={ref} className="stack">
      {state.error ? <div className="notice error" role="alert">{state.error}</div> : null}
      {state.ok ? <div className="notice ok">Foto salva.</div> : null}
      <div className="grid-2">
        <label className="field">
          <span className="label">Tipo</span>
          <select name="kind" defaultValue="before" required>
            <option value="before">Antes</option>
            <option value="after">Depois</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Data da foto</span>
          <input type="date" name="takenOn" defaultValue={today} required />
        </label>
      </div>
      <label className="field">
        <span className="label">Área ou tratamento</span>
        <input name="note" maxLength={120} placeholder="Ex.: axilas, sessão 3" />
      </label>
      <div className="field">
        <span className="label">Foto</span>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <label className="btn secondary file-btn">
            <input className="sr-only" type="file" name="photo" accept={PHOTO_ACCEPT} required aria-describedby="client-photo-help" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
            <Icon name="camera" /> {fileName ? "Trocar foto" : "Escolher foto"}
          </label>
          {fileName ? (
            <span className="file-name small" title={fileName}>
              {fileName}
            </span>
          ) : null}
        </div>
        <span id="client-photo-help" className="muted tiny">
          JPG, PNG ou WebP, até {PHOTO_MAX_MB} MB.
        </span>
      </div>
      <label className="row small" style={{ gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" name="consent" required style={{ marginTop: 3 }} />
        <span>A cliente autorizou o registro desta foto na ficha.</span>
      </label>
      <div className="row">
        <button className="btn secondary" type="submit" disabled={pending}>{pending ? "Enviando…" : "Adicionar foto"}</button>
      </div>
    </form>
  );
}
