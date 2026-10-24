"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icons";

export type NavItem = { href: string; label: string; icon: IconName };

const STORAGE_KEY = "mavi.sidebar";

/**
 * Estrutura do painel: menu lateral que recolhe (computador) ou vira gaveta (celular).
 * A escolha de recolher fica salva neste aparelho.
 */
export default function AppShell({
  items,
  userName,
  roleLabel,
  initials,
  logout,
  children,
}: {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  initials: string;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "collapsed");
    } catch {
      /* sem armazenamento: segue expandido */
    }
  }, []);

  // Fecha a gaveta ao navegar e com a tecla Esc.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "expanded" : "collapsed");
      } catch {
        /* ignora */
      }
      return !c;
    });
  }, []);

  return (
    <div className={`shell${collapsed ? " collapsed" : ""}${drawer ? " drawer-open" : ""}`}>
      <header className="mobile-bar">
        <button type="button" className="mobile-bar-btn" onClick={() => setDrawer(true)} aria-label="Abrir menu" aria-expanded={drawer} aria-controls="sidebar">
          <Icon name="menu" size={22} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="MAVI Podologia" />
      </header>

      <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />

      <aside className="sidebar" id="sidebar" aria-label="Menu lateral">
        <div className="sidebar-top">
          <div className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="MAVI Podologia" />
          </div>
          <button type="button" className="side-btn close-drawer" onClick={() => setDrawer(false)} aria-label="Fechar menu">
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="nav" aria-label="Principal">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined}>
                <Icon name={item.icon} />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <button type="button" className="side-btn collapse-btn" onClick={toggleCollapsed} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} title={collapsed ? "Expandir menu" : "Recolher menu"}>
            <Icon name="panel" size={20} />
            <span className="nav-label">Recolher menu</span>
          </button>
          <div className="user">
            <span className="avatar" aria-hidden="true" title={userName}>
              {initials}
            </span>
            <div className="user-info small">
              <div style={{ fontWeight: 600 }}>{userName}</div>
              <div className="tiny" style={{ color: "#c9d8d3" }}>
                {roleLabel}
              </div>
            </div>
            <form action={logout} className="logout">
              <button type="submit" className="side-btn" aria-label="Sair" title="Sair">
                <Icon name="logout" size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
