import { requireUser } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
import AppShell, { type NavItem } from "@/components/AppShell";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items: NavItem[] = [{ href: "/agenda", label: "Agenda", icon: "calendar" }];
  if (can(user.accessRole, "cash.view")) items.push({ href: "/caixa", label: "Caixa", icon: "wallet" });
  if (can(user.accessRole, "clients.view")) items.push({ href: "/clientes", label: "Clientes", icon: "users" });
  if (can(user.accessRole, "employees.manage")) items.push({ href: "/funcionarios", label: "Funcionários", icon: "badge" });
  if (can(user.accessRole, "services.view")) items.push({ href: "/servicos", label: "Serviços", icon: "sparkles" });
  if (can(user.accessRole, "settings.manage")) items.push({ href: "/configuracoes", label: "Configurações", icon: "sliders" });

  const initials = user.name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell items={items} userName={user.name} roleLabel={ROLE_LABEL[user.accessRole]} initials={initials} logout={logoutAction}>
      {children}
    </AppShell>
  );
}
