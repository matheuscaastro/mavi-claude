import { requireUser } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
import Nav, { type NavItem } from "@/components/Nav";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items: NavItem[] = [{ href: "/agenda", label: "Agenda", icon: "calendar" }];
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
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="MAVI Podologia" />
        </div>
        <Nav items={items} />
        <div className="user">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="small" style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div className="tiny" style={{ color: "#c9d8d3" }}>
              {ROLE_LABEL[user.accessRole]}
            </div>
            <form action={logoutAction}>
              <button type="submit">Sair</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
