const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 12000 -> "R$ 120,00" */
export function formatBRL(cents: number): string {
  return brlFormatter.format(cents / 100);
}

/** "120,00" | "1.234,50" | "120" -> 12000. Retorna null se não for um valor válido. */
export function parseBRL(input: string): number | null {
  const cleaned = input.trim().replace(/^R\$\s*/, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** 12000 -> "120,00" (para preencher campos de formulário) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
