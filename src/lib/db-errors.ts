type PgLike = { code?: string; cause?: { code?: string } } | null | undefined;

function pgCode(e: unknown): string | undefined {
  const err = e as PgLike;
  return err?.code ?? err?.cause?.code;
}

/** Violação de unicidade (ex.: e-mail ou telefone já cadastrado). O Drizzle embrulha o erro do Postgres em `cause`. */
export const isUniqueViolation = (e: unknown) => pgCode(e) === "23505";

/** Conflito da trava de horário (dois atendimentos ou bloqueios sobrepostos). */
export const isOverlapViolation = (e: unknown) => pgCode(e) === "23P01";
