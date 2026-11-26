import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/permissions";
import PasswordForm from "./PasswordForm";

export const metadata = { title: "Meu perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <h1 className="page-title" data-eyebrow="Conta" style={{ marginBottom: 16 }}>
        Meu perfil
      </h1>
      <div className="stack">
        <div className="card">
          <div className="section-title">Meus dados</div>
          <div className="stack small">
            <div><span className="muted">Nome: </span>{user.name}</div>
            <div><span className="muted">E-mail: </span>{user.email}</div>
            <div><span className="muted">Perfil: </span>{ROLE_LABEL[user.accessRole]}</div>
          </div>
          <p className="muted tiny">Para mudar nome, e-mail ou perfil, peça à administradora (tela Funcionários).</p>
        </div>
        <div className="card">
          <div className="section-title">Trocar minha senha</div>
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
