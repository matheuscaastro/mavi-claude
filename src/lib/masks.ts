/** Máscaras de digitação (telefone e CPF). Funções puras, usadas na tela e nos testes. */

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

/**
 * Telefone brasileiro: celular "(99) 9 9999-9999" (11 dígitos, começa com 9 depois do DDD)
 * ou fixo "(99) 9999-9999" (10 dígitos). Aceita texto colado com +55.
 */
export function maskPhone(input: string): string {
  let d = onlyDigits(input);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  const mobile = d[2] === "9";
  d = d.slice(0, mobile ? 11 : 10);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const r = d.slice(2);
  if (mobile) {
    return `(${ddd}) ${r[0]}` + (r.length > 1 ? ` ${r.slice(1, 5)}` : "") + (r.length > 5 ? `-${r.slice(5)}` : "");
  }
  return `(${ddd}) ${r.slice(0, 4)}` + (r.length > 4 ? `-${r.slice(4)}` : "");
}

/** CPF "999.999.999-99" (11 dígitos). */
export function maskCpf(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += `.${d.slice(3, 6)}`;
  if (d.length > 6) out += `.${d.slice(6, 9)}`;
  if (d.length > 9) out += `-${d.slice(9)}`;
  return out;
}

export const PHONE_PATTERN = String.raw`\(\d{2}\) (9 \d{4}-\d{4}|\d{4}-\d{4})`;
export const CPF_PATTERN = String.raw`\d{3}\.\d{3}\.\d{3}-\d{2}`;
