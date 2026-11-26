"use client";

import Select from "@/components/Select";
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { PHOTO_ACCEPT, PHOTO_MAX_BYTES, PHOTO_MAX_MB } from "@/lib/employee-photo-shared";
import MaskedInput from "@/components/MaskedInput";
import type { EmployeeFormState } from "./actions";

export type EmployeeDefaults = {
  name: string;
  jobTitle: string;
  phone: string;
  email: string;
  accessRole: "admin" | "reception" | "professional";
  performsServices: boolean;
  color: string;
  commissionPercent: number;
  /** Endereço da foto atual, ou nada se ela não tem foto. */
  photo: string | null;
  serviceIds: number[];
};

export const PALETTE = ["#3D6B62", "#B5651D", "#7B5EA7", "#C0516B", "#2F7DA8", "#8A8F2A", "#D08A2E", "#5C6B73"];

export default function EmployeeForm({
  action,
  defaults,
  services,
  isNew,
  submitLabel,
  onDone,
}: {
  action: (state: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  defaults: EmployeeDefaults;
  services: { id: number; name: string }[];
  isNew: boolean;
  submitLabel: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  // O erro do servidor sai da tela quando a pessoa escolhe outro arquivo, e volta se o envio falhar de novo.
  const [staleError, setStaleError] = useState(false);

  // Mostra a foto escolhida e avisa na hora se o arquivo não serve (o servidor confere de novo ao salvar).
  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError(null);
    setStaleError(true);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName("");
    if (!file) return;
    const reject = (msg: string) => {
      setPhotoError(msg);
      e.target.value = "";
    };
    if (!file.type.startsWith("image/") || !PHOTO_ACCEPT.split(",").includes(file.type)) {
      return reject(file.type.startsWith("image/") ? "Formato não aceito. Envie uma foto em JPG, PNG ou WebP." : "O arquivo precisa ser uma imagem (JPG, PNG ou WebP).");
    }
    if (file.size > PHOTO_MAX_BYTES) return reject(`A foto tem ${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB e o limite é ${PHOTO_MAX_MB} MB. Escolha uma imagem menor.`);
    setRemovePhoto(false);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
  }
  function clearPhoto() {
    if (fileRef.current) fileRef.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName("");
    setPhotoError(null);
  }
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form
      action={(fd) => {
        setStaleError(false);
        formAction(fd);
      }}
      className="stack"
    >
      {state.error && !staleError ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="field">
        <span className="label">Foto</span>
        <div className="row" style={{ alignItems: "center", gap: 16 }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pré-visualização da foto" width={72} height={72} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", boxShadow: `0 0 0 2px ${defaults.color}` }} />
          ) : (
            <EmployeeAvatar name={defaults.name || "Nova funcionária"} color={defaults.color} photo={removePhoto ? null : defaults.photo} size={72} />
          )}
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <label className="btn secondary file-btn">
                <input ref={fileRef} className="sr-only" type="file" name="photo" accept={PHOTO_ACCEPT} onChange={onPickPhoto} aria-describedby="photo-help" />
                <Icon name="camera" /> {preview || defaults.photo ? "Trocar foto" : "Escolher foto"}
              </label>
              {fileName ? (
                <span className="file-name small" title={fileName}>
                  {fileName}
                </span>
              ) : null}
              {preview ? (
                <button type="button" className="link-btn small" onClick={clearPhoto}>
                  Cancelar
                </button>
              ) : null}
            </div>
            <span id="photo-help" className="muted tiny">
              JPG, PNG ou WebP, até {PHOTO_MAX_MB} MB. Sem foto, aparecem as iniciais.
            </span>
            {!isNew && defaults.photo && !preview ? (
              <label className="check small">
                <input type="checkbox" name="removePhoto" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} />
                Remover a foto atual
              </label>
            ) : null}
          </div>
        </div>
        {photoError ? (
          <div className="notice error" role="alert" style={{ marginTop: 8 }}>
            {photoError}
          </div>
        ) : null}
      </div>

      <div className="grid-2">
        <label className="field">
          <span className="label">Nome</span>
          <input name="name" defaultValue={defaults.name} autoComplete="off" spellCheck={false} required />
        </label>
        <label className="field">
          <span className="label">Cargo</span>
          <input name="jobTitle" defaultValue={defaults.jobTitle} placeholder="Ex.: podóloga…" autoComplete="off" />
        </label>
        <label className="field">
          <span className="label">Telefone</span>
          <MaskedInput kind="phone" name="phone" defaultValue={defaults.phone} />
        </label>
        <label className="field">
          <span className="label">E-mail (usado no login)</span>
          <input type="email" name="email" defaultValue={defaults.email} inputMode="email" autoComplete="off" spellCheck={false} required />
        </label>
        <div className="field">
          <span className="label">Perfil de acesso</span>
          <Select name="accessRole" defaultValue={defaults.accessRole} options={[{ value: "professional", label: "Profissional" }, { value: "reception", label: "Recepção" }, { value: "admin", label: "Administradora" }]} aria-label="Perfil de acesso" />
        </div>
        <label className="field">
          <span className="label">Comissão (%)</span>
          <input type="number" name="commissionPercent" min={0} max={100} step={1} defaultValue={defaults.commissionPercent} inputMode="numeric" />
        </label>
        <label className="field">
          <span className="label">{isNew ? "Senha inicial" : "Nova senha (deixe vazio para manter)"}</span>
          <input type="password" name="password" autoComplete="new-password" minLength={8} required={isNew} />
        </label>
      </div>

      <div className="field">
        <span className="label">Cor na agenda</span>
        <div className="swatches">
          {PALETTE.map((c) => (
            <label key={c} className="swatch" title={c}>
              <input type="radio" name="color" value={c} defaultChecked={defaults.color.toLowerCase() === c.toLowerCase()} />
              <span style={{ background: c }} />
            </label>
          ))}
        </div>
      </div>

      <label className="check">
        <input type="checkbox" name="performsServices" defaultChecked={defaults.performsServices} />
        Realiza atendimentos (aparece na agenda e pode ser escolhida pelas clientes)
      </label>

      <div className="field">
        <span className="label">Serviços que realiza</span>
        <div className="stack" style={{ gap: 6 }}>
          {services.map((s) => (
            <label key={s.id} className="check">
              <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={defaults.serviceIds.includes(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
