import { requireUser } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
import AppShell, { type NavItem } from "@/components/AppShell";
import { unreadCount } from "@/lib/notifications";
import { photoUrl } from "@/lib/employee-photo-shared";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // A contagem de notificações não depende de quem é a pessoa logada: sai junto com a consulta do usuário.
  const [user, notifCountAll] = await Promise.all([requireUser(), unreadCount()]);

  const items: NavItem[] = [{ href: "/agenda", label: "Agenda", icon: "calendar" }];
  if (can(user.accessRole, "reports.view")) items.push({ href: "/visao-geral", label: "Visão Geral", icon: "dashboard" });
  if (can(user.accessRole, "agenda.edit")) items.push({ href: "/lista-de-espera", label: "Lista de espera", icon: "clock" });
  if (can(user.accessRole, "cash.view")) items.push({ href: "/caixa", label: "Caixa", icon: "wallet" });
  if (can(user.accessRole, "reports.view")) items.push({ href: "/relatorios", label: "Relatórios", icon: "chart" });
  if (can(user.accessRole, "clients.view")) items.push({ href: "/clientes", label: "Clientes", icon: "users" });
  if (can(user.accessRole, "employees.manage")) items.push({ href: "/funcionarios", label: "Funcionários", icon: "badge" });
  if (can(user.accessRole, "services.view")) items.push({ href: "/servicos", label: "Serviços", icon: "sparkles" });
  if (can(user.accessRole, "settings.manage")) items.push({ href: "/mensagens", label: "Mensagens", icon: "chat" });
  if (can(user.accessRole, "settings.manage")) items.push({ href: "/configuracoes", label: "Configurações", icon: "sliders" });

  const canSeeNotifications = can(user.accessRole, "agenda.edit");
  const notifCount = canSeeNotifications ? notifCountAll : 0;
  if (canSeeNotifications) items.push({ href: "/notificacoes", label: "Notificações", icon: "bell", badge: notifCount });

  const initials = user.name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell items={items} userName={user.name} roleLabel={ROLE_LABEL[user.accessRole]} initials={initials} photo={photoUrl(user.id, user.photoUpdatedAt)} logout={logoutAction}>
      {children}
    </AppShell>
  );
}
