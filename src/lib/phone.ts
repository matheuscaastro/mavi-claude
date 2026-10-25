import { maskPhone } from "./masks";

/** Telefone guardado só com dígitos (DDD + número), sem o 55 do país. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

/** Mostra o telefone com máscara: (61) 9 8888-7777. */
export function formatPhone(digits: string): string {
  return maskPhone(digits);
}
