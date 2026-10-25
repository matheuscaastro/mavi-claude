"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CPF_PATTERN, maskCpf, maskPhone, onlyDigits, PHONE_PATTERN } from "@/lib/masks";

type Kind = "phone" | "cpf";

const CONFIG = {
  phone: { mask: maskPhone, pattern: PHONE_PATTERN, inputMode: "tel" as const, autoComplete: "tel-national", title: "Digite o telefone completo com DDD: (99) 9 9999-9999", placeholder: "(99) 9 9999-9999" },
  cpf: { mask: maskCpf, pattern: CPF_PATTERN, inputMode: "numeric" as const, autoComplete: "off", title: "Digite os 11 números do CPF: 999.999.999-99", placeholder: "999.999.999-99" },
};

/**
 * Campo com máscara de telefone ou CPF: só aceita números, limita o tamanho
 * e mantém o cursor no lugar ao digitar no meio do texto.
 */
export default function MaskedInput({
  kind,
  name,
  defaultValue = "",
  required,
  placeholder,
  autoComplete,
}: {
  kind: Kind;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const cfg = CONFIG[kind];
  const [value, setValue] = useState(() => cfg.mask(defaultValue));
  const ref = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);

  // Depois de reformatar, devolve o cursor para a mesma posição (contada em dígitos).
  useLayoutEffect(() => {
    const el = ref.current;
    const n = caretDigits.current;
    if (!el || n === null || document.activeElement !== el) return;
    caretDigits.current = null;
    let pos = 0;
    let seen = 0;
    while (pos < value.length && seen < n) {
      if (/\d/.test(value[pos])) seen += 1;
      pos += 1;
    }
    el.setSelectionRange(pos, pos);
  }, [value]);

  return (
    <input
      ref={ref}
      name={name}
      type="text"
      value={value}
      required={required}
      inputMode={cfg.inputMode}
      autoComplete={autoComplete ?? cfg.autoComplete}
      placeholder={placeholder ?? cfg.placeholder}
      pattern={cfg.pattern}
      title={cfg.title}
      onKeyDown={(e) => {
        // Backspace logo depois de um separador "(", ")", espaço, "." ou "-": apaga o dígito anterior.
        const el = e.currentTarget;
        if (e.key !== "Backspace" || el.selectionStart !== el.selectionEnd) return;
        const caret = el.selectionStart ?? 0;
        if (caret === 0 || /\d/.test(el.value[caret - 1])) return;
        let i = caret - 1;
        while (i >= 0 && !/\d/.test(el.value[i])) i -= 1;
        if (i < 0) return;
        e.preventDefault();
        caretDigits.current = onlyDigits(el.value.slice(0, i)).length;
        setValue(cfg.mask(el.value.slice(0, i) + el.value.slice(i + 1)));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        caretDigits.current = onlyDigits(raw.slice(0, caret)).length;
        setValue(cfg.mask(raw));
      }}
    />
  );
}
