import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Agende seu horário", template: "%s · MAVI Podologia" },
  description: "Agende online seu atendimento na MAVI Podologia.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-wrap">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="public-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="MAVI Podologia" width={150} height={150} />
      </header>
      <main className="public-main" id="conteudo" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
