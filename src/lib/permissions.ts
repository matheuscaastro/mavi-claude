import type { AccessRole } from "@db/schema";

/**
 * O que cada perfil pode fazer (seção 3 do PRD).
 * As telas escondem o que não se aplica, mas quem decide de verdade é o servidor:
 * toda ação chama `can` ou `requireUser` antes de mexer nos dados.
 */
export type Permission =
  | "agenda.viewAll" // ver a agenda de todas as profissionais
  | "agenda.edit" // criar, remarcar e cancelar atendimentos
  | "agenda.updateOwnStatus" // marcar o próprio atendimento como em andamento/concluído
  | "clients.view"
  | "clients.edit"
  | "services.view"
  | "services.manage"
  | "categories.manage" // cadastrar categorias de serviço (administradora e recepção)
  | "employees.manage"
  | "settings.manage"
  | "cash.view" // fluxo de caixa completo (fase seguinte)
  | "cash.register"; // registrar pagamento do atendimento (fase seguinte)

const MATRIX: Record<AccessRole, Permission[]> = {
  admin: [
    "agenda.viewAll",
    "agenda.edit",
    "agenda.updateOwnStatus",
    "clients.view",
    "clients.edit",
    "services.view",
    "services.manage",
    "categories.manage",
    "employees.manage",
    "settings.manage",
    "cash.view",
    "cash.register",
  ],
  reception: ["agenda.viewAll", "agenda.edit", "clients.view", "clients.edit", "services.view", "categories.manage", "cash.register"],
  professional: ["agenda.updateOwnStatus", "clients.view", "services.view"],
};

export function can(role: AccessRole, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export const ROLE_LABEL: Record<AccessRole, string> = {
  admin: "Administradora",
  reception: "Recepção",
  professional: "Profissional",
};
